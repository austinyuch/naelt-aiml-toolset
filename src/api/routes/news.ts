import { Router, Request, Response } from 'express';
import { ContentOrchestrator } from '../../services/ContentOrchestrator.js';
import { NewsSearchRequestSchema } from '../../types/requests.js';
import { NewsSearchResponse } from '../../types/responses.js';
import { z } from 'zod';

/**
 * Create news router
 * 
 * @param orchestrator - Content orchestrator instance
 * @returns Express router for news endpoints
 */
export function newsRouter(orchestrator: ContentOrchestrator): Router {
  const router = Router();

  /**
   * Search news articles
   * 
   * @route POST /api/v1/news/search
   * @param {NewsSearchRequest} request.body - Search request with keywords
   * @returns {NewsSearchResponse} 200 - Search results
   * @returns {ErrorResponse} 400 - Invalid request
   * @returns {ErrorResponse} 500 - Internal server error
   * 
   * Requirements:
   * - 1.2: Expose API endpoint for news search at POST /api/v1/news/search
   * - 2.1: Return Search_Result within 10000 milliseconds
   * - 2.2: Accept request body with keywords field containing 1 to 10 search terms
   * - 2.3: Return minimum 5 and maximum 20 Search_Result items
   * - 2.4: Include title, source, published_date, url, and summary fields
   * 
   * @example request - application/json
   * {
   *   "keywords": ["司法", "改革"]
   * }
   * 
   * @example response - 200 - Success response
   * {
   *   "results": [
   *     {
   *       "title": "司法改革新進展",
   *       "source": "Test News",
   *       "published_date": "2025-11-12T00:00:00.000Z",
   *       "url": "https://example.com/news1",
   *       "summary": "司法改革取得重要進展"
   *     }
   *   ],
   *   "total": 1
   * }
   */
  router.post('/search', async (req: Request, res: Response) => {
    try {
      // Validate request body (Requirement 2.2)
      const validatedData = NewsSearchRequestSchema.parse(req.body);

      // Call news search service (Requirement 2.1)
      const articles = await orchestrator.newsService.searchNews(
        validatedData.keywords,
        20 // Default max results
      );

      // Build response (Requirement 2.3, 2.4)
      const response: NewsSearchResponse = {
        results: articles,
        total: articles.length
      };

      // Return response
      res.json(response);
    } catch (error) {
      // Handle validation errors
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'ValidationError',
          detail: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
          request_id: req.headers['x-request-id'] || 'unknown',
          timestamp: new Date().toISOString()
        });
      }

      // Handle other errors
      console.error('News search error:', error);
      res.status(500).json({
        error: 'InternalServerError',
        detail: error instanceof Error ? error.message : 'Unknown error occurred',
        request_id: req.headers['x-request-id'] || 'unknown',
        timestamp: new Date().toISOString()
      });
    }
  });

  return router;
}
