/**
 * Feature Flags Configuration
 * 
 * 控制 LangChain 功能的啟用/停用
 * 透過環境變數配置，支援漸進式整合和 A/B 測試
 * 
 * 使用方式：
 * - 開發環境：在 .env 檔案中設定
 * - 生產環境：透過環境變數或配置管理系統設定
 * 
 * 範例 .env 配置：
 * ```
 * FEATURE_LANGCHAIN_AGENT=true
 * FEATURE_LANGCHAIN_RAG=false
 * FEATURE_LANGCHAIN_MEMORY=false
 * ```
 */

/**
 * Feature Flags 介面
 * 
 * 定義所有可用的 LangChain 功能開關
 */
export interface FeatureFlags {
    /**
     * 啟用 LangChain Agent 工具調用
     * 
     * 當啟用時：
     * - 使用 LangChain Agent 自動編排工作流程
     * - 支援多步驟任務自動決策
     * - 簡化 ContentOrchestrator 邏輯
     * 
     * 當停用時：
     * - 使用原生 BedrockClient
     * - 手動編排工作流程
     */
    useLangChainAgent: boolean;

    /**
     * 啟用 LangChain RAG (Retrieval-Augmented Generation)
     * 
     * 當啟用時：
     * - 使用向量資料庫進行語義搜尋
     * - 支援判決書知識庫查詢
     * - 提供 RAG 增強的內容生成
     * 
     * 當停用時：
     * - 使用傳統的關鍵字搜尋
     * - 不使用向量資料庫
     * 
     * 注意：需要配置 CHROMA_URL 環境變數
     */
    useLangChainRAG: boolean;

    /**
     * 啟用 LangChain Memory 管理
     * 
     * 當啟用時：
     * - 支援多輪對話記憶
     * - 記住使用者的精煉歷史
     * - 提供上下文感知的內容生成
     * 
     * 當停用時：
     * - 每次請求獨立處理
     * - 不保留對話歷史
     */
    useLangChainMemory: boolean;
}

/**
 * 從環境變數讀取 Feature Flags
 * 
 * 預設值：
 * - useLangChainAgent: false (保守策略，需明確啟用)
 * - useLangChainRAG: false (需要額外基礎設施)
 * - useLangChainMemory: false (需要額外儲存)
 * 
 * @returns FeatureFlags 物件
 */
export const features: FeatureFlags = {
    useLangChainAgent: process.env.FEATURE_LANGCHAIN_AGENT === 'true',
    useLangChainRAG: process.env.FEATURE_LANGCHAIN_RAG === 'true',
    useLangChainMemory: process.env.FEATURE_LANGCHAIN_MEMORY === 'true'
};

/**
 * 檢查是否有任何 LangChain 功能啟用
 * 
 * @returns 如果有任何 LangChain 功能啟用則返回 true
 */
export function isLangChainEnabled(): boolean {
    return features.useLangChainAgent ||
        features.useLangChainRAG ||
        features.useLangChainMemory;
}

/**
 * 取得啟用的功能列表
 * 
 * @returns 啟用的功能名稱陣列
 */
export function getEnabledFeatures(): string[] {
    const enabled: string[] = [];

    if (features.useLangChainAgent) {
        enabled.push('LangChain Agent');
    }
    if (features.useLangChainRAG) {
        enabled.push('LangChain RAG');
    }
    if (features.useLangChainMemory) {
        enabled.push('LangChain Memory');
    }

    return enabled;
}

/**
 * 驗證 Feature Flags 配置
 * 
 * 檢查必要的環境變數是否已設定
 * 
 * @throws Error 如果配置無效
 */
export function validateFeatureFlags(): void {
    // 如果啟用 RAG，檢查 CHROMA_URL 是否設定
    if (features.useLangChainRAG && !process.env.CHROMA_URL) {
        throw new Error(
            'FEATURE_LANGCHAIN_RAG is enabled but CHROMA_URL is not set. ' +
            'Please configure CHROMA_URL environment variable.'
        );
    }

    // 未來可以加入更多驗證邏輯
}

/**
 * 記錄 Feature Flags 狀態
 * 
 * 用於啟動時記錄當前的功能配置
 * 
 * @param logger - Logger 實例
 */
export function logFeatureFlags(logger: any): void {
    const enabled = getEnabledFeatures();

    if (enabled.length === 0) {
        logger.info('LangChain features: All disabled (using native implementations)');
    } else {
        logger.info('LangChain features enabled:', { features: enabled });
    }

    // 記錄詳細配置
    logger.debug('Feature flags configuration:', {
        useLangChainAgent: features.useLangChainAgent,
        useLangChainRAG: features.useLangChainRAG,
        useLangChainMemory: features.useLangChainMemory
    });
}
