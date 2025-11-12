/**
 * MCP Integration Tests
 * 
 * These tests verify the MCP server functionality using the @modelcontextprotocol/sdk.
 * They test tool discovery, invocation, and integration with business logic.
 * 
 * Requirements tested:
 * - 6.1: search_news tool
 * - 6.2: generate_content tool
 * - 6.3: refine_content tool
 * - 6.4: Tool descriptions and parameter schemas
 * - 6.5: MCP endpoint functionality
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

describe('MCP Integration Tests', () => {
  let client: Client;
  let serverProcess: ChildProcess;
  let transport: StdioClientTransport;

  beforeAll(async () => {
    // Start MCP server process
    const serverPath = path.join(__dirname, '../../dist/index.js');
    
    serverProcess = spawn('node', [serverPath], {
      env: {
        ...process.env,
        SERVICE_MODE: 'mcp-only',
        AWS_REGION: 'us-east-1',
        LOG_LEVEL: 'error' // Reduce noise in tests
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create transport
    transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
      env: {
        SERVICE_MODE: 'mcp-only',
        AWS_REGION: 'us-east-1',
        LOG_LEVEL: 'error'
      }
    });

    // Create client
    client = new Client(
      {
        name: 'test-mcp-client',
        version: '1.0.0'
      },
      {
        capabilities: {}
      }
    );

    // Connect to server
    await client.connect(transport);
  }, 30000);

  afterAll(async () => {
    // Cleanup
    if (client) {
      await client.close();
    }
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  describe('Tool Discovery', () => {
    it('should list available tools', async () => {
      const response = await client.listTools();

      expect(response.tools).toBeDefined();
      expect(Array.isArray(response.tools)).toBe(true);
      expect(response.tools.length).toBeGreaterThan(0);

      // Verify tool names
      const toolNames = response.tools.map(t => t.name);
      expect(toolNames).toContain('search_news');
      expect(toolNames).toContain('generate_content');
      expect(toolNames).toContain('refine_content');
    });

    it('should provide tool descriptions', async () => {
      const response = await client.listTools();

      response.tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.description).toBeTruthy();
      });
    });

    it('should define input schemas for all tools', async () => {
      const response = await client.listTools();

      response.tools.forEach(tool => {
        expect(tool.inputSchema).toHaveProperty('type', 'object');
        expect(tool.inputSchema).toHaveProperty('properties');
        expect(tool.inputSchema).toHaveProperty('required');
      });
    });
  });

  describe('search_news Tool', () => {
    it('should search news successfully', async () => {
      const result = await client.callTool({
        name: 'search_news',
        arguments: {
          keywords: ['司法改革', '受害者權益']
        }
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect((result.content as any[]).length).toBeGreaterThan(0);

      // Parse result
      const data = JSON.parse((result.content as any[])[0].text);
      expect(data).toHaveProperty('results');
      expect(Array.isArray(data.results)).toBe(true);
      expect(data).toHaveProperty('total');

      // Verify result structure
      if (data.results.length > 0) {
        const firstResult = data.results[0];
        expect(firstResult).toHaveProperty('title');
        expect(firstResult).toHaveProperty('source');
        expect(firstResult).toHaveProperty('published_date');
        expect(firstResult).toHaveProperty('url');
        expect(firstResult).toHaveProperty('summary');
      }
    }, 15000);

    it('should validate keywords parameter', async () => {
      await expect(
        client.callTool({
          name: 'search_news',
          arguments: {
            keywords: []
          }
        })
      ).rejects.toThrow();
    });

    it('should handle missing keywords parameter', async () => {
      await expect(
        client.callTool({
          name: 'search_news',
          arguments: {}
        })
      ).rejects.toThrow();
    });

    it('should limit keywords to 10', async () => {
      const keywords = Array(11).fill('test');
      
      await expect(
        client.callTool({
          name: 'search_news',
          arguments: { keywords }
        })
      ).rejects.toThrow();
    });
  });

  describe('generate_content Tool', () => {
    it('should generate content successfully', async () => {
      const result = await client.callTool({
        name: 'generate_content',
        arguments: {
          user_input: '我認為應該加強受害者權益保護',
          topic_templates: ['victim_rights'],
          platform_type: 'instagram',
          selected_news_urls: []
        }
      });

      expect(result.content).toBeDefined();
      expect((result.content as any[]).length).toBeGreaterThan(0);

      // Parse result
      const data = JSON.parse((result.content as any[])[0].text);
      expect(data).toHaveProperty('variants');
      expect(Array.isArray(data.variants)).toBe(true);
      expect(data.variants.length).toBe(3);
      expect(data).toHaveProperty('generation_id');

      // Verify variant structure
      const firstVariant = data.variants[0];
      expect(firstVariant).toHaveProperty('text');
      expect(firstVariant).toHaveProperty('image_suggestion');
      expect(firstVariant).toHaveProperty('hashtags');
      expect(Array.isArray(firstVariant.hashtags)).toBe(true);
      expect(firstVariant).toHaveProperty('metadata');
    }, 60000);

    it('should validate required parameters', async () => {
      await expect(
        client.callTool({
          name: 'generate_content',
          arguments: {}
        })
      ).rejects.toThrow();
    });

    it('should validate platform_type', async () => {
      await expect(
        client.callTool({
          name: 'generate_content',
          arguments: {
            user_input: 'test',
            topic_templates: ['victim_rights'],
            platform_type: 'invalid_platform',
            selected_news_urls: []
          }
        })
      ).rejects.toThrow();
    });

    it('should validate topic_templates', async () => {
      await expect(
        client.callTool({
          name: 'generate_content',
          arguments: {
            user_input: 'test',
            topic_templates: ['invalid_template'],
            platform_type: 'instagram',
            selected_news_urls: []
          }
        })
      ).rejects.toThrow();
    });

    it('should generate content for different platforms', async () => {
      const platforms = ['instagram', 'facebook', 'line'];

      for (const platform of platforms) {
        const result = await client.callTool({
          name: 'generate_content',
          arguments: {
            user_input: '測試內容生成',
            topic_templates: ['victim_rights'],
            platform_type: platform,
            selected_news_urls: []
          }
        });

        const data = JSON.parse((result.content as any[])[0].text);
        expect(data.variants).toHaveLength(3);

        // Verify platform-specific constraints
        const firstVariant = data.variants[0];
        if (platform === 'instagram') {
          expect(firstVariant.hashtags.length).toBeGreaterThanOrEqual(5);
          expect(firstVariant.hashtags.length).toBeLessThanOrEqual(15);
        } else if (platform === 'facebook') {
          expect(firstVariant.text.length).toBeLessThanOrEqual(2000);
        } else if (platform === 'line') {
          expect(firstVariant.text.length).toBeLessThanOrEqual(200);
        }
      }
    }, 180000);
  });

  describe('refine_content Tool', () => {
    let generationId: string;

    beforeAll(async () => {
      // Generate content first
      const result = await client.callTool({
        name: 'generate_content',
        arguments: {
          user_input: '測試內容',
          topic_templates: ['victim_rights'],
          platform_type: 'instagram',
          selected_news_urls: []
        }
      });

      const data = JSON.parse((result.content as any[])[0].text);
      generationId = data.generation_id;
    }, 60000);

    it('should refine content successfully', async () => {
      const result = await client.callTool({
        name: 'refine_content',
        arguments: {
          content_id: generationId,
          feedback: '請加強情感共鳴的部分，並增加具體的行動建議'
        }
      });

      expect(result.content).toBeDefined();
      expect((result.content as any[]).length).toBeGreaterThan(0);

      // Parse result
      const data = JSON.parse((result.content as any[])[0].text);
      expect(data).toHaveProperty('text');
      expect(data).toHaveProperty('image_suggestion');
      expect(data).toHaveProperty('hashtags');
      expect(data).toHaveProperty('metadata');
      expect(data.metadata).toHaveProperty('refinement_count');
    }, 60000);

    it('should validate feedback length', async () => {
      await expect(
        client.callTool({
          name: 'refine_content',
          arguments: {
            content_id: generationId,
            feedback: 'short'
          }
        })
      ).rejects.toThrow();
    });

    it('should enforce rate limit (5 per hour)', async () => {
      const testContentId = 'test_rate_limit_' + Date.now();

      // Make 5 requests (should succeed)
      for (let i = 0; i < 5; i++) {
        await client.callTool({
          name: 'refine_content',
          arguments: {
            content_id: testContentId,
            feedback: '測試速率限制 ' + i
          }
        });
      }

      // 6th request should fail
      await expect(
        client.callTool({
          name: 'refine_content',
          arguments: {
            content_id: testContentId,
            feedback: '測試速率限制 - 應該失敗'
          }
        })
      ).rejects.toThrow();
    }, 300000);
  });

  describe('Complete MCP Workflow', () => {
    it('should complete full workflow using MCP tools', async () => {
      // Step 1: Search news
      const newsResult = await client.callTool({
        name: 'search_news',
        arguments: {
          keywords: ['司法改革', '受害者權益']
        }
      });

      const newsData = JSON.parse((newsResult.content as any[])[0].text);
      expect(newsData.results.length).toBeGreaterThan(0);
      const newsUrls = newsData.results.slice(0, 3).map((n: any) => n.url);

      // Step 2: Generate content
      const contentResult = await client.callTool({
        name: 'generate_content',
        arguments: {
          user_input: '我認為應該加強受害者權益保護，確保他們在司法程序中的聲音被聽見',
          topic_templates: ['victim_rights'],
          platform_type: 'instagram',
          selected_news_urls: newsUrls
        }
      });

      const contentData = JSON.parse((contentResult.content as any[])[0].text);
      expect(contentData.variants).toHaveLength(3);
      const generationId = contentData.generation_id;

      // Step 3: Refine content
      const refineResult = await client.callTool({
        name: 'refine_content',
        arguments: {
          content_id: generationId,
          feedback: '請加強情感共鳴，並增加具體行動建議'
        }
      });

      const refineData = JSON.parse((refineResult.content as any[])[0].text);
      expect(refineData.text).toBeTruthy();
      expect(refineData.metadata.refinement_count).toBe(1);
    }, 180000);
  });

  describe('Error Handling', () => {
    it('should handle unknown tool names', async () => {
      await expect(
        client.callTool({
          name: 'unknown_tool',
          arguments: {}
        })
      ).rejects.toThrow();
    });

    it('should handle invalid arguments', async () => {
      await expect(
        client.callTool({
          name: 'search_news',
          arguments: {
            invalid_param: 'value'
          }
        })
      ).rejects.toThrow();
    });

    it('should provide meaningful error messages', async () => {
      try {
        await client.callTool({
          name: 'search_news',
          arguments: {}
        });
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBeTruthy();
        expect(error.message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Tool Schema Validation', () => {
    it('should have correct schema for search_news', async () => {
      const response = await client.listTools();
      const searchNewsTool = response.tools.find(t => t.name === 'search_news');

      expect(searchNewsTool).toBeDefined();
      expect(searchNewsTool!.inputSchema.properties).toHaveProperty('keywords');
      expect(searchNewsTool!.inputSchema.required).toContain('keywords');
    });

    it('should have correct schema for generate_content', async () => {
      const response = await client.listTools();
      const generateTool = response.tools.find(t => t.name === 'generate_content');

      expect(generateTool).toBeDefined();
      expect(generateTool!.inputSchema.properties).toHaveProperty('user_input');
      expect(generateTool!.inputSchema.properties).toHaveProperty('topic_templates');
      expect(generateTool!.inputSchema.properties).toHaveProperty('platform_type');
      expect(generateTool!.inputSchema.required).toContain('user_input');
      expect(generateTool!.inputSchema.required).toContain('topic_templates');
      expect(generateTool!.inputSchema.required).toContain('platform_type');
    });

    it('should have correct schema for refine_content', async () => {
      const response = await client.listTools();
      const refineTool = response.tools.find(t => t.name === 'refine_content');

      expect(refineTool).toBeDefined();
      expect(refineTool!.inputSchema.properties).toHaveProperty('content_id');
      expect(refineTool!.inputSchema.properties).toHaveProperty('feedback');
      expect(refineTool!.inputSchema.required).toContain('content_id');
      expect(refineTool!.inputSchema.required).toContain('feedback');
    });
  });
});
