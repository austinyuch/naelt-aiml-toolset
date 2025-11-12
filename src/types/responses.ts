/**
 * Response Type Definitions
 * 
 * TypeScript interfaces for API responses
 * Requirements: 2.4, 3.5, 4.1, 5.2, 9.1
 */

import { NewsArticle, ContentVariant } from './domain.js';

/**
 * News Search Response
 * Requirement 2.4: Include title, source, published_date, url, and summary fields in each Search_Result
 */
export interface NewsSearchResponse {
  results: NewsArticle[];
  total: number;
}

/**
 * Content Generation Response
 * Requirement 3.5: Include text, image_suggestion, hashtags, and metadata fields in each Content_Variant
 */
export interface ContentGenerationResponse {
  variants: ContentVariant[];
  generation_id: string;
}

/**
 * Error Response
 * Requirement 9.1: Return HTTP 400 status with detailed error message
 * Requirement 9.2: Validate all required fields and return field-specific error messages
 */
export interface ErrorResponse {
  error: string;
  detail: string;
  request_id: string;
  timestamp: string;
  retry_after?: number;
}
