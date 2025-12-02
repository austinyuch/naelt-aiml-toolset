# LangChain 最佳實踐指南

## 目錄

- [概述](#概述)
- [Agent 設計模式](#agent-設計模式)
- [RAG 優化技巧](#rag-優化技巧)
- [Memory 管理策略](#memory-管理策略)
- [效能優化](#效能優化)
- [錯誤處理](#錯誤處理)
- [測試策略](#測試策略)
- [常見問題與解決方案](#常見問題與解決方案)

---

## 概述

本文件提供 LangChain 1.x 在司法正義論述生成器專案中的最佳實踐指南。基於實際開發經驗和效能測試結果，幫助開發團隊高效、安全地使用 LangChain 功能。

### 核心原則

1. **漸進式整合**: 先在非關鍵路徑測試，驗證後再擴展
2. **介面隔離**: 保持與現有系統的相容性
3. **效能優先**: 監控並優化關鍵路徑的效能
4. **測試驅動**: 遵循 TDD 流程，確保程式碼品質
5. **可觀測性**: 完整的日誌和監控

### 適用場景

| 功能 | 推薦使用 | 不推薦使用 |
|------|---------|-----------|
| Agent 工具調用 | ✅ 複雜多步驟工作流程 | ❌ 簡單的單一 LLM 調用 |
| RAG 檢索 | ✅ 判決書知識庫查詢 | ❌ 靜態模板內容 |
| Memory 管理 | ✅ 多輪對話場景 | ❌ 單次請求處理 |
| Prompt 管理 | ❌ 已有完善的 Markdown 模板 | - |

---

## Agent 設計模式

### 1. 工具定義最佳實踐

#### ✅ 良好的工具定義

```typescript
import { tool } from "langchain";
import * as z from "zod";

const searchNewsTool = tool(
  async ({ keywords, limit }) => {
    // 清晰的日誌記錄
    logger.info('Searching news', { keywords, limit });
    
    // 錯誤處理
    try {
      const results = await newsService.searchNews(keywords, limit);
      
      // 返回結構化的 JSON
      return JSON.stringify({
        success: true,
        results,
        count: results.length
      });
    } catch (error) {
      logger.error('News search failed', { error });
      return JSON.stringify({
        success: false,
        error: error.message
      });
    }
  },
  {
    name: "search_news",
    description: "搜尋司法相關新聞文章。返回新聞標題、來源、發布日期和摘要。",
    schema: z.object({
      keywords: z.array(z.string())
        .min(1)
        .max(10)
        .describe("搜尋關鍵字陣列，1-10 個關鍵字"),
      limit: z.number()
        .optional()
        .default(10)
        .min(1)
        .max(20)
        .describe("最大結果數量，預設 10")
    })
  }
);
```

**關鍵要點**:
- ✅ 使用 Zod schema 進行嚴格的參數驗證
- ✅ 提供詳細的描述和範例
- ✅ 設定合理的預設值和限制
- ✅ 返回結構化的 JSON 格式
- ✅ 完整的錯誤處理和日誌記錄

#### ❌ 不良的工具定義

```typescript
// 缺少驗證和錯誤處理
const badTool = tool(
  async (input) => {
    return await someService.doSomething(input);
  },
  {
    name: "bad_tool",
    description: "做某事",  // 描述不清楚
    schema: z.any()  // 沒有型別驗證
  }
);
```

### 2. Agent 編排模式

#### 模式 1: 簡單順序執行

適用於明確的多步驟流程：

```typescript
export class SimpleAgentOrchestrator {
  async executeSequentialTask(userRequest: string): Promise<any> {
    // 1. 搜尋新聞
    const newsResults = await this.searchNewsTool.invoke({
      keywords: extractKeywords(userRequest)
    });
    
    // 2. 生成內容
    const content = await this.generateContentTool.invoke({
      newsContext: newsResults,
      userInput: userRequest
    });
    
    return content;
  }
}
```

#### 模式 2: Agent 自動決策

適用於複雜、不確定的工作流程：

```typescript
export class SmartAgentOrchestrator {
  private agent: ReturnType<typeof createAgent>;
  
  constructor() {
    this.agent = createAgent({
      model: "claude-sonnet-4-5-20250929",
      tools: [
        this.searchNewsTool,
        this.analyzeNewsTool,
        this.generateContentTool,
        this.refineContentTool
      ],
      // 設定 Agent 行為
      agentType: "openai-functions",
      maxIterations: 5,  // 限制最大迭代次數
      earlyStoppingMethod: "generate"
    });
  }
  
  async executeTask(userRequest: string): Promise<any> {
    const result = await this.agent.invoke({
      messages: [{ 
        role: "user", 
        content: userRequest 
      }]
    });
    
    return result;
  }
}
```

**選擇建議**:
- 簡單順序執行: 流程明確、步驟固定
- Agent 自動決策: 流程複雜、需要靈活決策

### 3. 工具組合策略

#### 策略 1: 功能分組

將相關工具組織在一起：

```typescript
// 新聞相關工具
const newsTools = [
  searchNewsTool,
  fetchArticleTool,
  analyzeNewsTool
];

// 內容相關工具
const contentTools = [
  generateContentTool,
  refineContentTool,
  validateContentTool
];

// 根據任務類型選擇工具組
const agent = createAgent({
  model: "claude-sonnet-4-5-20250929",
  tools: userTask.includes("新聞") ? newsTools : contentTools
});
```

#### 策略 2: 階層式工具

建立高階和低階工具的層次結構：

```typescript
// 低階工具：基礎操作
const lowLevelTools = [
  searchNewsTool,
  fetchArticleTool
];

// 高階工具：組合操作
const highLevelTool = tool(
  async ({ topic }) => {
    // 內部調用低階工具
    const news = await searchNewsTool.invoke({ keywords: [topic] });
    const articles = await fetchArticleTool.invoke({ urls: news.urls });
    return { news, articles };
  },
  {
    name: "research_topic",
    description: "研究特定主題，包含搜尋和抓取文章",
    schema: z.object({
      topic: z.string().describe("研究主題")
    })
  }
);

// Agent 只需要使用高階工具
const agent = createAgent({
  model: "claude-sonnet-4-5-20250929",
  tools: [highLevelTool, generateContentTool]
});
```

---

## RAG 優化技巧

### 1. 文件分割策略

#### 策略 1: 基於語義的分割

```typescript
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,        // 每個區塊的字元數
  chunkOverlap: 200,      // 區塊之間的重疊
  separators: ["\n\n", "\n", "。", "，", " "],  // 分割符號優先順序
  keepSeparator: true     // 保留分割符號
});

const documents = await textSplitter.splitDocuments(judgmentDocuments);
```

**參數調整建議**:
- 判決書: `chunkSize: 1000-1500`, `chunkOverlap: 200-300`
- 新聞文章: `chunkSize: 500-800`, `chunkOverlap: 100-150`
- 短文本: `chunkSize: 300-500`, `chunkOverlap: 50-100`

#### 策略 2: 基於結構的分割

```typescript
// 針對判決書的結構化分割
class JudgmentTextSplitter {
  split(judgment: string): Document[] {
    const sections = this.extractSections(judgment);
    
    return sections.map(section => new Document({
      pageContent: section.content,
      metadata: {
        type: section.type,  // 主文、理由、判決結果
        caseNumber: section.caseNumber,
        date: section.date
      }
    }));
  }
  
  private extractSections(judgment: string) {
    // 根據判決書格式提取各個部分
    // ...
  }
}
```

### 2. 嵌入模型選擇

#### AWS Bedrock Embeddings

```typescript
import { BedrockEmbeddings } from "@langchain/aws";

const embeddings = new BedrockEmbeddings({
  region: process.env.AWS_REGION || 'us-east-1',
  model: "amazon.titan-embed-text-v1",  // 或 "cohere.embed-multilingual-v3"
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});
```

**模型比較**:

| 模型 | 維度 | 語言支援 | 適用場景 |
|------|------|---------|---------|
| amazon.titan-embed-text-v1 | 1536 | 英文為主 | 英文文件、通用場景 |
| cohere.embed-multilingual-v3 | 1024 | 100+ 語言 | 中文文件、多語言場景 |

**建議**: 對於中文判決書，使用 `cohere.embed-multilingual-v3`

### 3. 向量資料庫配置

#### Chroma 配置最佳實踐

```typescript
import { Chroma } from "@langchain/community/vectorstores/chroma";

const vectorStore = await Chroma.fromDocuments(
  documents,
  embeddings,
  {
    collectionName: "judicial-cases",
    url: process.env.CHROMA_URL || "http://localhost:8000",
    collectionMetadata: {
      "hnsw:space": "cosine",  // 相似度計算方式
      "hnsw:construction_ef": 200,  // 建構時的搜尋範圍
      "hnsw:M": 16  // 每個節點的連接數
    }
  }
);
```

**參數調整**:
- `hnsw:space`: `cosine` (推薦) 或 `l2` 或 `ip`
- `hnsw:construction_ef`: 越大越準確，但建構越慢（推薦 100-300）
- `hnsw:M`: 越大越準確，但記憶體越大（推薦 8-32）

### 4. 檢索策略優化

#### 策略 1: 混合檢索

結合向量檢索和關鍵字檢索：

```typescript
class HybridRetriever {
  async retrieve(query: string, k: number = 5): Promise<Document[]> {
    // 1. 向量檢索
    const vectorResults = await this.vectorStore.similaritySearch(query, k);
    
    // 2. 關鍵字檢索（使用 metadata 過濾）
    const keywordResults = await this.vectorStore.similaritySearch(
      query,
      k,
      { caseType: "酒駕致死" }  // metadata 過濾
    );
    
    // 3. 合併和去重
    const combined = this.mergeAndDeduplicate(vectorResults, keywordResults);
    
    // 4. 重新排序
    return this.rerank(combined, query);
  }
}
```

#### 策略 2: 多查詢檢索

使用多個查詢變體提升召回率：

```typescript
import { MultiQueryRetriever } from "langchain/retrievers/multi_query";

const retriever = MultiQueryRetriever.fromLLM({
  llm: new BedrockChat({ model: "claude-sonnet-4-5-20250929" }),
  retriever: vectorStore.asRetriever(),
  queryCount: 3  // 生成 3 個查詢變體
});

// 自動生成多個查詢並合併結果
const results = await retriever.getRelevantDocuments(
  "酒駕致死案件的量刑趨勢"
);
```

---

## Memory 管理策略

### 1. Memory 類型選擇

#### BufferMemory: 完整對話歷史

適用於短對話、需要完整上下文：

```typescript
import { BufferMemory } from "langchain/memory";

const memory = new BufferMemory({
  returnMessages: true,
  memoryKey: "chat_history",
  inputKey: "input",
  outputKey: "output"
});

// 儲存對話
await memory.saveContext(
  { input: "生成一篇反廢死論述" },
  { output: "已生成內容..." }
);

// 載入對話歷史
const history = await memory.loadMemoryVariables({});
```

#### ConversationSummaryMemory: 摘要式記憶

適用於長對話、節省 token：

```typescript
import { ConversationSummaryMemory } from "langchain/memory";

const memory = new ConversationSummaryMemory({
  llm: new BedrockChat({ model: "claude-sonnet-4-5-20250929" }),
  returnMessages: true,
  memoryKey: "chat_history"
});

// 自動摘要對話歷史
await memory.saveContext(
  { input: "..." },
  { output: "..." }
);
```

### 2. Memory 清理策略

#### 策略 1: 基於時間的清理

```typescript
class TimedMemoryManager {
  private memory: BufferMemory;
  private ttl: number = 3600000;  // 1 小時
  
  async saveContext(input: any, output: any) {
    await this.memory.saveContext(input, output);
    
    // 設定清理定時器
    setTimeout(() => {
      this.memory.clear();
    }, this.ttl);
  }
}
```

#### 策略 2: 基於大小的清理

```typescript
class SizedMemoryManager {
  private memory: BufferMemory;
  private maxMessages: number = 10;
  
  async saveContext(input: any, output: any) {
    await this.memory.saveContext(input, output);
    
    // 檢查訊息數量
    const history = await this.memory.loadMemoryVariables({});
    if (history.chat_history.length > this.maxMessages) {
      // 移除最舊的訊息
      history.chat_history.shift();
    }
  }
}
```

---

## 效能優化

### 1. 快取策略

#### LLM 回應快取

```typescript
import { InMemoryCache } from "@langchain/core/caches";

const cache = new InMemoryCache();

const llm = new BedrockChat({
  model: "claude-sonnet-4-5-20250929",
  cache  // 啟用快取
});

// 相同的 prompt 會從快取返回
const response1 = await llm.invoke("介紹台灣司法制度");
const response2 = await llm.invoke("介紹台灣司法制度");  // 從快取返回
```

#### 向量檢索快取

```typescript
class CachedVectorStore {
  private cache: Map<string, Document[]> = new Map();
  
  async similaritySearch(query: string, k: number): Promise<Document[]> {
    const cacheKey = `${query}:${k}`;
    
    // 檢查快取
    if (this.cache.has(cacheKey)) {
      logger.info('Cache hit', { query });
      return this.cache.get(cacheKey)!;
    }
    
    // 執行檢索
    const results = await this.vectorStore.similaritySearch(query, k);
    
    // 儲存快取
    this.cache.set(cacheKey, results);
    
    return results;
  }
}
```

### 2. 批次處理

#### 批次嵌入

```typescript
// ❌ 不良實踐：逐一處理
for (const doc of documents) {
  const embedding = await embeddings.embedQuery(doc.pageContent);
  // ...
}

// ✅ 良好實踐：批次處理
const texts = documents.map(doc => doc.pageContent);
const embeddings = await embeddings.embedDocuments(texts);
```

### 3. 並行處理

```typescript
// ✅ 並行執行多個獨立操作
const [newsResults, templateData, cacheData] = await Promise.all([
  newsService.searchNews(keywords),
  templateService.getTemplate(templateId),
  cacheManager.getCachedContent(contentId)
]);
```

### 4. 串流回應

```typescript
// 使用串流減少首字節時間
async function* generateContentStream(prompt: string) {
  const stream = await llm.stream(prompt);
  
  for await (const chunk of stream) {
    yield chunk.content;
  }
}

// 使用
for await (const chunk of generateContentStream(prompt)) {
  console.log(chunk);  // 即時輸出
}
```

---

## 錯誤處理

### 1. 分層錯誤處理

```typescript
class LangChainErrorHandler {
  async handleToolExecution<T>(
    toolName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      // 1. 記錄錯誤
      logger.error(`Tool execution failed: ${toolName}`, { error });
      
      // 2. 分類錯誤
      if (error instanceof RateLimitError) {
        throw new APIException(429, 'Rate limit exceeded', 'RATE_LIMIT');
      } else if (error instanceof AuthenticationError) {
        throw new APIException(401, 'Authentication failed', 'AUTH_ERROR');
      } else {
        throw new APIException(500, 'Tool execution failed', 'TOOL_ERROR');
      }
    }
  }
}
```

### 2. 重試機制

```typescript
import { retryWithBackoff } from '../core/retry';

async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  return await retryWithBackoff(
    operation,
    maxRetries,
    1000  // 基礎延遲 1 秒
  );
}

// 使用
const result = await executeWithRetry(async () => {
  return await llm.invoke(prompt);
});
```

### 3. 超時控制

```typescript
async function executeWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
    )
  ]);
}
```

---

## 測試策略

### 1. 單元測試

#### 測試 Agent 工具

```typescript
describe('SearchNewsTool', () => {
  let tool: ReturnType<typeof tool>;
  let mockNewsService: jest.Mocked<NewsSearchService>;
  
  beforeEach(() => {
    mockNewsService = {
      searchNews: jest.fn()
    } as any;
    
    tool = createSearchNewsTool(mockNewsService);
  });
  
  it('should search news successfully', async () => {
    mockNewsService.searchNews.mockResolvedValue([
      { title: 'Test News', url: 'https://...' }
    ]);
    
    const result = await tool.invoke({
      keywords: ['司法改革'],
      limit: 10
    });
    
    expect(mockNewsService.searchNews).toHaveBeenCalledWith(
      ['司法改革'],
      10
    );
    expect(JSON.parse(result).success).toBe(true);
  });
  
  it('should handle errors gracefully', async () => {
    mockNewsService.searchNews.mockRejectedValue(
      new Error('API error')
    );
    
    const result = await tool.invoke({
      keywords: ['test'],
      limit: 10
    });
    
    expect(JSON.parse(result).success).toBe(false);
  });
});
```

### 2. 整合測試

```typescript
describe('Agent Integration', () => {
  let orchestrator: AgentOrchestrator;
  
  beforeAll(() => {
    // 使用真實服務
    orchestrator = new AgentOrchestrator(
      new NewsSearchService(/* ... */),
      new ContentGenerationService(/* ... */)
    );
  });
  
  it('should execute end-to-end workflow', async () => {
    const result = await orchestrator.executeTask(
      "搜尋司法改革新聞並生成 Instagram 貼文"
    );
    
    expect(result).toBeDefined();
    expect(result.messages.length).toBeGreaterThan(0);
  }, 60000);  // 60 秒超時
});
```

### 3. 效能測試

```typescript
describe('Performance Benchmark', () => {
  it('should meet response time SLA', async () => {
    const times: number[] = [];
    
    for (let i = 0; i < 100; i++) {
      const start = Date.now();
      await llm.invoke("測試提示");
      times.push(Date.now() - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b) / times.length;
    const p95Time = times.sort((a, b) => a - b)[95];
    
    expect(avgTime).toBeLessThan(2000);  // 平均 < 2 秒
    expect(p95Time).toBeLessThan(3000);  // P95 < 3 秒
  });
});
```

---

## 常見問題與解決方案

### 問題 1: Agent 無限循環

**症狀**: Agent 不斷調用相同的工具，無法完成任務

**原因**:
- 工具返回格式不正確
- 工具描述不清楚
- 缺少停止條件

**解決方案**:

```typescript
const agent = createAgent({
  model: "claude-sonnet-4-5-20250929",
  tools: [...],
  maxIterations: 5,  // 限制最大迭代次數
  earlyStoppingMethod: "generate"  // 提前停止策略
});

// 在工具中明確返回完成狀態
const tool = tool(
  async (input) => {
    const result = await doSomething(input);
    return JSON.stringify({
      success: true,
      result,
      completed: true  // 明確標記完成
    });
  },
  { /* ... */ }
);
```

### 問題 2: RAG 檢索結果不相關

**症狀**: 檢索到的文件與查詢不相關

**原因**:
- 文件分割不當
- 嵌入模型不適合
- 檢索參數設定不當

**解決方案**:

```typescript
// 1. 優化文件分割
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", "。", "，"]  // 中文分隔符
});

// 2. 使用多語言嵌入模型
const embeddings = new BedrockEmbeddings({
  model: "cohere.embed-multilingual-v3"  // 支援中文
});

// 3. 調整檢索參數
const results = await vectorStore.similaritySearch(
  query,
  k: 10,  // 增加檢索數量
  filter: { caseType: "酒駕致死" }  // 使用 metadata 過濾
);

// 4. 使用重新排序
const reranked = await reranker.rerank(results, query);
```

### 問題 3: Memory 佔用過多

**症狀**: 記憶體使用持續增長，最終導致 OOM

**原因**:
- Memory 沒有清理機制
- 儲存過多對話歷史

**解決方案**:

```typescript
// 1. 使用 ConversationSummaryMemory
const memory = new ConversationSummaryMemory({
  llm: new BedrockChat({ model: "claude-sonnet-4-5-20250929" }),
  maxTokenLimit: 2000  // 限制 token 數量
});

// 2. 定期清理
class ManagedMemory {
  private memory: BufferMemory;
  private lastCleanup: Date = new Date();
  
  async saveContext(input: any, output: any) {
    await this.memory.saveContext(input, output);
    
    // 每小時清理一次
    if (Date.now() - this.lastCleanup.getTime() > 3600000) {
      await this.memory.clear();
      this.lastCleanup = new Date();
    }
  }
}

// 3. 使用外部儲存
class PersistentMemory {
  async saveContext(sessionId: string, input: any, output: any) {
    // 儲存到資料庫或 Redis
    await redis.set(
      `session:${sessionId}`,
      JSON.stringify({ input, output }),
      'EX',
      3600  // 1 小時過期
    );
  }
}
```

### 問題 4: 效能退化

**症狀**: LangChain 版本比原生實作慢很多

**原因**:
- 過多的抽象層
- 沒有使用快取
- 串行執行可並行的操作

**解決方案**:

```typescript
// 1. 啟用快取
const llm = new BedrockChat({
  model: "claude-sonnet-4-5-20250929",
  cache: new InMemoryCache()
});

// 2. 並行執行
const [result1, result2] = await Promise.all([
  llm.invoke(prompt1),
  llm.invoke(prompt2)
]);

// 3. 使用串流減少首字節時間
const stream = await llm.stream(prompt);
for await (const chunk of stream) {
  // 即時處理
}

// 4. 關鍵路徑保留原生實作
if (isCriticalPath) {
  // 使用原生 BedrockClient
  return await bedrockClient.generateCompletion(prompt);
} else {
  // 使用 LangChain
  return await llm.invoke(prompt);
}
```

### 問題 5: 向量資料庫連線失敗

**症狀**: 無法連線到 Chroma 或其他向量資料庫

**原因**:
- 服務未啟動
- 網路配置問題
- 認證失敗

**解決方案**:

```typescript
// 1. 檢查服務狀態
async function checkChromaHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.CHROMA_URL}/api/v1/heartbeat`);
    return response.ok;
  } catch (error) {
    logger.error('Chroma health check failed', { error });
    return false;
  }
}

// 2. 實作重試機制
async function connectWithRetry(maxRetries: number = 3): Promise<Chroma> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const vectorStore = await Chroma.fromExistingCollection(
        embeddings,
        {
          collectionName: "judicial-cases",
          url: process.env.CHROMA_URL
        }
      );
      return vectorStore;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error('Failed to connect to Chroma');
}

// 3. 提供降級方案
class ResilientVectorStore {
  private vectorStore?: Chroma;
  private fallbackEnabled: boolean = true;
  
  async search(query: string, k: number): Promise<Document[]> {
    try {
      if (!this.vectorStore) {
        this.vectorStore = await connectWithRetry();
      }
      return await this.vectorStore.similaritySearch(query, k);
    } catch (error) {
      logger.error('Vector search failed', { error });
      
      if (this.fallbackEnabled) {
        // 降級到關鍵字搜尋
        return await this.keywordSearch(query, k);
      }
      
      throw error;
    }
  }
}
```

### 問題 6: Token 超出限制

**症狀**: 請求因 token 數量過多而失敗

**原因**:
- 對話歷史過長
- 檢索到的文件過多
- Prompt 過長

**解決方案**:

```typescript
// 1. 限制對話歷史
const memory = new ConversationSummaryMemory({
  llm: new BedrockChat({ model: "claude-sonnet-4-5-20250929" }),
  maxTokenLimit: 2000  // 限制 token 數量
});

// 2. 限制檢索結果
const results = await vectorStore.similaritySearch(
  query,
  k: 5  // 減少檢索數量
);

// 3. 截斷文件內容
function truncateDocuments(docs: Document[], maxTokens: number): Document[] {
  let totalTokens = 0;
  const truncated: Document[] = [];
  
  for (const doc of docs) {
    const tokens = estimateTokens(doc.pageContent);
    if (totalTokens + tokens > maxTokens) break;
    
    truncated.push(doc);
    totalTokens += tokens;
  }
  
  return truncated;
}

// 4. 使用摘要
async function summarizeContext(docs: Document[]): Promise<string> {
  const llm = new BedrockChat({ model: "claude-sonnet-4-5-20250929" });
  const summaries = await Promise.all(
    docs.map(doc => llm.invoke(`摘要以下內容：\n${doc.pageContent}`))
  );
  return summaries.join('\n\n');
}
```

---

## 監控與可觀測性

### 1. 日誌記錄

```typescript
import { logger } from '../core/logger';

class ObservableAgent {
  async executeTask(userRequest: string): Promise<any> {
    const requestId = generateRequestId();
    
    logger.info('Agent task started', {
      requestId,
      userRequest,
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await this.agent.invoke({
        messages: [{ role: "user", content: userRequest }]
      });
      
      logger.info('Agent task completed', {
        requestId,
        duration: Date.now() - startTime,
        messageCount: result.messages.length
      });
      
      return result;
    } catch (error) {
      logger.error('Agent task failed', {
        requestId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}
```

### 2. 效能指標

```typescript
import { metrics } from '../core/metrics';

class MetricsCollector {
  trackLLMCall(duration: number, tokens: number) {
    metrics.llmCallDuration.observe(duration);
    metrics.llmTokensUsed.inc(tokens);
  }
  
  trackVectorSearch(duration: number, resultCount: number) {
    metrics.vectorSearchDuration.observe(duration);
    metrics.vectorSearchResults.observe(resultCount);
  }
  
  trackAgentIteration(iterationCount: number) {
    metrics.agentIterations.observe(iterationCount);
  }
}
```

### 3. 追蹤與除錯

```typescript
// 使用 LangSmith 追蹤（可選）
process.env.LANGSMITH_TRACING = 'true';
process.env.LANGSMITH_API_KEY = 'your-api-key';

// 自定義追蹤
class TracedAgent {
  async executeTask(userRequest: string): Promise<any> {
    const trace = {
      requestId: generateRequestId(),
      startTime: Date.now(),
      steps: []
    };
    
    try {
      // 記錄每個步驟
      for await (const step of this.agent.stream(userRequest)) {
        trace.steps.push({
          type: step.type,
          content: step.content,
          timestamp: Date.now()
        });
      }
      
      // 儲存追蹤資料
      await this.saveTrace(trace);
      
      return trace;
    } catch (error) {
      trace.error = error.message;
      await this.saveTrace(trace);
      throw error;
    }
  }
}
```

---

## 部署建議

### 1. 環境變數配置

```bash
# LangChain Feature Flags
FEATURE_LANGCHAIN_AGENT=true
FEATURE_LANGCHAIN_RAG=true
FEATURE_LANGCHAIN_MEMORY=false

# Chroma 配置
CHROMA_URL=http://chroma:8000
CHROMA_USERNAME=admin
CHROMA_PASSWORD=${CHROMA_PASSWORD}

# LangSmith 追蹤（可選）
LANGSMITH_TRACING=false
LANGSMITH_API_KEY=${LANGSMITH_API_KEY}

# 效能配置
LANGCHAIN_CACHE_ENABLED=true
LANGCHAIN_MAX_RETRIES=3
LANGCHAIN_TIMEOUT=30000
```

### 2. Docker Compose 配置

```yaml
version: '3.8'

services:
  app:
    build: .
    environment:
      - FEATURE_LANGCHAIN_AGENT=true
      - FEATURE_LANGCHAIN_RAG=true
      - CHROMA_URL=http://chroma:8000
    depends_on:
      - chroma
    networks:
      - app-network

  chroma:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - chroma-data:/chroma/chroma
    environment:
      - CHROMA_SERVER_AUTH_CREDENTIALS=${CHROMA_PASSWORD}
    networks:
      - app-network

volumes:
  chroma-data:

networks:
  app-network:
```

### 3. 健康檢查

```typescript
export async function healthCheck(): Promise<HealthStatus> {
  const checks = {
    langchain: await checkLangChainHealth(),
    chroma: await checkChromaHealth(),
    bedrock: await checkBedrockHealth()
  };
  
  return {
    status: Object.values(checks).every(c => c) ? 'healthy' : 'unhealthy',
    checks
  };
}

async function checkChromaHealth(): Promise<boolean> {
  if (!features.useLangChainRAG) return true;
  
  try {
    const response = await fetch(`${process.env.CHROMA_URL}/api/v1/heartbeat`);
    return response.ok;
  } catch {
    return false;
  }
}
```

---

## 總結

### 關鍵要點

1. **漸進式整合**: 從非關鍵路徑開始，逐步擴展
2. **效能優先**: 監控並優化關鍵路徑
3. **完整測試**: 遵循 TDD，確保品質
4. **可觀測性**: 完整的日誌和監控
5. **錯誤處理**: 分層處理，提供降級方案

### 下一步行動

1. 閱讀 [LangChain 評估報告](langchain-evaluation.md)
2. 查看 [設計文件](../.kiro/specs/advocacy-content-generator/design.md)
3. 參考 [LangChain 官方文檔](https://js.langchain.com/)
4. 加入團隊討論和知識分享

---

**文件版本**: 1.0  
**最後更新**: 2024-12-02  
**作者**: AI Development Team  
**審核狀態**: 待審核
