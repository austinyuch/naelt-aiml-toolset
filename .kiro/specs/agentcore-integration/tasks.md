# Implementation Plan - AgentCore Integration POC

本實作計畫將在一週內完成 AWS Bedrock AgentCore 整合的 POC，驗證可行性、效能和成本效益。

## 開發方法論

本專案採用 **Test-Driven Development (TDD)** 方法：

### TDD 循環 (Red-Green-Refactor)

1. **Red Phase - 撰寫失敗的測試**
   - 在實作功能前先撰寫測試
   - 測試應該失敗（因為功能尚未實作）
   - 定義預期行為和驗收標準

2. **Green Phase - 實作最小可行程式碼**
   - 撰寫剛好足夠讓測試通過的程式碼
   - 專注於功能性，而非優化
   - 確保所有測試通過

3. **Refactor Phase - 改善程式碼品質**
   - 在保持測試通過的前提下重構程式碼
   - 改善可讀性、可維護性和效能
   - 移除重複程式碼，套用設計模式

### TDD 實作規則

- **測試優先**: 沒有失敗的測試就不寫產品程式碼
- **一次一個測試**: 專注於一個測試案例，讓它通過後再進行下一個
- **最小實作**: 撰寫最簡單的程式碼讓測試通過
- **持續測試**: 開發過程中頻繁執行測試
- **測試覆蓋率**: 關鍵業務邏輯目標 95%+ 覆蓋率
- **測試獨立性**: 每個測試應該獨立且可重複執行

### 品質門檻

在標記任何任務為完成前：

- ✅ 所有測試通過（pytest/jest exit code 0）
- ✅ 測試覆蓋率達到門檻（關鍵程式碼 95%+）
- ✅ 無測試警告或錯誤
- ✅ 測試包含需求參考文件
- ✅ 程式碼遵循專案編碼標準
- ✅ 文件已更新以反映變更

## 任務概覽

- **總任務數**: 10 個主要任務（Task 13 包含 12 個子任務）
- **預估時間**: 5-7 個工作天
- **優先級**: 按順序執行，每個任務完成後再進行下一個
- **開發方法**: 遵循 TDD (Test-Driven Development) 原則
- **關鍵里程碑**: Task 13.12 執行實際部署（Task 14-17 的前置需求）

---

## Day 1: 環境準備與 MCP Server 安裝

- [x] 1. 安裝 AgentCore MCP Server 到 Kiro
  - 建立或更新 `.kiro/settings/mcp.json` 配置檔
  - 加入 AgentCore MCP Server 配置
  - 重啟 Kiro 或重新載入 MCP 配置
  - 驗證 MCP Server 連線成功
  - 測試 `search_agentcore_docs` 和 `fetch_agentcore_doc` 工具
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. 安裝必要的開發工具
  - 安裝 Python 3.10+ (如果尚未安裝)
  - 安裝 `uv` 和 `uvx` (Python 套件管理器)
  - 安裝 `bedrock-agentcore-starter-toolkit`
  - 驗證 AWS CLI 版本 >= 2.0
  - 配置 AWS 憑證和區域
  - _Requirements: 4.1, 4.2_

- [x] 3. 驗證 AWS 權限和資源
  - 檢查 IAM 使用者/角色權限
  - 確認有 Bedrock AgentCore 相關權限
  - 確認有 ECR、IAM、Cognito 權限
  - 建立或驗證 ECR repository
  - 建立或驗證 IAM execution role
  - _Requirements: 4.3, 4.4, 4.5_

---

## Day 2: MCP Server 協議轉換

- [x] 4. 安裝 MCP TypeScript SDK 依賴
  - 安裝 `@modelcontextprotocol/sdk`
  - 安裝 `express` (如果尚未安裝)
  - 安裝 `zod@3` (MCP SDK 需要)
  - 更新 `package.json` 依賴
  - 執行 `npm install`
  - _Requirements: 2.1_

- [x] 5. 重構 MCP Server 支援 streamable-http
  - 修改 `src/mcp/server.ts` 使用 `McpServer` 類別
  - 實作 `StreamableHTTPServerTransport` 傳輸層
  - 整合 Express.js 處理 `/mcp` 端點
  - 保留 stdio transport 用於本地開發
  - 加入環境變數控制傳輸模式
  - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [x] 6. 註冊 MCP 工具
  - 使用 `server.registerTool()` 註冊 `search_news`
  - 使用 `server.registerTool()` 註冊 `generate_content`
  - 使用 `server.registerTool()` 註冊 `refine_content`
  - 定義 Zod schema 用於輸入/輸出驗證
  - 實作工具處理函數連接到 ContentOrchestrator
  - _Requirements: 2.1_

- [x] 7. 更新主程式入口點
  - 修改 `src/index.ts` 支援 MCP HTTP 模式
  - 加入 `MCP_TRANSPORT` 環境變數
  - 實作 `startHttp()` 和 `startStdio()` 分支邏輯
  - 確保 graceful shutdown 支援 HTTP server
  - 更新配置檔 `src/config.ts`
  - _Requirements: 2.2, 2.3_

---

## Day 3: 本地測試與 Docker 容器化

- [x] 8. 建立本地測試環境
  - 建立 `test/local-mcp-client.ts` 測試腳本
  - 使用 `StreamableHTTPClientTransport` 連接本地 server
  - 測試 `listTools()` 列出可用工具
  - 測試 `callTool('search_news')` 功能
  - 測試 `callTool('generate_content')` 功能
  - 測試 `callTool('refine_content')` 功能
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 9. 更新 Docker 配置
  - 更新 `Dockerfile` 暴露 8000 端口
  - 確保 `/mcp` 路徑可訪問
  - 加入健康檢查端點 `/health`
  - 複製 `prompts/` 目錄到容器
  - 設定正確的環境變數
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 10. 本地 Docker 測試
  - 建構 Docker 映像
  - 執行容器並測試 `/health` 端點
  - 執行容器並測試 `/mcp` 端點
  - 使用測試腳本驗證所有工具
  - 檢查日誌輸出是否正常
  - _Requirements: 7.1, 7.2, 7.3_

---

## Day 4: AWS 認證設定與部署配置

- [x] 11. 設定 Cognito 認證
  - 建立 `scripts/setup_cognito.sh` 腳本
  - 執行腳本建立 Cognito User Pool
  - 建立 App Client
  - 建立測試使用者
  - 取得 Bearer Token
  - 記錄 Discovery URL 和 Client ID
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 12. 配置 AgentCore 部署
  - 執行 `agentcore configure -e dist/index.js --protocol MCP`
  - 選擇或建立 IAM execution role
  - 配置 ECR repository
  - 指定 `requirements.txt` (Node.js 專案可能不需要)
  - 配置 OAuth discovery URL 和 client ID
  - 驗證 `.bedrock_agentcore.yaml` 配置檔
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

---

## Day 5: AgentCore Runtime 部署與測試 (CloudFormation)

- [x] 13. 使用 CloudFormation 部署到 AgentCore Runtime
  - **發現**: `agentcore` CLI 工具主要針對 Python agents 設計，TypeScript/Node.js MCP Server 應使用 CloudFormation 部署
  - **參考**: [CloudFormation MCP Server 範例](https://aws.github.io/bedrock-agentcore-starter-toolkit/examples/infrastructure-as-code/cloudformation/mcp-server-runtime/)
  - **TDD 方法**: 每個子任務遵循 Red-Green-Refactor 循環

- [x] 13.1 研究與驗證部署方法
  - 測試 `agentcore` CLI 工具部署 TypeScript MCP Server
  - 發現 CLI 主要針對 Python agents 設計
  - 探索 boto3 Python SDK 方法（發現 API 尚未支援）
  - 探索 AWS CLI 直接調用（發現服務尚未支援）
  - 查閱 AgentCore 官方文件和範例
  - 確認 CloudFormation 為 TypeScript/Node.js MCP Server 的推薦部署方式
  - 建立 POC 發現報告（`docs/agentcore-poc-findings.md`）
  - 建立部署指南（`docs/agentcore-deployment-next-steps.md`）
  - **學習**: 非 Python agents 應使用 Infrastructure as Code 方式部署
  - _Requirements: 8.1, 8.2_

- [x] 13.2 建立 CloudFormation 模板驗證測試 (TDD - Red)
  - 建立 `tests/cloudformation/validate-template.test.ts`
  - 測試模板 YAML 語法正確性
  - 測試必要參數存在（ImageUri, ExecutionRoleArn, CognitoUserPoolId, CognitoClientId）
  - 測試 Resources 定義完整（AgentCoreRuntime）
  - 測試 Outputs 定義正確（RuntimeArn, RuntimeEndpoint）
  - 執行測試應該失敗（模板尚未建立）
  - _Requirements: 8.1_

- [x] 13.3 建立 CloudFormation 模板 (TDD - Green)
  - 建立 `cloudformation/agentcore-mcp-server.yaml`
  - 定義 Parameters: ImageUri, ExecutionRoleArn, CognitoUserPoolId, CognitoClientId
  - 定義 Resources: AWS::BedrockAgentCore::Runtime
  - 配置 ContainerConfig（ImageUri, Port, Environment）
  - 配置 AuthenticationConfig（OAuth, DiscoveryUrl, ClientId）
  - 配置 Runtime 設定（Memory: 1024MB, Timeout: 3600s）
  - 定義 Outputs: RuntimeArn, RuntimeEndpoint
  - 執行測試應該通過
  - _Requirements: 8.1, 8.2_

- [x] 13.4 建立部署腳本驗證測試 (TDD - Red)
  - 建立 `tests/cloudformation/deploy-script.test.ts`
  - 測試腳本檔案存在
  - 測試腳本可執行權限
  - 測試腳本包含必要的 AWS CLI 命令
  - 測試腳本包含錯誤處理
  - 執行測試應該失敗（腳本尚未建立）
  - _Requirements: 8.2_

- [x] 13.5 建立 CloudFormation 部署腳本 (TDD - Green)
  - 建立 `scripts/deploy-cloudformation.sh`
  - 推送 Docker 映像到 ECR
  - 執行 `aws cloudformation create-stack` 或 `update-stack`
  - 等待 stack 建立完成（使用 `wait stack-create-complete`）
  - 擷取 Outputs（RuntimeArn, RuntimeEndpoint）
  - 儲存到 `agentcore-runtime.env` 檔案
  - 加入錯誤處理和回滾機制
  - 執行測試應該通過
  - _Requirements: 8.2, 8.3_

- [x] 13.6 執行 CloudFormation 部署 (TDD - Integration)
  - 執行 `npm run build` 編譯 TypeScript
  - 執行 `./scripts/deploy-cloudformation.sh`
  - 等待部署完成（約 5-10 分鐘）
  - 驗證 Stack 狀態為 `CREATE_COMPLETE`
  - 記錄 Runtime ARN 到環境變數
  - 驗證 Runtime 狀態為 `Active`
  - _Requirements: 8.3, 8.4_

- [x] 13.7 建立部署驗證測試 (TDD - Red)
  - 建立 `tests/cloudformation/deployment-validation.test.ts`
  - 測試 Runtime ARN 格式正確
  - 測試 Runtime 狀態為 Active
  - 測試 CloudWatch Log Group 已建立
  - 測試 Runtime Endpoint 可訪問
  - 執行測試應該失敗（部署尚未驗證）
  - _Requirements: 8.4_

- [x] 13.8 驗證部署狀態 (TDD - Green)
  - 使用 AWS CLI 查詢 Runtime 狀態
  - 驗證 CloudWatch Logs 存在
  - 檢查 Runtime 健康狀態
  - 確認所有配置正確套用
  - 執行測試應該通過
  - _Requirements: 8.4, 8.5_

- [x] 13.9 建立回滾腳本測試 (TDD - Red)
  - 建立 `tests/cloudformation/rollback-script.test.ts`
  - 測試回滾腳本存在
  - 測試腳本包含 `delete-stack` 命令
  - 測試腳本包含確認提示
  - 執行測試應該失敗（腳本尚未建立）
  - _Requirements: 12.1_

- [x] 13.10 建立 CloudFormation 回滾腳本 (TDD - Green)
  - 建立 `scripts/rollback-cloudformation.sh`
  - 實作 `aws cloudformation delete-stack` 命令
  - 加入確認提示（避免誤刪）
  - 等待 stack 刪除完成
  - 清理相關資源（保留 ECR 映像）
  - 執行測試應該通過
  - _Requirements: 12.1, 12.2_

- [x] 13.11 撰寫 CloudFormation 部署文件
  - 更新 `docs/agentcore-deployment-guide.md`
  - 記錄 CloudFormation 模板結構
  - 記錄部署步驟和參數說明
  - 記錄常見問題和解決方案
  - 記錄回滾流程
  - _Requirements: 11.1, 11.2_

- [x] 13.12 執行 CloudFormation 部署到 AgentCore Runtime
  - 執行 `npm run build` 編譯 TypeScript
  - 執行 `./scripts/deploy-cloudformation.sh` 部署
  - 等待 CloudFormation Stack 建立完成（約 5-10 分鐘）
  - 驗證 Stack 狀態為 `CREATE_COMPLETE`
  - 驗證 `agentcore-runtime.env` 檔案已建立
  - 驗證 `AGENT_ARN` 環境變數已設定
  - 驗證 Runtime 狀態為 `Active`
  - 檢查 CloudWatch Logs 是否正常
  - **此任務為 Task 14-17 的前置需求**
  - _Requirements: 8.3, 8.4, 8.5_

---

## Day 5: 遠端測試（需要先完成 Task 13.12 部署）

- [ ] 14. 建立遠端測試腳本
  - 建立 `test/remote-mcp-client.ts`
  - 實作 Bearer Token 認證
  - 實作 Runtime ARN URL 編碼
  - 使用 `StreamableHTTPClientTransport` 連接遠端
  - 加入錯誤處理和重試邏輯
  - _Requirements: 9.1_

- [ ] 15. 執行遠端端對端測試
  - 設定環境變數 `AGENT_ARN` 和 `BEARER_TOKEN`
  - 測試 `search_news` 工具（記錄執行時間）
  - 測試 `generate_content` 工具（記錄執行時間）
  - 測試 `refine_content` 工具（記錄執行時間）
  - 驗證所有回應格式正確
  - _Requirements: 9.2, 9.3, 9.4, 9.5_

---

## Day 6-7: 效能測試、成本分析與文件

- [ ] 16. 執行效能測試
  - 建立 `test/performance-test.ts` 腳本
  - 執行 100 次請求測試
  - 記錄每次請求的回應時間
  - 計算 P50、P95、P99 延遲
  - 記錄錯誤率
  - 產生效能報告
  - _Requirements: 10.1, 10.2_

- [ ] 17. 執行成本分析
  - 從 CloudWatch 取得執行時間和記憶體使用
  - 計算每次請求的平均成本
  - 預估每月 10,000 次請求的總成本
  - 與現有 ECS Fargate 成本比較
  - 產生成本分析報告
  - _Requirements: 10.3, 10.4, 10.5_

- [ ] 18. 撰寫整合文件
  - 建立 `docs/agentcore-poc-report.md`
  - 記錄完整的安裝步驟
  - 記錄所有配置檔案說明
  - 記錄常見問題和解決方案
  - 包含效能測試結果
  - 包含成本分析結果
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 19. 建立回滾計畫文件
  - 記錄回滾步驟
  - 建立 `scripts/rollback.sh` 腳本
  - 測試回滾流程
  - 驗證現有 ECS 服務仍正常運行
  - 記錄學習經驗和改進建議
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 20. 團隊知識轉移
  - 準備 POC 展示簡報
  - 進行團隊分享會議
  - 回答團隊問題
  - 收集反饋和建議
  - 決定是否繼續深入整合
  - _Requirements: 11.1_

---

## 成功標準

### 功能性
- ✅ 所有 3 個 MCP 工具正常運作
- ✅ 本地和遠端測試都通過
- ✅ 認證機制正常運作
- ✅ 端對端流程完整

### 效能
- ✅ P95 延遲 < 60 秒
- ✅ 錯誤率 < 1%
- ✅ 可處理 100 次並發請求

### 成本
- ✅ 每次請求成本 < $0.001
- ✅ 每月成本 < $30 (10K 請求)
- ✅ 比現有方案更便宜

### 知識
- ✅ 團隊理解 AgentCore
- ✅ 文件完整且清晰
- ✅ 學習經驗已記錄

---

## 風險與緩解措施

| 風險 | 緩解措施 |
|------|----------|
| AWS 權限不足 | 提前驗證 IAM 權限，準備權限申請文件 |
| Cognito 設定複雜 | 使用提供的腳本自動化設定 |
| 部署失敗 | 保留現有 ECS 部署，隨時可回滾 |
| 效能不符預期 | 調整記憶體配置，優化程式碼 |
| 成本超支 | 設定 CloudWatch 告警，限制測試次數 |
| 時間不足 | 優先完成核心功能，文件可後補 |

---

## 下一步（POC 成功後）

如果 POC 驗證成功，建議進行：

1. **Phase 2: 生產環境部署**
   - 設定生產 Cognito
   - 建立 CI/CD pipeline
   - 實作完整監控
   - 負載測試

2. **Phase 3: Gateway 整合**
   - 註冊工具到 Gateway
   - 集中化認證管理
   - 工具版本控制

3. **Phase 4: 進階功能**
   - AgentCore Memory
   - AgentCore Observability
   - A2A 協議支援
   - 多 Agent 協作

---

## 參考資源

- [AgentCore 官方文件](https://docs.aws.amazon.com/bedrock-agentcore/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [AgentCore Starter Toolkit](https://pypi.org/project/bedrock-agentcore-starter-toolkit/)
- [AgentCore 範例](https://github.com/awslabs/amazon-bedrock-agentcore-samples)
