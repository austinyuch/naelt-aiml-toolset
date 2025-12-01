/**
 * Content Orchestrator
 * 
 * Coordinates all services for content generation workflow
 * Supports both traditional orchestration and LangChain Agent mode
 * Requirements: 3.1, 4.1, Design Document - Agent Orchestrator
 */

import { NewsSearchService } from './NewsSearchService.js';
import { ContentGenerationService } from './ContentGenerationService.js';
import { TemplateManagementService } from './TemplateManagementService.js';
import { NewsArticle, ContentVariant, PlatformType } from '../types/domain.js';
import { features } from '../config/features.js';
import { randomUUID } from 'crypto';

// Dynamic import for AgentOrchestrator to avoid loading LangChain when not needed
type AgentOrchestratorType = import('./AgentOrchestrator.js').AgentOrchestrator;

/**
 * Content generation request
 */
export interface ContentGenerationRequest {
  user_input: string;
  topic_templates: string[];
  platform_type: PlatformType;
  selected_news_urls: string[];
}

/**
 * Content generation response
 */
export interface ContentGenerationResponse {
  variants: ContentVariant[];
  generation_id: string;
}

/**
 * Content Orchestrator
 * 
 * Coordinates the complete content generation workflow:
 * 1. Search/fetch news articles
 * 2. Generate content variants
 * 3. Return results with metadata
 * 
 * Supports two modes:
 * - Traditional: Manual orchestration (default)
 * - Agent: LangChain Agent automatic orchestration (when FEATURE_LANGCHAIN_AGENT=true)
 */
export class ContentOrchestrator {
  public newsService: NewsSearchService;
  public contentService: ContentGenerationService;
  public templateService: TemplateManagementService;
  private agentOrchestrator?: AgentOrchestratorType;

  /**
   * Creates a new ContentOrchestrator
   * 
   * @param newsService - News search service
   * @param contentService - Content generation service
   * @param templateService - Template management service
   */
  constructor(
    newsService: NewsSearchService,
    contentService: ContentGenerationService,
    templateService: TemplateManagementService
  ) {
    this.newsService = newsService;
    this.contentService = contentService;
    this.templateService = templateService;

    // Agent Orchestrator will be initialized lazily when needed
  }

  /**
   * Orchestrate complete content generation workflow
   * 
   * Requirement 3.1: Orchestrate content generation within 30000ms
   * Requirement 4.1: Coordinate services for content generation
   * 
   * Supports two modes based on Feature Flag:
   * - Agent mode: Uses LangChain Agent for automatic orchestration
   * - Traditional mode: Manual orchestration (default)
   * 
   * @param request - Content generation request
   * @returns Promise resolving to content generation response
   * @throws Error if any service fails
   */
  async orchestrateContentGeneration(
    request: ContentGenerationRequest
  ): Promise<ContentGenerationResponse> {
    // Check if Agent mode is enabled
    if (features.useLangChainAgent && this.agentOrchestrator) {
      return this.orchestrateWithAgent(request);
    }

    // Traditional orchestration mode
    return this.orchestrateTraditional(request);
  }

  /**
   * Orchestrate using LangChain Agent
   * 
   * Agent automatically decides which tools to use and in what order
   * 
   * @param request - Content generation request
   * @returns Promise resolving to content generation response
   * @private
   */
  private async orchestrateWithAgent(
    request: ContentGenerationRequest
  ): Promise<ContentGenerationResponse> {
    // Lazy initialization of Agent Orchestrator
    if (!this.agentOrchestrator) {
      const { AgentOrchestrator } = await import('./AgentOrchestrator.js');
      this.agentOrchestrator = new AgentOrchestrator(
        this.newsService,
        this.contentService
      );
    }

    // Construct natural language request for the agent
    const agentRequest = this.buildAgentRequest(request);

    // Execute task using agent
    const result = await this.agentOrchestrator.executeTask(agentRequest);

    // Parse agent result and format response
    // Note: Agent returns structured data that we need to parse
    const variants = this.parseAgentResult(result);

    // Generate unique ID for this generation
    const generationId = randomUUID();

    // Add generation ID to each variant's metadata
    variants.forEach(variant => {
      variant.metadata = {
        ...variant.metadata,
        generation_id: generationId,
        content_id: `${generationId}_${variant.metadata.strategy}`,
        orchestration_mode: 'agent'
      };
    });

    return {
      variants,
      generation_id: generationId
    };
  }

  /**
   * Traditional orchestration (original implementation)
   * 
   * Manual step-by-step orchestration
   * 
   * @param request - Content generation request
   * @returns Promise resolving to content generation response
   * @private
   */
  private async orchestrateTraditional(
    request: ContentGenerationRequest
  ): Promise<ContentGenerationResponse> {
    // Step 1: Fetch news articles if URLs provided
    let newsContext: NewsArticle[] = [];

    if (request.selected_news_urls && request.selected_news_urls.length > 0) {
      // Extract keywords from user input for news search
      // In a real implementation, this would be more sophisticated
      const keywords = this.extractKeywords(request.user_input);
      newsContext = await this.newsService.searchNews(keywords);
    }

    // Step 2: Generate content variants
    const variants = await this.contentService.generateContent(
      request.user_input,
      request.topic_templates,
      request.platform_type,
      newsContext
    );

    // Step 3: Generate unique ID for this generation
    const generationId = randomUUID();

    // Step 4: Add generation ID to each variant's metadata
    variants.forEach(variant => {
      variant.metadata = {
        ...variant.metadata,
        generation_id: generationId,
        content_id: `${generationId}_${variant.metadata.strategy}`,
        orchestration_mode: 'traditional'
      };
    });

    // Step 5: Return response
    return {
      variants,
      generation_id: generationId
    };
  }

  /**
   * Build natural language request for agent
   * 
   * @param request - Content generation request
   * @returns Natural language request string
   * @private
   */
  private buildAgentRequest(request: ContentGenerationRequest): string {
    const topicStr = request.topic_templates.join('、');
    const platformStr = request.platform_type;

    let agentRequest = `請為以下主題生成 ${platformStr} 平台的論述內容：\n`;
    agentRequest += `主題：${topicStr}\n`;
    agentRequest += `使用者觀點：${request.user_input}\n`;

    if (request.selected_news_urls && request.selected_news_urls.length > 0) {
      agentRequest += `\n請先搜尋相關新聞作為背景資料。`;
    }

    return agentRequest;
  }

  /**
   * Parse agent execution result
   * 
   * @param result - Agent execution result
   * @returns Array of content variants
   * @private
   */
  private parseAgentResult(result: any): ContentVariant[] {
    // Agent result structure depends on LangChain implementation
    // This is a simplified parser
    try {
      // If result contains messages, extract the last message
      if (result.messages && Array.isArray(result.messages)) {
        const lastMessage = result.messages[result.messages.length - 1];
        if (lastMessage && lastMessage.content) {
          const parsed = JSON.parse(lastMessage.content);
          return Array.isArray(parsed) ? parsed : [parsed];
        }
      }

      // If result is already an array of variants
      if (Array.isArray(result)) {
        return result;
      }

      // If result is a single variant
      if (result.text && result.image_suggestion && result.hashtags) {
        return [result as ContentVariant];
      }

      throw new Error('Unable to parse agent result');
    } catch (error) {
      throw new Error(`Failed to parse agent result: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Extract keywords from user input
   * 
   * Simple implementation that extracts meaningful words
   * In production, this could use NLP techniques
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
