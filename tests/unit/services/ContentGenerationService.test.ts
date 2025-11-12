/**
 * ContentGenerationService Unit Tests
 * 
 * Tests for content generation service with mock LLM
 * Requirements: 3.1, 3.4, 3.5, 4.1, 4.3, 8.4, 8.5
 */

import { ContentGenerationService } from '../../../src/services/ContentGenerationService.js';
import { BedrockClient } from '../../../src/clients/BedrockClient.js';
import { PromptBuilder } from '../../../src/prompts/PromptBuilder.js';
import { PromptTemplateLoader } from '../../../src/prompts/PromptTemplateLoader.js';
import { NewsArticle, ContentVariant, PlatformType } from '../../../src/types/domain.js';
import { RateLimiter } from '../../../src/core/rateLimiter.js';

// Mock dependencies
jest.mock('../../../src/clients/BedrockClient.js');
jest.mock('../../../src/prompts/PromptBuilder.js');
jest.mock('../../../src/prompts/PromptTemplateLoader.js');
jest.mock('../../../src/core/rateLimiter.js');

describe('ContentGenerationService', () => {
  let service: ContentGenerationService;
  let mockBedrockClient: jest.Mocked<BedrockClient>;
  let mockPromptBuilder: jest.Mocked<PromptBuilder>;
  let mockRateLimiter: jest.Mocked<RateLimiter>;

  const mockNewsArticles: NewsArticle[] = [
    {
      title: '司法改革新聞',
      source: '新聞來源',
      published_date: new Date('2025-11-12'),
      url: 'https://example.com/news/1',
      summary: '這是關於司法改革的新聞摘要'
    }
  ];

  const mockLLMResponse = JSON.stringify({
    text: '這是生成的論述內容，關注受害者權益，呼籲司法改革。',
    image_suggestion: '建議使用受害者家屬的照片或司法天秤的圖像',
    hashtags: ['#司法改革', '#受害者權益', '#正義', '#法治', '#人權']
  });

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockBedrockClient = new BedrockClient() as jest.Mocked<BedrockClient>;
    const mockLoader = new PromptTemplateLoader() as jest.Mocked<PromptTemplateLoader>;
    mockPromptBuilder = new PromptBuilder(mockLoader) as jest.Mocked<PromptBuilder>;
    mockRateLimiter = new RateLimiter() as jest.Mocked<RateLimiter>;

    // Setup default mock behavior
    mockPromptBuilder.buildPrompt = jest.fn().mockResolvedValue('Mock prompt');
    mockPromptBuilder.buildRefinePrompt = jest.fn().mockResolvedValue('Mock refine prompt');
    mockBedrockClient.generateCompletion = jest.fn().mockResolvedValue(mockLLMResponse);
    mockRateLimiter.checkRefineLimit = jest.fn().mockReturnValue(true);

    // Create service instance
    service = new ContentGenerationService(
      mockBedrockClient,
      mockPromptBuilder,
      mockRateLimiter
    );
  });

  describe('generateContent', () => {
    it('should generate 3 content variants', async () => {
      // Requirement 3.4: Generate 3 Content_Variant items
      const result = await service.generateContent(
        '我認為應該加強受害者權益保護',
        ['victim_rights'],
        'instagram',
        mockNewsArticles
      );

      expect(result).toHaveLength(3);
      expect(mockBedrockClient.generateCompletion).toHaveBeenCalledTimes(3);
    });

    it('should include all required fields in each variant', async () => {
      // Requirement 3.5: Include text, image_suggestion, hashtags, and metadata fields
      const result = await service.generateContent(
        '測試觀點',
        ['victim_rights'],
        'instagram',
        mockNewsArticles
      );

      result.forEach(variant => {
        expect(variant).toHaveProperty('text');
        expect(variant).toHaveProperty('image_suggestion');
        expect(variant).toHaveProperty('hashtags');
        expect(variant).toHaveProperty('metadata');
        expect(Array.isArray(variant.hashtags)).toBe(true);
        expect(typeof variant.metadata).toBe('object');
      });
    });

    it('should use different variant strategies', async () => {
      // Requirement 3.4: Generate variants with different tones and angles
      await service.generateContent(
        '測試觀點',
        ['victim_rights'],
        'instagram',
        mockNewsArticles
      );

      // Should call buildPrompt with different strategies
      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledTimes(3);
      
      const calls = (mockPromptBuilder.buildPrompt as jest.Mock).mock.calls;
      const strategies = calls.map(call => call[4]); // 5th parameter is variantStrategy
      
      // Should have 3 different strategies
      expect(new Set(strategies).size).toBe(3);
    });

    it('should validate platform format for Instagram', async () => {
      // Requirement 8.1: Instagram format with 5-15 hashtags
      const result = await service.generateContent(
        '測試觀點',
        ['victim_rights'],
        'instagram',
        mockNewsArticles
      );

      result.forEach(variant => {
        expect(variant.hashtags.length).toBeGreaterThanOrEqual(5);
        expect(variant.hashtags.length).toBeLessThanOrEqual(15);
      });
    });

    it('should validate platform format for Facebook', async () => {
      // Requirement 8.2: Facebook format with max 2000 characters
      const result = await service.generateContent(
        '測試觀點',
        ['victim_rights'],
        'facebook',
        mockNewsArticles
      );

      result.forEach(variant => {
        expect(variant.text.length).toBeLessThanOrEqual(2000);
      });
    });

    it('should validate platform format for LINE', async () => {
      // Requirement 8.3: LINE format with max 200 characters and 0-3 hashtags
      const lineResponse = JSON.stringify({
        text: '簡短的 LINE 訊息',
        image_suggestion: '圖片建議',
        hashtags: ['#標籤1', '#標籤2'] // 2 hashtags, within 0-3 range
      });
      
      mockBedrockClient.generateCompletion.mockResolvedValue(lineResponse);
      
      const result = await service.generateContent(
        '測試觀點',
        ['victim_rights'],
        'line',
        mockNewsArticles
      );

      result.forEach(variant => {
        expect(variant.text.length).toBeLessThanOrEqual(200);
        expect(variant.hashtags.length).toBeLessThanOrEqual(3);
      });
    });

    it('should handle LLM errors gracefully', async () => {
      mockBedrockClient.generateCompletion.mockRejectedValue(new Error('LLM error'));

      await expect(
        service.generateContent(
          '測試觀點',
          ['victim_rights'],
          'instagram',
          mockNewsArticles
        )
      ).rejects.toThrow('LLM error');
    });

    it('should validate user input is not empty', async () => {
      await expect(
        service.generateContent(
          '',
          ['victim_rights'],
          'instagram',
          mockNewsArticles
        )
      ).rejects.toThrow();
    });

    it('should validate topic templates array', async () => {
      await expect(
        service.generateContent(
          '測試觀點',
          [],
          'instagram',
          mockNewsArticles
        )
      ).rejects.toThrow();
    });

    it('should handle invalid JSON response from LLM', async () => {
      mockBedrockClient.generateCompletion.mockResolvedValue('Invalid JSON');

      await expect(
        service.generateContent(
          '測試觀點',
          ['victim_rights'],
          'instagram',
          mockNewsArticles
        )
      ).rejects.toThrow();
    });
  });

  describe('refineContent', () => {
    const mockOriginalContent: ContentVariant = {
      text: '原始內容',
      image_suggestion: '原始圖片建議',
      hashtags: ['#原始標籤'],
      metadata: { generation_id: 'test_123' }
    };

    const mockRefinedResponse = JSON.stringify({
      text: '精煉後的內容',
      image_suggestion: '更新的圖片建議',
      hashtags: ['#更新標籤']
    });

    beforeEach(() => {
      mockBedrockClient.generateCompletion.mockResolvedValue(mockRefinedResponse);
    });

    it('should refine content based on feedback', async () => {
      // Requirement 4.1: Refine content based on user feedback
      // Requirement 4.2: Feedback must be at least 10 characters
      const feedback = '請讓語氣更溫和一些，增加同理心';
      
      const result = await service.refineContent(
        mockOriginalContent,
        feedback
      );

      expect(result.text).toBe('精煉後的內容');
      expect(mockPromptBuilder.buildRefinePrompt).toHaveBeenCalledWith(
        mockOriginalContent,
        feedback
      );
    });

    it('should check rate limit before refining', async () => {
      // Requirement 4.4: Limit refinement iterations to 5 per hour
      const contentId = 'test_content_123';
      mockOriginalContent.metadata.content_id = contentId;
      const feedback = '測試反饋，這是足夠長的反饋內容';

      await service.refineContent(mockOriginalContent, feedback);

      expect(mockRateLimiter.checkRefineLimit).toHaveBeenCalledWith(contentId);
    });

    it('should throw error when rate limit exceeded', async () => {
      // Requirement 4.5: Return HTTP 429 when refinement limit exceeded
      mockRateLimiter.checkRefineLimit.mockReturnValue(false);
      mockOriginalContent.metadata.content_id = 'test_123';
      const feedback = '測試反饋，這是足夠長的反饋內容';

      await expect(
        service.refineContent(mockOriginalContent, feedback)
      ).rejects.toThrow('Refinement limit exceeded');
    });

    it('should maintain original metadata during refinement', async () => {
      // Requirement 4.3: Maintain original Topic_Template and Platform_Type
      const feedback = '測試反饋，這是足夠長的反饋內容';
      
      const result = await service.refineContent(
        mockOriginalContent,
        feedback
      );

      // Should maintain original metadata fields
      expect(result.metadata.generation_id).toBe(mockOriginalContent.metadata.generation_id);
    });

    it('should validate feedback is not empty', async () => {
      await expect(
        service.refineContent(mockOriginalContent, '')
      ).rejects.toThrow();
    });

    it('should validate feedback minimum length', async () => {
      // Requirement 4.2: Accept feedback with minimum 10 characters
      await expect(
        service.refineContent(mockOriginalContent, '太短')
      ).rejects.toThrow();
    });

    it('should handle LLM errors during refinement', async () => {
      mockBedrockClient.generateCompletion.mockRejectedValue(new Error('LLM error'));

      await expect(
        service.refineContent(mockOriginalContent, '測試反饋，這是足夠長的反饋')
      ).rejects.toThrow('LLM error');
    });
  });

  describe('platform validation', () => {
    it('should validate Instagram hashtag count', async () => {
      const invalidResponse = JSON.stringify({
        text: '測試內容',
        image_suggestion: '圖片建議',
        hashtags: ['#1', '#2', '#3'] // Only 3 hashtags, less than minimum 5
      });

      mockBedrockClient.generateCompletion.mockResolvedValue(invalidResponse);

      await expect(
        service.generateContent(
          '測試觀點',
          ['victim_rights'],
          'instagram',
          mockNewsArticles
        )
      ).rejects.toThrow();
    });

    it('should validate Facebook text length', async () => {
      const longText = 'a'.repeat(2100); // Exceeds 2000 character limit
      const invalidResponse = JSON.stringify({
        text: longText,
        image_suggestion: '圖片建議',
        hashtags: ['#標籤']
      });

      mockBedrockClient.generateCompletion.mockResolvedValue(invalidResponse);

      await expect(
        service.generateContent(
          '測試觀點',
          ['victim_rights'],
          'facebook',
          mockNewsArticles
        )
      ).rejects.toThrow();
    });

    it('should validate LINE text length', async () => {
      const longText = 'a'.repeat(250); // Exceeds 200 character limit
      const invalidResponse = JSON.stringify({
        text: longText,
        image_suggestion: '圖片建議',
        hashtags: ['#標籤']
      });

      mockBedrockClient.generateCompletion.mockResolvedValue(invalidResponse);

      await expect(
        service.generateContent(
          '測試觀點',
          ['victim_rights'],
          'line',
          mockNewsArticles
        )
      ).rejects.toThrow();
    });
  });
});
