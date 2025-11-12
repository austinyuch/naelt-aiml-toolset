import { PromptTemplateLoader } from './PromptTemplateLoader';
import { NewsArticle, ContentVariant } from '../types/domain';

/**
 * PromptBuilder
 * 
 * 負責建構完整的 LLM 提示，包括：
 * - 載入並組合各種模板
 * - 替換模板變數
 * - 格式化新聞背景
 */
export class PromptBuilder {
  constructor(private loader: PromptTemplateLoader) {}

  /**
   * 建構內容生成提示
   * 
   * @param topic - 主題類型
   * @param platform - 目標平台
   * @param userInput - 使用者輸入的觀點
   * @param newsContext - 新聞背景資料
   * @param variantStrategy - 變體策略
   * @returns 完整的提示文字
   */
  async buildPrompt(
    topic: string,
    platform: string,
    userInput: string,
    newsContext: NewsArticle[],
    variantStrategy: string
  ): Promise<string> {
    // 載入模板
    const topicTemplate = await this.loader.loadTopicTemplate(topic);
    const platformTemplate = await this.loader.loadPlatformTemplate(platform);
    const variantTemplate = await this.loader.loadVariantTemplate(variantStrategy);

    // 格式化新聞背景
    const newsContextText = this.formatNewsContext(newsContext);

    // 替換變數
    let prompt = topicTemplate
      .replace('{news_context}', newsContextText)
      .replace('{user_input}', userInput)
      .replace('{platform_requirements}', platformTemplate)
      .replace('{variant_strategy}', variantTemplate);

    return prompt;
  }

  /**
   * 建構內容精煉提示
   * 
   * @param originalContent - 原始內容
   * @param userFeedback - 使用者反饋
   * @returns 完整的精煉提示文字
   */
  async buildRefinePrompt(
    originalContent: ContentVariant,
    userFeedback: string
  ): Promise<string> {
    // 載入精煉模板
    const refineTemplate = await this.loader.loadRefineTemplate();

    // 將原始內容轉換為 JSON 字串
    const originalContentJson = JSON.stringify(originalContent, null, 2);

    // 替換變數
    const prompt = refineTemplate
      .replace('{original_content}', originalContentJson)
      .replace('{user_feedback}', userFeedback);

    return prompt;
  }

  /**
   * 格式化新聞背景為文字
   * 
   * @param articles - 新聞文章陣列
   * @returns 格式化的新聞背景文字
   */
  private formatNewsContext(articles: NewsArticle[]): string {
    if (articles.length === 0) {
      return '';
    }

    return articles
      .map((article, index) => {
        // 格式化日期
        const dateStr = article.published_date.toISOString().split('T')[0];

        return `
### 新聞 ${index + 1}: ${article.title}
- 來源: ${article.source}
- 日期: ${dateStr}
- 摘要: ${article.summary}
- 連結: ${article.url}
`;
      })
      .join('\n');
  }
}
