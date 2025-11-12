# 實作計畫

- [x] 1. 建立專案結構和核心配置

  - 建立專案目錄結構（src/api, src/services, src/clients, src/types, src/core, src/prompts, src/mcp）
  - 初始化 Node.js 專案並設定 package.json 與 TypeScript 配置
  - 建立 .env.example 環境變數範本
  - 實作 src/config.ts 配置管理模組
  - 設定 Jest 測試框架和 ESLint/TypeScript 配置
  - _需求: 10.1, 10.2, 10.4_

- [x] 2. 實作 TypeScript 型別定義（TDD）

  - [x] 2.1 撰寫型別定義測試（TDD Red Phase）
    - 建立 tests/unit/types.test.ts 測試型別正確性
    - _需求: 2.2, 3.2, 4.2, 5.2, 9.2_
  - [x] 2.2 實作型別定義（TDD Green Phase）
    - 建立 src/types/requests.ts 定義請求介面（NewsSearchRequest, ContentGenerationRequest, ContentRefineRequest）
    - 建立 src/types/responses.ts 定義回應介面（NewsSearchResponse, ContentGenerationResponse, ErrorResponse）
    - 建立 src/types/domain.ts 定義領域模型（NewsArticle, ContentVariant, TopicTemplate, PlatformType）
    - 實作 Zod schema 進行執行時驗證
    - _需求: 2.2, 3.2, 4.2, 5.2, 9.2_

- [x] 3. 實作核心工具模組（TDD）

  - [x] 3.1 實作例外處理類別
    - 建立 tests/unit/core/exceptions.test.ts 測試自訂例外
    - 建立 src/core/exceptions.ts 定義自訂例外（APIException, ValidationError, NewsAPIUnavailable, LLMProviderError, RateLimitExceeded）
    - _需求: 9.1, 9.2, 9.3, 9.4_
  - [x] 3.2 實作快取管理器
    - 建立 tests/unit/core/cache.test.ts 測試快取功能
    - 建立 src/core/cache.ts 實作 CacheManager 類別
    - 實作 L1 記憶體快取（LRU cache）和 L2 檔案系統快取（EFS）
    - _需求: 3.5, 4.1_
  - [x] 3.3 實作速率限制器
    - 建立 tests/unit/core/rateLimiter.test.ts 測試速率限制邏輯
    - 建立 src/core/rateLimiter.ts 實作 RateLimiter 類別
    - 實作精煉次數限制（5 次/小時）
    - _需求: 4.4, 4.5_
  - [x] 3.4 實作重試機制
    - 建立 tests/unit/core/retry.test.ts 測試重試邏輯
    - 建立 src/core/retry.ts 實作指數退避重試函數
    - 支援最多 3 次重試，間隔 1s, 2s, 4s
    - _需求: 2.5, 9.3_

- [x] 4. 實作外部客戶端（TDD）

  - [x] 4.1 實作新聞 API 客戶端
    - 建立 tests/unit/clients/NewsAPIClient.test.ts 使用 Mock 測試
    - 建立 src/clients/NewsAPIClient.ts 實作 NewsAPIClient 類別
    - 整合 Google News API
    - 實作錯誤處理和重試機制
    - _需求: 2.1, 2.5, 9.3_
  - [x] 4.2 實作 AWS Bedrock 客戶端
    - 建立 tests/unit/clients/BedrockClient.test.ts 使用 Mock 測試
    - 建立 src/clients/BedrockClient.ts 實作 BedrockClient 類別
    - 整合 AWS Bedrock Claude Sonnet 4.5 API
    - 設定 LLM 參數（temperature=0.7, maxTokens=4096）
    - 實作錯誤處理和串流支援
    - _需求: 7.1, 7.4, 7.5, 9.4_

- [x] 5. 實作提示模板系統（TDD）

  - [x] 5.1 建立 Markdown 提示模板檔案
    - 建立 prompts/ 目錄結構（topics/, platforms/, variants/）
    - 建立 prompts/topics/victim_rights.md（受害者權益模板）
    - 建立 prompts/topics/anti_death_penalty.md（反廢死模板）
    - 建立 prompts/topics/judicial_injustice.md（司法不公模板）
    - 建立 prompts/platforms/instagram.md（Instagram 平台要求）
    - 建立 prompts/platforms/facebook.md（Facebook 平台要求）
    - 建立 prompts/platforms/line.md（LINE 平台要求）
    - 建立 prompts/variants/rational_analysis.md（理性分析變體）
    - 建立 prompts/variants/emotional_resonance.md（情感共鳴變體）
    - 建立 prompts/variants/call_to_action.md（行動呼籲變體）
    - 建立 prompts/refine.md（內容精煉模板）
    - _需求: 7.2, 7.3, 8.1, 8.2, 8.3_
  - [x] 5.2 撰寫模板載入器測試
    - 建立 tests/unit/prompts/PromptTemplateLoader.test.ts 測試模板載入
    - 建立 tests/unit/prompts/PromptBuilder.test.ts 測試 prompt 建構
    - _需求: 7.2, 7.3, 8.1, 8.2, 8.3_
  - [x] 5.3 實作模板載入器和建構器
    - 建立 src/prompts/PromptTemplateLoader.ts 實作模板載入邏輯
    - 建立 src/prompts/PromptBuilder.ts 實作 prompt 建構邏輯
    - 實作變數替換和新聞背景格式化
    - 實作模板快取機制
    - _需求: 7.2, 7.3, 8.1, 8.2, 8.3_

- [x] 6. 實作服務層（TDD）

  - [x] 6.1 實作新聞搜尋服務
    - 建立 tests/unit/services/NewsSearchService.test.ts 使用 Mock 測試
    - 建立 src/services/NewsSearchService.ts 實作 NewsSearchService 類別
    - 實作 searchNews 方法，呼叫 NewsAPIClient
    - 整合快取機制
    - _需求: 2.1, 2.3, 2.4_
  - [x] 6.2 實作內容生成服務
    - 建立 tests/unit/services/ContentGenerationService.test.ts 使用 Mock LLM 測試
    - 建立 src/services/ContentGenerationService.ts 實作 ContentGenerationService 類別
    - 實作 generateContent 方法，生成 3 個內容變體
    - 實作 refineContent 方法，根據反饋精煉內容
    - 整合 BedrockClient 和提示模板
    - 實作平台格式驗證
    - _需求: 3.1, 3.4, 3.5, 4.1, 4.3, 8.4, 8.5_
  - [x] 6.3 實作模板管理服務
    - 建立 tests/unit/services/TemplateManagementService.test.ts 測試模板管理
    - 建立 src/services/TemplateManagementService.ts 實作 TemplateManagementService 類別
    - 實作 getTemplates 和 getTemplateById 方法
    - 支援多語言（zh_TW, en）
    - _需求: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [x] 6.4 實作內容編排器
    - 建立 tests/unit/services/ContentOrchestrator.test.ts 測試編排邏輯
    - 建立 src/services/ContentOrchestrator.ts 實作 ContentOrchestrator 類別
    - 協調各服務的業務邏輯
    - 實作依賴注入模式
    - _需求: 3.1, 4.1_

- [x] 7. 實作 Express REST API（TDD）

  - [x] 7.1 建立健康檢查端點
    - 建立 tests/unit/api/routes/health.test.ts 測試健康檢查
    - 建立 src/api/routes/health.ts 實作健康檢查端點
    - _需求: 10.3_
  - [x] 7.2 建立新聞搜尋路由
    - 建立 tests/unit/api/routes/news.test.ts 測試新聞搜尋端點
    - 建立 src/api/routes/news.ts 實作新聞搜尋端點
    - _需求: 1.2_
  - [x] 7.3 建立內容生成和精煉路由
    - 建立 tests/unit/api/routes/content.test.ts 測試內容端點
    - 建立 src/api/routes/content.ts 實作內容生成和精煉端點
    - _需求: 1.3, 1.4_
  - [x] 7.4 建立模板列表路由
    - 建立 tests/unit/api/routes/templates.test.ts 測試模板端點
    - 建立 src/api/routes/templates.ts 實作模板列表端點
    - _需求: 1.5_
  - [x] 7.5 實作中介軟體
    - 建立 tests/unit/api/middleware/auth.test.ts 測試認證中介軟體
    - 建立 src/api/middleware/auth.ts 實作 API Key 認證中介軟體
    - 建立 tests/unit/api/middleware/errorHandler.test.ts 測試錯誤處理
    - 建立 src/api/middleware/errorHandler.ts 實作錯誤處理中介軟體
    - 建立 src/api/middleware/monitoring.ts 實作監控中介軟體（日誌記錄、效能追蹤）
    - _需求: 9.1, 9.5_
  - [x] 7.6 實作 Express 應用程式
    - 建立 tests/unit/api/app.test.ts 測試應用程式配置
    - 建立 src/api/app.ts 實作 Express 應用程式配置
    - 整合所有路由和中介軟體
    - 實作 OpenAPI 文件配置（swagger-jsdoc）
    - _需求: 1.1, 10.3_

- [x] 8. 實作 MCP Server（TDD）

  - [x] 8.1 撰寫 MCP Server 測試
    - 建立 tests/unit/mcp/server.test.ts 測試 MCP 工具
    - _需求: 6.1, 6.2, 6.3, 6.4, 6.5_
  - [x] 8.2 實作 MCP Server
    - 建立 src/mcp/server.ts 實作 MCP 伺服器
    - 使用 @modelcontextprotocol/sdk 定義 MCP 工具（search_news, generate_content, refine_content）
    - 實作 MCP 工具與 Express 業務邏輯的整合（共享 ContentOrchestrator）
    - 建立 src/mcp/index.ts MCP 入口
    - _需求: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9. 實作統一服務啟動

  - [x] 9.1 撰寫啟動邏輯測試
    - 建立 tests/unit/index.test.ts 測試服務啟動邏輯
    - _需求: 10.1, 10.4, 10.5_
  - [x] 9.2 實作主入口
    - 建立 src/index.ts 應用程式入口
    - 實作服務模式選擇（unified, api-only, mcp-only）
    - 實作優雅關閉處理（SIGTERM, SIGINT）
    - 實作啟動日誌記錄
    - _需求: 10.1, 10.4, 10.5_

- [x] 10. 實作日誌與監控

  - 建立 src/core/logger.ts 整合 winston 結構化日誌
  - 建立 src/core/metrics.ts 實作效能監控指標（prom-client）
  - 實作請求追蹤（request_id）
  - 實作日誌脫敏
  - _需求: 9.5, 10.4_

- [x] 11. 建立 Docker 部署配置

  - 建立 Dockerfile（多階段建構）
  - 建立 docker-compose.yml（本地開發）
  - 建立 .dockerignore
  - 設定環境變數和掛載點
  - _需求: 10.1, 10.2_

- [x] 12. 建立 AWS ECS 部署配置

  - 建立 task-definition.json（ECS Fargate Task Definition）
  - 建立 .github/workflows/deploy.yml（CI/CD Pipeline）
  - 設定 IAM 角色和權限
  - 配置 EFS 檔案系統掛載
  - _需求: 10.1, 10.2_

- [x] 13. 撰寫專案文件

  - 建立 README.md 包含安裝、配置和使用說明
  - 建立 API 使用範例
  - 建立 MCP 整合範例
  - 建立 AWS 部署指南
  - _需求: 1.1, 6.4_

- [ ]\* 14. 撰寫整合測試

  - [ ]\* 14.1 Docker 環境整合測試
    - 建立 tests/integration/api.integration.test.ts 測試完整 API 流程
    - 建立 tests/integration/mcp.integration.test.ts 測試 MCP 工具功能
    - 測試外部服務整合（使用真實 API）
  - [ ]\* 14.2 效能測試
    - 建立 tests/performance/baseline.test.ts 測試回應時間基準
    - 測試並發處理能力
