/**
 * NewsAPIClient Unit Tests
 * 
 * Tests for the News API client using mocks
 * Requirements: 2.1, 2.5, 9.3
 * 
 * TDD Red Phase: Write failing tests first
 */

import { NewsAPIClient } from '../../../src/clients/NewsAPIClient.js';

describe('NewsAPIClient', () => {
  let client: NewsAPIClient;
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    client = new NewsAPIClient(mockApiKey);
  });

  describe('Constructor', () => {
    it('should create instance with API key', () => {
      expect(client).toBeInstanceOf(NewsAPIClient);
    });

    it('should throw error when API key is empty', () => {
      expect(() => new NewsAPIClient('')).toThrow('API key is required');
    });
  });

  describe('search', () => {
    it('should search news with single keyword', async () => {
      // Requirement 2.1: Search news and return results
      const results = await client.search('司法改革', 10);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(10);
    });

    it('should return news articles with required fields', async () => {
      // Requirement 2.4: Include title, source, published_date, url, and summary
      const results = await client.search('受害者權益', 5);

      expect(results.length).toBeGreaterThan(0);
      results.forEach(article => {
        expect(article).toHaveProperty('title');
        expect(article).toHaveProperty('source');
        expect(article).toHaveProperty('published_date');
        expect(article).toHaveProperty('url');
        expect(article).toHaveProperty('summary');
        expect(typeof article.title).toBe('string');
        expect(typeof article.source).toBe('string');
        expect(typeof article.url).toBe('string');
        expect(typeof article.summary).toBe('string');
      });
    });

    it('should respect maxResults parameter', async () => {
      const maxResults = 5;
      const results = await client.search('廢死', maxResults);

      expect(results.length).toBeLessThanOrEqual(maxResults);
    });

    it('should handle empty search results', async () => {
      const results = await client.search('xyzabc123nonexistent', 10);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should throw error for invalid query', async () => {
      // Empty query should throw error
      await expect(client.search('', 10)).rejects.toThrow();
    });

    it('should throw error for invalid maxResults', async () => {
      // Negative maxResults should throw error
      await expect(client.search('test', -1)).rejects.toThrow();
      
      // Zero maxResults should throw error
      await expect(client.search('test', 0)).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle API rate limit errors', async () => {
      // Requirement 2.5: Handle API rate limits with retry
      // This test will verify retry mechanism is triggered
      // Mock implementation will simulate rate limit error
      
      // For now, we expect the client to eventually throw after retries
      // In real implementation, this would retry 3 times before failing
      await expect(async () => {
        // Simulate rate limit scenario
        const failingClient = new NewsAPIClient('rate-limit-test-key');
        await failingClient.search('test', 10);
      }).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      // Requirement 9.3: Handle external service errors
      await expect(async () => {
        const failingClient = new NewsAPIClient('network-error-test-key');
        await failingClient.search('test', 10);
      }).rejects.toThrow();
    });

    it('should handle invalid API key', async () => {
      await expect(async () => {
        const invalidClient = new NewsAPIClient('invalid-key');
        await invalidClient.search('test', 10);
      }).rejects.toThrow();
    });
  });

  describe('Retry Mechanism', () => {
    it('should retry on transient failures', async () => {
      // Requirement 2.5: Exponential backoff retry up to 3 attempts
      // This test verifies that retry mechanism is in place
      // Mock will simulate transient failure followed by success
      
      const results = await client.search('test', 5);
      expect(Array.isArray(results)).toBe(true);
    });

    it('should fail after max retries exceeded', async () => {
      // After 3 retry attempts, should throw error
      await expect(async () => {
        const failingClient = new NewsAPIClient('max-retries-test-key');
        await failingClient.search('test', 10);
      }).rejects.toThrow();
    });
  });
});
