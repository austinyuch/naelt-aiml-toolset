import { PromptTemplateLoader } from '../../../src/prompts/PromptTemplateLoader';
import fs from 'fs/promises';
import path from 'path';

// Mock fs module
jest.mock('fs/promises');

describe('PromptTemplateLoader', () => {
  let loader: PromptTemplateLoader;
  const mockTemplatesDir = './prompts';

  beforeEach(() => {
    loader = new PromptTemplateLoader(mockTemplatesDir);
    jest.clearAllMocks();
  });

  describe('loadTemplate', () => {
    it('should load a template from file system', async () => {
      // Arrange
      const mockContent = '# Test Template\n\nThis is a test template.';
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      // Act
      const result = await loader.loadTemplate('topics', 'victim_rights');

      // Assert
      expect(result).toBe(mockContent);
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(mockTemplatesDir, 'topics', 'victim_rights.md'),
        'utf-8'
      );
    });

    it('should cache loaded templates', async () => {
      // Arrange
      const mockContent = '# Test Template';
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      // Act
      await loader.loadTemplate('topics', 'victim_rights');
      await loader.loadTemplate('topics', 'victim_rights');

      // Assert
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should throw error when template file does not exist', async () => {
      // Arrange
      (fs.readFile as jest.Mock).mockRejectedValue(
        new Error('ENOENT: no such file or directory')
      );

      // Act & Assert
      await expect(
        loader.loadTemplate('topics', 'nonexistent')
      ).rejects.toThrow();
    });

    it('should load different templates independently', async () => {
      // Arrange
      const mockContent1 = '# Template 1';
      const mockContent2 = '# Template 2';
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(mockContent1)
        .mockResolvedValueOnce(mockContent2);

      // Act
      const result1 = await loader.loadTemplate('topics', 'victim_rights');
      const result2 = await loader.loadTemplate('topics', 'anti_death_penalty');

      // Assert
      expect(result1).toBe(mockContent1);
      expect(result2).toBe(mockContent2);
      expect(fs.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('loadTopicTemplate', () => {
    it('should load topic template from topics directory', async () => {
      // Arrange
      const mockContent = '# Victim Rights Template';
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      // Act
      const result = await loader.loadTopicTemplate('victim_rights');

      // Assert
      expect(result).toBe(mockContent);
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(mockTemplatesDir, 'topics', 'victim_rights.md'),
        'utf-8'
      );
    });

    it('should load all three topic templates', async () => {
      // Arrange
      const topics = ['victim_rights', 'anti_death_penalty', 'judicial_injustice'];
      (fs.readFile as jest.Mock).mockResolvedValue('# Template');

      // Act
      const results = await Promise.all(
        topics.map(topic => loader.loadTopicTemplate(topic))
      );

      // Assert
      expect(results).toHaveLength(3);
      expect(fs.readFile).toHaveBeenCalledTimes(3);
    });
  });

  describe('loadPlatformTemplate', () => {
    it('should load platform template from platforms directory', async () => {
      // Arrange
      const mockContent = '# Instagram Platform Requirements';
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      // Act
      const result = await loader.loadPlatformTemplate('instagram');

      // Assert
      expect(result).toBe(mockContent);
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(mockTemplatesDir, 'platforms', 'instagram.md'),
        'utf-8'
      );
    });

    it('should load all three platform templates', async () => {
      // Arrange
      const platforms = ['instagram', 'facebook', 'line'];
      (fs.readFile as jest.Mock).mockResolvedValue('# Platform');

      // Act
      const results = await Promise.all(
        platforms.map(platform => loader.loadPlatformTemplate(platform))
      );

      // Assert
      expect(results).toHaveLength(3);
      expect(fs.readFile).toHaveBeenCalledTimes(3);
    });
  });

  describe('loadVariantTemplate', () => {
    it('should load variant template from variants directory', async () => {
      // Arrange
      const mockContent = '# Rational Analysis Variant';
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      // Act
      const result = await loader.loadVariantTemplate('rational_analysis');

      // Assert
      expect(result).toBe(mockContent);
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(mockTemplatesDir, 'variants', 'rational_analysis.md'),
        'utf-8'
      );
    });

    it('should load all three variant templates', async () => {
      // Arrange
      const variants = ['rational_analysis', 'emotional_resonance', 'call_to_action'];
      (fs.readFile as jest.Mock).mockResolvedValue('# Variant');

      // Act
      const results = await Promise.all(
        variants.map(variant => loader.loadVariantTemplate(variant))
      );

      // Assert
      expect(results).toHaveLength(3);
      expect(fs.readFile).toHaveBeenCalledTimes(3);
    });
  });

  describe('loadRefineTemplate', () => {
    it('should load refine template from root directory', async () => {
      // Arrange
      const mockContent = '# Content Refinement Template';
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      // Act
      const result = await loader.loadRefineTemplate();

      // Assert
      expect(result).toBe(mockContent);
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join(mockTemplatesDir, 'refine.md'),
        'utf-8'
      );
    });
  });

  describe('clearCache', () => {
    it('should clear the template cache', async () => {
      // Arrange
      const mockContent = '# Test Template';
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);

      // Act
      await loader.loadTemplate('topics', 'victim_rights');
      loader.clearCache();
      await loader.loadTemplate('topics', 'victim_rights');

      // Assert
      expect(fs.readFile).toHaveBeenCalledTimes(2);
    });

    it('should allow reloading templates after cache clear', async () => {
      // Arrange
      const mockContent1 = '# Original Template';
      const mockContent2 = '# Updated Template';
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(mockContent1)
        .mockResolvedValueOnce(mockContent2);

      // Act
      const result1 = await loader.loadTemplate('topics', 'victim_rights');
      loader.clearCache();
      const result2 = await loader.loadTemplate('topics', 'victim_rights');

      // Assert
      expect(result1).toBe(mockContent1);
      expect(result2).toBe(mockContent2);
    });
  });

  describe('constructor', () => {
    it('should use default templates directory when not specified', () => {
      // Act
      const defaultLoader = new PromptTemplateLoader();

      // Assert
      expect(defaultLoader).toBeDefined();
    });

    it('should use custom templates directory when specified', () => {
      // Act
      const customLoader = new PromptTemplateLoader('/custom/path');

      // Assert
      expect(customLoader).toBeDefined();
    });
  });
});
