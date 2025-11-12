/**
 * MCP Server Tests
 * 
 * Tests for MCP server implementation
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { MCPServer } from '../../../src/mcp/server';
import { ContentOrchestrator } from '../../../src/services/ContentOrchestrator';
import { NewsSearchService } from '../../../src/services/NewsSearchService';
import { ContentGenerationService } from '../../../src/services/ContentGenerationService';
import { TemplateManagementService } from '../../../src/services/TemplateManagementService';
import { NewsAPIClient } from '../../../src/clients/NewsAPIClient';
import { BedrockClient } from '../../../src/clients/BedrockClient';
import { PromptBuilder } from '../../../src/prompts/PromptBuilder';
import { PromptTemplateLoader } from '../../../src/prompts/PromptTemplateLoader';
import { RateLimiter } from '../../../src/core/rateLimiter';
import { CacheManager } from '../../../src/core/cache';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

describe('MCPServer', () => {
  let mcpServer: MCPServer;
  let orchestrator: ContentOrchestrator;
  let newsService: NewsSearchService;
  let contentService: ContentGenerationService;
  let templateService: TemplateManagementService;

  beforeEach(() => {
    // Create mock clients
    const mockNewsClient = {
      search: jest.fn().mockResolvedValue([
        {
          title: 'Test News',
          source: 'Test Source',
          published_date: new Date(),
          url: 'https://example.com/news',
          summary: 'Test summary'
        }
      ])
    } as unknown as NewsAPIClient;

    const mockBedrockClient = {
      generateCompletion: jest.fn().mockImplementation((prompt: string) => {
        // Return different hashtag counts based on platform mentioned in prompt
        if (prompt.toLowerCase().includes('line')) {
          return Promise.resolve(JSON.stringify({
            text: 'Generated content for LINE',
            image_suggestion: 'Image description',
            hashtags: ['#test1', '#test2']
          }));
        } else if (prompt.toLowerCase().includes('facebook')) {
          return Promise.resolve(JSON.stringify({
            text: 'Generated content for Facebook',
            image_suggestion: 'Image description',
            hashtags: ['#test1', '#test2']
          }));
        }
        // Default for Instagram
        return Promise.resolve(JSON.stringify({
          text: 'Generated content',
          image_suggestion: 'Image description',
          hashtags: ['#test1', '#test2', '#test3', '#test4', '#test5']
        }));
      })
    } as unknown as BedrockClient;

    // Create services
    const cacheManager = new CacheManager('.cache-test');
    const rateLimiter = new RateLimiter();
    const templateLoader = new PromptTemplateLoader('./prompts');
    const promptBuilder = new PromptBuilder(templateLoader);

    newsService = new NewsSearchService(mockNewsClient, cacheManager);
    contentService = new ContentGenerationService(mockBedrockClient, promptBuilder, rateLimiter);
    templateService = new TemplateManagementService();

    orchestrator = new ContentOrchestrator(newsService, contentService, templateService);

    // Create MCP server
    mcpServer = new MCPServer(orchestrator);
  });

  describe('Constructor', () => {
    /**
     * Requirement 6.5: Expose MCP endpoint for tool discovery and invocation
     */
    it('should create MCP server with correct configuration', () => {
      expect(mcpServer).toBeDefined();
      expect(mcpServer['server']).toBeDefined();
      expect(mcpServer['orchestrator']).toBe(orchestrator);
    });

    it('should initialize with correct server info', () => {
      const serverInfo = mcpServer.getServerInfo();
      expect(serverInfo.name).toBe('advocacy-content-generator');
      expect(serverInfo.version).toBe('1.0.0');
    });
  });

  describe('Tool Definitions', () => {
    /**
     * Requirement 6.1: Implement MCP_Tool named search_news
     * Requirement 6.2: Implement MCP_Tool named generate_content
     * Requirement 6.3: Implement MCP_Tool named refine_content
     * Requirement 6.4: Provide tool descriptions and parameter schemas
     */
    it('should define search_news tool', async () => {
      const tools = await mcpServer.listTools();
      
      const searchNewsTool = tools.find((t: Tool) => t.name === 'search_news');
      expect(searchNewsTool).toBeDefined();
      expect(searchNewsTool?.description).toContain('搜尋新聞');
      expect(searchNewsTool?.inputSchema).toBeDefined();
      expect(searchNewsTool?.inputSchema.properties).toHaveProperty('keywords');
      expect(searchNewsTool?.inputSchema.required).toContain('keywords');
    });

    it('should define generate_content tool', async () => {
      const tools = await mcpServer.listTools();
      
      const generateContentTool = tools.find((t: Tool) => t.name === 'generate_content');
      expect(generateContentTool).toBeDefined();
      expect(generateContentTool?.description).toContain('生成論述內容');
      expect(generateContentTool?.inputSchema).toBeDefined();
      expect(generateContentTool?.inputSchema.properties).toHaveProperty('user_input');
      expect(generateContentTool?.inputSchema.properties).toHaveProperty('topic_templates');
      expect(generateContentTool?.inputSchema.properties).toHaveProperty('platform_type');
      expect(generateContentTool?.inputSchema.required).toContain('user_input');
      expect(generateContentTool?.inputSchema.required).toContain('topic_templates');
      expect(generateContentTool?.inputSchema.required).toContain('platform_type');
    });

    it('should define refine_content tool', async () => {
      const tools = await mcpServer.listTools();
      
      const refineContentTool = tools.find((t: Tool) => t.name === 'refine_content');
      expect(refineContentTool).toBeDefined();
      expect(refineContentTool?.description).toContain('精煉內容');
      expect(refineContentTool?.inputSchema).toBeDefined();
      expect(refineContentTool?.inputSchema.properties).toHaveProperty('content_id');
      expect(refineContentTool?.inputSchema.properties).toHaveProperty('feedback');
      expect(refineContentTool?.inputSchema.required).toContain('content_id');
      expect(refineContentTool?.inputSchema.required).toContain('feedback');
    });

    it('should define exactly 3 tools', async () => {
      const tools = await mcpServer.listTools();
      expect(tools).toHaveLength(3);
    });
  });

  describe('Tool Execution - search_news', () => {
    /**
     * Requirement 6.1: Implement MCP_Tool named search_news for news searching functionality
     */
    it('should execute search_news tool successfully', async () => {
      const result = await mcpServer.callTool('search_news', {
        keywords: ['司法', '受害者']
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const parsedResult = JSON.parse(result.content[0].text);
      expect(Array.isArray(parsedResult)).toBe(true);
      expect(parsedResult.length).toBeGreaterThan(0);
      expect(parsedResult[0]).toHaveProperty('title');
      expect(parsedResult[0]).toHaveProperty('source');
      expect(parsedResult[0]).toHaveProperty('url');
    });

    it('should handle search_news with single keyword', async () => {
      const result = await mcpServer.callTool('search_news', {
        keywords: ['司法']
      });

      expect(result).toBeDefined();
      const parsedResult = JSON.parse(result.content[0].text);
      expect(Array.isArray(parsedResult)).toBe(true);
    });

    it('should throw error for search_news with empty keywords', async () => {
      await expect(
        mcpServer.callTool('search_news', { keywords: [] })
      ).rejects.toThrow();
    });
  });

  describe('Tool Execution - generate_content', () => {
    /**
     * Requirement 6.2: Implement MCP_Tool named generate_content for content generation functionality
     */
    it('should execute generate_content tool successfully', async () => {
      const result = await mcpServer.callTool('generate_content', {
        user_input: '我認為應該重視受害者權益',
        topic_templates: ['victim_rights'],
        platform_type: 'instagram',
        selected_news_urls: []
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult).toHaveProperty('variants');
      expect(parsedResult).toHaveProperty('generation_id');
      expect(Array.isArray(parsedResult.variants)).toBe(true);
      expect(parsedResult.variants.length).toBe(3);
    });

    it('should generate content for facebook platform', async () => {
      const result = await mcpServer.callTool('generate_content', {
        user_input: '司法改革刻不容緩',
        topic_templates: ['judicial_injustice'],
        platform_type: 'facebook',
        selected_news_urls: []
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.variants).toHaveLength(3);
      parsedResult.variants.forEach((variant: any) => {
        expect(variant.metadata.platform).toBe('facebook');
      });
    });

    it('should generate content for line platform', async () => {
      const result = await mcpServer.callTool('generate_content', {
        user_input: '反對廢死',
        topic_templates: ['anti_death_penalty'],
        platform_type: 'line',
        selected_news_urls: []
      });

      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.variants).toHaveLength(3);
      parsedResult.variants.forEach((variant: any) => {
        expect(variant.metadata.platform).toBe('line');
      });
    });

    it('should throw error for generate_content with empty user_input', async () => {
      await expect(
        mcpServer.callTool('generate_content', {
          user_input: '',
          topic_templates: ['victim_rights'],
          platform_type: 'instagram',
          selected_news_urls: []
        })
      ).rejects.toThrow();
    });

    it('should throw error for generate_content with invalid platform', async () => {
      await expect(
        mcpServer.callTool('generate_content', {
          user_input: '測試',
          topic_templates: ['victim_rights'],
          platform_type: 'invalid_platform',
          selected_news_urls: []
        })
      ).rejects.toThrow();
    });
  });

  describe('Tool Execution - refine_content', () => {
    /**
     * Requirement 6.3: Implement MCP_Tool named refine_content for content refinement functionality
     */
    it('should execute refine_content tool successfully', async () => {
      // First generate content to get a content_id
      const generateResult = await mcpServer.callTool('generate_content', {
        user_input: '測試內容',
        topic_templates: ['victim_rights'],
        platform_type: 'instagram',
        selected_news_urls: []
      });

      const generatedContent = JSON.parse(generateResult.content[0].text);
      const contentId = generatedContent.variants[0].metadata.content_id;

      // Now refine the content
      const result = await mcpServer.callTool('refine_content', {
        content_id: contentId,
        feedback: '請讓語氣更溫和一些，並增加更多數據支持'
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult).toHaveProperty('text');
      expect(parsedResult).toHaveProperty('image_suggestion');
      expect(parsedResult).toHaveProperty('hashtags');
      expect(parsedResult.metadata).toHaveProperty('refined_at');
      expect(parsedResult.metadata).toHaveProperty('feedback');
    });

    it('should throw error for refine_content with short feedback', async () => {
      await expect(
        mcpServer.callTool('refine_content', {
          content_id: 'test_id',
          feedback: '太短'
        })
      ).rejects.toThrow();
    });

    it('should throw error for refine_content with empty feedback', async () => {
      await expect(
        mcpServer.callTool('refine_content', {
          content_id: 'test_id',
          feedback: ''
        })
      ).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should throw error for unknown tool', async () => {
      await expect(
        mcpServer.callTool('unknown_tool', {})
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });

    it('should handle service errors gracefully', async () => {
      // Create orchestrator with failing service
      const failingNewsClient = {
        search: jest.fn().mockRejectedValue(new Error('API Error'))
      } as unknown as NewsAPIClient;

      const failingNewsService = new NewsSearchService(
        failingNewsClient,
        new CacheManager('.cache-test')
      );

      const failingOrchestrator = new ContentOrchestrator(
        failingNewsService,
        contentService,
        templateService
      );

      const failingMcpServer = new MCPServer(failingOrchestrator);

      await expect(
        failingMcpServer.callTool('search_news', { keywords: ['test'] })
      ).rejects.toThrow();
    });
  });

  describe('Integration with ContentOrchestrator', () => {
    /**
     * Verify that MCP tools use the same business logic as Express API
     */
    it('should use shared ContentOrchestrator for generate_content', async () => {
      const orchestrateSpy = jest.spyOn(orchestrator, 'orchestrateContentGeneration');

      await mcpServer.callTool('generate_content', {
        user_input: '測試',
        topic_templates: ['victim_rights'],
        platform_type: 'instagram',
        selected_news_urls: []
      });

      expect(orchestrateSpy).toHaveBeenCalledWith({
        user_input: '測試',
        topic_templates: ['victim_rights'],
        platform_type: 'instagram',
        selected_news_urls: []
      });
    });

    it('should use shared NewsSearchService for search_news', async () => {
      const searchSpy = jest.spyOn(newsService, 'searchNews');

      await mcpServer.callTool('search_news', {
        keywords: ['司法', '改革']
      });

      expect(searchSpy).toHaveBeenCalledWith(['司法', '改革']);
    });

    it('should use shared ContentGenerationService for refine_content', async () => {
      const refineSpy = jest.spyOn(contentService, 'refineContent');

      // Create a mock content variant
      const mockContent = {
        text: 'Test content',
        image_suggestion: 'Test image',
        hashtags: ['#test'],
        metadata: { content_id: 'test_123' }
      };

      await mcpServer.callTool('refine_content', {
        content_id: 'test_123',
        feedback: '請改進內容品質，讓語氣更溫和一些'
      });

      expect(refineSpy).toHaveBeenCalled();
    });
  });
});
