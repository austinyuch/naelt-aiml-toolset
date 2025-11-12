/**
 * ContentOrchestrator Unit Tests
 * 
 * Tests for content orchestrator that coordinates all services
 * Requirements: 3.1, 4.1
 */

import { ContentOrchestrator } from '../../../src/services/ContentOrchestrator.js';
import { NewsSearchService } from '../../../src/services/NewsSearchService.js';
import { ContentGenerationService } from '../../../src/services/ContentGenerationService.js';
import { TemplateManagementService } from '../../../src/services/TemplateManagementService.js';
import { NewsArticle, ContentVariant, PlatformType } from '../../../src/types/domain.js';

// Mock all services
jest.mock('../../../src/services/NewsSearchService.js');
jest.mock('../../../src/services/ContentGenerationService.js');
jest.mock('../../../src/services/TemplateManagementService.js');

describe('ContentOrchestrator', () => {
  let orchestrator: ContentOrchestrator;
  let mockNewsService: jest.Mocked<NewsSearchService>;
  let mockContentService: jest.Mocked<ContentGenerationService>;
  let mockTemplateService: jest.Mocked<TemplateManagementService>;

  const mockNewsArticles: NewsArticle[] = [
    {
      title: '司法改革新聞',
      source: '新聞來源',
      published_date: new Date('2025-11-12'),
      url: 'https://example.com/news/1',
      summary: '這是關於司法改革的新聞摘要'
    }
  ];

  const mockContentVariants: ContentVariant[] = [
    {
      text: '變體 1',
      image_suggestion: '圖片建議 1',
      hashtags: ['#標籤1', '#標籤2', '#標籤3', '#標籤4', '#標籤5'],
      metadata: { strategy: 'rational_analysis' }
    },
    {
      text: '變體 2',
      image_suggestion: '圖片建議 2',
      hashtags: ['#標籤1', '#標籤2', '#標籤3', '#標籤4', '#標籤5'],
      metadata: { strategy: 'emotional_resonance' }
    },
    {
      text: '變體 3',
      image_suggestion: '圖片建議 3',
      hashtags: ['#標籤1', '#標籤2', '#標籤3', '#標籤4', '#標籤5'],
      metadata: { strategy: 'call_to_action' }
    }
  ];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockNewsService = {
      searchNews: jest.fn().mockResolvedValue(mockNewsArticles)
    } as any;

    mockContentService = {
      generateContent: jest.fn().mockResolvedValue(mockContentVariants),
      refineContent: jest.fn().mockResolvedValue(mockContentVariants[0])
    } as any;

    mockTemplateService = {
      getTemplates: jest.fn().mockReturnValue([]),
      getTemplateById: jest.fn().mockReturnValue({
        template_id: 'victim_rights',
        name: '受害者權益',
        description: '測試描述',
        tone_guidelines: '測試指引',
        example_output: '測試範例'
      })
    } as any;

    // Create orchestrator instance
    orchestrator = new ContentOrchestrator(
      mockNewsService,
      mockContentService,
      mockTemplateService
    );
  });

  describe('orchestrateContentGeneration', () => {
    it('should orchestrate complete content generation flow', async () => {
      // Requirement 3.1: Orchestrate content generation
      const request = {
        user_input: '我認為應該加強受害者權益保護',
        topic_templates: ['victim_rights'],
        platform_type: 'instagram' as PlatformType,
        selected_news_urls: ['https://example.com/news/1']
      };

      const result = await orchestrator.orchestrateContentGeneration(request);

      expect(result).toBeDefined();
      expect(result.variants).toHaveLength(3);
      expect(result.generation_id).toBeTruthy();
    });

    it('should search news when news URLs provided', async () => {
      const request = {
        user_input: '測試觀點',
        topic_templates: ['victim_rights'],
        platform_type: 'instagram' as PlatformType,
        selected_news_urls: ['https://example.com/news/1']
      };

      await orchestrator.orchestrateContentGeneration(request);

      // Should call news service to fetch articles
      expect(mockNewsService.searchNews).toHaveBeenCalled();
    });

    it('should generate content with news context', async () => {
      const request = {
        user_input: '測試觀點',
        topic_templates: ['victim_rights'],
        platform_type: 'instagram' as PlatformType,
        selected_news_urls: ['https://example.com/news/1']
      };

      await orchestrator.orchestrateContentGeneration(request);

      // Should call content service with news context
      expect(mockContentService.generateContent).toHaveBeenCalledWith(
        request.user_input,
        request.topic_templates,
        request.platform_type,
        expect.any(Array) // news articles
      );
    });

    it('should generate content without news context', async () => {
      const request = {
        user_input: '測試觀點',
        topic_templates: ['victim_rights'],
        platform_type: 'instagram' as PlatformType,
        selected_news_urls: []
      };

      await orchestrator.orchestrateContentGeneration(request);

      // Should call content service with empty news array
      expect(mockContentService.generateContent).toHaveBeenCalledWith(
        request.user_input,
        request.topic_templates,
        request.platform_type,
        []
      );
    });

    it('should generate unique generation ID', async () => {
      const request = {
        user_input: '測試觀點',
        topic_templates: ['victim_rights'],
        platform_type: 'instagram' as PlatformType,
        selected_news_urls: []
      };

      const result1 = await orchestrator.orchestrateContentGeneration(request);
      const result2 = await orchestrator.orchestrateContentGeneration(request);

      expect(result1.generation_id).not.toBe(result2.generation_id);
    });

    it('should include generation metadata in response', async () => {
      const request = {
        user_input: '測試觀點',
        topic_templates: ['victim_rights'],
        platform_type: 'instagram' as PlatformType,
        selected_news_urls: []
      };

      const result = await orchestrator.orchestrateContentGeneration(request);

      expect(result).toHaveProperty('generation_id');
      expect(result).toHaveProperty('variants');
      expect(result.variants).toHaveLength(3);
    });

    it('should handle errors from news service', async () => {
      mockNewsService.searchNews.mockRejectedValue(new Error('News API error'));

      const request = {
        user_input: '測試觀點',
        topic_templates: ['victim_rights'],
        platform_type: 'instagram' as PlatformType,
        selected_news_urls: ['https://example.com/news/1']
      };

      await expect(
        orchestrator.orchestrateContentGeneration(request)
      ).rejects.toThrow('News API error');
    });

    it('should handle errors from content service', async () => {
      mockContentService.generateContent.mockRejectedValue(new Error('LLM error'));

      const request = {
        user_input: '測試觀點',
        topic_templates: ['victim_rights'],
        platform_type: 'instagram' as PlatformType,
        selected_news_urls: []
      };

      await expect(
        orchestrator.orchestrateContentGeneration(request)
      ).rejects.toThrow('LLM error');
    });
  });

  describe('service access', () => {
    it('should provide access to news service', () => {
      expect(orchestrator.newsService).toBe(mockNewsService);
    });

    it('should provide access to content service', () => {
      expect(orchestrator.contentService).toBe(mockContentService);
    });

    it('should provide access to template service', () => {
      expect(orchestrator.templateService).toBe(mockTemplateService);
    });
  });

  describe('dependency injection', () => {
    it('should accept all required services via constructor', () => {
      const newOrchestrator = new ContentOrchestrator(
        mockNewsService,
        mockContentService,
        mockTemplateService
      );

      expect(newOrchestrator).toBeDefined();
      expect(newOrchestrator.newsService).toBe(mockNewsService);
      expect(newOrchestrator.contentService).toBe(mockContentService);
      expect(newOrchestrator.templateService).toBe(mockTemplateService);
    });
  });
});
