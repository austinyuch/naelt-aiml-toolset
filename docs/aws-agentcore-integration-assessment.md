# AWS Bedrock AgentCore 整合評估

## 執行摘要

AWS Bedrock AgentCore 是 AWS 推出的企業級 AI Agent 平台，提供完整的 Agent 開發、部署和運營能力。本文件評估如何將現有的「司法正義論述生成器」整合到 AgentCore 生態系統中。

**核心結論**: AgentCore 提供了強大的企業級基礎設施，建議採用**漸進式整合策略**，優先整合 Runtime 和 Gateway，後續再擴展其他服務。

---

## AWS Bedrock AgentCore 概述

### 核心服務模組

AgentCore 提供 7 個可組合的模組化服務：

| 服務 | 功能 | 整合優先級 |
|------|------|-----------|
| **Runtime** | 無伺服器 Agent 運行環境，支援任何框架 | ⭐⭐⭐⭐⭐ 最高 |
| **Gateway** | 工具發現和調用的統一閘道，支援 MCP | ⭐⭐⭐⭐⭐ 最高 |
| **Identity** | Agent 身份和權限管理 | ⭐⭐⭐⭐ 高 |
| **Memory** | 短期和長期記憶管理 | ⭐⭐⭐ 中 |
| **Code Interpreter** | 安全的程式碼執行沙箱 | ⭐⭐ 低 |
| **Browser** | 雲端瀏覽器自動化 | ⭐⭐ 低 |
| **Observability** | 追蹤、除錯和監控 | ⭐⭐⭐⭐ 高 |

### 關鍵特性

1. **框架無關**: 支援 LangGraph, CrewAI, Strands Agents 等任何框架
2. **模型無關**: 可使用任何 LLM（Bedrock, OpenAI, Anthropic 等）
3. **協議支援**: 原生支援 MCP (Model Context Protocol)
4. **企業級**: 內建安全性、擴展性、可觀測性
5. **無伺服器**: 自動擴展，無需管理基礎設施

---

## 整合方案評估

### 方案 A: AgentCore Runtime 部署 (推薦)

**概述**: 將現有的 Express.js + MCP Server 部署到 AgentCore Runtime

#### 架構圖

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ Kiro IDE │  │ Claude   │  │ Frontend Web App     │  │
│  │          │  │ Desktop  │  │                      │  │
│  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘  │
└───────┼─────────────┼───────────────────┼──────────────┘
        │             │                   │
        │ MCP         │ MCP               │ HTTPS
        │             │                   │
┌───────▼─────────────▼───────────────────▼──────────────┐
│           AWS Bedrock AgentCore Runtime                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Advocacy Content Generator (Containerized)     │   │
│  │  ┌──────────────┐  ┌──────────────────────┐    │   │
│  │  │ MCP Server   │  │ Express REST API     │    │   │
│  │  │ (stdio/http) │  │ (Port 8000)          │    │   │
│  │  └──────┬───────┘  └──────────┬───────────┘    │   │
│  │         │                     │                 │   │
│  │         └──────────┬──────────┘                 │   │
│  │                    │                            │   │
│  │         ┌──────────▼──────────┐                 │   │
│  │         │ ContentOrchestrator │                 │   │
│  │         └──────────┬──────────┘                 │   │
│  │                    │                            │   │
│  │    ┌───────────────┼───────────────┐            │   │
│  │    │               │               │            │   │
│  │ ┌──▼────┐  ┌──────▼──────┐  ┌────▼─────┐      │   │
│  │ │ News  │  │  Content    │  │ Template │      │   │
│  │ │Service│  │  Service    │  │ Service  │      │   │
│  │ └───────┘  └─────────────┘  └──────────┘      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Features:                                              │
│  • Session Isolation                                    │
│  • Auto-scaling                                         │
│  • Extended Runtime (60 min timeout)                    │
│  • Built-in Identity (OAuth/Cognito)                    │
└─────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐
│ AWS Bedrock  │  │ Google     │  │ AgentCore  │
│ Claude 4.5   │  │ News API   │  │ Gateway    │
└──────────────┘  └────────────┘  └────────────┘
```

#### 優點

✅ **快速部署**: 使用 `bedrock-agentcore-starter-toolkit` CLI 一鍵部署
✅ **零基礎設施管理**: 完全無伺服器，自動擴展
✅ **原生 MCP 支援**: Runtime 原生支援 MCP streamable-http 協議
✅ **企業級安全**: 內建 IAM、OAuth、Cognito 整合
✅ **成本效益**: 按使用量付費，無閒置成本
✅ **長時間運行**: 支援 60 分鐘超時（適合複雜內容生成）
✅ **Session 隔離**: 每個請求自動隔離，無狀態設計

#### 挑戰

⚠️ **協議適配**: 需要將 stdio MCP 轉換為 streamable-http
⚠️ **認證整合**: 需要設定 Cognito 或 OAuth 認證
⚠️ **容器化**: 需要 Docker 容器打包
⚠️ **學習曲線**: 團隊需要學習 AgentCore 工具鏈

#### 實作步驟

**Phase 1: 準備階段 (1-2 天)**

1. 安裝 AgentCore 工具
```bash
pip install bedrock-agentcore-starter-toolkit
pip install mcp  # FastMCP for streamable-http
```

2. 修改 MCP Server 支援 streamable-http
```typescript
// src/mcp/server.ts
import { FastMCP } from 'mcp/server/fastmcp';

export class MCPServer {
  private mcp: FastMCP;

  constructor(orchestrator: ContentOrchestrator) {
    // 使用 FastMCP 支援 streamable-http
    this.mcp = new FastMCP({
      host: '0.0.0.0',
      port: 8000,
      stateless_http: true  // 關鍵: 啟用無狀態 HTTP
    });

    this.setupTools(orchestrator);
  }

  private setupTools(orchestrator: ContentOrchestrator) {
    // 註冊工具
    this.mcp.tool('search_news', async (args) => {
      return await orchestrator.newsService.searchNews(args.keywords);
    });

    this.mcp.tool('generate_content', async (args) => {
      return await orchestrator.orchestrateContentGeneration(args);
    });

    this.mcp.tool('refine_content', async (args) => {
      return await orchestrator.contentService.refineContent(
        args.content_id,
        args.feedback
      );
    });
  }

  async start() {
    await this.mcp.run({ transport: 'streamable-http' });
  }
}
```

3. 建立 Dockerfile（如果尚未存在）
```dockerfile
FROM node:20-alpine

WORKDIR /app

# 複製依賴檔案
COPY package*.json ./
RUN npm ci --only=production

# 複製原始碼
COPY dist ./dist
COPY prompts ./prompts

# 暴露 MCP 端口
EXPOSE 8000

# 啟動 MCP Server
CMD ["node", "dist/index.js"]
```

**Phase 2: 部署階段 (1 天)**

1. 設定 Cognito 認證
```bash
# 執行 AWS 提供的 setup_cognito.sh 腳本
export REGION=us-east-1
export USERNAME=admin
export PASSWORD=YourSecurePassword123!

./setup_cognito.sh
```

2. 配置 AgentCore 部署
```bash
# 初始化配置
agentcore configure -e src/index.ts --protocol MCP

# 配置選項:
# - Execution Role: 選擇或建立 IAM 角色
# - ECR Repository: 自動建立
# - Dependencies: 自動偵測 package.json
# - OAuth: 使用 Cognito Discovery URL 和 Client ID
```

3. 部署到 AgentCore Runtime
```bash
# 一鍵部署
agentcore launch

# 輸出範例:
# ✓ Building Docker image...
# ✓ Pushing to ECR...
# ✓ Creating AgentCore Runtime...
# ✓ Deployment complete!
# 
# Runtime ARN: arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/advocacy-content-generator-xyz
```

**Phase 3: 測試階段 (1 天)**

1. 本地測試 MCP 工具
```typescript
// test_mcp_client.ts
import { ClientSession } from 'mcp';
import { streamablehttp_client } from 'mcp/client/streamable_http';

async function testDeployedAgent() {
  const agentArn = process.env.AGENT_ARN;
  const bearerToken = process.env.BEARER_TOKEN;
  
  const encodedArn = agentArn.replace(/:/g, '%3A').replace(/\//g, '%2F');
  const mcpUrl = `https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/${encodedArn}/invocations?qualifier=DEFAULT`;
  
  const headers = {
    'authorization': `Bearer ${bearerToken}`,
    'Content-Type': 'application/json'
  };

  async with streamablehttp_client(mcpUrl, headers) as (read, write, _) {
    async with ClientSession(read, write) as session {
      await session.initialize();
      
      // 測試新聞搜尋
      const result = await session.call_tool('search_news', {
        keywords: ['司法改革', '受害者權益']
      });
      
      console.log('News search result:', result);
    }
  }
}
```

2. 整合測試
```bash
# 設定環境變數
export AGENT_ARN="arn:aws:bedrock-agentcore:us-east-1:123456789012:runtime/advocacy-content-generator-xyz"
export BEARER_TOKEN="<從 Cognito 取得的 token>"

# 執行測試
npm run test:agentcore
```

#### 成本估算

基於 [AgentCore Runtime 定價](https://aws.amazon.com/bedrock/agentcore/pricing/):

- **Runtime 執行時間**: $0.00003 per second
- **記憶體使用**: $0.0000000625 per GB-second
- **請求數**: 無額外費用

**範例場景**:
- 每次內容生成: 30 秒執行時間, 1GB 記憶體
- 成本: $0.00003 × 30 + $0.0000000625 × 1 × 30 = **$0.0009 per request**
- 每月 10,000 次請求: **$9/月**

---

### 方案 B: AgentCore Gateway 整合

**概述**: 將現有的 REST API 和 MCP Server 註冊到 AgentCore Gateway

#### 架構圖

```
┌─────────────────────────────────────────────────────────┐
│                  AgentCore Gateway                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Tool Registry (MCP Compatible)                   │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────┐  │  │
│  │  │ search_news │  │ generate_   │  │ refine_  │  │  │
│  │  │             │  │ content     │  │ content  │  │  │
│  │  └──────┬──────┘  └──────┬──────┘  └────┬─────┘  │  │
│  └─────────┼────────────────┼──────────────┼────────┘  │
│            │                │              │           │
│  Features: │                │              │           │
│  • Auto API Discovery       │              │           │
│  • OpenAPI → MCP            │              │           │
│  • Centralized Auth         │              │           │
│  • Rate Limiting            │              │           │
└────────────┼────────────────┼──────────────┼───────────┘
             │                │              │
┌────────────▼────────────────▼──────────────▼───────────┐
│     Existing Advocacy Content Generator                 │
│     (Running on ECS Fargate or EC2)                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Express REST API                                 │  │
│  │  • POST /api/v1/news/search                       │  │
│  │  • POST /api/v1/content/generate                  │  │
│  │  • POST /api/v1/content/refine                    │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

#### 優點

✅ **最小改動**: 現有 API 無需修改
✅ **自動轉換**: Gateway 自動將 REST API 轉換為 MCP 工具
✅ **統一管理**: 集中管理所有工具的認證和授權
✅ **OpenAPI 整合**: 直接從 OpenAPI spec 生成工具定義
✅ **漸進式遷移**: 可以逐步遷移到 AgentCore

#### 挑戰

⚠️ **額外成本**: Gateway 有獨立的定價
⚠️ **網路延遲**: 增加一層閘道可能增加延遲
⚠️ **依賴性**: 依賴 Gateway 服務可用性

#### 實作步驟

1. 準備 OpenAPI 規格
```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: Advocacy Content Generator API
  version: 1.0.0
paths:
  /api/v1/news/search:
    post:
      operationId: search_news
      summary: Search news articles
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                keywords:
                  type: array
                  items:
                    type: string
      responses:
        '200':
          description: Success
```

2. 建立 Gateway 配置
```bash
# 使用 AWS CLI 建立 Gateway
aws bedrock-agentcore create-gateway \
  --name advocacy-content-gateway \
  --openapi-spec file://openapi.yaml \
  --endpoint-url https://your-api.example.com
```

3. 配置認證
```bash
# 設定 API Key 或 OAuth
aws bedrock-agentcore update-gateway-auth \
  --gateway-id <gateway-id> \
  --auth-type API_KEY \
  --api-key-header X-API-Key
```

---

### 方案 C: 混合架構 (最佳實踐)

**概述**: Runtime + Gateway 組合，充分利用兩者優勢

#### 架構圖

```
┌──────────────────────────────────────────────────────────┐
│                    Client Layer                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │ Kiro IDE │  │ Claude   │  │ Other AI Agents      │   │
│  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘   │
└───────┼─────────────┼───────────────────┼───────────────┘
        │ MCP         │ MCP               │ MCP
┌───────▼─────────────▼───────────────────▼───────────────┐
│           AWS Bedrock AgentCore Runtime                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Main Agent (Content Orchestrator)               │   │
│  │  • Coordinates content generation workflow       │   │
│  │  • Calls Gateway tools                           │   │
│  └────────────────────┬─────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────┘
                          │ MCP Client
┌─────────────────────────▼───────────────────────────────┐
│              AgentCore Gateway                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Tool Registry                                    │   │
│  │  ┌────────────┐  ┌────────────┐  ┌───────────┐  │   │
│  │  │ News API   │  │ Template   │  │ External  │  │   │
│  │  │ Search     │  │ Service    │  │ APIs      │  │   │
│  │  └──────┬─────┘  └──────┬─────┘  └─────┬─────┘  │   │
│  └─────────┼────────────────┼──────────────┼────────┘   │
└────────────┼────────────────┼──────────────┼────────────┘
             │                │              │
    ┌────────▼────┐  ┌────────▼────┐  ┌─────▼──────┐
    │ Google News │  │ Template DB │  │ Other APIs │
    │ API         │  │             │  │            │
    └─────────────┘  └─────────────┘  └────────────┘
```

#### 優點

✅ **最佳實踐**: 結合 Runtime 的執行能力和 Gateway 的工具管理
✅ **關注點分離**: Agent 邏輯在 Runtime，工具在 Gateway
✅ **可擴展性**: 易於新增新工具而不修改 Agent
✅ **企業級**: 完整的安全、監控、擴展能力

#### 實作重點

1. **Agent 在 Runtime 運行**: 主要的內容編排邏輯
2. **工具在 Gateway 註冊**: 新聞搜尋、模板管理等工具
3. **Agent 透過 MCP 呼叫 Gateway**: 使用 MCP client 調用工具

---

## 整合優先級建議

### 階段 1: 快速驗證 (1-2 週)

**目標**: 驗證 AgentCore 可行性

- [ ] 部署現有服務到 AgentCore Runtime (方案 A)
- [ ] 設定基本認證 (Cognito)
- [ ] 測試 MCP 工具調用
- [ ] 評估效能和成本

### 階段 2: 生產就緒 (2-4 週)

**目標**: 準備生產環境部署

- [ ] 整合 AgentCore Gateway (方案 C)
- [ ] 設定 AgentCore Identity
- [ ] 實作 AgentCore Observability
- [ ] 建立 CI/CD pipeline
- [ ] 負載測試和優化

### 階段 3: 進階功能 (4-8 週)

**目標**: 充分利用 AgentCore 能力

- [ ] 整合 AgentCore Memory (對話記憶)
- [ ] 探索 Code Interpreter (程式碼生成)
- [ ] 探索 Browser (網頁抓取)
- [ ] 多 Agent 協作

---

## 技術考量

### 1. MCP 協議適配

**現狀**: 使用 stdio transport
**需求**: AgentCore Runtime 需要 streamable-http

**解決方案**:
```typescript
// 使用 FastMCP 同時支援兩種 transport
import { FastMCP } from 'mcp/server/fastmcp';

const mcp = new FastMCP({
  host: '0.0.0.0',
  port: 8000,
  stateless_http: true  // AgentCore 需要
});

// 本地開發: stdio
if (process.env.NODE_ENV === 'development') {
  mcp.run({ transport: 'stdio' });
}

// AgentCore: streamable-http
if (process.env.NODE_ENV === 'production') {
  mcp.run({ transport: 'streamable-http' });
}
```

### 2. 認證整合

**選項 A: Cognito (推薦)**
- AWS 原生整合
- 支援 OAuth 2.0
- 易於管理使用者

**選項 B: 自訂 OAuth Provider**
- 整合現有身份系統
- 需要額外配置

### 3. 狀態管理

**AgentCore 要求**: 無狀態設計

**現有架構**: 已經是無狀態（符合要求）
- 使用 EFS 作為 L2 快取
- 無本地狀態依賴

### 4. 容器化

**現有**: 已有 Dockerfile
**需求**: 確保符合 AgentCore 要求
- 暴露 8000 端口
- 支援 `/mcp` 路徑
- 健康檢查端點

---

## 成本效益分析

### 現有架構 (ECS Fargate)

**每月成本估算**:
- ECS Fargate (0.5 vCPU, 1GB): ~$15/月
- ALB: ~$20/月
- EFS: ~$5/月
- **總計**: ~$40/月 (基礎成本)

### AgentCore Runtime

**每月成本估算** (10,000 requests):
- Runtime 執行: ~$9/月
- Gateway (如使用): ~$10/月
- Observability: ~$5/月
- **總計**: ~$24/月

**優勢**:
- 無閒置成本
- 自動擴展
- 無需管理基礎設施

---

## 風險評估

| 風險 | 影響 | 可能性 | 緩解措施 |
|------|------|--------|----------|
| 學習曲線陡峭 | 中 | 高 | 使用 AgentCore MCP Server 加速開發 |
| 供應商鎖定 | 高 | 中 | 保持 MCP 標準介面，易於遷移 |
| 成本超支 | 中 | 低 | 設定 CloudWatch 告警和預算 |
| 效能問題 | 中 | 低 | 充分測試和優化 |
| 認證複雜性 | 低 | 中 | 使用 Cognito 簡化 |

---

## 建議行動方案

### 立即行動 (本週)

1. **安裝 AgentCore MCP Server**
```bash
# 在 .kiro/settings/mcp.json 加入
{
  "mcpServers": {
    "bedrock-agentcore-mcp-server": {
      "command": "uvx",
      "args": ["awslabs.amazon-bedrock-agentcore-mcp-server@latest"],
      "env": {
        "FASTMCP_LOG_LEVEL": "ERROR"
      }
    }
  }
}
```

2. **使用 Kiro + AgentCore MCP Server 探索**
   - 詢問 AgentCore 相關問題
   - 讓 AI 協助轉換程式碼
   - 自動生成部署配置

3. **建立 POC 環境**
   - 設定 AWS 測試帳號
   - 部署簡單的 MCP Server
   - 驗證端對端流程

### 短期目標 (2 週內)

1. 完成方案 A 的 POC 部署
2. 測試效能和成本
3. 評估是否繼續深入整合

### 中期目標 (1-2 個月)

1. 生產環境部署
2. 整合 Gateway 和 Identity
3. 建立完整的 CI/CD

---

## 結論

AWS Bedrock AgentCore 提供了強大的企業級 AI Agent 基礎設施，特別適合需要：
- **快速擴展**: 自動處理流量波動
- **企業安全**: 內建身份和權限管理
- **運營可見性**: 完整的監控和追蹤
- **成本優化**: 按使用量付費

**建議採用漸進式整合策略**:
1. 先部署到 Runtime (驗證可行性)
2. 再整合 Gateway (統一工具管理)
3. 最後擴展其他服務 (Memory, Observability 等)

**關鍵成功因素**:
- 使用 AgentCore MCP Server 加速開發
- 保持 MCP 標準介面避免鎖定
- 充分測試和監控
- 團隊培訓和知識轉移

---

## 參考資源

- [AgentCore 官方文件](https://docs.aws.amazon.com/bedrock-agentcore/)
- [AgentCore MCP Server GitHub](https://github.com/awslabs/mcp/tree/main/src/amazon-bedrock-agentcore-mcp-server)
- [AgentCore 範例程式碼](https://github.com/awslabs/amazon-bedrock-agentcore-samples)
- [MCP 協議規範](https://modelcontextprotocol.io/)
- [AgentCore 定價](https://aws.amazon.com/bedrock/agentcore/pricing/)
