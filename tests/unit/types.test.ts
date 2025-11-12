/**
 * Type Definitions Tests
 * 
 * Tests for TypeScript type definitions and Zod schemas
 * Requirements: 2.2, 3.2, 4.2, 5.2, 9.2
 */

import { z } from 'zod';
import type { NewsSearchResponse, ContentGenerationResponse, ErrorResponse } from '../../src/types/responses.js';
import type { NewsArticle, ContentVariant, TopicTemplate, PlatformType } from '../../src/types/domain.js';

describe('Request Types', () => {
  describe('NewsSearchRequest', () => {
    it('should validate valid news search request', () => {
      const { NewsSearchRequestSchema } = require('../../src/types/requests');
      
      const validRequest = {
        keywords: ['司法', '受害者']
      };

      expect(() => NewsSearchRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should reject request with no keywords', () => {
      const { NewsSearchRequestSchema } = require('../../src/types/requests');
      
      const invalidRequest = {
        keywords: []
      };

      expect(() => NewsSearchRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should reject request with more than 10 keywords', () => {
      const { NewsSearchRequestSchema } = require('../../src/types/requests');
      
      const invalidRequest = {
        keywords: Array(11).fill('keyword')
      };

      expect(() => NewsSearchRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('ContentGenerationRequest', () => {
    it('should validate valid content generation request', () => {
      const { ContentGenerationRequestSchema } = require('../../src/types/requests');
      
      const validRequest = {
        user_input: '測試觀點',
        topic_templates: ['victim_rights'],
        platform_type: 'instagram',
        selected_news_urls: ['https://example.com/news1']
      };

      expect(() => ContentGenerationRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should reject invalid platform type', () => {
      const { ContentGenerationRequestSchema } = require('../../src/types/requests');
      
      const invalidRequest = {
        user_input: '測試觀點',
        topic_templates: ['victim_rights'],
        platform_type: 'invalid_platform',
        selected_news_urls: []
      };

      expect(() => ContentGenerationRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should validate all valid platform types', () => {
      const { ContentGenerationRequestSchema } = require('../../src/types/requests');
      
      const platforms = ['instagram', 'facebook', 'line'];
      
      platforms.forEach(platform => {
        const request = {
          user_input: '測試觀點',
          topic_templates: ['victim_rights'],
          platform_type: platform,
          selected_news_urls: []
        };

        expect(() => ContentGenerationRequestSchema.parse(request)).not.toThrow();
      });
    });

    it('should validate all valid topic templates', () => {
      const { ContentGenerationRequestSchema } = require('../../src/types/requests');
      
      const topics = ['victim_rights', 'anti_death_penalty', 'judicial_injustice'];
      
      topics.forEach(topic => {
        const request = {
          user_input: '測試觀點',
          topic_templates: [topic],
          platform_type: 'instagram',
          selected_news_urls: []
        };

        expect(() => ContentGenerationRequestSchema.parse(request)).not.toThrow();
      });
    });
  });

  describe('ContentRefineRequest', () => {
    it('should validate valid refine request', () => {
      const { ContentRefineRequestSchema } = require('../../src/types/requests');
      
      const validRequest = {
        content_id: 'content_123',
        feedback: '請調整語氣更溫和一些'
      };

      expect(() => ContentRefineRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should reject feedback with less than 10 characters', () => {
      const { ContentRefineRequestSchema } = require('../../src/types/requests');
      
      const invalidRequest = {
        content_id: 'content_123',
        feedback: '太短'
      };

      expect(() => ContentRefineRequestSchema.parse(invalidRequest)).toThrow();
    });
  });
});

describe('Response Types', () => {
  describe('NewsSearchResponse', () => {
    it('should have correct structure', () => {
      const response: NewsSearchResponse = {
        results: [
          {
            title: '測試新聞',
            source: '測試來源',
            published_date: new Date(),
            url: 'https://example.com/news',
            summary: '測試摘要'
          }
        ],
        total: 1
      };

      expect(response.results).toHaveLength(1);
      expect(response.total).toBe(1);
    });
  });

  describe('ContentGenerationResponse', () => {
    it('should have correct structure with 3 variants', () => {
      const response: ContentGenerationResponse = {
        variants: [
          {
            text: '變體1',
            image_suggestion: '圖片建議1',
            hashtags: ['標籤1', '標籤2'],
            metadata: {}
          },
          {
            text: '變體2',
            image_suggestion: '圖片建議2',
            hashtags: ['標籤3', '標籤4'],
            metadata: {}
          },
          {
            text: '變體3',
            image_suggestion: '圖片建議3',
            hashtags: ['標籤5', '標籤6'],
            metadata: {}
          }
        ],
        generation_id: 'gen_123'
      };

      expect(response.variants).toHaveLength(3);
      expect(response.generation_id).toBeTruthy();
    });
  });

  describe('ErrorResponse', () => {
    it('should have correct structure', () => {
      const response: ErrorResponse = {
        error: 'ValidationError',
        detail: 'Invalid request',
        request_id: 'req_123',
        timestamp: new Date().toISOString()
      };

      expect(response.error).toBe('ValidationError');
      expect(response.detail).toBeTruthy();
      expect(response.request_id).toBeTruthy();
      expect(response.timestamp).toBeTruthy();
    });

    it('should support optional retry_after field', () => {
      const response: ErrorResponse = {
        error: 'RateLimitExceeded',
        detail: 'Too many requests',
        request_id: 'req_123',
        timestamp: new Date().toISOString(),
        retry_after: 60
      };

      expect(response.retry_after).toBe(60);
    });
  });
});

describe('Domain Types', () => {
  describe('NewsArticle', () => {
    it('should have all required fields', () => {
      const article: NewsArticle = {
        title: '測試新聞標題',
        source: '測試來源',
        published_date: new Date(),
        url: 'https://example.com/news',
        summary: '測試新聞摘要'
      };

      expect(article.title).toBeTruthy();
      expect(article.source).toBeTruthy();
      expect(article.published_date).toBeInstanceOf(Date);
      expect(article.url).toBeTruthy();
      expect(article.summary).toBeTruthy();
    });
  });

  describe('ContentVariant', () => {
    it('should have all required fields', () => {
      const variant: ContentVariant = {
        text: '論述內容',
        image_suggestion: '建議圖片描述',
        hashtags: ['標籤1', '標籤2', '標籤3'],
        metadata: {
          variant_type: 'rational_analysis',
          word_count: 500
        }
      };

      expect(variant.text).toBeTruthy();
      expect(variant.image_suggestion).toBeTruthy();
      expect(variant.hashtags).toBeInstanceOf(Array);
      expect(variant.metadata).toBeInstanceOf(Object);
    });
  });

  describe('TopicTemplate', () => {
    it('should have all required fields', () => {
      const template: TopicTemplate = {
        template_id: 'victim_rights',
        name: '受害者權益',
        description: '關注受害者權益的論述模板',
        tone_guidelines: '同理、支持、倡議',
        example_output: '範例輸出內容'
      };

      expect(template.template_id).toBeTruthy();
      expect(template.name).toBeTruthy();
      expect(template.description).toBeTruthy();
      expect(template.tone_guidelines).toBeTruthy();
      expect(template.example_output).toBeTruthy();
    });
  });

  describe('PlatformType', () => {
    it('should only allow valid platform types', () => {
      const validPlatforms: PlatformType[] = ['instagram', 'facebook', 'line'];
      
      validPlatforms.forEach(platform => {
        const p: PlatformType = platform;
        expect(['instagram', 'facebook', 'line']).toContain(p);
      });
    });
  });
});

describe('Zod Schema Validation', () => {
  describe('NewsSearchRequestSchema', () => {
    it('should validate keyword array length', () => {
      const { NewsSearchRequestSchema } = require('../../src/types/requests');
      
      // Valid: 1 keyword
      expect(() => NewsSearchRequestSchema.parse({ keywords: ['test'] })).not.toThrow();
      
      // Valid: 10 keywords
      expect(() => NewsSearchRequestSchema.parse({ 
        keywords: Array(10).fill('test') 
      })).not.toThrow();
      
      // Invalid: 0 keywords
      expect(() => NewsSearchRequestSchema.parse({ keywords: [] })).toThrow();
      
      // Invalid: 11 keywords
      expect(() => NewsSearchRequestSchema.parse({ 
        keywords: Array(11).fill('test') 
      })).toThrow();
    });
  });

  describe('ContentGenerationRequestSchema', () => {
    it('should validate required fields', () => {
      const { ContentGenerationRequestSchema } = require('../../src/types/requests');
      
      const validRequest = {
        user_input: '測試觀點',
        topic_templates: ['victim_rights'],
        platform_type: 'instagram',
        selected_news_urls: []
      };

      expect(() => ContentGenerationRequestSchema.parse(validRequest)).not.toThrow();
    });

    it('should reject missing required fields', () => {
      const { ContentGenerationRequestSchema } = require('../../src/types/requests');
      
      const invalidRequest = {
        user_input: '測試觀點',
        // missing topic_templates
        platform_type: 'instagram',
        selected_news_urls: []
      };

      expect(() => ContentGenerationRequestSchema.parse(invalidRequest)).toThrow();
    });

    it('should validate URL format in selected_news_urls', () => {
      const { ContentGenerationRequestSchema } = require('../../src/types/requests');
      
      const invalidRequest = {
        user_input: '測試觀點',
        topic_templates: ['victim_rights'],
        platform_type: 'instagram',
        selected_news_urls: ['not-a-valid-url']
      };

      expect(() => ContentGenerationRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('ContentRefineRequestSchema', () => {
    it('should validate feedback minimum length', () => {
      const { ContentRefineRequestSchema } = require('../../src/types/requests');
      
      // Valid: 10 characters
      expect(() => ContentRefineRequestSchema.parse({
        content_id: 'test',
        feedback: '1234567890'
      })).not.toThrow();
      
      // Invalid: 9 characters
      expect(() => ContentRefineRequestSchema.parse({
        content_id: 'test',
        feedback: '123456789'
      })).toThrow();
    });
  });
});
