# MCP 整合指南

本文件說明如何將司法正義論述生成器整合到支援 Model Context Protocol (MCP) 的應用程式中。

## 目錄

- [什麼是 MCP](#什麼是-mcp)
- [系統需求](#系統需求)
- [快速開始](#快速開始)
- [MCP 工具](#mcp-工具)
- [Claude Desktop 整合](#claude-desktop-整合)
- [自訂 MCP 客戶端](#自訂-mcp-客戶端)
- [故障排除](#故障排除)

## 什麼是 MCP

Model Context Protocol (MCP) 是一個開放標準，讓 AI 應用程式能夠安全地連接到外部資料來源和工具。透過 MCP，Claude 等 AI 助手可以：

- 存取本地和遠端資料
- 執行特定功能
- 與外部系統互動

本服務實作了 MCP 伺服器，提供新聞搜尋和內容生成功能。

## 系統需求

- Node.js 20+ LTS
- 支援 MCP 的客戶端應用（如 Claude Desktop）
- AWS 帳號（用於 Bedrock）
- Google News API Key（可選）

## 快速開始

### 1. 建構專案

```bash
# 安裝依賴
npm install

# 建構 TypeScript
npm run build
```

### 2. 配置環境變數

建立 `.env` 檔案：

```bash
# 服務模式（設定為 mcp-only）
SERVICE_MODE=mcp-only

# AWS 配置
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-5-20250929-v1:0

# 新聞 API（可選）
NEWS_API_KEY=your-news-api-key

# 快取配置
CACHE_DIR=.cache

# 日誌配置
LOG_LEVEL=info
```

### 3. 測試 MCP 伺服器

```bash
# 啟動 MCP 伺服器
npm run start:mcp

# 伺服器會在 stdio 上監聽 MCP 協議訊息
```

## MCP 工具

本服務提供以下 MCP 工具：

### 1. search_news

搜尋與司法議題相關的新聞文章。

**輸入參數：**

```json
{
  "keywords": ["司法改革", "受害者權益"]
}
```

**輸出：**

```json
{
  "results": [
    {
      "title": "司法改革新進展：受害者權益保護法案通過",
      "source": "中央社",
      "published_date": "2025-11-10T10:30:00Z",
      "url": "https://example.com/news/1",
      "summary": "立法院今日三讀通過受害者權益保護法案..."
    }
  ],
  "total": 15
}
```

### 2. generate_content

根據使用者觀點和新聞背景生成論述內容。

**輸入參數：**

```json
{
  "user_input": "我認為應該加強受害者權益保護",
  "topic_templates": ["victim_rights"],
  "platform_type": "instagram",
  "selected_news_urls": ["https://example.com/news/1"]
}
```

**輸出：**

```json
{
  "variants": [
    {
      "text": "【為受害者發聲】\n\n根據最新通過的受害者權益保護法案...",
      "image_suggestion": "一雙緊握的手，象徵支持與團結",
      "hashtags": ["受害者權益", "司法改革", "為正義發聲"],
      "metadata": {
        "variant_type": "理性分析",
        "tone": "客觀、數據導向"
      }
    }
  ],
  "generation_id": "gen_abc123xyz"
}
```

### 3. refine_content

根據反饋精煉已生成的內容。

**輸入參數：**

```json
{
  "content_id": "gen_abc123xyz",
  "feedback": "請加強情感共鳴的部分"
}
```

**輸出：**

```json
{
  "text": "【為受害者發聲，從你我做起】\n\n想像一下，如果是你的家人...",
  "image_suggestion": "溫暖的光線照進黑暗的房間",
  "hashtags": ["受害者權益", "同理心", "立即行動"],
  "metadata": {
    "variant_type": "情感共鳴 + 行動呼籲",
    "refinement_count": 1
  }
}
```

## Claude Desktop 整合

### 配置步驟

1. **找到 Claude Desktop 配置檔案**

   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. **編輯配置檔案**

   ```json
   {
     "mcpServers": {
       "advocacy-content-generator": {
         "command": "node",
         "args": ["/absolute/path/to/advocacy-content-generator/dist/index.js"],
         "env": {
           "SERVICE_MODE": "mcp-only",
           "AWS_REGION": "us-east-1",
           "AWS_PROFILE": "default",
           "NEWS_API_KEY": "your-news-api-key",
           "CACHE_DIR": "/tmp/advocacy-cache",
           "LOG_LEVEL": "info"
         }
       }
     }
   }
   ```

   **重要提示：**

   - 使用絕對路徑指向 `dist/index.js`
   - 確保 `SERVICE_MODE` 設定為 `mcp-only`
   - 配置 AWS 憑證（使用 `AWS_PROFILE` 或環境變數）

3. **重啟 Claude Desktop**

   關閉並重新開啟 Claude Desktop 以載入新配置。

4. **驗證整合**

   在 Claude Desktop 中輸入：

   ```
   請使用 search_news 工具搜尋「司法改革」相關新聞
   ```

   Claude 應該能夠呼叫 MCP 工具並回傳結果。

### 使用範例

#### 範例 1：搜尋新聞

```
請幫我搜尋最近關於「受害者權益」和「司法改革」的新聞
```

Claude 會使用 `search_news` 工具搜尋相關新聞並摘要結果。

#### 範例 2：生成 Instagram 內容

```
根據剛才搜尋到的新聞，請幫我生成一篇適合 Instagram 發布的論述內容，
主題是受害者權益，我的觀點是「應該加強受害者在司法程序中的保護」
```

Claude 會使用 `generate_content` 工具生成多個內容變體。

#### 範例 3：精煉內容

```
請幫我精煉剛才生成的第一個變體，加強情感共鳴的部分，
並增加具體的行動建議
```

Claude 會使用 `refine_content` 工具改進內容。

### 完整工作流程範例

```
使用者: 我想為受害者權益發聲，請幫我準備一篇 Instagram 貼文

Claude: 好的，讓我先搜尋相關新聞。

[使用 search_news 工具]

Claude: 我找到了幾篇相關新聞：
1. 受害者權益保護法案通過
2. 司法改革新進展
...

現在讓我根據這些新聞生成內容。

[使用 generate_content 工具]

Claude: 我生成了三個版本的內容：

版本 1（理性分析）：
【為受害者發聲】
根據最新通過的受害者權益保護法案...

版本 2（情感共鳴）：
想像一下，如果是你的家人...

版本 3（行動呼籲）：
【行動起來】
受害者權益保護法案已通過...

您比較喜歡哪一個版本？或者需要我調整某個版本？

使用者: 我喜歡版本 2，但希望加入一些具體的行動建議

Claude: 好的，讓我精煉版本 2。

[使用 refine_content 工具]

Claude: 這是精煉後的版本：

【為受害者發聲，從你我做起】

想像一下，如果是你的家人遭遇不幸...

你可以立即行動：
✅ 關注並分享受害者的故事
✅ 支持受害者保護組織
...

這個版本如何？
```

## 自訂 MCP 客戶端

如果您想建立自己的 MCP 客戶端，可以使用 `@modelcontextprotocol/sdk`。

### 安裝 SDK

```bash
npm install @modelcontextprotocol/sdk
```

### 基本客戶端實作

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { spawn } from "child_process";

async function createMCPClient() {
  // 啟動 MCP 伺服器程序
  const serverProcess = spawn(
    "node",
    ["/path/to/advocacy-content-generator/dist/index.js"],
    {
      env: {
        ...process.env,
        SERVICE_MODE: "mcp-only",
        AWS_REGION: "us-east-1",
      },
    }
  );

  // 建立 stdio transport
  const transport = new StdioClientTransport({
    command: "node",
    args: ["/path/to/advocacy-content-generator/dist/index.js"],
    env: {
      SERVICE_MODE: "mcp-only",
      AWS_REGION: "us-east-1",
    },
  });

  // 建立客戶端
  const client = new Client(
    {
      name: "my-mcp-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  // 連接到伺服器
  await client.connect(transport);

  return client;
}

// 使用範例
async function main() {
  const client = await createMCPClient();

  try {
    // 列出可用工具
    const tools = await client.listTools();
    console.log(
      "可用工具:",
      tools.tools.map((t) => t.name)
    );

    // 呼叫 search_news 工具
    const newsResult = await client.callTool({
      name: "search_news",
      arguments: {
        keywords: ["司法改革", "受害者權益"],
      },
    });

    console.log("新聞搜尋結果:", newsResult.content);

    // 呼叫 generate_content 工具
    const contentResult = await client.callTool({
      name: "generate_content",
      arguments: {
        user_input: "我認為應該加強受害者權益保護",
        topic_templates: ["victim_rights"],
        platform_type: "instagram",
        selected_news_urls: [],
      },
    });

    console.log("生成的內容:", contentResult.content);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
```

### 進階客戶端功能

```typescript
class AdvocacyContentMCPClient {
  private client: Client;

  constructor(private serverPath: string) {}

  async connect() {
    const transport = new StdioClientTransport({
      command: "node",
      args: [this.serverPath],
      env: {
        SERVICE_MODE: "mcp-only",
        AWS_REGION: process.env.AWS_REGION || "us-east-1",
        NEWS_API_KEY: process.env.NEWS_API_KEY,
      },
    });

    this.client = new Client(
      { name: "advocacy-content-client", version: "1.0.0" },
      { capabilities: {} }
    );

    await this.client.connect(transport);
  }

  async searchNews(keywords: string[]): Promise<any> {
    const result = await this.client.callTool({
      name: "search_news",
      arguments: { keywords },
    });

    return JSON.parse(result.content[0].text);
  }

  async generateContent(
    userInput: string,
    topicTemplates: string[],
    platformType: string,
    newsUrls: string[] = []
  ): Promise<any> {
    const result = await this.client.callTool({
      name: "generate_content",
      arguments: {
        user_input: userInput,
        topic_templates: topicTemplates,
        platform_type: platformType,
        selected_news_urls: newsUrls,
      },
    });

    return JSON.parse(result.content[0].text);
  }

  async refineContent(contentId: string, feedback: string): Promise<any> {
    const result = await this.client.callTool({
      name: "refine_content",
      arguments: {
        content_id: contentId,
        feedback,
      },
    });

    return JSON.parse(result.content[0].text);
  }

  async close() {
    await this.client.close();
  }
}

// 使用範例
async function workflow() {
  const client = new AdvocacyContentMCPClient(
    "/path/to/advocacy-content-generator/dist/index.js"
  );

  try {
    await client.connect();

    // 1. 搜尋新聞
    const news = await client.searchNews(["司法改革", "受害者權益"]);
    console.log(`找到 ${news.total} 篇新聞`);

    // 2. 生成內容
    const content = await client.generateContent(
      "我認為應該加強受害者權益保護",
      ["victim_rights"],
      "instagram",
      news.results.slice(0, 3).map((n: any) => n.url)
    );

    console.log(`生成了 ${content.variants.length} 個變體`);

    // 3. 精煉內容
    const refined = await client.refineContent(
      content.generation_id,
      "請加強情感共鳴"
    );

    console.log("精煉後的內容:", refined.text);
  } finally {
    await client.close();
  }
}

workflow().catch(console.error);
```

## 故障排除

### 問題 1：Claude Desktop 無法找到 MCP 伺服器

**症狀：** Claude Desktop 啟動時沒有載入 MCP 工具

**解決方案：**

1. 檢查配置檔案路徑是否正確
2. 確認 `dist/index.js` 的絕對路徑正確
3. 檢查 Node.js 是否在 PATH 中
4. 查看 Claude Desktop 的日誌檔案

```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp*.log

# Windows
type %APPDATA%\Claude\logs\mcp*.log

# Linux
tail -f ~/.config/Claude/logs/mcp*.log
```

### 問題 2：AWS 憑證錯誤

**症狀：** MCP 工具呼叫失敗，錯誤訊息提到 AWS 憑證

**解決方案：**

1. 確認 AWS CLI 已配置：

```bash
aws configure list
```

2. 在 MCP 配置中明確指定 AWS Profile：

```json
{
  "env": {
    "AWS_PROFILE": "default",
    "AWS_REGION": "us-east-1"
  }
}
```

3. 或使用環境變數：

```json
{
  "env": {
    "AWS_ACCESS_KEY_ID": "your-access-key",
    "AWS_SECRET_ACCESS_KEY": "your-secret-key",
    "AWS_REGION": "us-east-1"
  }
}
```

### 問題 3：工具呼叫超時

**症狀：** MCP 工具呼叫時間過長或超時

**解決方案：**

1. 檢查網路連線
2. 確認 AWS Bedrock 服務可用
3. 增加日誌等級以診斷問題：

```json
{
  "env": {
    "LOG_LEVEL": "debug"
  }
}
```

### 問題 4：新聞搜尋失敗

**症狀：** `search_news` 工具回傳錯誤

**解決方案：**

1. 確認 `NEWS_API_KEY` 已設定且有效
2. 檢查 API 配額是否用盡
3. 如果沒有新聞 API，工具會回傳模擬資料

### 問題 5：內容生成品質不佳

**症狀：** 生成的內容不符合預期

**解決方案：**

1. 提供更詳細的 `user_input`
2. 選擇合適的 `topic_templates`
3. 使用 `refine_content` 工具迭代改進
4. 調整提示模板（位於 `prompts/` 目錄）

## 除錯技巧

### 啟用詳細日誌

```json
{
  "env": {
    "LOG_LEVEL": "debug",
    "NODE_ENV": "development"
  }
}
```

### 測試 MCP 伺服器

```bash
# 直接執行 MCP 伺服器
SERVICE_MODE=mcp-only \
AWS_REGION=us-east-1 \
LOG_LEVEL=debug \
node dist/index.js
```

### 使用 MCP Inspector

MCP SDK 提供了一個檢查工具：

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

這會啟動一個 Web 介面，讓您可以測試 MCP 工具。

## 效能優化

### 快取策略

MCP 伺服器會快取以下資料：

- 模板定義（記憶體快取）
- 新聞搜尋結果（檔案快取，1 小時）
- 生成的內容（檔案快取，15 分鐘）

### 並行處理

如果需要生成多個內容，可以使用並行呼叫：

```typescript
const results = await Promise.all([
  client.generateContent("觀點1", ["victim_rights"], "instagram"),
  client.generateContent("觀點2", ["anti_death_penalty"], "facebook"),
  client.generateContent("觀點3", ["judicial_injustice"], "line"),
]);
```

## 安全性考量

### 1. 環境變數保護

不要在配置檔案中硬編碼敏感資訊：

```json
{
  "env": {
    "NEWS_API_KEY": "${NEWS_API_KEY}",
    "AWS_ACCESS_KEY_ID": "${AWS_ACCESS_KEY_ID}"
  }
}
```

### 2. 檔案權限

確保配置檔案權限正確：

```bash
chmod 600 ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

### 3. 日誌脫敏

MCP 伺服器會自動脫敏日誌中的敏感資訊。

## 相關資源

- [MCP 官方文件](https://modelcontextprotocol.io/)
- [MCP SDK GitHub](https://github.com/modelcontextprotocol/sdk)
- [Claude Desktop](https://claude.ai/desktop)
- [API 使用指南](./api-guide.md)
- [AWS 部署指南](./deployment-guide.md)

## 支援

如有問題或建議，請透過 GitHub Issues 聯繫。
