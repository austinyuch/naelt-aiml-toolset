/**
 * News Search Service
 * 
 * Service for searching news articles with caching support
 * Requirements: 2.1, 2.3, 2.4
 */

import { NewsAPIClient, NewsArticle } from '../clients/NewsAPIClient.js';
import { CacheManager } from '../core/cache.js';

/**
 * News Search Service
 * 
 * Orchestrates news search operations with caching
 */
export class NewsSearchService {
  private newsClient: NewsAPIClient;
  public cacheManager: CacheManager;

  /**
   * Creates a new NewsSearchService
   * 
   * @param newsClient - News API client for fetching articles
   * @param cacheManager - Cache manager for caching results
   */
  constructor(newsClient: NewsAPIClient, cacheManager: CacheManager) {
    this.newsClient = newsClient;
    this.cacheManager = cacheManager;
  }

  /**
   * Search for news articles
   * 
   * Requirement 2.1: Search news and return results within 10000ms
   * Requirement 2.3: Return minimum 5 and maximum 20 results
   * Requirement 2.4: Include title, source, published_date, url, and summary fields
   * 
   * @param keywords - Array of search keywords (1-10 keywords)
   * @param maxResults - Maximum number of results (default: 20, range: 1-20)
   * @returns Promise resolving to array of news articles
   * @throws Error if keywords array is empty
   * @throws Error if maxResults is out of valid range
   */
  async searchNews(
    keywords: string[],
    maxResults: number = 20
  ): Promise<NewsArticle[]> {
    // Validate input
    if (!keywords || keywords.length === 0) {
      throw new Error('Keywords array cannot be empty');
    }

    if (keywords.length > 10) {
      throw new Error('Maximum 10 keywords allowed');
    }

    // Requirement 2.3: Validate maxResults range
    if (maxResults <= 0 || maxResults > 20) {
      throw new Error('maxResults must be between 1 and 20');
    }

    // Combine keywords into single query string
    const query = keywords.join(' ');

    // Call NewsAPIClient to fetch articles
    // The client already implements retry mechanism (Requirement 2.5)
    const articles = await this.newsClient.search(query, maxResults);

    // Return articles (already in correct format from client)
    // Requirement 2.4: Articles include title, source, published_date, url, and summary
    return articles;
  }
}
