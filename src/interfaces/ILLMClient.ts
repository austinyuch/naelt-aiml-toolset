/**
 * LLM Client Interface
 * 
 * 統一的 LLM 客戶端介面，支援多種實作：
 * - BedrockClient (原生 AWS SDK 實作)
 * - LangChainBedrockAdapter (LangChain 實作)
 * 
 * 這個介面確保不同實作之間的互換性，支援依賴注入和測試
 */

export interface LLMOptions {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    stopSequences?: string[];
}

export interface ILLMClient {
    /**
     * 生成 LLM 完成回應
     * 
     * @param prompt - 使用者提示
     * @param temperature - 溫度參數 (0.0-1.0)，控制輸出的隨機性
     * @param maxTokens - 最大輸出 token 數
     * @param systemPrompt - 系統提示（可選）
     * @returns 生成的文字回應
     */
    generateCompletion(
        prompt: string,
        temperature?: number,
        maxTokens?: number,
        systemPrompt?: string
    ): Promise<string>;

    /**
     * 生成 LLM 完成回應（串流模式）
     * 
     * @param prompt - 使用者提示
     * @param temperature - 溫度參數 (0.0-1.0)
     * @param maxTokens - 最大輸出 token 數
     * @param systemPrompt - 系統提示（可選）
     * @returns 非同步生成器，逐步產生文字片段
     */
    generateCompletionStream(
        prompt: string,
        temperature?: number,
        maxTokens?: number,
        systemPrompt?: string
    ): AsyncGenerator<string>;
}
