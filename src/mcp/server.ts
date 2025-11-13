/**
 * MCP Server Implementation
 * 
 * Implements Model Context Protocol server for advocacy content generation
 * Supports both stdio and streamable-http transports
 * Requirements: 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import express, { Express, Request, Response } from 'express';
import { Server } from 'http';
import { ContentOrchestrator } from '../services/ContentOrchestrator.js';
import { ContentVariant } from '../types/domain.js';
import { log } from '../core/logger.js';
import { z } from 'zod';

/**
 * MCP Server for Advocacy Content Generator
 * 
 * Provides MCP tools for:
 * - search_news: Search for news articles
 * - generate_content: Generate advocacy content
 * - refine_content: Refine existing content
 * 
 * Supports two transport modes:
 * - stdio: For local development and testing
 * - streamable-http: For AgentCore Runtime deployment
 */
export class MCPServer {
  private server: McpServer;
  private orchestrator: ContentOrchestrator;
  private app?: Express;

  /**
   * Creates a new MCP Server
   * 
   * Requirement 2.1: Support streamable-http transport
   * Requirement 6.5: Expose MCP endpoint for tool discovery and invocation
   * 
   * @param orchestrator - Content orchestrator for business logic
   */
  constructor(orchestrator: ContentOrchestrator) {
    this.orchestrator = orchestrator;

    // Initialize MCP server with server info
    // Requirement 2.1: Use McpServer class for MCP protocol
    this.server = new McpServer({
      name: 'advocacy-content-generator',
      version: '1.0.0'
    });

    this.setupTools();
  }

  /**
   * Setup MCP tools using registerTool API
   * 
   * Requirement 2.1: Register tools using McpServer.registerTool()
   * Requirement 6.4: Provide tool descriptions and parameter schemas following MCP specification
   * 
   * @private
   */
  private setupTools(): void {
    // Register search_news tool
    // Requirement 6.1: Implement MCP_Tool named search_news
    this.server.registerTool(
      'search_news',
      {
        title: 'News Search',
        description: '搜尋新聞文章，用於為內容生成提供事實依據',
        inputSchema: {
          keywords: z.array(z.string()).min(1).max(10).describe('搜尋關鍵字（1-10個）')
        },
        outputSchema: {
          results: z.array(z.object({
            title: z.string(),
            source: z.string(),
            published_date: z.string(),
            url: z.string(),
            summary: z.string()
          })),
          total: z.number()
        }
      },
      async ({ keywords }) => {
        const articles = await this.orchestrator.newsService.searchNews(keywords);
        // Convert Date objects to ISO strings for MCP protocol compliance
        const serializedArticles = articles.map(article => ({
          ...article,
          published_date: article.published_date instanceof Date
            ? article.published_date.toISOString()
            : article.published_date
        }));
        const result = {
          results: serializedArticles,
          total: serializedArticles.length
        };
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result as unknown as { [x: string]: unknown }
        };
      }
    );

    // Register generate_content tool
    // Requirement 6.2: Implement MCP_Tool named generate_content
    this.server.registerTool(
      'generate_content',
      {
        title: 'Content Generation',
        description: '生成論述內容，針對不同平台和主題產出適合的倡議內容',
        inputSchema: {
          user_input: z.string().describe('使用者的觀點和方向'),
          topic_templates: z.array(z.string()).describe('主題模板（victim_rights, anti_death_penalty, judicial_injustice）'),
          platform_type: z.enum(['instagram', 'facebook', 'line']).describe('目標平台類型'),
          selected_news_urls: z.array(z.string().url()).optional().default([]).describe('選定的新聞URL（可選）')
        },
        outputSchema: {
          variants: z.array(z.object({
            text: z.string(),
            image_suggestion: z.string(),
            hashtags: z.array(z.string())
          })),
          generation_id: z.string()
        }
      },
      async (args) => {
        const result = await this.orchestrator.orchestrateContentGeneration(args);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result as unknown as { [x: string]: unknown }
        };
      }
    );

    // Register refine_content tool
    // Requirement 6.3: Implement MCP_Tool named refine_content
    this.server.registerTool(
      'refine_content',
      {
        title: 'Content Refinement',
        description: '精煉內容，根據使用者反饋改進已生成的內容',
        inputSchema: {
          content_id: z.string().describe('要精煉的內容ID'),
          feedback: z.string().min(10).describe('使用者反饋（至少10個字元）')
        },
        outputSchema: {
          text: z.string(),
          image_suggestion: z.string(),
          hashtags: z.array(z.string())
        }
      },
      async ({ content_id, feedback }) => {
        // For refinement, we need to retrieve the original content
        // In a real implementation, this would fetch from cache or database
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

        const result = await this.orchestrator.contentService.refineContent(
          mockOriginalContent,
          feedback
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result as unknown as { [x: string]: unknown }
        };
      }
    );
  }

  /**
   * Setup Express app for HTTP transport
   * 
   * Requirement 2.2: Integrate Express.js to handle /mcp endpoint
   * Requirement 2.4: Listen on 0.0.0.0:8000/mcp
   * 
   * @private
   */
  private setupExpressApp(): void {
    this.app = express();
    this.app.use(express.json());

    // MCP endpoint
    // Requirement 2.2: Handle MCP requests at /mcp path
    this.app.post('/mcp', async (req: Request, res: Response) => {
      try {
        // Create a new transport for each request to prevent ID collisions
        // Requirement 2.5: Support stateless HTTP request handling
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true
        });

        // Clean up transport when response is closed
        res.on('close', () => {
          transport.close();
        });

        // Connect server to transport
        await this.server.connect(transport);

        // Handle the request
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        log.error('Error handling MCP request', { error });
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'Internal server error',
              data: { error: String(error) }
            }
          });
        }
      }
    });

    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        service: 'advocacy-content-generator',
        version: '1.0.0',
        transport: 'streamable-http'
      });
    });
  }

  /**
   * Start MCP server with stdio transport
   * 
   * Requirement 2.3: Preserve stdio transport for local development
   * 
   * @returns Promise that resolves when server is started
   */
  async startStdio(): Promise<void> {
    log.info('Starting MCP Server with stdio transport...');
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    log.info('MCP Server started on stdio');
  }

  /**
   * Start MCP server with HTTP transport
   * 
   * Requirement 2.2: Use streamable-http transport for production
   * Requirement 2.4: Listen on specified host and port
   * 
   * @param port - Port to listen on (default: 8000)
   * @param host - Host to bind to (default: 0.0.0.0)
   * @returns Promise that resolves to HTTP server instance for graceful shutdown
   */
  async startHttp(port: number = 8000, host: string = '0.0.0.0'): Promise<Server> {
    log.info('Starting MCP Server with HTTP transport...', { port, host });

    // Setup Express app if not already done
    if (!this.app) {
      this.setupExpressApp();
    }

    return new Promise<Server>((resolve, reject) => {
      const server = this.app!.listen(port, host, () => {
        log.info(`MCP Server listening on ${host}:${port}/mcp`, {
          host,
          port,
          mcp_url: `http://${host}:${port}/mcp`,
          health_url: `http://${host}:${port}/health`
        });
        resolve(server);
      }).on('error', (error) => {
        log.error('Error starting MCP HTTP server', { error });
        reject(error);
      });
    });
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
    // The actual tool execution is handled by the registered handlers
    // For testing, we need to manually invoke them
    // This is a simplified version for testing purposes
    switch (name) {
      case 'search_news': {
        const result = await this.orchestrator.newsService.searchNews(args.keywords);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result as unknown as { [x: string]: unknown }
        };
      }

      case 'generate_content': {
        const result = await this.orchestrator.orchestrateContentGeneration(args);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result as unknown as { [x: string]: unknown }
        };
      }

      case 'refine_content': {
        const mockOriginalContent: ContentVariant = {
          text: 'Original content',
          image_suggestion: 'Original image',
          hashtags: ['#original'],
          metadata: {
            content_id: args.content_id,
            platform: 'instagram',
            topic: 'victim_rights',
            strategy: 'rational_analysis'
          }
        };

        const result = await this.orchestrator.contentService.refineContent(
          mockOriginalContent,
          args.feedback
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          structuredContent: result as unknown as { [x: string]: unknown }
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Get tool definitions (for testing)
   * 
   * @returns Array of tool definitions
   */
  getToolDefinitions(): Tool[] {
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
}
