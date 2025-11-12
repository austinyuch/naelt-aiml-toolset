/**
 * Cache Manager for multi-layer caching
 * 
 * Implements L1 (memory) and L2 (file system) caching strategies:
 * - L1: LRU memory cache for templates and configurations
 * - L2: File system cache (EFS) for generated content
 * 
 * Requirements: 3.5, 4.1
 */

import fs from 'fs/promises';
import path from 'path';
import { LRUCache } from 'lru-cache';
import { TopicTemplate, ContentVariant } from '../types/domain.js';

/**
 * Multi-layer cache manager
 * 
 * Provides both in-memory (L1) and file system (L2) caching
 */
export class CacheManager {
  private cacheDir: string;
  private templateCache: LRUCache<string, TopicTemplate>;

  /**
   * Creates a new CacheManager
   * 
   * @param cacheDir - Directory for L2 file system cache (default: '.cache')
   */
  constructor(cacheDir: string = '.cache') {
    this.cacheDir = cacheDir;
    
    // L1 Cache: LRU memory cache for templates
    this.templateCache = new LRUCache<string, TopicTemplate>({
      max: 100, // Maximum 100 templates
      ttl: 1000 * 60 * 60, // 1 hour TTL
    });

    // Ensure cache directory exists (async, but don't block constructor)
    this.ensureCacheDir();
  }

  /**
   * Ensures the cache directory exists
   * 
   * @private
   */
  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      // Silently fail - will be handled when trying to write
      console.error('Failed to create cache directory:', error);
    }
  }

  /**
   * Gets a template from L1 cache
   * 
   * @param templateId - Template identifier
   * @returns Template if found, undefined otherwise
   */
  getTemplate(templateId: string): TopicTemplate | undefined {
    return this.templateCache.get(templateId);
  }

  /**
   * Sets a template in L1 cache
   * 
   * @param templateId - Template identifier
   * @param template - Template to cache
   */
  setTemplate(templateId: string, template: TopicTemplate): void {
    this.templateCache.set(templateId, template);
  }

  /**
   * Gets cached content from L2 file system cache
   * 
   * @param contentId - Content identifier
   * @returns Content if found, null otherwise
   */
  async getCachedContent(contentId: string): Promise<ContentVariant | null> {
    const cacheFile = path.join(this.cacheDir, `${contentId}.json`);
    
    try {
      const data = await fs.readFile(cacheFile, 'utf-8');
      return JSON.parse(data) as ContentVariant;
    } catch (error) {
      // File doesn't exist or is corrupted
      return null;
    }
  }

  /**
   * Sets cached content in L2 file system cache
   * 
   * @param contentId - Content identifier
   * @param content - Content to cache
   */
  async setCachedContent(contentId: string, content: ContentVariant): Promise<void> {
    // Ensure cache directory exists
    await this.ensureCacheDir();
    
    const cacheFile = path.join(this.cacheDir, `${contentId}.json`);
    
    try {
      await fs.writeFile(cacheFile, JSON.stringify(content, null, 2), 'utf-8');
    } catch (error) {
      // Log error but don't throw - caching is not critical
      console.error('Failed to write cache file:', error);
    }
  }

  /**
   * Clears all L1 cache entries
   */
  clearL1Cache(): void {
    this.templateCache.clear();
  }

  /**
   * Clears all L2 cache entries
   */
  async clearL2Cache(): Promise<void> {
    try {
      const files = await fs.readdir(this.cacheDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          await fs.unlink(path.join(this.cacheDir, file));
        }
      }
    } catch (error) {
      console.error('Failed to clear L2 cache:', error);
    }
  }

  /**
   * Clears all cache entries (L1 and L2)
   */
  async clearAll(): Promise<void> {
    this.clearL1Cache();
    await this.clearL2Cache();
  }
}
