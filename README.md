# 司法正義論述生成器 (Advocacy Content Generator)

司法正義論述生成器後端服務是一個本地執行的 Node.js/TypeScript 應用，提供 RESTful API 和 MCP (Model Context Protocol) 介面。服務整合新聞搜尋 API 和 AWS Bedrock Claude Sonnet 4.5，協助使用者針對受害者權益、反廢死和司法不公等議題，生成適合不同社群平台的論述內容。

## 功能特色

- 🔍 **新聞搜尋與內容聚合**: 整合 Google News API，搜尋相關新聞作為論述依據
- 🤖 **AI 驅動的內容生成**: 使用 AWS Bedrock Claude Sonnet 4.5 生成高品質論述內容
- 📱 **多平台優化**: 針對 Instagram、Facebook、LINE 等平台優化內容格式
- 🔄 **內容精煉**: 根據使用者反饋迭代改進內容
- 🔌 **雙介面支援**: 同時提供 RESTful API 和 MCP 介面
- 🧠 **LangChain 整合** (可選): Agent 工具調用、RAG 檢索增強、對話記憶管理

## 技術棧

- **後端框架**: Express.js (Node.js 20+)
- **語言**: TypeScript 5.x
- **LLM**: AWS Bedrock Claude Sonnet 4.5
- **LLM 框架**: LangChain 1.x (Agent、RAG、Memory)
- **向量資料庫**: Chroma (用於 RAG 檢索)
- **新聞 API**: Google News API
- **MCP 支援**: @modelcontextprotocol/sdk
- **測試**: Jest
- **部署**: Docker, AWS ECS Fargate

## 快速開始

### 前置需求

- Node.js 20+ LTS
- npm 或 yarn
- AWS 帳號（用於 Bedrock）
- Google News API Key（可選）

### 安裝

1. 克隆專案

```bash
git clone <repository-url>
cd advocacy-content-generator
```

2. 安裝依賴

```bash
npm install
```

3. 配置環境變數

```bash
cp .env.example .env
# 編輯 .env 檔案，填入必要的配置
```

4. 配置 AWS 憑證

```bash
# 方法 1: 使用 AWS CLI 配置
aws configure

# 方法 2: 設定環境變數
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_REGION=us-east-1
```

### 執行

#### 開發模式

```bash
npm run dev
```

#### 生產模式

```bash
# 建構
npm run build

# 啟動（unified 模式 - 同時啟動 API 和 MCP）
npm start

# 僅啟動 API
npm run start:api

# 僅啟動 MCP
npm run start:mcp
```

### 測試

```bash
# 執行所有測試
npm test

# 監視模式
npm run test:watch

# 測試覆蓋率
npm run test:coverage
```

### 程式碼品質

```bash
# 型別檢查
npm run type-check

# Lint 檢查
npm run lint

# 自動修復 Lint 問題
npm run lint:fix
```

## API 文件

服務啟動後，可以透過以下 URL 存取 API 文件：

- OpenAPI 文件: `http://localhost:8000/api-docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

### 主要端點

#### 健康檢查

```bash
GET /health
```

#### 新聞搜尋

```bash
POST /api/v1/news/search
Content-Type: application/json
X-API-Key: your-api-key

{
  "keywords": ["司法改革", "受害者權益"]
}
```

#### 內容生成

```bash
POST /api/v1/content/generate
Content-Type: application/json
X-API-Key: your-api-key

{
  "user_input": "我認為應該加強受害者權益保護",
  "topic_templates": ["victim_rights"],
  "platform_type": "instagram",
  "selected_news_urls": ["https://..."]
}
```

#### 內容精煉

```bash
POST /api/v1/content/refine
Content-Type: application/json
X-API-Key: your-api-key

{
  "content_id": "content_123",
  "feedback": "請加強情感共鳴的部分"
}
```

#### 模板列表

```bash
GET /api/v1/templates?lang=zh_TW
X-API-Key: your-api-key
```

## MCP 整合

本服務支援 Model Context Protocol (MCP)，可與 Claude Desktop 等工具整合。

### MCP 工具

- `search_news`: 搜尋新聞
- `generate_content`: 生成論述內容
- `refine_content`: 精煉內容

### 配置 MCP 客戶端

在 Claude Desktop 的配置檔案中加入：

```json
{
  "mcpServers": {
    "advocacy-content-generator": {
      "command": "node",
      "args": ["/path/to/advocacy-content-generator/dist/index.js"],
      "env": {
        "SERVICE_MODE": "mcp-only",
        "AWS_REGION": "us-east-1",
        "NEWS_API_KEY": "your-api-key"
      }
    }
  }
}
```

## Docker 部署

### 建構映像

```bash
docker build -t advocacy-content-generator .
```

### 執行容器

```bash
docker run -p 8000:8000 \
  -e AWS_REGION=us-east-1 \
  -e NEWS_API_KEY=your-api-key \
  -e API_KEYS=key1,key2 \
  -v ~/.aws:/root/.aws:ro \
  advocacy-content-generator
```

### Docker Compose

```bash
docker-compose up -d
```

## 專案結構

```
advocacy-content-generator/
├── src/                          # 原始碼
│   ├── api/                      # Express API 層
│   │   ├── routes/              # API 路由
│   │   ├── middleware/          # 中介軟體
│   │   └── app.ts               # Express 應用配置
│   ├── mcp/                      # MCP 層
│   │   ├── server.ts            # MCP 伺服器
│   │   └── index.ts             # MCP 入口
│   ├── services/                 # 服務層
│   ├── clients/                  # 外部客戶端
│   ├── types/                    # TypeScript 型別
│   ├── core/                     # 核心工具
│   ├── prompts/                  # 提示模板
│   ├── config.ts                 # 配置管理
│   └── index.ts                  # 應用入口
├── tests/                        # 測試
│   ├── unit/                    # 單元測試
│   ├── integration/             # 整合測試
│   └── fixtures/                # 測試固件
├── prompts/                      # Markdown 提示模板
│   ├── topics/                  # 主題模板
│   ├── platforms/               # 平台模板
│   └── variants/                # 變體模板
├── .env.example                  # 環境變數範例
├── package.json                  # npm 配置
├── tsconfig.json                 # TypeScript 配置
├── jest.config.js                # Jest 配置
├── Dockerfile                    # Docker 配置
└── README.md                     # 本文件
```

## 環境變數

### 基礎配置

| 變數名稱           | 說明                                 | 預設值                                    | 必填 |
| ------------------ | ------------------------------------ | ----------------------------------------- | ---- |
| `SERVICE_MODE`     | 服務模式 (unified/api-only/mcp-only) | unified                                   | 否   |
| `PORT`             | API 服務端口                         | 8000                                      | 否   |
| `AWS_REGION`       | AWS 區域                             | us-east-1                                 | 是   |
| `BEDROCK_MODEL_ID` | Bedrock 模型 ID                      | anthropic.claude-sonnet-4-5-20250929-v1:0 | 否   |
| `NEWS_API_KEY`     | 新聞 API Key                         | -                                         | 建議 |
| `API_KEYS`         | API 認證金鑰（逗號分隔）             | -                                         | 是   |
| `CACHE_DIR`        | 快取目錄                             | .cache                                    | 否   |
| `LOG_LEVEL`        | 日誌等級 (debug/info/warn/error)     | info                                      | 否   |

### LangChain 功能配置 (可選)

| 變數名稱                    | 說明                           | 預設值                | 必填 |
| --------------------------- | ------------------------------ | --------------------- | ---- |
| `FEATURE_LANGCHAIN_AGENT`   | 啟用 Agent 工具調用            | false                 | 否   |
| `FEATURE_LANGCHAIN_RAG`     | 啟用 RAG 檢索增強              | false                 | 否   |
| `FEATURE_LANGCHAIN_MEMORY`  | 啟用對話記憶管理               | false                 | 否   |
| `CHROMA_URL`                | Chroma 向量資料庫 URL          | http://localhost:8000 | RAG  |
| `CHROMA_USERNAME`           | Chroma 認證使用者名稱          | admin                 | RAG  |
| `CHROMA_PASSWORD`           | Chroma 認證密碼                | -                     | RAG  |

## LangChain 整合 (可選功能)

本專案支援 LangChain 1.x 框架的漸進式整合，提供 Agent 工具調用、RAG 檢索增強和對話記憶管理等進階功能。

### 功能特性

#### 1. Agent 工具調用

使用 LangChain Agent 自動編排工作流程，簡化複雜的多步驟邏輯：

```typescript
// Agent 會自動決定需要調用哪些工具
const result = await agentOrchestrator.executeTask(
  "針對最近的司法改革新聞，生成一篇 Instagram 貼文"
);
```

**優勢**:
- 減少 30-40% 的編排邏輯程式碼
- 自動處理工具選擇與參數傳遞
- 更自然的使用者互動體驗

#### 2. RAG 檢索增強生成

建立判決書知識庫，支援語義搜尋和問答（為 Module 3 準備）：

```typescript
// 搜尋相似案例
const similarCases = await knowledgeBase.searchSimilarCases(
  "酒駕致死案件的量刑趨勢", 
  5
);

// 問答查詢
const analysis = await knowledgeBase.query(
  "分析過去 5 年內酒駕致死案件的量刑趨勢"
);
```

**優勢**:
- 快速建立語義搜尋能力
- 支援多種向量資料庫（Chroma, FAISS）
- 節省 4-6 週開發時間

#### 3. 對話記憶管理

支援多輪對話的上下文記憶，提升內容精煉的連貫性：

```typescript
// 記住精煉歷史
await memory.saveContext(
  { input: originalContent },
  { output: refinedContent }
);
```

### Feature Flag 配置

使用環境變數控制 LangChain 功能的啟用：

```bash
# 啟用 LangChain Agent 工具調用
FEATURE_LANGCHAIN_AGENT=true

# 啟用 LangChain RAG（需要配置 Chroma）
FEATURE_LANGCHAIN_RAG=true

# 啟用 LangChain Memory
FEATURE_LANGCHAIN_MEMORY=true
```

### Chroma 向量資料庫設定

當啟用 RAG 功能時，需要配置 Chroma 向量資料庫：

#### 使用 Docker Compose 啟動 Chroma

```bash
# 啟動 Chroma 服務
docker-compose -f docker-compose.chroma.yml up -d

# 檢查服務狀態
docker-compose -f docker-compose.chroma.yml ps
```

#### 環境變數配置

```bash
CHROMA_URL=http://localhost:8000
CHROMA_USERNAME=admin
CHROMA_PASSWORD=your_password
```

### 效能比較

基於效能基準測試（100 次迭代）：

| 指標 | 原生 BedrockClient | LangChain Adapter | 差異 |
|------|-------------------|-------------------|------|
| 平均回應時間 | ~1.8s | ~2.0s | +11% |
| P95 回應時間 | ~2.5s | ~2.8s | +12% |
| 記憶體使用 | ~150MB | ~180MB | +20% |

**結論**: LangChain 增加約 10-20% 的延遲，但在 Agent 和 RAG 場景下，開發效率提升遠超效能損失。

### 使用範例

#### 範例 1: 使用 Agent 自動化工作流程

```typescript
import { AgentOrchestrator } from './services/AgentOrchestrator';

const orchestrator = new AgentOrchestrator(newsService, contentService);

// Agent 會自動搜尋新聞、分析內容、生成論述
const result = await orchestrator.executeTask(
  "搜尋最近的受害者權益新聞，並生成一篇 Facebook 貼文，強調情感共鳴"
);
```

#### 範例 2: 使用 RAG 查詢判決資料

```typescript
import { JudicialKnowledgeBase } from './services/JudicialKnowledgeBase';

const knowledgeBase = new JudicialKnowledgeBase();
await knowledgeBase.initialize(judgmentDocuments);

// 語義搜尋相似案例
const cases = await knowledgeBase.searchSimilarCases("酒駕致死", 5);

// 分析法官判決模式
const pattern = await knowledgeBase.analyzeJudgePattern("王法官");

// 量刑趨勢分析
const trend = await knowledgeBase.analyzeSentencingTrend("酒駕致死", 5);
```

### 最佳實踐

1. **漸進式整合**: 先在非關鍵路徑測試，驗證效能和品質後再擴展
2. **Feature Flag 控制**: 使用環境變數控制功能啟用，支援 A/B 測試
3. **效能監控**: 持續監控回應時間和錯誤率，設定告警閾值
4. **保留現有實作**: 不替換穩定的 BedrockClient 和 PromptBuilder
5. **完整測試**: 遵循 TDD 流程，確保測試覆蓋率 > 95%

### 相關文件

- [LangChain 評估報告](docs/langchain-evaluation.md) - 詳細的技術評估和整合策略
- [LangChain 最佳實踐](docs/langchain-best-practices.md) - Agent 設計模式和 RAG 優化技巧
- [LangChain 官方文檔](https://js.langchain.com/) - 官方 API 文檔和教學

## 開發指南

### TDD 工作流程

本專案遵循測試驅動開發 (TDD) 方法論：

1. **RED**: 先寫失敗的測試
2. **GREEN**: 實作最小程式碼使測試通過
3. **REFACTOR**: 重構並保持測試通過

### 程式碼風格

- 使用 TypeScript strict 模式
- 遵循 ESLint 規則
- 使用 Prettier 格式化程式碼
- 撰寫清晰的 JSDoc 註解

### 提交規範

使用 Conventional Commits 格式：

```
feat(api): add content refinement endpoint
fix(mcp): resolve tool invocation error
docs(readme): update installation guide
test(services): add content generation tests
```

## 授權

MIT License

## 貢獻

歡迎提交 Issue 和 Pull Request！

## 聯絡方式

如有問題或建議，請透過 GitHub Issues 聯繫。
