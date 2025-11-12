import { CacheManager } from '../../../src/core/cache';
import { TopicTemplate, ContentVariant } from '../../../src/types/domain';
import fs from 'fs/promises';
import path from 'path';

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  const testCacheDir = '.cache-test';

  beforeEach(async () => {
    // Create a fresh cache manager for each test
    cacheManager = new CacheManager(testCacheDir);
    // Wait a bit for cache directory creation
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    // Clean up test cache directory
    try {
      await fs.rm(testCacheDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore errors if directory doesn't exist
    }
  });

  describe('L1 Cache - Template Cache', () => {
    it('should store and retrieve templates from L1 cache', () => {
      const template: TopicTemplate = {
        template_id: 'victim_rights',
        name: '受害者權益',
        description: '關注受害者權益的論述模板',
        tone_guidelines: '同理、支持、呼籲',
        example_output: '範例輸出...',
      };

      cacheManager.setTemplate('victim_rights', template);
      const retrieved = cacheManager.getTemplate('victim_rights');

      expect(retrieved).toEqual(template);
    });

    it('should return undefined for non-existent template', () => {
      const retrieved = cacheManager.getTemplate('non_existent');

      expect(retrieved).toBeUndefined();
    });

    it('should overwrite existing template', () => {
      const template1: TopicTemplate = {
        template_id: 'test',
        name: 'Test 1',
        description: 'First version',
        tone_guidelines: 'Tone 1',
        example_output: 'Example 1',
      };

      const template2: TopicTemplate = {
        template_id: 'test',
        name: 'Test 2',
        description: 'Second version',
        tone_guidelines: 'Tone 2',
        example_output: 'Example 2',
      };

      cacheManager.setTemplate('test', template1);
      cacheManager.setTemplate('test', template2);
      const retrieved = cacheManager.getTemplate('test');

      expect(retrieved).toEqual(template2);
      expect(retrieved?.name).toBe('Test 2');
    });

    it('should handle multiple templates', () => {
      const template1: TopicTemplate = {
        template_id: 'victim_rights',
        name: '受害者權益',
        description: 'Description 1',
        tone_guidelines: 'Tone 1',
        example_output: 'Example 1',
      };

      const template2: TopicTemplate = {
        template_id: 'anti_death_penalty',
        name: '反廢死',
        description: 'Description 2',
        tone_guidelines: 'Tone 2',
        example_output: 'Example 2',
      };

      cacheManager.setTemplate('victim_rights', template1);
      cacheManager.setTemplate('anti_death_penalty', template2);

      expect(cacheManager.getTemplate('victim_rights')).toEqual(template1);
      expect(cacheManager.getTemplate('anti_death_penalty')).toEqual(template2);
    });
  });

  describe('L2 Cache - File System Cache', () => {
    it('should store and retrieve content from L2 cache', async () => {
      const content: ContentVariant = {
        text: '這是測試內容',
        image_suggestion: '建議圖片',
        hashtags: ['#測試', '#內容'],
        metadata: { platform: 'instagram' },
      };

      await cacheManager.setCachedContent('content_123', content);
      const retrieved = await cacheManager.getCachedContent('content_123');

      expect(retrieved).toEqual(content);
    });

    it('should return null for non-existent content', async () => {
      const retrieved = await cacheManager.getCachedContent('non_existent');

      expect(retrieved).toBeNull();
    });

    it('should handle content with complex metadata', async () => {
      const content: ContentVariant = {
        text: '複雜內容',
        image_suggestion: '圖片建議',
        hashtags: ['#tag1', '#tag2', '#tag3'],
        metadata: {
          platform: 'facebook',
          topic: 'victim_rights',
          generated_at: '2025-11-12T10:00:00Z',
          variant_type: 'rational_analysis',
        },
      };

      await cacheManager.setCachedContent('content_456', content);
      const retrieved = await cacheManager.getCachedContent('content_456');

      expect(retrieved).toEqual(content);
      expect(retrieved?.metadata.platform).toBe('facebook');
      expect(retrieved?.metadata.topic).toBe('victim_rights');
    });

    it('should overwrite existing cached content', async () => {
      const content1: ContentVariant = {
        text: '第一版內容',
        image_suggestion: '圖片 1',
        hashtags: ['#v1'],
        metadata: {},
      };

      const content2: ContentVariant = {
        text: '第二版內容',
        image_suggestion: '圖片 2',
        hashtags: ['#v2'],
        metadata: {},
      };

      await cacheManager.setCachedContent('content_789', content1);
      await cacheManager.setCachedContent('content_789', content2);
      const retrieved = await cacheManager.getCachedContent('content_789');

      expect(retrieved).toEqual(content2);
      expect(retrieved?.text).toBe('第二版內容');
    });

    it('should create cache directory if it does not exist', async () => {
      const newCacheDir = '.cache-test-new';
      const newCacheManager = new CacheManager(newCacheDir);

      const content: ContentVariant = {
        text: '測試',
        image_suggestion: '圖片',
        hashtags: ['#test'],
        metadata: {},
      };

      await new Promise(resolve => setTimeout(resolve, 100));
      await newCacheManager.setCachedContent('test', content);

      // Verify directory was created
      const stats = await fs.stat(newCacheDir);
      expect(stats.isDirectory()).toBe(true);

      // Clean up
      await fs.rm(newCacheDir, { recursive: true, force: true });
    });

    it('should handle special characters in content ID', async () => {
      const content: ContentVariant = {
        text: '特殊字元測試',
        image_suggestion: '圖片',
        hashtags: ['#test'],
        metadata: {},
      };

      const contentId = 'content_with-special_chars_123';
      await cacheManager.setCachedContent(contentId, content);
      const retrieved = await cacheManager.getCachedContent(contentId);

      expect(retrieved).toEqual(content);
    });
  });

  describe('Cache Integration', () => {
    it('should handle both L1 and L2 cache independently', async () => {
      // L1 cache (template)
      const template: TopicTemplate = {
        template_id: 'test',
        name: 'Test Template',
        description: 'Test',
        tone_guidelines: 'Test',
        example_output: 'Test',
      };

      // L2 cache (content)
      const content: ContentVariant = {
        text: 'Test content',
        image_suggestion: 'Test image',
        hashtags: ['#test'],
        metadata: {},
      };

      cacheManager.setTemplate('test', template);
      await cacheManager.setCachedContent('test', content);

      const retrievedTemplate = cacheManager.getTemplate('test');
      const retrievedContent = await cacheManager.getCachedContent('test');

      expect(retrievedTemplate).toEqual(template);
      expect(retrievedContent).toEqual(content);
    });

    it('should use default cache directory when not specified', () => {
      const defaultCacheManager = new CacheManager();
      const template: TopicTemplate = {
        template_id: 'default',
        name: 'Default',
        description: 'Default',
        tone_guidelines: 'Default',
        example_output: 'Default',
      };

      defaultCacheManager.setTemplate('default', template);
      const retrieved = defaultCacheManager.getTemplate('default');

      expect(retrieved).toEqual(template);
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      const invalidCacheManager = new CacheManager('/invalid/path/that/cannot/be/created');

      // Should not throw, but return null
      const retrieved = await invalidCacheManager.getCachedContent('test');
      expect(retrieved).toBeNull();
    });

    it('should handle corrupted cache files', async () => {
      // Create a corrupted cache file
      const corruptedFile = path.join(testCacheDir, 'corrupted.json');
      await fs.mkdir(testCacheDir, { recursive: true });
      await fs.writeFile(corruptedFile, 'invalid json content');

      const retrieved = await cacheManager.getCachedContent('corrupted');
      expect(retrieved).toBeNull();
    });
  });
});
