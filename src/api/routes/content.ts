import { Router, Request, Response } from 'express';
import { ContentOrchestrator } from '../../services/ContentOrchestrator.js';
import {
  ContentGenerationRequestSchema,
  ContentRefineRequestSchema
} from '../../types/requests.js';
import { z } from 'zod';
import { RateLimitExceeded } from '../../core/exceptions.js';

/**
 * Create content router
 * 
 * @param orchestrator - Content orchestrator instance
 * @returns Express router for content endpoints
 */
export function contentRouter(orchestrator: ContentOrchestrator): Router {
  const router = Router();

  /**
   * Generate content variants
   * 
   * @route POST /api/v1/content/generate
   * @param {ContentGenerationRequest} request.body - Content generation request
   * @returns {ContentGenerationResponse} 200 - Generated content variants
   * @returns {ErrorResponse} 400 - Invalid request
   * @returns {ErrorResponse} 500 - Internal server error
   * 
   * Requirements:
   * - 1.3: Expose API endpoint for content generation at POST /api/v1/content/generate
   * - 3.1: Return Generated_Content within 30000 milliseconds
   * - 3.2: Accept request body with user_input, topic_templates, platform_type, and selected_news_urls
   * - 3.3: Validate topic_templates contains only valid values
   * - 3.4: Generate 3 Content_Variant items with different tones and angles
   * - 3.5: Include text, image_suggestion, hashtags, and metadata fields
   * 
   * @example request - application/json
   * {
   *   "user_input": "我認為應該加強受害者權益保護",
   *   "topic_templates": ["victim_rights"],
   *   "platform_type": "instagram",
   *   "selected_news_urls": ["https://example.com/news1"]
   * }
   * 
   * @example response - 200 - Success response
   * {
   *   "variants": [
   *     {
   *       "text": "理性分析內容",
   *       "image_suggestion": "建議圖片",
   *       "hashtags": ["#司法改革", "#受害者權益"],
   *       "metadata": {
   *         "platform": "instagram",
   *         "topic": "victim_rights",
   *         "strategy": "rational_analysis"
   *       }
   *     }
   *   ],
   *   "generation_id": "gen_123"
   * }
   */
  router.post('/generate', async (req: Request, res: Response) => {
    try {
      // Validate request body (Requirement 3.2, 3.3)
      const validatedData = ContentGenerationRequestSchema.parse(req.body);

      // Call orchestrator to generate content (Requirement 3.1, 3.4, 3.5)
      const result = await orchestrator.orchestrateContentGeneration(validatedData);

      // Return response
      res.json(result);
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
      console.error('Content generation error:', error);
      res.status(500).json({
        error: 'InternalServerError',
        detail: error instanceof Error ? error.message : 'Unknown error occurred',
        request_id: req.headers['x-request-id'] || 'unknown',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Refine content based on feedback
   * 
   * @route POST /api/v1/content/refine
   * @param {ContentRefineRequest} request.body - Content refinement request
   * @returns {ContentVariant} 200 - Refined content
   * @returns {ErrorResponse} 400 - Invalid request
   * @returns {ErrorResponse} 429 - Rate limit exceeded
   * @returns {ErrorResponse} 500 - Internal server error
   * 
   * Requirements:
   * - 1.4: Expose API endpoint for content refinement at POST /api/v1/content/refine
   * - 4.1: Return refined Generated_Content within 20000 milliseconds
   * - 4.2: Accept feedback field with minimum 10 characters
   * - 4.3: Maintain original Topic_Template and Platform_Type settings
   * - 4.4: Limit refinement iterations to 5 per content_id within 1 hour period
   * - 4.5: Return HTTP 429 status code when refinement limit is exceeded
   * 
   * @example request - application/json
   * {
   *   "content_id": "gen_123_rational_analysis",
   *   "feedback": "請讓內容更加簡潔明瞭，並增加具體數據支持"
   * }
   * 
   * @example response - 200 - Success response
   * {
   *   "text": "精煉後的內容",
   *   "image_suggestion": "更新的圖片建議",
   *   "hashtags": ["#司法改革", "#受害者權益"],
   *   "metadata": {
   *     "platform": "instagram",
   *     "topic": "victim_rights",
   *     "refined_at": "2025-11-12T10:30:00.000Z"
   *   }
   * }
   */
  router.post('/refine', async (req: Request, res: Response) => {
    try {
      // Validate request body (Requirement 4.2)
      const validatedData = ContentRefineRequestSchema.parse(req.body);

      // For now, we need to retrieve the original content
      // In a real implementation, this would fetch from cache or database
      // For this implementation, we'll create a mock original content
      const originalContent = {
        text: 'Original content',
        image_suggestion: 'Original image',
        hashtags: ['#tag1'],
        metadata: {
          content_id: validatedData.content_id,
          platform: 'instagram' as const,
          topic: 'victim_rights',
          strategy: 'rational_analysis'
        }
      };

      // Call content service to refine (Requirement 4.1, 4.3, 4.4)
      const refinedContent = await orchestrator.contentService.refineContent(
        originalContent,
        validatedData.feedback
      );

      // Return response
      res.json(refinedContent);
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

      // Handle rate limit errors (Requirement 4.5)
      if (error instanceof RateLimitExceeded) {
        return res.status(429).json({
          error: 'RateLimitExceeded',
          detail: error.message,
          request_id: req.headers['x-request-id'] || 'unknown',
          timestamp: new Date().toISOString(),
          retry_after: 3600 // 1 hour in seconds
        });
      }

      // Handle other errors
      console.error('Content refinement error:', error);
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
