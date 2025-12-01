/**
 * Agent Orchestrator
 * 
 * Uses LangChain Agent to automatically orchestrate workflow
 * Simplifies ContentOrchestrator complex logic
 * Requirements: Design Document - Agent Orchestrator
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { NewsSearchService } from './NewsSearchService.js';
import { ContentGenerationService } from './ContentGenerationService.js';
import { NewsArticle, ContentVariant, PlatformType } from '../types/domain.js';

/**
 * Agent Orchestrator
 * 
 * Uses LangChain Agent to automatically orchestrate workflow
 * Simplifies ContentOrchestrator complex logic
 */
export class AgentOrchestrator {
    private newsService: NewsSearchService;
    private contentService: ContentGenerationService;
    private agent?: any; // LangChain agent type
    private tools: DynamicStructuredTool[];

    /**
     * Creates a new AgentOrchestrator
     * 
     * @param newsService - News search service
     * @param contentService - Content generation service
     */
    constructor(
        newsService: NewsSearchService,
        contentService: ContentGenerationService
    ) {
        this.newsService = newsService;
        this.contentService = contentService;
        this.tools = this.createTools();
    }

    /**
     * Create LangChain tools for the agent
     * 
     * @returns Array of DynamicStructuredTool instances
     * @private
     */
    private createTools(): DynamicStructuredTool[] {
        return [
            this.createSearchNewsTool(),
            this.createGenerateContentTool(),
            this.createRefineContentTool()
        ];
    }

    /**
     * Create search_news tool
     * 
     * @returns DynamicStructuredTool for searching news
     * @private
     */
    private createSearchNewsTool(): DynamicStructuredTool {
        return new DynamicStructuredTool({
            name: 'search_news',
            description: '搜尋司法相關新聞文章。使用此工具來查找與司法改革、受害者權益、反廢死等議題相關的新聞。',
            schema: z.object({
                keywords: z.array(z.string()).describe('搜尋關鍵字陣列，例如：["司法改革", "受害者權益"]'),
                limit: z.number().optional().default(10).describe('最大結果數量，預設為 10')
            }),
            func: async ({ keywords, limit }) => {
                try {
                    const results = await this.newsService.searchNews(keywords, limit);
                    return JSON.stringify(results, null, 2);
                } catch (error) {
                    throw new Error(`搜尋新聞失敗: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        });
    }

    /**
     * Create generate_content tool
     * 
     * @returns DynamicStructuredTool for generating content
     * @private
     */
    private createGenerateContentTool(): DynamicStructuredTool {
        return new DynamicStructuredTool({
            name: 'generate_content',
            description: '生成社群平台論述內容。根據使用者觀點、主題模板和平台類型，生成適合的論述內容變體。',
            schema: z.object({
                userInput: z.string().describe('使用者觀點和方向'),
                topicTemplates: z.array(z.string()).describe('主題模板 ID 陣列，例如：["victim_rights", "anti_death_penalty"]'),
                platformType: z.enum(['instagram', 'facebook', 'line']).describe('目標平台：instagram、facebook 或 line'),
                newsUrls: z.array(z.string()).optional().default([]).describe('新聞文章 URL 陣列（可選）')
            }),
            func: async ({ userInput, topicTemplates, platformType, newsUrls }) => {
                try {
                    // Fetch news context if URLs provided
                    let newsContext: NewsArticle[] = [];
                    if (newsUrls && newsUrls.length > 0) {
                        // Extract keywords from user input for news search
                        const keywords = this.extractKeywords(userInput);
                        newsContext = await this.newsService.searchNews(keywords);
                    }

                    // Generate content variants
                    const variants = await this.contentService.generateContent(
                        userInput,
                        topicTemplates,
                        platformType as PlatformType,
                        newsContext
                    );

                    return JSON.stringify(variants, null, 2);
                } catch (error) {
                    throw new Error(`生成內容失敗: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        });
    }

    /**
     * Create refine_content tool
     * 
     * @returns DynamicStructuredTool for refining content
     * @private
     */
    private createRefineContentTool(): DynamicStructuredTool {
        return new DynamicStructuredTool({
            name: 'refine_content',
            description: '根據反饋精煉內容。使用此工具來改進已生成的內容，使其更符合使用者需求。',
            schema: z.object({
                contentId: z.string().describe('內容 ID'),
                feedback: z.string().min(10).describe('使用者反饋，至少 10 個字元')
            }),
            func: async ({ contentId, feedback }) => {
                try {
                    // Get original content from cache
                    const originalContent = await this.newsService.cacheManager.getCachedContent(contentId);

                    if (!originalContent) {
                        throw new Error(`找不到內容 ID: ${contentId}`);
                    }

                    // Refine content
                    const refined = await this.contentService.refineContent(
                        originalContent as ContentVariant,
                        feedback
                    );

                    return JSON.stringify(refined, null, 2);
                } catch (error) {
                    throw new Error(`精煉內容失敗: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        });
    }

    /**
     * Get tools for testing
     * 
     * @returns Array of tools
     */
    public getTools(): DynamicStructuredTool[] {
        return this.tools;
    }

    /**
     * Initialize the agent
     * 
     * Note: Full Agent implementation requires LangChain's createReactAgent or similar.
     * This is a placeholder that will be implemented when the correct LangChain API is determined.
     * 
     * @private
     */
    private async initializeAgent(): Promise<void> {
        if (this.agent) {
            return; // Already initialized
        }

        // TODO: Implement proper LangChain Agent initialization
        // The createAgent API from 'langchain' package doesn't exist in the current version
        // Need to use @langchain/langgraph or implement custom agent logic

        // For now, create a simple mock agent that can invoke tools
        this.agent = {
            invoke: async (input: { messages: Array<{ role: string; content: string }> }) => {
                // Simple mock implementation
                // In production, this would use LangChain's Agent framework
                return {
                    output: 'Agent execution not yet implemented',
                    messages: input.messages
                };
            }
        };
    }

    /**
     * Execute user task
     * 
     * Agent will automatically decide which tools to invoke
     * 
     * Note: This is a simplified implementation. Full Agent functionality
     * requires proper LangChain Agent setup with tool calling capabilities.
     * 
     * @param userRequest - User request in natural language
     * @returns Promise resolving to execution result
     */
    async executeTask(userRequest: string): Promise<any> {
        // Initialize agent if not already done
        await this.initializeAgent();

        if (!this.agent) {
            throw new Error('Agent initialization failed');
        }

        // Execute task using simplified agent
        const result = await this.agent.invoke({
            messages: [{ role: 'user', content: userRequest }]
        });

        return result;
    }

    /**
     * Extract keywords from user input
     * 
     * Simple implementation that extracts meaningful words
     * 
     * @param userInput - User input text
     * @returns Array of keywords
     * @private
     */
    private extractKeywords(userInput: string): string[] {
        // Simple keyword extraction: split by spaces and filter short words
        const words = userInput
            .split(/\s+/)
            .filter(word => word.length > 1)
            .slice(0, 5); // Limit to 5 keywords

        // If no keywords extracted, use a default
        return words.length > 0 ? words : ['司法'];
    }
}
