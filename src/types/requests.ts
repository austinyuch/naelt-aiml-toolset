/**
 * Request Type Definitions
 * 
 * TypeScript interfaces and Zod schemas for API requests
 * Requirements: 2.2, 3.2, 4.2, 9.2
 */

import { z } from 'zod';

/**
 * News Search Request
 * Requirement 2.2: Accept request body with keywords field containing 1 to 10 search terms
 */
export interface NewsSearchRequest {
  keywords: string[];
}

export const NewsSearchRequestSchema = z.object({
  keywords: z.array(z.string()).min(1).max(10)
});

/**
 * Content Generation Request
 * Requirement 3.2: Accept request body with user_input, topic_templates, platform_type, and selected_news_urls fields
 */
export interface ContentGenerationRequest {
  user_input: string;
  topic_templates: string[];
  platform_type: 'instagram' | 'facebook' | 'line';
  selected_news_urls: string[];
}

export const ContentGenerationRequestSchema = z.object({
  user_input: z.string(),
  topic_templates: z.array(z.string()),
  platform_type: z.enum(['instagram', 'facebook', 'line']),
  selected_news_urls: z.array(z.string().url())
});

/**
 * Content Refine Request
 * Requirement 4.2: Accept feedback field with minimum 10 characters describing requested changes
 */
export interface ContentRefineRequest {
  content_id: string;
  feedback: string;
}

export const ContentRefineRequestSchema = z.object({
  content_id: z.string(),
  feedback: z.string().min(10)
});
