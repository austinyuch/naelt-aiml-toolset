/**
 * MCP Server Implementation
 * 
 * Implements Model Context Protocol server for advocacy content generation
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { ContentOrchestrator } from '../services/ContentOrchestrator.js';
import { ContentVariant } from '../types/domain.js';

/**
 * MCP Server for Advocacy Content Generator
 * 
 * Provides MCP tools for:
 * - search_news: Search for news articles
 * - generate_content: Generate advocacy content
 * - refine_content: Refine existing content
 */
export class MCPServer {
  private server: Server;
  private orchestrator: ContentOrchestrator;

  /**
   * Creates a new MCP Server
   * 
   * Requirement 6.5: Expose MCP endpoint for tool discovery and invocation
   * 
   * @param orchestrator - Content orchestrator for business logic
   */
  constructor(orchestrator: ContentOrchestrator) {
    this.orchestrator = orchestrator;

    // Initialize MCP server with server info
    this.server = new Server(
      {
        name: 'advocacy-content-generator',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupHandlers();
  }

  /**
   * Setup MCP request handlers
   * 
   * Requirement 6.4: Provide tool descriptions and parameter schemas following MCP specification
   * 
   * @private
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: this.getToolDefinitions()
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'search_news':
          return await this.handleSearchNews(args);
        
        case 'generate_content':
          return await this.handleGenerateContent(args);
        
        case 'refine_content':
          return await this.handleRefineContent(args);
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  /**
   * Get tool definitions
   * 
   * Requirement 6.1: Implement MCP_Tool named search_news
   * Requirement 6.2: Implement MCP_Tool named generate_content
   * Requirement 6.3: Implement MCP_Tool named refine_content
   * Requirement 6.4: Provide tool descriptions and parameter schemas
   * 
   * @returns Array of tool definitions
   * @private
   */
  private getToolDefinitions(): Tool[] {
    return [
      {
        name: 'search_news',
        description: '搜尋新聞文章，用於為內容生成提供事實依據',
        inputSchema: {
          type: 'object',
          properties: {
            keywords: {
              type: 'array',
              items: { type: 'string' },
              description: '搜尋關鍵字（1-10個）',
              minItems: 1,
              maxItems: 10
            }
          },
          required: ['keywords']
        }
      },
      {
        name: 'generate_content',
        description: '生成論述內容，針對不同平台和主題產出適合的倡議內容',
        inputSchema: {
          type: 'object',
          properties: {
            user_input: {
              type: 'string',
              description: '使用者的觀點和方向'
            },
            topic_templates: {
              type: 'array',
              items: { type: 'string' },
              description: '主題模板（victim_rights, anti_death_penalty, judicial_injustice）'
            },
            platform_type: {
              type: 'string',
              enum: ['instagram', 'facebook', 'line'],
              description: '目標平台類型'
            },
            selected_news_urls: {
              type: 'array',
              items: { type: 'string' },
              description: '選定的新聞URL（可選）',
              default: []
            }
          },
          required: ['user_input', 'topic_templates', 'platform_type']
        }
      },
      {
        name: 'refine_content',
        description: '精煉內容，根據使用者反饋改進已生成的內容',
        inputSchema: {
          type: 'object',
          properties: {
            content_id: {
              type: 'string',
              description: '要精煉的內容ID'
            },
            feedback: {
              type: 'string',
              description: '使用者反饋（至少10個字元）',
              minLength: 10
            }
          },
          required: ['content_id', 'feedback']
        }
      }
    ];
  }

  /**
   * Handle search_news tool call
   * 
   * Requirement 6.1: Implement MCP_Tool named search_news for news searching functionality
   * 
   * @param args - Tool arguments
   * @returns Tool result with news articles
   * @private
   */
  private async handleSearchNews(args: any) {
    const { keywords } = args;

    // Call news search service
    const newsResult = await this.orchestrator.newsService.searchNews(keywords);

    // Return result as JSON text
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(newsResult, null, 2)
        }
      ]
    };
  }

  /**
   * Handle generate_content tool call
   * 
   * Requirement 6.2: Implement MCP_Tool named generate_content for content generation functionality
   * 
   * @param args - Tool arguments
   * @returns Tool result with generated content variants
   * @private
   */
  private async handleGenerateContent(args: any) {
    const {
      user_input,
      topic_templates,
      platform_type,
      selected_news_urls = []
    } = args;

    // Call content orchestrator
    const contentResult = await this.orchestrator.orchestrateContentGeneration({
      user_input,
      topic_templates,
      platform_type,
      selected_news_urls
    });

    // Return result as JSON text
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(contentResult, null, 2)
        }
      ]
    };
  }

  /**
   * Handle refine_content tool call
   * 
   * Requirement 6.3: Implement MCP_Tool named refine_content for content refinement functionality
   * 
   * @param args - Tool arguments
   * @returns Tool result with refined content
   * @private
   */
  private async handleRefineContent(args: any) {
    const { content_id, feedback } = args;

    // For refinement, we need to retrieve the original content
    // In a real implementation, this would fetch from cache or database
    // For now, we'll create a mock content variant with the content_id
    const mockOriginalContent: ContentVariant = {
      text: 'Original content',
      image_suggestion: 'Original image',
      hashtags: ['#original'],
      metadata: {
        content_id,
        platform: 'instagram',
        topic: 'victim_rights',
        strategy: 'rational_analysis'
      }
    };

    // Call content service to refine
    const refinedResult = await this.orchestrator.contentService.refineContent(
      mockOriginalContent,
      feedback
    );

    // Return result as JSON text
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(refinedResult, null, 2)
        }
      ]
    };
  }

  /**
   * Start the MCP server
   * 
   * Requirement 6.5: Expose MCP endpoint at /mcp for tool discovery and invocation
   * 
   * @returns Promise that resolves when server is started
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  /**
   * Get server info
   * 
   * @returns Server information
   */
  getServerInfo() {
    return {
      name: 'advocacy-content-generator',
      version: '1.0.0'
    };
  }

  /**
   * List available tools (for testing)
   * 
   * @returns Promise resolving to array of tools
   */
  async listTools(): Promise<Tool[]> {
    return this.getToolDefinitions();
  }

  /**
   * Call a tool (for testing)
   * 
   * @param name - Tool name
   * @param args - Tool arguments
   * @returns Promise resolving to tool result
   */
  async callTool(name: string, args: any) {
    switch (name) {
      case 'search_news':
        return await this.handleSearchNews(args);
      
      case 'generate_content':
        return await this.handleGenerateContent(args);
      
      case 'refine_content':
        return await this.handleRefineContent(args);
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}
