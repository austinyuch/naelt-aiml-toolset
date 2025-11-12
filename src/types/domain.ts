/**
 * Domain Model Type Definitions
 * 
 * Core domain models for the application
 * Requirements: 2.4, 3.5, 5.2, 5.3, 8.1, 8.2, 8.3
 */

/**
 * Platform Type
 * Requirement 8.1, 8.2, 8.3: Support for Instagram, Facebook, and LINE platforms
 */
export type PlatformType = 'instagram' | 'facebook' | 'line';

/**
 * News Article
 * Requirement 2.4: Include title, source, published_date, url, and summary fields
 */
export interface NewsArticle {
  title: string;
  source: string;
  published_date: Date;
  url: string;
  summary: string;
}

/**
 * Content Variant
 * Requirement 3.5: Include text, image_suggestion, hashtags, and metadata fields
 */
export interface ContentVariant {
  text: string;
  image_suggestion: string;
  hashtags: string[];
  metadata: Record<string, any>;
}

/**
 * Topic Template
 * Requirement 5.2: Return JSON array with template_id, name, description, and tone_guidelines fields
 * Requirement 5.3: Provide templates for victim_rights, anti_death_penalty, and judicial_injustice topics
 */
export interface TopicTemplate {
  template_id: string;
  name: string;
  description: string;
  tone_guidelines: string;
  example_output: string;
}
