# Task 13 TDD 快速參考指南

## TDD 循環速查

```
┌─────────────────────────────────────────┐
│  1. RED - 撰寫失敗的測試                 │
│     ↓                                   │
│  2. GREEN - 實作最小可行程式碼            │
│     ↓                                   │
│  3. REFACTOR - 改善程式碼品質            │
│     ↓                                   │
│  4. 重複循環                             │
└─────────────────────────────────────────┘
```

## 子任務執行順序

### Phase 1: CloudFormation 模板 (1 小時)

**13.1 (RED)** - 建立模板驗證測試
```bash
# 建立測試檔案
touch tests/cloudformation/validate-template.test.ts

# 撰寫測試
# - 測試 YAML 語法
# - 測試參數存在
# - 測試資源定義
# - 測試輸出定義

# 執行測試（應該失敗）
npm test tests/cloudformation/validate-template.test.ts
# ❌ FAIL - 模板不存在
```

**13.2 (GREEN)** - 建立 CloudFormation 模板
```bash
# 建立模板檔案
mkdir -p cloudformation
touch cloudformation/agentcore-mcp-server.yaml

# 撰寫模板內容
# - Parameters
# - Resources
# - Outputs

# 執行測試（應該通過）
npm test tests/cloudformation/validate-template.test.ts
# ✅ PASS - 模板符合規格
```

### Phase 2: 部署腳本 (1 小時)

**13.3 (RED)** - 建立部署腳本測試
```bash
# 建立測試檔案
touch tests/cloudformation/deploy-script.test.ts

# 撰寫測試
# - 測試腳本存在
# - 測試可執行權限
# - 測試包含必要命令
# - 測試錯誤處理

# 執行測試（應該失敗）
npm test tests/cloudformation/deploy-script.test.ts
# ❌ FAIL - 腳本不存在
```

**13.4 (GREEN)** - 建立部署腳本
```bash
# 建立腳本檔案
touch scripts/deploy-cloudformation.sh
chmod +x scripts/deploy-cloudformation.sh

# 撰寫腳本內容
# - ECR 推送
# - CloudFormation 部署
# - 等待完成
# - 擷取輸出
# - 錯誤處理

# 執行測試（應該通過）
npm test tests/cloudformation/deploy-script.test.ts
# ✅ PASS - 腳本符合規格
```

### Phase 3: 執行部署 (15-30 分鐘)

**13.5 (INTEGRATION)** - 執行 CloudFormation 部署
```bash
# 編譯 TypeScript
npm run build

# 執行部署腳本
./scripts/deploy-cloudformation.sh

# 等待部署完成
# ⏳ 約 5-10 分鐘

# 檢查結果
cat agentcore-runtime.env
# AGENT_ARN=arn:aws:bedrock-agentcore:...
# AWS_REGION=us-east-1
```

### Phase 4: 部署驗證 (30 分鐘)

**13.6 (RED)** - 建立部署驗證測試
```bash
# 建立測試檔案
touch tests/cloudformation/deployment-validation.test.ts

# 撰寫測試
# - 測試 Runtime ARN 格式
# - 測試 Runtime 狀態
# - 測試 CloudWatch Logs
# - 測試 Endpoint 可訪問

# 執行測試（應該失敗）
npm test tests/cloudformation/deployment-validation.test.ts
# ❌ FAIL - 部署尚未驗證
```

**13.7 (GREEN)** - 驗證部署狀態
```bash
# 實作驗證邏輯
# - AWS CLI 查詢
# - 狀態檢查
# - 日誌驗證
# - 健康檢查

# 執行測試（應該通過）
npm test tests/cloudformation/deployment-validation.test.ts
# ✅ PASS - 部署驗證成功
```

### Phase 5: 回滾機制 (30 分鐘)

**13.8 (RED)** - 建立回滾腳本測試
```bash
# 建立測試檔案
touch tests/cloudformation/rollback-script.test.ts

# 撰寫測試
# - 測試腳本存在
# - 測試 delete-stack 命令
# - 測試確認提示

# 執行測試（應該失敗）
npm test tests/cloudformation/rollback-script.test.ts
# ❌ FAIL - 腳本不存在
```

**13.9 (GREEN)** - 建立回滾腳本
```bash
# 建立腳本檔案
touch scripts/rollback-cloudformation.sh
chmod +x scripts/rollback-cloudformation.sh

# 撰寫腳本內容
# - 確認提示
# - delete-stack 命令
# - 等待刪除完成
# - 清理資源

# 執行測試（應該通過）
npm test tests/cloudformation/rollback-script.test.ts
# ✅ PASS - 回滾腳本符合規格
```

### Phase 6: 文件撰寫 (30 分鐘，選用)

**13.10 (DOCUMENTATION)** - 撰寫部署文件
```bash
# 更新文件
vim docs/agentcore-deployment-guide.md

# 內容包含
# - CloudFormation 模板說明
# - 部署步驟
# - 參數說明
# - 常見問題
# - 回滾流程
```

## 測試命令速查

### 執行所有測試
```bash
npm test
```

### 執行特定測試檔案
```bash
npm test tests/cloudformation/validate-template.test.ts
```

### 執行測試並顯示覆蓋率
```bash
npm test -- --coverage
```

### 監看模式（開發時使用）
```bash
npm test -- --watch
```

### 執行整合測試
```bash
npm run test:integration
```

## 常用 AWS CLI 命令

### 驗證 CloudFormation 模板
```bash
aws cloudformation validate-template \
  --template-body file://cloudformation/agentcore-mcp-server.yaml
```

### 建立 Stack
```bash
aws cloudformation create-stack \
  --stack-name advocacy-content-generator-agentcore \
  --template-body file://cloudformation/agentcore-mcp-server.yaml \
  --region us-east-1
```

### 檢查 Stack 狀態
```bash
aws cloudformation describe-stacks \
  --stack-name advocacy-content-generator-agentcore \
  --region us-east-1
```

### 等待 Stack 建立完成
```bash
aws cloudformation wait stack-create-complete \
  --stack-name advocacy-content-generator-agentcore \
  --region us-east-1
```

### 取得 Stack 輸出
```bash
aws cloudformation describe-stacks \
  --stack-name advocacy-content-generator-agentcore \
  --region us-east-1 \
  --query 'Stacks[0].Outputs'
```

### 刪除 Stack
```bash
aws cloudformation delete-stack \
  --stack-name advocacy-content-generator-agentcore \
  --region us-east-1
```

## 檢查清單

### 開始前
- [ ] 已完成 Task 1-12
- [ ] TypeScript 已編譯（`npm run build`）
- [ ] Docker 映像已建立
- [ ] AWS 憑證已配置
- [ ] Cognito 已設定

### 每個子任務完成後
- [ ] 所有測試通過
- [ ] 測試覆蓋率達標
- [ ] 無測試警告
- [ ] 程式碼已提交
- [ ] 文件已更新

### Task 13 完成後
- [ ] CloudFormation Stack 建立成功
- [ ] Runtime 狀態為 Active
- [ ] 所有驗證測試通過
- [ ] 回滾腳本已測試
- [ ] 文件已完成

## 故障排除

### 測試失敗
```bash
# 查看詳細錯誤訊息
npm test -- --verbose

# 只執行失敗的測試
npm test -- --onlyFailures
```

### CloudFormation 部署失敗
```bash
# 查看 Stack 事件
aws cloudformation describe-stack-events \
  --stack-name advocacy-content-generator-agentcore \
  --region us-east-1

# 查看失敗原因
aws cloudformation describe-stack-events \
  --stack-name advocacy-content-generator-agentcore \
  --region us-east-1 \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`]'
```

### Runtime 狀態異常
```bash
# 查看 CloudWatch Logs
aws logs tail /aws/bedrock-agentcore/advocacy-content-generator-mcp --follow

# 查看錯誤日誌
aws logs filter-log-events \
  --log-group-name /aws/bedrock-agentcore/advocacy-content-generator-mcp \
  --filter-pattern "ERROR"
```

## 時間管理

| 子任務 | 預估時間 | 累計時間 |
|--------|----------|----------|
| 13.1 | 30 分鐘 | 0.5 小時 |
| 13.2 | 30 分鐘 | 1.0 小時 |
| 13.3 | 30 分鐘 | 1.5 小時 |
| 13.4 | 30 分鐘 | 2.0 小時 |
| 13.5 | 15-30 分鐘 | 2.5 小時 |
| 13.6 | 15 分鐘 | 2.75 小時 |
| 13.7 | 15 分鐘 | 3.0 小時 |
| 13.8 | 15 分鐘 | 3.25 小時 |
| 13.9 | 15 分鐘 | 3.5 小時 |
| 13.10* | 30 分鐘 | 4.0 小時 |

**總計**: 3.5-4 小時

## 成功標準

### 技術標準
- ✅ 所有測試通過（exit code 0）
- ✅ 測試覆蓋率 > 95%
- ✅ CloudFormation Stack 狀態: CREATE_COMPLETE
- ✅ Runtime 狀態: Active
- ✅ 無 ESLint 錯誤
- ✅ 無 TypeScript 錯誤

### 功能標準
- ✅ 可以重複執行部署
- ✅ 可以成功回滾
- ✅ 環境變數正確儲存
- ✅ CloudWatch Logs 可訪問
- ✅ Runtime Endpoint 可訪問

### 文件標準
- ✅ 測試包含需求參考
- ✅ 程式碼包含註解
- ✅ README 已更新
- ✅ 部署指南已完成
- ✅ 故障排除指南已完成

---

**快速開始**: 從 Task 13.1 開始，遵循 TDD 循環！
