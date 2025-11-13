# Requirements Document - AgentCore Integration POC

## Introduction

本專案旨在將現有的「司法正義論述生成器」整合到 AWS Bedrock AgentCore 平台，透過建立 POC (Proof of Concept) 驗證整合可行性、效能和成本效益。

## Glossary

- **AgentCore**: AWS Bedrock AgentCore，AWS 的企業級 AI Agent 平台
- **Runtime**: AgentCore Runtime，無伺服器 Agent 運行環境
- **Gateway**: AgentCore Gateway，工具發現和調用的統一閘道
- **MCP**: Model Context Protocol，AI Agent 工具協議標準
- **MCP Server**: 實作 MCP 協議的伺服器，提供工具給 AI Agent 使用
- **Streamable HTTP**: MCP 支援的 HTTP 傳輸協議，AgentCore Runtime 要求使用
- **McpServer**: TypeScript MCP SDK 的伺服器類別
- **StreamableHTTPServerTransport**: TypeScript MCP SDK 的 HTTP 傳輸層實作
- **Kiro**: AI 驅動的開發環境
- **POC**: Proof of Concept，概念驗證

## Requirements

### Requirement 1: AgentCore MCP Server 安裝與配置

**User Story:** 作為開發者，我希望在 Kiro IDE 中安裝 AgentCore MCP Server，以便透過 AI 協助快速學習和整合 AgentCore 服務

#### Acceptance Criteria

1. WHEN 開發者配置 `.kiro/settings/mcp.json` 檔案，THE System SHALL 成功載入 AgentCore MCP Server
2. WHEN AgentCore MCP Server 啟動，THE System SHALL 提供 `search_agentcore_docs` 和 `fetch_agentcore_doc` 兩個工具
3. WHEN 開發者在 Kiro 中詢問 AgentCore 相關問題，THE System SHALL 能夠搜尋並回傳相關文件
4. WHEN MCP Server 連線失敗，THE System SHALL 提供清楚的錯誤訊息和除錯建議
5. THE System SHALL 自動批准 `search_agentcore_docs` 和 `fetch_agentcore_doc` 工具的使用

### Requirement 2: MCP Server 協議轉換

**User Story:** 作為開發者，我希望將現有的 stdio MCP Server 轉換為 streamable-http 協議，以便部署到 AgentCore Runtime

#### Acceptance Criteria

1. WHEN 開發者修改 MCP Server 程式碼，THE System SHALL 支援 streamable-http transport
2. WHEN MCP Server 在開發環境啟動，THE System SHALL 使用 stdio transport
3. WHEN MCP Server 在生產環境啟動，THE System SHALL 使用 streamable-http transport
4. THE System SHALL 在 `0.0.0.0:8000/mcp` 路徑提供 MCP 服務
5. THE System SHALL 支援無狀態 HTTP 請求處理

### Requirement 3: 本地測試環境建立

**User Story:** 作為開發者，我希望在本地測試 streamable-http MCP Server，以便在部署前驗證功能正確性

#### Acceptance Criteria

1. WHEN 開發者啟動本地 MCP Server，THE System SHALL 在 8000 端口監聽
2. WHEN 開發者執行測試腳本，THE System SHALL 成功呼叫 `search_news` 工具
3. WHEN 開發者執行測試腳本，THE System SHALL 成功呼叫 `generate_content` 工具
4. WHEN 開發者執行測試腳本，THE System SHALL 成功呼叫 `refine_content` 工具
5. THE System SHALL 回傳符合 MCP 協議規範的回應格式

### Requirement 4: AWS 環境準備

**User Story:** 作為開發者，我希望準備 AWS 測試環境，以便部署 AgentCore POC

#### Acceptance Criteria

1. WHEN 開發者執行環境檢查腳本，THE System SHALL 驗證 AWS CLI 已安裝且版本 >= 2.0
2. WHEN 開發者執行環境檢查腳本，THE System SHALL 驗證 AWS 憑證已正確配置
3. WHEN 開發者執行環境檢查腳本，THE System SHALL 驗證 IAM 權限包含 Bedrock AgentCore 所需權限
4. THE System SHALL 建立或驗證 ECR repository 存在
5. THE System SHALL 建立或驗證 IAM execution role 存在且具備必要權限

### Requirement 5: Cognito 認證設定

**User Story:** 作為開發者，我希望設定 Cognito 使用者池，以便為 AgentCore Runtime 提供 OAuth 認證

#### Acceptance Criteria

1. WHEN 開發者執行 Cognito 設定腳本，THE System SHALL 建立 Cognito User Pool
2. WHEN 開發者執行 Cognito 設定腳本，THE System SHALL 建立 App Client
3. WHEN 開發者執行 Cognito 設定腳本，THE System SHALL 建立測試使用者
4. WHEN 開發者執行認證測試，THE System SHALL 成功取得 Bearer Token
5. THE System SHALL 輸出 Discovery URL 和 Client ID 供後續使用

### Requirement 6: AgentCore 部署配置

**User Story:** 作為開發者，我希望配置 AgentCore 部署參數，以便使用 CLI 工具一鍵部署

#### Acceptance Criteria

1. WHEN 開發者執行 `agentcore configure` 命令，THE System SHALL 建立 `.bedrock_agentcore.yaml` 配置檔
2. THE Configuration SHALL 包含 execution role ARN
3. THE Configuration SHALL 包含 ECR repository URI
4. THE Configuration SHALL 包含 OAuth discovery URL 和 client ID
5. THE Configuration SHALL 指定 MCP 協議類型

### Requirement 7: Docker 容器建構

**User Story:** 作為開發者，我希望建構符合 AgentCore 要求的 Docker 容器，以便部署到 Runtime

#### Acceptance Criteria

1. WHEN 開發者執行 Docker build，THE System SHALL 成功建構容器映像
2. THE Container SHALL 暴露 8000 端口
3. THE Container SHALL 在 `/mcp` 路徑提供 MCP 服務
4. THE Container SHALL 包含所有必要的 Node.js 依賴
5. THE Container SHALL 包含 prompts 模板檔案

### Requirement 8: AgentCore Runtime 部署

**User Story:** 作為開發者，我希望部署 MCP Server 到 AgentCore Runtime，以便在雲端環境運行

#### Acceptance Criteria

1. WHEN 開發者執行 `agentcore launch` 命令，THE System SHALL 推送 Docker 映像到 ECR
2. WHEN 部署完成，THE System SHALL 建立 AgentCore Runtime 實例
3. WHEN 部署完成，THE System SHALL 回傳 Runtime ARN
4. THE Deployment SHALL 在 5 分鐘內完成
5. THE Runtime SHALL 通過健康檢查

### Requirement 9: 遠端 MCP Server 測試

**User Story:** 作為開發者，我希望測試已部署的 AgentCore Runtime，以便驗證端對端功能

#### Acceptance Criteria

1. WHEN 開發者執行遠端測試腳本，THE System SHALL 使用 Bearer Token 認證
2. WHEN 開發者呼叫 `search_news` 工具，THE System SHALL 在 10 秒內回傳新聞結果
3. WHEN 開發者呼叫 `generate_content` 工具，THE System SHALL 在 60 秒內回傳生成內容
4. WHEN 開發者呼叫 `refine_content` 工具，THE System SHALL 在 30 秒內回傳精煉內容
5. THE System SHALL 記錄所有請求的執行時間和成本

### Requirement 10: 效能與成本評估

**User Story:** 作為專案負責人，我希望評估 AgentCore 的效能和成本，以便決定是否繼續深入整合

#### Acceptance Criteria

1. WHEN 開發者執行效能測試，THE System SHALL 記錄 100 次請求的回應時間
2. WHEN 開發者執行效能測試，THE System SHALL 計算 P50、P95、P99 延遲
3. WHEN 開發者執行成本分析，THE System SHALL 計算每次請求的平均成本
4. WHEN 開發者執行成本分析，THE System SHALL 預估每月 10,000 次請求的總成本
5. THE System SHALL 產生效能和成本報告文件

### Requirement 11: 文件與知識轉移

**User Story:** 作為團隊成員，我希望有完整的文件記錄整合過程，以便未來維護和擴展

#### Acceptance Criteria

1. THE Documentation SHALL 包含完整的安裝步驟
2. THE Documentation SHALL 包含所有配置檔案的說明
3. THE Documentation SHALL 包含常見問題和解決方案
4. THE Documentation SHALL 包含效能測試結果
5. THE Documentation SHALL 包含成本分析結果

### Requirement 12: 回滾計畫

**User Story:** 作為開發者，我希望有明確的回滾計畫，以便在整合失敗時快速恢復

#### Acceptance Criteria

1. THE System SHALL 保留現有的 ECS Fargate 部署不變
2. THE Documentation SHALL 包含回滾步驟
3. WHEN 需要回滾，THE System SHALL 在 10 分鐘內恢復到原始狀態
4. THE System SHALL 保留所有測試資料供分析
5. THE Documentation SHALL 記錄失敗原因和學習經驗
