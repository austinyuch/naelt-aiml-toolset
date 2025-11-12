import request from 'supertest';
import express, { Express } from 'express';
import { newsRouter } from '../../../../src/api/routes/news.js';
import { ContentOrchestrator } from '../../../../src/services/ContentOrchestrator.js';
import { NewsSearchService } from '../../../../src/services/NewsSearchService.js';
import { ContentGenerationService } from '../../../../src/services/ContentGenerationService.js';
import { TemplateManagementService } from '../../../../src/services/TemplateManagementService.js';
import { NewsArticle } from '../../../../src/types/domain.js';

// Mock services
jest.mock('../../../../src/services/NewsSearchService.js');
jest.mock('../../../../src/services/ContentGenerationService.js');
jest.mock('../../../../src/services/TemplateManagementService.js');

describe('News Search Routes', () => {
  let app: Express;
  let mockOrchestrator: ContentOrchestrator;
  let mockNewsService: jest.Mocked<NewsSearchService>;

  const mockNewsArticles: NewsArticle[] = [
    {
      title: '司法改革新進展',
      source: 'Test News',
      published_date: new Date('2025-11-12'),
      url: 'https://example.com/news1',
      summary: '司法改革取得重要進展'
    },
    {
      title: '受害者權益保護',
      source: 'Test News 2',
      published_date: new Date('2025-11-11'),
      url: 'https://example.com/news2',
      summary: '加強受害者權益保護措施'
    }
  ];

  beforeEach(() => {
    // Create mock services
    mockNewsService = {
      searchNews: jest.fn().mockResolvedValue(mockNewsArticles),
      cacheManager: {} as any
    } as any;

    const mockContentService = {} as any;
    const mockTemplateService = {} as any;

    mockOrchestrator = new ContentOrchestrator(
      mockNewsService,
      mockContentService,
      mockTemplateService
    );

    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/v1/news', newsRouter(mockOrchestrator));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/news/search', () => {
    it('should return 200 status code for valid request', async () => {
      const response = await request(app)
        .post('/api/v1/news/search')
        .send({ keywords: ['司法', '改革'] });

      expect(response.status).toBe(200);
    });

    it('should return JSON response', async () => {
      const response = await request(app)
        .post('/api/v1/news/search')
        .send({ keywords: ['司法'] });

      expect(response.headers['content-type']).toMatch(/json/);
    });

    it('should return results and total fields', async () => {
      const response = await request(app)
        .post('/api/v1/news/search')
        .send({ keywords: ['司法'] });

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(typeof response.body.total).toBe('number');
    });

    it('should call NewsSearchService with correct keywords', async () => {
      const keywords = ['司法', '改革'];
      
      await request(app)
        .post('/api/v1/news/search')
        .send({ keywords });

      expect(mockNewsService.searchNews).toHaveBeenCalledWith(keywords, 20);
    });

    it('should return news articles with required fields', async () => {
      const response = await request(app)
        .post('/api/v1/news/search')
        .send({ keywords: ['司法'] });

      expect(response.body.results).toHaveLength(2);
      
      response.body.results.forEach((article: any) => {
        expect(article).toHaveProperty('title');
        expect(article).toHaveProperty('source');
        expect(article).toHaveProperty('published_date');
        expect(article).toHaveProperty('url');
        expect(article).toHaveProperty('summary');
      });
    });

    it('should return 400 for missing keywords', async () => {
      const response = await request(app)
        .post('/api/v1/news/search')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for empty keywords array', async () => {
      const response = await request(app)
        .post('/api/v1/news/search')
        .send({ keywords: [] });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for too many keywords (>10)', async () => {
      const keywords = Array(11).fill('keyword');
      
      const response = await request(app)
        .post('/api/v1/news/search')
        .send({ keywords });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid request body', async () => {
      const response = await request(app)
        .post('/api/v1/news/search')
        .send({ invalid: 'data' });

      expect(response.status).toBe(400);
    });

    it('should handle service errors gracefully', async () => {
      mockNewsService.searchNews.mockRejectedValue(
        new Error('News API unavailable')
      );

      const response = await request(app)
        .post('/api/v1/news/search')
        .send({ keywords: ['司法'] });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should respond within 10 seconds (performance requirement)', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/v1/news/search')
        .send({ keywords: ['司法'] });
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(10000);
    }, 15000); // Set Jest timeout to 15 seconds

    it('should return correct total count', async () => {
      const response = await request(app)
        .post('/api/v1/news/search')
        .send({ keywords: ['司法'] });

      expect(response.body.total).toBe(mockNewsArticles.length);
    });

    it('should accept 1 to 10 keywords', async () => {
      // Test with 1 keyword
      const response1 = await request(app)
        .post('/api/v1/news/search')
        .send({ keywords: ['司法'] });
      expect(response1.status).toBe(200);

      // Test with 10 keywords
      const keywords10 = Array(10).fill('keyword');
      const response10 = await request(app)
        .post('/api/v1/news/search')
        .send({ keywords: keywords10 });
      expect(response10.status).toBe(200);
    });
  });
});
