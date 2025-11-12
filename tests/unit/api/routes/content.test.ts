import request from 'supertest';
import express, { Express } from 'express';
import { contentRouter } from '../../../../src/api/routes/content.js';
import { ContentOrchestrator } from '../../../../src/services/ContentOrchestrator.js';
import { NewsSearchService } from '../../../../src/services/NewsSearchService.js';
import { ContentGenerationService } from '../../../../src/services/ContentGenerationService.js';
import { TemplateManagementService } from '../../../../src/services/TemplateManagementService.js';
import { ContentVariant } from '../../../../src/types/domain.js';
import { RateLimitExceeded } from '../../../../src/core/exceptions.js';

// Mock services
jest.mock('../../../../src/services/NewsSearchService.js');
jest.mock('../../../../src/services/ContentGenerationService.js');
jest.mock('../../../../src/services/TemplateManagementService.js');

describe('Content Routes', () => {
  let app: Express;
  let mockOrchestrator: ContentOrchestrator;
  let mockContentService: jest.Mocked<ContentGenerationService>;

  const mockContentVariants: ContentVariant[] = [
    {
      text: '理性分析內容',
      image_suggestion: '建議圖片1',
      hashtags: ['#司法改革', '#受害者權益', '#正義'],
      metadata: {
        platform: 'instagram',
        topic: 'victim_rights',
        strategy: 'rational_analysis',
        generated_at: '2025-11-12T10:00:00.000Z',
        generation_id: 'gen_123',
        content_id: 'gen_123_rational_analysis'
      }
    },
    {
      text: '情感共鳴內容',
      image_suggestion: '建議圖片2',
      hashtags: ['#司法改革', '#受害者權益', '#正義', '#同理心'],
      metadata: {
        platform: 'instagram',
        topic: 'victim_rights',
        strategy: 'emotional_resonance',
        generated_at: '2025-11-12T10:00:00.000Z',
        generation_id: 'gen_123',
        content_id: 'gen_123_emotional_resonance'
      }
    },
    {
      text: '行動呼籲內容',
      image_suggestion: '建議圖片3',
      hashtags: ['#司法改革', '#受害者權益', '#正義', '#行動'],
      metadata: {
        platform: 'instagram',
        topic: 'victim_rights',
        strategy: 'call_to_action',
        generated_at: '2025-11-12T10:00:00.000Z',
        generation_id: 'gen_123',
        content_id: 'gen_123_call_to_action'
      }
    }
  ];

  beforeEach(() => {
    // Create mock services
    const mockNewsService = {
      searchNews: jest.fn().mockResolvedValue([])
    } as any;
    
    mockContentService = {
      generateContent: jest.fn().mockResolvedValue(mockContentVariants),
      refineContent: jest.fn().mockResolvedValue(mockContentVariants[0]),
      bedrockClient: {} as any,
      promptBuilder: {} as any,
      rateLimiter: {} as any
    } as any;

    const mockTemplateService = {} as any;

    mockOrchestrator = new ContentOrchestrator(
      mockNewsService,
      mockContentService,
      mockTemplateService
    );

    // Mock orchestrateContentGeneration to return expected response
    mockOrchestrator.orchestrateContentGeneration = jest.fn().mockResolvedValue({
      variants: mockContentVariants,
      generation_id: 'gen_123'
    });

    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1/content', contentRouter(mockOrchestrator));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/content/generate', () => {
    const validRequest = {
      user_input: '我認為應該加強受害者權益保護',
      topic_templates: ['victim_rights'],
      platform_type: 'instagram',
      selected_news_urls: ['https://example.com/news1']
    };

    it('should return 200 status code for valid request', async () => {
      const response = await request(app)
        .post('/api/v1/content/generate')
        .send(validRequest);

      expect(response.status).toBe(200);
    });

    it('should return JSON response', async () => {
      const response = await request(app)
        .post('/api/v1/content/generate')
        .send(validRequest);

      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return variants and generation_id fields', async () => {
      const response = await request(app)
        .post('/api/v1/content/generate')
        .send(validRequest);

      expect(response.body).toHaveProperty('variants');
      expect(response.body).toHaveProperty('generation_id');
      expect(Array.isArray(response.body.variants)).toBe(true);
      expect(typeof response.body.generation_id).toBe('string');
    });

    it('should return 3 content variants', async () => {
      const response = await request(app)
        .post('/api/v1/content/generate')
        .send(validRequest);

      expect(response.body.variants).toHaveLength(3);
    });

    it('should return variants with required fields', async () => {
      const response = await request(app)
        .post('/api/v1/content/generate')
        .send(validRequest);

      response.body.variants.forEach((variant: any) => {
        expect(variant).toHaveProperty('text');
        expect(variant).toHaveProperty('image_suggestion');
        expect(variant).toHaveProperty('hashtags');
        expect(variant).toHaveProperty('metadata');
        expect(Array.isArray(variant.hashtags)).toBe(true);
      });
    });

    it('should return 400 for missing user_input', async () => {
      const invalidRequest = { ...validRequest };
      delete (invalidRequest as any).user_input;

      const response = await request(app)
        .post('/api/v1/content/generate')
        .send(invalidRequest);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing topic_templates', async () => {
      const invalidRequest = { ...validRequest };
      delete (invalidRequest as any).topic_templates;

      const response = await request(app)
        .post('/api/v1/content/generate')
        .send(invalidRequest);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid platform_type', async () => {
      const invalidRequest = {
        ...validRequest,
        platform_type: 'invalid_platform'
      };

      const response = await request(app)
        .post('/api/v1/content/generate')
        .send(invalidRequest);

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid selected_news_urls', async () => {
      const invalidRequest = {
        ...validRequest,
        selected_news_urls: ['not-a-valid-url']
      };

      const response = await request(app)
        .post('/api/v1/content/generate')
        .send(invalidRequest);

      expect(response.status).toBe(400);
    });

    it('should validate topic_templates contains valid values', async () => {
      const validTopics = ['victim_rights', 'anti_death_penalty', 'judicial_injustice'];
      
      for (const topic of validTopics) {
        const response = await request(app)
          .post('/api/v1/content/generate')
          .send({ ...validRequest, topic_templates: [topic] });

        expect(response.status).toBe(200);
      }
    });

    it('should respond within 30 seconds (performance requirement)', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/v1/content/generate')
        .send(validRequest);
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(30000);
    }, 35000); // Set Jest timeout to 35 seconds

    it('should handle service errors gracefully', async () => {
      // Mock orchestrator to throw error
      mockOrchestrator.orchestrateContentGeneration = jest.fn().mockRejectedValue(
        new Error('LLM service unavailable')
      );

      const response = await request(app)
        .post('/api/v1/content/generate')
        .send(validRequest);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/content/refine', () => {
    const validRequest = {
      content_id: 'gen_123_rational_analysis',
      feedback: '請讓內容更加簡潔明瞭，並增加具體數據支持'
    };

    it('should return 200 status code for valid request', async () => {
      const response = await request(app)
        .post('/api/v1/content/refine')
        .send(validRequest);

      expect(response.status).toBe(200);
    });

    it('should return JSON response', async () => {
      const response = await request(app)
        .post('/api/v1/content/refine')
        .send(validRequest);

      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return refined content with required fields', async () => {
      const response = await request(app)
        .post('/api/v1/content/refine')
        .send(validRequest);

      expect(response.body).toHaveProperty('text');
      expect(response.body).toHaveProperty('image_suggestion');
      expect(response.body).toHaveProperty('hashtags');
      expect(response.body).toHaveProperty('metadata');
    });

    it('should return 400 for missing content_id', async () => {
      const invalidRequest = { ...validRequest };
      delete (invalidRequest as any).content_id;

      const response = await request(app)
        .post('/api/v1/content/refine')
        .send(invalidRequest);

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing feedback', async () => {
      const invalidRequest = { ...validRequest };
      delete (invalidRequest as any).feedback;

      const response = await request(app)
        .post('/api/v1/content/refine')
        .send(invalidRequest);

      expect(response.status).toBe(400);
    });

    it('should return 400 for feedback less than 10 characters', async () => {
      const invalidRequest = {
        ...validRequest,
        feedback: '太短了'
      };

      const response = await request(app)
        .post('/api/v1/content/refine')
        .send(invalidRequest);

      expect(response.status).toBe(400);
    });

    it('should return 429 when rate limit exceeded', async () => {
      mockContentService.refineContent.mockRejectedValue(
        new RateLimitExceeded(
          'Refinement limit exceeded (5 per hour)',
          'rate_limit_exceeded'
        )
      );

      const response = await request(app)
        .post('/api/v1/content/refine')
        .send(validRequest);

      expect(response.status).toBe(429);
      expect(response.body).toHaveProperty('error');
    });

    it('should respond within 20 seconds (performance requirement)', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/v1/content/refine')
        .send(validRequest);
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(20000);
    }, 25000); // Set Jest timeout to 25 seconds

    it('should handle service errors gracefully', async () => {
      mockContentService.refineContent.mockRejectedValue(
        new Error('LLM service unavailable')
      );

      const response = await request(app)
        .post('/api/v1/content/refine')
        .send(validRequest);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});
