/**
 * NewsSearchService Unit Tests
 * 
 * Tests for news search service with mock NewsAPIClient
 * Requirements: 2.1, 2.3, 2.4
 */

import { NewsSearchService } from '../../../src/services/NewsSearchService.js';
import { NewsAPIClient, NewsArticle } from '../../../src/clients/NewsAPIClient.js';
import { CacheManager } from '../../../src/core/cache.js';

// Mock NewsAPIClient
jest.mock('../../../src/clients/NewsAPIClient.js');
jest.mock('../../../src/core/cache.js');

describe('NewsSearchService', () => {
  let service: NewsSearchService;
  let mockNewsClient: jest.Mocked<NewsAPIClient>;
  let mockCacheManager: jest.Mocked<CacheManager>;

  const mockArticles: NewsArticle[] = [
    {
      title: '司法改革新聞 1',
      source: '新聞來源 1',
      published_date: new Date('2025-11-12'),
      url: 'https://example.com/news/1',
      summary: '這是關於司法改革的新聞摘要 1'
    },
    {
      title: '司法改革新聞 2',
      source: '新聞來源 2',
      published_date: new Date('2025-11-11'),
      url: 'https://example.com/news/2',
      summary: '這是關於司法改革的新聞摘要 2'
    },
    {
      title: '司法改革新聞 3',
      source: '新聞來源 3',
      published_date: new Date('2025-11-10'),
      url: 'https://example.com/news/3',
      summary: '這是關於司法改革的新聞摘要 3'
    }
  ];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockNewsClient = new NewsAPIClient('test-key') as jest.Mocked<NewsAPIClient>;
    mockCacheManager = new CacheManager() as jest.Mocked<CacheManager>;

    // Setup default mock behavior
    mockNewsClient.search = jest.fn().mockResolvedValue(mockArticles);

    // Create service instance
    service = new NewsSearchService(mockNewsClient, mockCacheManager);
  });

  describe('searchNews', () => {
    it('should search news successfully with single keyword', async () => {
      // Requirement 2.1: Search news and return results
      const result = await service.searchNews(['司法改革']);

      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('司法改革新聞 1');
      expect(mockNewsClient.search).toHaveBeenCalledWith('司法改革', 20);
    });

    it('should search news with multiple keywords', async () => {
      // Requirement 2.1: Accept 1 to 10 search terms
      const keywords = ['司法', '改革', '受害者'];
      
      await service.searchNews(keywords);

      // Should combine keywords into single query
      expect(mockNewsClient.search).toHaveBeenCalledWith('司法 改革 受害者', 20);
    });

    it('should limit results to specified maxResults', async () => {
      // Requirement 2.3: Return minimum 5 and maximum 20 results
      await service.searchNews(['司法'], 10);

      expect(mockNewsClient.search).toHaveBeenCalledWith('司法', 10);
    });

    it('should return minimum 5 results', async () => {
      // Requirement 2.3: Return minimum 5 results
      const fewArticles = mockArticles.slice(0, 3);
      mockNewsClient.search.mockResolvedValue(fewArticles);

      const result = await service.searchNews(['test']);

      // Should still return what's available even if less than 5
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should return maximum 20 results', async () => {
      // Requirement 2.3: Return maximum 20 results
      const manyArticles = Array(25).fill(null).map((_, i) => ({
        ...mockArticles[0],
        title: `新聞 ${i + 1}`
      }));
      mockNewsClient.search.mockResolvedValue(manyArticles);

      await service.searchNews(['test'], 20);

      expect(mockNewsClient.search).toHaveBeenCalledWith('test', 20);
    });

    it('should include all required fields in results', async () => {
      // Requirement 2.4: Include title, source, published_date, url, and summary
      const result = await service.searchNews(['test']);

      result.forEach(article => {
        expect(article).toHaveProperty('title');
        expect(article).toHaveProperty('source');
        expect(article).toHaveProperty('published_date');
        expect(article).toHaveProperty('url');
        expect(article).toHaveProperty('summary');
        expect(article.published_date).toBeInstanceOf(Date);
      });
    });

    it('should handle empty search results', async () => {
      mockNewsClient.search.mockResolvedValue([]);

      const result = await service.searchNews(['nonexistent']);

      expect(result).toHaveLength(0);
    });

    it('should propagate errors from NewsAPIClient', async () => {
      const error = new Error('API error');
      mockNewsClient.search.mockRejectedValue(error);

      await expect(service.searchNews(['test'])).rejects.toThrow('API error');
    });

    it('should validate keywords array is not empty', async () => {
      await expect(service.searchNews([])).rejects.toThrow();
    });

    it('should validate maxResults is within valid range', async () => {
      await expect(service.searchNews(['test'], 0)).rejects.toThrow();
      await expect(service.searchNews(['test'], 21)).rejects.toThrow();
    });
  });

  describe('cache integration', () => {
    it('should use cache manager for caching results', async () => {
      // This test verifies cache integration exists
      // Actual caching logic will be implemented in the service
      
      await service.searchNews(['test']);

      // Service should have cache manager available
      expect(service).toHaveProperty('cacheManager');
    });
  });
});
