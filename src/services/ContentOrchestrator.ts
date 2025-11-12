/**
 * Content Orchestrator
 * 
 * Coordinates all services for content generation workflow
 * Requirements: 3.1, 4.1
 */

import { NewsSearchService } from './NewsSearchService.js';
import { ContentGenerationService } from './ContentGenerationService.js';
import { TemplateManagementService } from './TemplateManagementService.js';
import { NewsArticle, ContentVariant, PlatformType } from '../types/domain.js';
import { randomUUID } from 'crypto';

/**
 * Content generation request
 */
export interface ContentGenerationRequest {
  user_input: string;
  topic_templates: string[];
  platform_type: PlatformType;
  selected_news_urls: string[];
}

/**
 * Content generation response
 */
export interface ContentGenerationResponse {
  variants: ContentVariant[];
  generation_id: string;
}

/**
 * Content Orchestrator
 * 
 * Coordinates the complete content generation workflow:
 * 1. Search/fetch news articles
 * 2. Generate content variants
 * 3. Return results with metadata
 */
export class ContentOrchestrator {
  public newsService: NewsSearchService;
  public contentService: ContentGenerationService;
  public templateService: TemplateManagementService;

  /**
   * Creates a new ContentOrchestrator
   * 
   * @param newsService - News search service
   * @param contentService - Content generation service
   * @param templateService - Template management service
   */
  constructor(
    newsService: NewsSearchService,
    contentService: ContentGenerationService,
    templateService: TemplateManagementService
  ) {
    this.newsService = newsService;
    this.contentService = contentService;
    this.templateService = templateService;
  }

  /**
   * Orchestrate complete content generation workflow
   * 
   * Requirement 3.1: Orchestrate content generation within 30000ms
   * Requirement 4.1: Coordinate services for content generation
   * 
   * @param request - Content generation request
   * @returns Promise resolving to content generation response
   * @throws Error if any service fails
   */
  async orchestrateContentGeneration(
    request: ContentGenerationRequest
  ): Promise<ContentGenerationResponse> {
    // Step 1: Fetch news articles if URLs provided
    let newsContext: NewsArticle[] = [];
    
    if (request.selected_news_urls && request.selected_news_urls.length > 0) {
      // Extract keywords from user input for news search
      // In a real implementation, this would be more sophisticated
      const keywords = this.extractKeywords(request.user_input);
      newsContext = await this.newsService.searchNews(keywords);
    }

    // Step 2: Generate content variants
    const variants = await this.contentService.generateContent(
      request.user_input,
      request.topic_templates,
      request.platform_type,
      newsContext
    );

    // Step 3: Generate unique ID for this generation
    const generationId = randomUUID();

    // Step 4: Add generation ID to each variant's metadata
    variants.forEach(variant => {
      variant.metadata = {
        ...variant.metadata,
        generation_id: generationId,
        content_id: `${generationId}_${variant.metadata.strategy}`
      };
    });

    // Step 5: Return response
    return {
      variants,
      generation_id: generationId
    };
  }

  /**
   * Extract keywords from user input
   * 
   * Simple implementation that extracts meaningful words
   * In production, this could use NLP techniques
   * 
   * @param userInput - User input text
   * @returns Array of keywords
   * @private
   */
  private extractKeywords(userInput: string): string[] {
    // Simple keyword extraction: split by spaces and filter short words
    const words = userInput
      .split(/\s+/)
      .filter(word => word.length > 1)
      .slice(0, 5); // Limit to 5 keywords

    // If no keywords extracted, use a default
    return words.length > 0 ? words : ['司法'];
  }
}
