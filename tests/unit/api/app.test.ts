import request from 'supertest';
import { Express } from 'express';
import { createExpressApp } from '../../../src/api/app.js';
import { ContentOrchestrator } from '../../../src/services/ContentOrchestrator.js';
import { NewsSearchService } from '../../../src/services/NewsSearchService.js';
import { ContentGenerationService } from '../../../src/services/ContentGenerationService.js';
import { TemplateManagementService } from '../../../src/services/TemplateManagementService.js';

// Mock services
jest.mock('../../../src/services/NewsSearchService.js');
jest.mock('../../../src/services/ContentGenerationService.js');
jest.mock('../../../src/services/TemplateManagementService.js');

describe('Express App', () => {
  let app: Express;
  let mockOrchestrator: ContentOrchestrator;

  beforeEach(() => {
    // Create mock services
    const mockNewsService = {
      searchNews: jest.fn().mockResolvedValue([])
    } as any;

    const mockContentService = {} as any;
    
    const mockTemplateService = {
      getTemplates: jest.fn().mockReturnValue([]),
      getTemplateById: jest.fn()
    } as any;

    mockOrchestrator = new ContentOrchestrator(
      mockNewsService,
      mockContentService,
      mockTemplateService
    );

    // Set API keys for testing
    process.env.API_KEYS = 'test-key-1,test-key-2';

    // Create app
    app = createExpressApp(mockOrchestrator);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.API_KEYS;
  });

  describe('Middleware Configuration', () => {
    it('should have CORS enabled', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://example.com');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should have security headers (helmet)', async () => {
      const response = await request(app).get('/health');

      // Helmet adds various security headers
      expect(response.headers).toHaveProperty('x-content-type-options');
    });

    it('should parse JSON bodies', async () => {
      const response = await request(app)
        .post('/api/v1/news/search')
        .set('x-api-key', 'test-key-1')
        .send({ keywords: ['test'] });

      // Should not return 400 for JSON parsing
      expect(response.status).not.toBe(400);
    });

    it('should add request ID to responses', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-request-id']).toBeDefined();
    });
  });

  describe('OpenAPI Documentation', () => {
    it('should serve Swagger UI at /api-docs', async () => {
      const response = await request(app).get('/api-docs/');

      expect(response.status).toBe(200);
      expect(response.text).toContain('swagger');
    });

    it('should serve OpenAPI spec at /openapi.json', async () => {
      const response = await request(app).get('/openapi.json');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('paths');
    });

    it('should include API version in spec', async () => {
      const response = await request(app).get('/openapi.json');

      expect(response.body.info.version).toBe('1.0.0');
    });
  });

  describe('Public Routes (No Auth Required)', () => {
    it('should allow access to /health without API key', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
    });

    it('should allow access to /openapi.json without API key', async () => {
      const response = await request(app).get('/openapi.json');

      expect(response.status).toBe(200);
    });

    it('should allow access to /api-docs without API key', async () => {
      const response = await request(app).get('/api-docs/');

      expect(response.status).toBe(200);
    });
  });

  describe('Protected Routes (Auth Required)', () => {
    it('should require API key for /api/v1/news/search', async () => {
      const response = await request(app)
        .post('/api/v1/news/search')
        .send({ keywords: ['test'] });

      expect(response.status).toBe(401);
    });

    it('should require API key for /api/v1/content/generate', async () => {
      const response = await request(app)
        .post('/api/v1/content/generate')
        .send({});

      expect(response.status).toBe(401);
    });

    it('should require API key for /api/v1/templates', async () => {
      const response = await request(app).get('/api/v1/templates');

      expect(response.status).toBe(401);
    });

    it('should allow access with valid API key', async () => {
      const response = await request(app)
        .get('/api/v1/templates')
        .set('x-api-key', 'test-key-1');

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/non-existent-route');

      expect(response.status).toBe(404);
    });

    it('should handle errors with proper format', async () => {
      // Trigger an error by providing invalid data
      const response = await request(app)
        .post('/api/v1/news/search')
        .set('x-api-key', 'test-key-1')
        .send({ invalid: 'data' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('detail');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Request Tracking', () => {
    it('should accept custom request ID', async () => {
      const customRequestId = 'custom-req-123';
      
      const response = await request(app)
        .get('/health')
        .set('x-request-id', customRequestId);

      expect(response.headers['x-request-id']).toBe(customRequestId);
    });

    it('should generate request ID if not provided', async () => {
      const response = await request(app).get('/health');

      expect(response.headers['x-request-id']).toBeDefined();
      expect(response.headers['x-request-id']).toMatch(/^[a-f0-9-]{36}$/);
    });
  });
});
