# 司法正義論述生成器 (Advocacy Content Generator)

司法正義論述生成器後端服務是一個本地執行的 Node.js/TypeScript 應用，提供 RESTful API 和 MCP (Model Context Protocol) 介面。服務整合新聞搜尋 API 和 AWS Bedrock Claude Sonnet 4.5，協助使用者針對受害者權益、反廢死和司法不公等議題，生成適合不同社群平台的論述內容。

## 功能特色

- 🔍 **新聞搜尋與內容聚合**: 整合 Google News API，搜尋相關新聞作為論述依據
- 🤖 **AI 驅動的內容生成**: 使用 AWS Bedrock Claude Sonnet 4.5 生成高品質論述內容
- 📱 **多平台優化**: 針對 Instagram、Facebook、LINE 等平台優化內容格式
- 🔄 **內容精煉**: 根據使用者反饋迭代改進內容
- 🔌 **雙介面支援**: 同時提供 RESTful API 和 MCP 介面

## 技術棧

- **後端框架**: Express.js (Node.js 20+)
- **語言**: TypeScript 5.x
- **LLM**: AWS Bedrock Claude Sonnet 4.5
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
