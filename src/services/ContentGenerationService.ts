/**
 * Content Generation Service
 * 
 * Service for generating and refining advocacy content
 * Requirements: 3.1, 3.4, 3.5, 4.1, 4.3, 8.4, 8.5
 */

import { BedrockClient } from '../clients/BedrockClient.js';
import { PromptBuilder } from '../prompts/PromptBuilder.js';
import { RateLimiter } from '../core/rateLimiter.js';
import { NewsArticle, ContentVariant, PlatformType } from '../types/domain.js';
import { RateLimitExceeded } from '../core/exceptions.js';

/**
 * Variant strategies for content generation
 */
const VARIANT_STRATEGIES = [
  'rational_analysis',    // 理性分析
  'emotional_resonance',  // 情感共鳴
  'call_to_action'        // 行動呼籲
] as const;

/**
 * Platform format requirements
 */
const PLATFORM_REQUIREMENTS = {
  instagram: {
    maxLength: 2200,
    hashtagRange: { min: 5, max: 15 }
  },
  facebook: {
    maxLength: 2000,
    hashtagRange: { min: 0, max: 5 }
  },
  line: {
    maxLength: 200,
    hashtagRange: { min: 0, max: 3 }
  }
} as const;

/**
 * Content Generation Service
 * 
 * Orchestrates content generation and refinement using LLM
 */
export class ContentGenerationService {
  private bedrockClient: BedrockClient;
  private promptBuilder: PromptBuilder;
  private rateLimiter: RateLimiter;

  /**
   * Creates a new ContentGenerationService
   * 
   * @param bedrockClient - Bedrock client for LLM calls
   * @param promptBuilder - Prompt builder for constructing prompts
   * @param rateLimiter - Rate limiter for refinement operations
   */
  constructor(
    bedrockClient: BedrockClient,
    promptBuilder: PromptBuilder,
    rateLimiter: RateLimiter
  ) {
    this.bedrockClient = bedrockClient;
    this.promptBuilder = promptBuilder;
    this.rateLimiter = rateLimiter;
  }

  /**
   * Generate content variants
   * 
   * Requirement 3.1: Generate content within 30000ms
   * Requirement 3.4: Generate 3 Content_Variant items with different tones
   * Requirement 3.5: Include text, image_suggestion, hashtags, and metadata
   * Requirement 8.4: Include platform-specific formatting metadata
   * Requirement 8.5: Validate generated content length against platform constraints
   * 
   * @param userInput - User's viewpoint and direction
   * @param topicTemplates - Array of topic template IDs
   * @param platformType - Target platform (instagram, facebook, line)
   * @param newsContext - Array of news articles for context
   * @returns Promise resolving to array of 3 content variants
   * @throws Error if validation fails or LLM call fails
   */
  async generateContent(
    userInput: string,
    topicTemplates: string[],
    platformType: PlatformType,
    newsContext: NewsArticle[]
  ): Promise<ContentVariant[]> {
    // Validate input
    this.validateGenerationInput(userInput, topicTemplates);

    // Generate 3 variants with different strategies
    const variants: ContentVariant[] = [];

    for (const strategy of VARIANT_STRATEGIES) {
      // Build prompt for this variant
      const prompt = await this.promptBuilder.buildPrompt(
        topicTemplates[0], // Use first topic template
        platformType,
        userInput,
        newsContext,
        strategy
      );

      // Generate content using LLM
      const llmResponse = await this.bedrockClient.generateCompletion(
        prompt,
        0.7,  // Requirement 7.4: Temperature 0.7
        4096  // Requirement 7.5: Max tokens
      );

      // Parse LLM response
      const variant = this.parseLLMResponse(llmResponse);

      // Validate platform format
      this.validatePlatformFormat(variant, platformType);

      // Add metadata
      variant.metadata = {
        ...variant.metadata,
        platform: platformType,
        topic: topicTemplates[0],
        strategy,
        generated_at: new Date().toISOString()
      };

      variants.push(variant);
    }

    return variants;
  }

  /**
   * Refine content based on user feedback
   * 
   * Requirement 4.1: Refine content within 20000ms
   * Requirement 4.2: Accept feedback with minimum 10 characters
   * Requirement 4.3: Maintain original Topic_Template and Platform_Type
   * Requirement 4.4: Limit refinement iterations to 5 per hour
   * 
   * @param originalContent - Original content variant to refine
   * @param feedback - User feedback describing requested changes
   * @returns Promise resolving to refined content variant
   * @throws RateLimitExceeded if refinement limit exceeded
   * @throws Error if validation fails or LLM call fails
   */
  async refineContent(
    originalContent: ContentVariant,
    feedback: string
  ): Promise<ContentVariant> {
    // Validate input
    this.validateRefinementInput(feedback);

    // Check rate limit
    const contentId = originalContent.metadata?.content_id || 'unknown';
    if (!this.rateLimiter.checkRefineLimit(contentId)) {
      throw new RateLimitExceeded(
        'Refinement limit exceeded (5 per hour)',
        'rate_limit_exceeded'
      );
    }

    // Build refine prompt
    const prompt = await this.promptBuilder.buildRefinePrompt(
      originalContent,
      feedback
    );

    // Generate refined content using LLM
    const llmResponse = await this.bedrockClient.generateCompletion(
      prompt,
      0.7,
      4096
    );

    // Parse LLM response
    const refinedVariant = this.parseLLMResponse(llmResponse);

    // Requirement 4.3: Maintain original metadata
    refinedVariant.metadata = {
      ...originalContent.metadata,
      refined_at: new Date().toISOString(),
      feedback
    };

    // Validate platform format if platform info is available
    if (originalContent.metadata?.platform) {
      this.validatePlatformFormat(
        refinedVariant,
        originalContent.metadata.platform as PlatformType
      );
    }

    return refinedVariant;
  }

  /**
   * Validate generation input parameters
   * 
   * @param userInput - User input
   * @param topicTemplates - Topic templates
   * @throws Error if validation fails
   * @private
   */
  private validateGenerationInput(
    userInput: string,
    topicTemplates: string[]
  ): void {
    if (!userInput || userInput.trim() === '') {
      throw new Error('User input cannot be empty');
    }

    if (!topicTemplates || topicTemplates.length === 0) {
      throw new Error('Topic templates array cannot be empty');
    }
  }

  /**
   * Validate refinement input parameters
   * 
   * Requirement 4.2: Accept feedback with minimum 10 characters
   * 
   * @param feedback - User feedback
   * @throws Error if validation fails
   * @private
   */
  private validateRefinementInput(feedback: string): void {
    if (!feedback || feedback.trim() === '') {
      throw new Error('Feedback cannot be empty');
    }

    if (feedback.trim().length < 10) {
      throw new Error('Feedback must be at least 10 characters');
    }
  }

  /**
   * Parse LLM response JSON
   * 
   * @param llmResponse - Raw LLM response string
   * @returns Parsed content variant
   * @throws Error if JSON parsing fails or required fields missing
   * @private
   */
  private parseLLMResponse(llmResponse: string): ContentVariant {
    try {
      const parsed = JSON.parse(llmResponse);

      // Validate required fields
      if (!parsed.text || !parsed.image_suggestion || !parsed.hashtags) {
        throw new Error('LLM response missing required fields');
      }

      if (!Array.isArray(parsed.hashtags)) {
        throw new Error('Hashtags must be an array');
      }

      return {
        text: parsed.text,
        image_suggestion: parsed.image_suggestion,
        hashtags: parsed.hashtags,
        metadata: parsed.metadata || {}
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Failed to parse LLM response as JSON');
      }
      throw error;
    }
  }

  /**
   * Validate platform format requirements
   * 
   * Requirement 8.1: Instagram with 5-15 hashtags
   * Requirement 8.2: Facebook with max 2000 characters
   * Requirement 8.3: LINE with max 200 characters
   * Requirement 8.5: Validate content length against platform constraints
   * 
   * @param variant - Content variant to validate
   * @param platform - Target platform
   * @throws Error if validation fails
   * @private
   */
  private validatePlatformFormat(
    variant: ContentVariant,
    platform: PlatformType
  ): void {
    const requirements = PLATFORM_REQUIREMENTS[platform];

    // Validate text length
    if (variant.text.length > requirements.maxLength) {
      throw new Error(
        `Content exceeds ${platform} maximum length of ${requirements.maxLength} characters`
      );
    }

    // Validate hashtag count
    const hashtagCount = variant.hashtags.length;
    if (hashtagCount < requirements.hashtagRange.min) {
      throw new Error(
        `${platform} requires at least ${requirements.hashtagRange.min} hashtags`
      );
    }

    if (hashtagCount > requirements.hashtagRange.max) {
      throw new Error(
        `${platform} allows maximum ${requirements.hashtagRange.max} hashtags`
      );
    }
  }
}
