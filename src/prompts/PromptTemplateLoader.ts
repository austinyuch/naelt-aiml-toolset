import fs from 'fs/promises';
import path from 'path';

/**
 * PromptTemplateLoader
 * 
 * 負責從檔案系統載入 Markdown 格式的提示模板。
 * 實作快取機制以提升效能。
 */
export class PromptTemplateLoader {
  private templatesDir: string;
  private cache: Map<string, string>;

  /**
   * 建立 PromptTemplateLoader 實例
   * 
   * @param templatesDir - 模板目錄路徑，預設為 './prompts'
   */
  constructor(templatesDir: string = './prompts') {
    this.templatesDir = templatesDir;
    this.cache = new Map();
  }

  /**
   * 載入指定類別和名稱的模板
   * 
   * @param category - 模板類別（如 'topics', 'platforms', 'variants'）
   * @param name - 模板名稱（如 'victim_rights', 'instagram'）
   * @returns 模板內容
   */
  async loadTemplate(category: string, name: string): Promise<string> {
    const cacheKey = `${category}/${name}`;

    // 檢查快取
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 從檔案載入
    const filePath = path.join(this.templatesDir, category, `${name}.md`);
    const content = await fs.readFile(filePath, 'utf-8');

    // 快取模板
    this.cache.set(cacheKey, content);

    return content;
  }

  /**
   * 載入主題模板
   * 
   * @param topic - 主題名稱（'victim_rights', 'anti_death_penalty', 'judicial_injustice'）
   * @returns 主題模板內容
   */
  async loadTopicTemplate(topic: string): Promise<string> {
    return this.loadTemplate('topics', topic);
  }

  /**
   * 載入平台模板
   * 
   * @param platform - 平台名稱（'instagram', 'facebook', 'line'）
   * @returns 平台模板內容
   */
  async loadPlatformTemplate(platform: string): Promise<string> {
    return this.loadTemplate('platforms', platform);
  }

  /**
   * 載入變體策略模板
   * 
   * @param variant - 變體名稱（'rational_analysis', 'emotional_resonance', 'call_to_action'）
   * @returns 變體模板內容
   */
  async loadVariantTemplate(variant: string): Promise<string> {
    return this.loadTemplate('variants', variant);
  }

  /**
   * 載入內容精煉模板
   * 
   * @returns 精煉模板內容
   */
  async loadRefineTemplate(): Promise<string> {
    const filePath = path.join(this.templatesDir, 'refine.md');
    
    // 檢查快取
    const cacheKey = 'refine';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // 從檔案載入
    const content = await fs.readFile(filePath, 'utf-8');
    
    // 快取模板
    this.cache.set(cacheKey, content);
    
    return content;
  }

  /**
   * 清除快取
   * 
   * 用於開發環境熱重載或強制重新載入模板
   */
  clearCache(): void {
    this.cache.clear();
  }
}
