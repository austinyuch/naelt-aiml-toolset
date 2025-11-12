/**
 * API Integration Tests
 * 
 * These tests verify the complete API flow using real services in a Docker environment.
 * They test the full stack from HTTP requests to external API integrations.
 * 
 * Requirements tested:
 * - 1.2: News search endpoint
 * - 1.3: Content generation endpoint
 * - 1.4: Content refinement endpoint
 * - 1.5: Template listing endpoint
 * - 9.1, 9.2: Error handling and validation
 * - 10.3: Health check endpoint
 */

import request from 'supertest';
import { Express } from 'express';
import { createExpressApp } from '../../src/api/app';
import { ContentOrchestrator } from '../../src/services/ContentOrchestrator';
import { NewsSearchService } from '../../src/services/NewsSearchService';
import { ContentGenerationService } from '../../src/services/ContentGenerationService';
import { TemplateManagementService } from '../../src/services/TemplateManagementService';
import { NewsAPIClient } from '../../src/clients/NewsAPIClient';
import { BedrockClient } from '../../src/clients/BedrockClient';
import { CacheManager } from '../../src/core/cache';
import { RateLimiter } from '../../src/core/rateLimiter';
import { PromptBuilder } from '../../src/prompts/PromptBuilder';
import { PromptTemplateLoader } from '../../src/prompts/PromptTemplateLoader';
import { config } from '../../src/config';

describe('API Integration Tests', () => {
  let app: Express;
  let orchestrator: ContentOrchestrator;
  const validApiKey = 'test-api-key-integration';

  beforeAll(async () => {
    // Initialize real clients (or mocked if no credentials)
    const newsApiClient = new NewsAPIClient(config.newsApiKey || 'mock-key');
    const bedrockClient = new BedrockClient(config.awsRegion);
    const cacheManager = new CacheManager();
    const rateLimiter = new RateLimiter();

    // Initialize services
    const templateService = new TemplateManagementService();
    const promptLoader = new PromptTemplateLoader();
    const promptBuilder = new PromptBuilder(promptLoader);
    const newsService = new NewsSearchService(newsApiClient, cacheManager);
    const contentService = new ContentGenerationService(bedrockClient, promptBuilder, rateLimiter);
    
    orchestrator = new ContentOrchestrator(newsService, contentService, templateService);

    // Create Express app
    app = createExpressApp(orchestrator);

    // Set test API key
    process.env.API_KEYS = validApiKey;
  });

  afterAll(async () => {
    // Cleanup
    delete process.env.API_KEYS;
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should not require authentication', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });
  });

  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      const response = await request(app)
        .post('/api/v1/news/search')
        .send({ keywords: ['test'] })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('API key');
    });

    it('should reject requests with invalid API key', async () => {
      const response = await request(app)
        .post('/api/v1/news/search')
        .set('X-API-Key', 'invalid-key')
        .send({ keywords: ['test'] })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should accept requests with valid API key', async () => {
      const response = await request(app)
        .post('/api/v1/news/search')
        .set('X-API-Key', validApiKey)
        .send({ keywords: ['test'] })
        .expect(200);

      expect(response.body).toHaveProperty('results');
    });
  });

  describe('News Search Endpoint', () => {
    it('should search news successfully', async () => {
      const response = await request(app)
        .post('/api/v1/news/search')
        .set('X-API-Key', validApiKey)
        .send({ keywords: ['司法改革', '受害者權益'] })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body).toHaveProperty('total');
      expect(typeof response.body.total).toBe('number');

      // Verify result structure
      if (response.body.results.length > 0) {
        const firstResult = response.body.results[0];
        expect(firstResult).toHaveProperty('title');
        expect(firstResult).toHaveProperty('source');
        expect(firstResult).toHaveProperty('published_date');
        expect(firstResult).toHaveProperty('url');
        expect(firstResult).toHaveProperty('summary');
      }
    }, 15000); // 15 second timeout

    it('should validate keywords parameter', async () => {
      const response = await request(app)
        .post('/api/v1/news/search')
        .set('X-API-Key', validApiKey)
        .send({ keywords: [] })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('keywords');
    });

    it('should limit keywords to 10', async () => {
      const keywords = Array(11).fill('test');
      const response = await request(app)
        .post('/api/v1/news/search')
        .set('X-API-Key', validApiKey)
        .send({ keywords })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle missing keywords parameter', async () => {
      const response = await request(app)
        .post('/api/v1/news/search')
        .set('X-API-Key', validApiKey)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Content Generation Endpoint', () => {
    it('should generate content successfully', async () => {
      const response = await request(app)
        .post('/api/v1/content/generate')
        .set('X-API-Key', validApiKey)
        .send({
          user_input: '我認為應該加強受害者權益保護',
          topic_templates: ['victim_rights'],
          platform_type: 'instagram',
          selected_news_urls: []
        })
        .expect(200);

      expect(response.body).toHaveProperty('variants');
      expect(Array.isArray(response.body.variants)).toBe(true);
      expect(response.body.variants.length).toBe(3);
      expect(response.body).toHaveProperty('generation_id');

      // Verify variant structure
      const firstVariant = response.body.variants[0];
      expect(firstVariant).toHaveProperty('text');
      expect(firstVariant).toHaveProperty('image_suggestion');
      expect(firstVariant).toHaveProperty('hashtags');
      expect(Array.isArray(firstVariant.hashtags)).toBe(true);
      expect(firstVariant).toHaveProperty('metadata');
    }, 60000); // 60 second timeout for LLM

    it('should validate required parameters', async () => {
      const response = await request(app)
        .post('/api/v1/content/generate')
        .set('X-API-Key', validApiKey)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate platform_type', async () => {
      const response = await request(app)
        .post('/api/v1/content/generate')
        .set('X-API-Key', validApiKey)
        .send({
          user_input: 'test',
          topic_templates: ['victim_rights'],
          platform_type: 'invalid_platform',
          selected_news_urls: []
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('platform');
    });

    it('should validate topic_templates', async () => {
      const response = await request(app)
        .post('/api/v1/content/generate')
        .set('X-API-Key', validApiKey)
        .send({
          user_input: 'test',
          topic_templates: ['invalid_template'],
          platform_type: 'instagram',
          selected_news_urls: []
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should generate content for different platforms', async () => {
      const platforms = ['instagram', 'facebook', 'line'] as const;

      for (const platform of platforms) {
        const response = await request(app)
          .post('/api/v1/content/generate')
          .set('X-API-Key', validApiKey)
          .send({
            user_input: '測試內容生成',
            topic_templates: ['victim_rights'],
            platform_type: platform,
            selected_news_urls: []
          })
          .expect(200);

        expect(response.body.variants).toHaveLength(3);

        // Verify platform-specific constraints
        const firstVariant = response.body.variants[0];
        if (platform === 'instagram') {
          expect(firstVariant.hashtags.length).toBeGreaterThanOrEqual(5);
          expect(firstVariant.hashtags.length).toBeLessThanOrEqual(15);
        } else if (platform === 'facebook') {
          expect(firstVariant.text.length).toBeLessThanOrEqual(2000);
        } else if (platform === 'line') {
          expect(firstVariant.text.length).toBeLessThanOrEqual(200);
        }
      }
    }, 180000); // 3 minutes for multiple LLM calls
  });

  describe('Content Refinement Endpoint', () => {
    let generationId: string;

    beforeAll(async () => {
      // Generate content first
      const response = await request(app)
        .post('/api/v1/content/generate')
        .set('X-API-Key', validApiKey)
        .send({
          user_input: '測試內容',
          topic_templates: ['victim_rights'],
          platform_type: 'instagram',
          selected_news_urls: []
        });

      generationId = response.body.generation_id;
    }, 60000);

    it('should refine content successfully', async () => {
      const response = await request(app)
        .post('/api/v1/content/refine')
        .set('X-API-Key', validApiKey)
        .send({
          content_id: generationId,
          feedback: '請加強情感共鳴的部分，並增加具體的行動建議'
        })
        .expect(200);

      expect(response.body).toHaveProperty('text');
      expect(response.body).toHaveProperty('image_suggestion');
      expect(response.body).toHaveProperty('hashtags');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('refinement_count');
    }, 60000);

    it('should validate feedback length', async () => {
      const response = await request(app)
        .post('/api/v1/content/refine')
        .set('X-API-Key', validApiKey)
        .send({
          content_id: generationId,
          feedback: 'short'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('feedback');
    });

    it('should enforce rate limit (5 per hour)', async () => {
      const testContentId = 'test_rate_limit_' + Date.now();

      // Make 5 requests (should succeed)
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/content/refine')
          .set('X-API-Key', validApiKey)
          .send({
            content_id: testContentId,
            feedback: '測試速率限制 ' + i
          })
          .expect(200);
      }

      // 6th request should fail
      const response = await request(app)
        .post('/api/v1/content/refine')
        .set('X-API-Key', validApiKey)
        .send({
          content_id: testContentId,
          feedback: '測試速率限制 - 應該失敗'
        })
        .expect(429);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('rate limit');
    }, 300000); // 5 minutes for multiple LLM calls
  });

  describe('Template Listing Endpoint', () => {
    it('should list templates successfully', async () => {
      const response = await request(app)
        .get('/api/v1/templates')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('templates');
      expect(Array.isArray(response.body.templates)).toBe(true);
      expect(response.body.templates.length).toBeGreaterThan(0);

      // Verify template structure
      const firstTemplate = response.body.templates[0];
      expect(firstTemplate).toHaveProperty('template_id');
      expect(firstTemplate).toHaveProperty('name');
      expect(firstTemplate).toHaveProperty('description');
      expect(firstTemplate).toHaveProperty('tone_guidelines');
      expect(firstTemplate).toHaveProperty('example_output');
    });

    it('should support language parameter', async () => {
      const response = await request(app)
        .get('/api/v1/templates?lang=zh_TW')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body.templates.length).toBeGreaterThan(0);
    });

    it('should return templates in English', async () => {
      const response = await request(app)
        .get('/api/v1/templates?lang=en')
        .set('X-API-Key', validApiKey)
        .expect(200);

      expect(response.body.templates.length).toBeGreaterThan(0);
    });

    it('should include all required templates', async () => {
      const response = await request(app)
        .get('/api/v1/templates')
        .set('X-API-Key', validApiKey)
        .expect(200);

      const templateIds = response.body.templates.map((t: any) => t.template_id);
      expect(templateIds).toContain('victim_rights');
      expect(templateIds).toContain('anti_death_penalty');
      expect(templateIds).toContain('judicial_injustice');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/unknown')
        .set('X-API-Key', validApiKey)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/v1/news/search')
        .set('X-API-Key', validApiKey)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should include request_id in error responses', async () => {
      const response = await request(app)
        .post('/api/v1/news/search')
        .set('X-API-Key', validApiKey)
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('request_id');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('OpenAPI Documentation', () => {
    it('should serve OpenAPI JSON', async () => {
      const response = await request(app)
        .get('/openapi.json')
        .expect(200);

      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('paths');
    });

    it('should serve Swagger UI', async () => {
      const response = await request(app)
        .get('/api-docs/')
        .expect(200);

      expect(response.text).toContain('swagger');
    });
  });

  describe('Complete Workflow', () => {
    it('should complete full content generation workflow', async () => {
      // Step 1: Search news
      const newsResponse = await request(app)
        .post('/api/v1/news/search')
        .set('X-API-Key', validApiKey)
        .send({ keywords: ['司法改革', '受害者權益'] })
        .expect(200);

      expect(newsResponse.body.results.length).toBeGreaterThan(0);
      const newsUrls = newsResponse.body.results.slice(0, 3).map((n: any) => n.url);

      // Step 2: Generate content
      const contentResponse = await request(app)
        .post('/api/v1/content/generate')
        .set('X-API-Key', validApiKey)
        .send({
          user_input: '我認為應該加強受害者權益保護，確保他們在司法程序中的聲音被聽見',
          topic_templates: ['victim_rights'],
          platform_type: 'instagram',
          selected_news_urls: newsUrls
        })
        .expect(200);

      expect(contentResponse.body.variants).toHaveLength(3);
      const generationId = contentResponse.body.generation_id;

      // Step 3: Refine content
      const refineResponse = await request(app)
        .post('/api/v1/content/refine')
        .set('X-API-Key', validApiKey)
        .send({
          content_id: generationId,
          feedback: '請加強情感共鳴，並增加具體行動建議'
        })
        .expect(200);

      expect(refineResponse.body.text).toBeTruthy();
      expect(refineResponse.body.metadata.refinement_count).toBe(1);
    }, 180000); // 3 minutes for complete workflow
  });
});
