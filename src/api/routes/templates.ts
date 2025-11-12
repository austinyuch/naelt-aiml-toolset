import { Router, Request, Response } from 'express';
import { ContentOrchestrator } from '../../services/ContentOrchestrator.js';

/**
 * Create templates router
 * 
 * @param orchestrator - Content orchestrator instance
 * @returns Express router for templates endpoints
 */
export function templatesRouter(orchestrator: ContentOrchestrator): Router {
  const router = Router();

  /**
   * Get all templates
   * 
   * @route GET /api/v1/templates
   * @param {string} request.query.lang - Language code (zh_TW or en, default: zh_TW)
   * @returns {TopicTemplate[]} 200 - Array of templates
   * @returns {ErrorResponse} 500 - Internal server error
   * 
   * Requirements:
   * - 1.5: Expose API endpoint for template listing at GET /api/v1/templates
   * - 5.1: Return template list within 500 milliseconds
   * - 5.2: Return JSON array with template_id, name, description, and tone_guidelines fields
   * - 5.3: Provide templates for victim_rights, anti_death_penalty, and judicial_injustice topics
   * - 5.4: Include example_output field demonstrating template style
   * - 5.5: Support query parameter lang with values zh_TW and en
   * 
   * @example response - 200 - Success response
   * [
   *   {
   *     "template_id": "victim_rights",
   *     "name": "受害者權益",
   *     "description": "關注受害者權益保護",
   *     "tone_guidelines": "同理受害者處境",
   *     "example_output": "範例輸出"
   *   }
   * ]
   */
  router.get('/', (req: Request, res: Response) => {
    try {
      // Get language parameter (Requirement 5.5)
      const lang = (req.query.lang as string) || 'zh_TW';

      // Get templates from service (Requirement 5.1, 5.2, 5.3, 5.4)
      const templates = orchestrator.templateService.getTemplates(lang);

      // Return templates
      res.json(templates);
    } catch (error) {
      // Handle errors
      console.error('Templates list error:', error);
      res.status(500).json({
        error: 'InternalServerError',
        detail: error instanceof Error ? error.message : 'Unknown error occurred',
        request_id: req.headers['x-request-id'] || 'unknown',
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * Get template by ID
   * 
   * @route GET /api/v1/templates/:id
   * @param {string} request.params.id - Template ID
   * @param {string} request.query.lang - Language code (zh_TW or en, default: zh_TW)
   * @returns {TopicTemplate} 200 - Template details
   * @returns {ErrorResponse} 404 - Template not found
   * @returns {ErrorResponse} 500 - Internal server error
   * 
   * Requirements:
   * - 5.2: Return template with all required fields
   * - 5.5: Support language parameter
   * 
   * @example response - 200 - Success response
   * {
   *   "template_id": "victim_rights",
   *   "name": "受害者權益",
   *   "description": "關注受害者權益保護",
   *   "tone_guidelines": "同理受害者處境",
   *   "example_output": "範例輸出"
   * }
   */
  router.get('/:id', (req: Request, res: Response) => {
    try {
      // Get template ID and language parameter
      const templateId = req.params.id;
      const lang = (req.query.lang as string) || 'zh_TW';

      // Get template by ID (Requirement 5.2, 5.5)
      const template = orchestrator.templateService.getTemplateById(templateId, lang);

      // Return template
      res.json(template);
    } catch (error) {
      // Handle template not found
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: 'NotFound',
          detail: error.message,
          request_id: req.headers['x-request-id'] || 'unknown',
          timestamp: new Date().toISOString()
        });
      }

      // Handle other errors
      console.error('Template get error:', error);
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
