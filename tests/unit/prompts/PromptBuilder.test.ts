import { PromptBuilder } from '../../../src/prompts/PromptBuilder';
import { PromptTemplateLoader } from '../../../src/prompts/PromptTemplateLoader';
import { NewsArticle } from '../../../src/types/domain';

// Mock PromptTemplateLoader
jest.mock('../../../src/prompts/PromptTemplateLoader');

describe('PromptBuilder', () => {
  let builder: PromptBuilder;
  let mockLoader: jest.Mocked<PromptTemplateLoader>;

  beforeEach(() => {
    mockLoader = new PromptTemplateLoader() as jest.Mocked<PromptTemplateLoader>;
    builder = new PromptBuilder(mockLoader);
    jest.clearAllMocks();
  });

  describe('buildPrompt', () => {
    it('should build a complete prompt with all components', async () => {
      // Arrange
      const topicTemplate = '主題: {user_input}\n新聞: {news_context}\n平台: {platform_requirements}\n變體: {variant_strategy}';
      const platformTemplate = 'Instagram 要求';
      const variantTemplate = '理性分析策略';

      mockLoader.loadTopicTemplate.mockResolvedValue(topicTemplate);
      mockLoader.loadPlatformTemplate.mockResolvedValue(platformTemplate);
      mockLoader.loadVariantTemplate.mockResolvedValue(variantTemplate);

      const newsArticles: NewsArticle[] = [
        {
          title: '測試新聞',
          source: '測試來源',
          published_date: new Date('2025-01-01'),
          url: 'https://example.com/news1',
          summary: '這是測試新聞摘要'
        }
      ];

      // Act
      const result = await builder.buildPrompt(
        'victim_rights',
        'instagram',
        '使用者觀點',
        newsArticles,
        'rational_analysis'
      );

      // Assert
      expect(result).toContain('使用者觀點');
      expect(result).toContain('Instagram 要求');
      expect(result).toContain('理性分析策略');
      expect(result).toContain('測試新聞');
      expect(mockLoader.loadTopicTemplate).toHaveBeenCalledWith('victim_rights');
      expect(mockLoader.loadPlatformTemplate).toHaveBeenCalledWith('instagram');
      expect(mockLoader.loadVariantTemplate).toHaveBeenCalledWith('rational_analysis');
    });

    it('should format news context correctly', async () => {
      // Arrange
      const topicTemplate = '{news_context}';
      mockLoader.loadTopicTemplate.mockResolvedValue(topicTemplate);
      mockLoader.loadPlatformTemplate.mockResolvedValue('');
      mockLoader.loadVariantTemplate.mockResolvedValue('');

      const newsArticles: NewsArticle[] = [
        {
          title: '新聞標題1',
          source: '來源1',
          published_date: new Date('2025-01-01'),
          url: 'https://example.com/1',
          summary: '摘要1'
        },
        {
          title: '新聞標題2',
          source: '來源2',
          published_date: new Date('2025-01-02'),
          url: 'https://example.com/2',
          summary: '摘要2'
        }
      ];

      // Act
      const result = await builder.buildPrompt(
        'victim_rights',
        'instagram',
        '觀點',
        newsArticles,
        'rational_analysis'
      );

      // Assert
      expect(result).toContain('新聞 1: 新聞標題1');
      expect(result).toContain('來源: 來源1');
      expect(result).toContain('摘要: 摘要1');
      expect(result).toContain('新聞 2: 新聞標題2');
      expect(result).toContain('來源: 來源2');
      expect(result).toContain('摘要: 摘要2');
    });

    it('should handle empty news context', async () => {
      // Arrange
      const topicTemplate = '{news_context}';
      mockLoader.loadTopicTemplate.mockResolvedValue(topicTemplate);
      mockLoader.loadPlatformTemplate.mockResolvedValue('');
      mockLoader.loadVariantTemplate.mockResolvedValue('');

      // Act
      const result = await builder.buildPrompt(
        'victim_rights',
        'instagram',
        '觀點',
        [],
        'rational_analysis'
      );

      // Assert
      expect(result).toBe('');
    });

    it('should replace all template variables', async () => {
      // Arrange
      const topicTemplate = 'User: {user_input}, News: {news_context}, Platform: {platform_requirements}, Variant: {variant_strategy}';
      mockLoader.loadTopicTemplate.mockResolvedValue(topicTemplate);
      mockLoader.loadPlatformTemplate.mockResolvedValue('平台要求');
      mockLoader.loadVariantTemplate.mockResolvedValue('變體策略');

      const newsArticles: NewsArticle[] = [
        {
          title: '新聞',
          source: '來源',
          published_date: new Date(),
          url: 'https://example.com',
          summary: '摘要'
        }
      ];

      // Act
      const result = await builder.buildPrompt(
        'victim_rights',
        'instagram',
        '我的觀點',
        newsArticles,
        'rational_analysis'
      );

      // Assert
      expect(result).toContain('User: 我的觀點');
      expect(result).toContain('Platform: 平台要求');
      expect(result).toContain('Variant: 變體策略');
      expect(result).not.toContain('{user_input}');
      expect(result).not.toContain('{platform_requirements}');
      expect(result).not.toContain('{variant_strategy}');
    });
  });

  describe('buildRefinePrompt', () => {
    it('should build a refine prompt with original content and feedback', async () => {
      // Arrange
      const refineTemplate = '原始內容: {original_content}\n反饋: {user_feedback}';
      mockLoader.loadRefineTemplate.mockResolvedValue(refineTemplate);

      const originalContent = {
        text: '原始論述內容',
        image_suggestion: '圖片建議',
        hashtags: ['標籤1', '標籤2'],
        metadata: {}
      };

      // Act
      const result = await builder.buildRefinePrompt(
        originalContent,
        '請讓內容更簡潔'
      );

      // Assert
      expect(result).toContain('原始論述內容');
      expect(result).toContain('請讓內容更簡潔');
      expect(mockLoader.loadRefineTemplate).toHaveBeenCalled();
    });

    it('should format original content as JSON string', async () => {
      // Arrange
      const refineTemplate = '{original_content}';
      mockLoader.loadRefineTemplate.mockResolvedValue(refineTemplate);

      const originalContent = {
        text: '內容',
        image_suggestion: '圖片',
        hashtags: ['標籤'],
        metadata: {}
      };

      // Act
      const result = await builder.buildRefinePrompt(
        originalContent,
        '反饋'
      );

      // Assert
      expect(result).toContain('"text"');
      expect(result).toContain('"image_suggestion"');
      expect(result).toContain('"hashtags"');
    });

    it('should handle multiline feedback', async () => {
      // Arrange
      const refineTemplate = '{user_feedback}';
      mockLoader.loadRefineTemplate.mockResolvedValue(refineTemplate);

      const originalContent = {
        text: '內容',
        image_suggestion: '圖片',
        hashtags: [],
        metadata: {}
      };

      const feedback = '第一行反饋\n第二行反饋\n第三行反饋';

      // Act
      const result = await builder.buildRefinePrompt(originalContent, feedback);

      // Assert
      expect(result).toContain('第一行反饋');
      expect(result).toContain('第二行反饋');
      expect(result).toContain('第三行反饋');
    });
  });

  describe('formatNewsContext', () => {
    it('should format single news article correctly', () => {
      // Arrange
      const newsArticles: NewsArticle[] = [
        {
          title: '測試標題',
          source: '測試來源',
          published_date: new Date('2025-01-15'),
          url: 'https://example.com/news',
          summary: '測試摘要內容'
        }
      ];

      // Act
      const result = (builder as any).formatNewsContext(newsArticles);

      // Assert
      expect(result).toContain('新聞 1: 測試標題');
      expect(result).toContain('來源: 測試來源');
      expect(result).toContain('摘要: 測試摘要內容');
      expect(result).toContain('連結: https://example.com/news');
    });

    it('should format multiple news articles with correct numbering', () => {
      // Arrange
      const newsArticles: NewsArticle[] = [
        {
          title: '標題1',
          source: '來源1',
          published_date: new Date('2025-01-01'),
          url: 'https://example.com/1',
          summary: '摘要1'
        },
        {
          title: '標題2',
          source: '來源2',
          published_date: new Date('2025-01-02'),
          url: 'https://example.com/2',
          summary: '摘要2'
        },
        {
          title: '標題3',
          source: '來源3',
          published_date: new Date('2025-01-03'),
          url: 'https://example.com/3',
          summary: '摘要3'
        }
      ];

      // Act
      const result = (builder as any).formatNewsContext(newsArticles);

      // Assert
      expect(result).toContain('新聞 1:');
      expect(result).toContain('新聞 2:');
      expect(result).toContain('新聞 3:');
    });

    it('should return empty string for empty news array', () => {
      // Arrange
      const newsArticles: NewsArticle[] = [];

      // Act
      const result = (builder as any).formatNewsContext(newsArticles);

      // Assert
      expect(result).toBe('');
    });

    it('should format date correctly', () => {
      // Arrange
      const newsArticles: NewsArticle[] = [
        {
          title: '標題',
          source: '來源',
          published_date: new Date('2025-01-15T10:30:00Z'),
          url: 'https://example.com',
          summary: '摘要'
        }
      ];

      // Act
      const result = (builder as any).formatNewsContext(newsArticles);

      // Assert
      expect(result).toContain('日期:');
      expect(result).toMatch(/2025/);
    });
  });

  describe('integration scenarios', () => {
    it('should build prompts for all topic and platform combinations', async () => {
      // Arrange
      const topics = ['victim_rights', 'anti_death_penalty', 'judicial_injustice'];
      const platforms = ['instagram', 'facebook', 'line'];
      const variants = ['rational_analysis', 'emotional_resonance', 'call_to_action'];

      mockLoader.loadTopicTemplate.mockResolvedValue('Topic: {user_input}');
      mockLoader.loadPlatformTemplate.mockResolvedValue('Platform');
      mockLoader.loadVariantTemplate.mockResolvedValue('Variant');

      // Act
      const promises = [];
      for (const topic of topics) {
        for (const platform of platforms) {
          for (const variant of variants) {
            promises.push(
              builder.buildPrompt(topic, platform, '觀點', [], variant)
            );
          }
        }
      }

      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(27); // 3 * 3 * 3
      results.forEach(result => {
        expect(result).toBeTruthy();
        expect(result).toContain('觀點');
      });
    });
  });
});
