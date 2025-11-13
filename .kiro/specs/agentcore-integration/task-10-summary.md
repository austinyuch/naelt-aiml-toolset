# Task 10 完成摘要：本地 Docker 測試

## 完成日期
2025-11-13

## 任務目標
驗證 Docker 容器化的 MCP Server 在本地環境正常運作，確保所有端點可訪問且符合 AgentCore Runtime 要求。

## 完成的工作

### 1. 修復配置問題
- **問題**: .env 檔案中的註解導致配置驗證失敗
- **解決**: 移除 .env 檔案中的行內註解
- **檔案**: `.env`

### 2. 修復 MCP 輸出格式
- **問題**: search_news 工具回傳陣列，但 MCP schema 期望物件
- **解決**: 將陣列包裝成 `{results: [], total: number}` 格式
- **檔案**: `src/mcp/server.ts`

### 3. 修復日期序列化
- **問題**: published_date 是 Date 物件，但 schema 期望字串
- **解決**: 將 Date 物件轉換為 ISO 字串
- **檔案**: `src/mcp/server.ts`

### 4. 建立測試腳本
- **檔案**: `scripts/test-docker-mcp.sh`
- **功能**: 
  - 測試 Health 端點
  - 列出 MCP 工具
  - 測試 search_news 工具
  - 測試 generate_content 工具
  - 測試 refine_content 工具

### 5. Docker 測試驗證
- ✅ Docker 映像成功建構
- ✅ 容器成功啟動（健康狀態）
- ✅ Health 端點回應正確
- ✅ MCP 端點可訪問
- ✅ 工具列表正確回傳（3 個工具）
- ✅ search_news 工具正常運作
- ✅ 日誌輸出格式正確

## 測試結果

### 成功的測試 ✅

#### Health 端點
```bash
curl http://localhost:8000/health
```
```json
{
  "status": "healthy",
  "service": "advocacy-content-generator",
  "version": "1.0.0",
  "transport": "streamable-http"
}
```

#### MCP 工具列表
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```
回傳 3 個工具：
1. search_news
2. generate_content
3. refine_content

#### search_news 工具
```bash
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_news","arguments":{"keywords":["司法改革"]}}}'
```
成功回傳 10 篇新聞文章

### 需要 AWS 憑證的測試 ⚠️

- **generate_content**: 需要 AWS Bedrock 存取權限
- **refine_content**: 需要 AWS Bedrock 存取權限

這些工具在 AgentCore Runtime 部署後將自動獲得必要的 IAM 權限。

## Requirements 驗證

| Requirement | 描述 | 狀態 |
|------------|------|------|
| 7.1 | 暴露 8000 端口 | ✅ |
| 7.2 | /mcp 路徑可訪問 | ✅ |
| 7.3 | 健康檢查端點 | ✅ |
| 7.4 | 包含 prompts 目錄 | ✅ |
| 7.5 | 設定環境變數 | ✅ |

## 程式碼變更

### src/mcp/server.ts
```typescript
// 修復 search_news 輸出格式
async ({ keywords }) => {
  const articles = await this.orchestrator.newsService.searchNews(keywords);
  // Convert Date objects to ISO strings for MCP protocol compliance
  const serializedArticles = articles.map(article => ({
    ...article,
    published_date: article.published_date instanceof Date 
      ? article.published_date.toISOString() 
      : article.published_date
  }));
  const result = {
    results: serializedArticles,
    total: serializedArticles.length
  };
  return {
    content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    structuredContent: result as unknown as { [x: string]: unknown }
  };
}
```

### .env
```bash
# 移除行內註解
SERVICE_MODE=unified
MCP_TRANSPORT=stdio
NEWS_API_PROVIDER=newsapi
```

## 建立的檔案

1. `scripts/test-docker-mcp.sh` - Docker MCP 測試腳本
2. `.kiro/specs/agentcore-integration/task-10-test-report.md` - 詳細測試報告
3. `.kiro/specs/agentcore-integration/task-10-summary.md` - 本摘要文件

## Docker 命令參考

### 建構映像
```bash
docker build -t advocacy-content-generator:latest .
```

### 啟動容器
```bash
docker run -d \
  --name advocacy-mcp-test \
  -p 8000:8000 \
  --env-file .env \
  -e SERVICE_MODE=mcp-only \
  -e MCP_TRANSPORT=streamable-http \
  -v ~/.aws:/home/appuser/.aws:ro \
  advocacy-content-generator:latest
```

### 檢查容器狀態
```bash
docker ps | grep advocacy
```

### 查看日誌
```bash
docker logs advocacy-mcp-test
```

### 停止並移除容器
```bash
docker stop advocacy-mcp-test
docker rm advocacy-mcp-test
```

## 下一步

Task 10 已完成，可以繼續進行：

**Task 11: 設定 Cognito 認證**
- 建立 Cognito User Pool
- 建立 App Client
- 建立測試使用者
- 取得 Bearer Token
- 記錄 Discovery URL 和 Client ID

## 學習經驗

1. **環境變數格式**: .env 檔案不應包含行內註解，會導致解析錯誤
2. **MCP 輸出格式**: 必須嚴格符合 Zod schema 定義，包括資料類型
3. **日期序列化**: Date 物件需要轉換為 ISO 字串才能通過 JSON 序列化
4. **Docker 健康檢查**: 容器啟動後需要等待健康檢查通過才能確認服務正常
5. **AWS 憑證**: 本地 Docker 測試需要掛載 ~/.aws 目錄才能存取 AWS 服務

## 結論

Task 10 成功完成！Docker 容器化的 MCP Server 已驗證可以正常運作，所有核心端點都可訪問且符合 AgentCore Runtime 的要求。search_news 工具已完整測試通過，generate_content 和 refine_content 工具在部署到 AgentCore Runtime 後將自動獲得必要的 AWS 權限。
