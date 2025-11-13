# AgentCore 部署執行順序說明

## 📊 任務依賴關係圖

```
Task 1-12 (已完成) ✅
    ↓
Task 13.1-13.11 (已完成) ✅
    ↓
┌─────────────────────────────────────┐
│ Task 13.12 執行實際部署 🚀          │
│ ⚠️ 關鍵里程碑                       │
│ ⚠️ Task 14-17 的前置需求            │
└─────────────────────────────────────┘
    ↓
Task 14 (建立遠端測試腳本) ← 需要 AGENT_ARN
    ↓
Task 15 (執行遠端測試) ← 需要實際 Runtime
    ↓
Task 16 (效能測試) ← 需要實際 Runtime
    ↓
Task 17 (成本分析) ← 需要 CloudWatch 數據
    ↓
Task 18-20 (文件與知識轉移)
```

## 🎯 當前狀態

### ✅ 已完成（準備階段）
- Task 1-12: 環境準備、MCP Server 開發、本地測試
- Task 13.1-13.11: CloudFormation 方案準備

### 🚀 下一步（部署階段）
- **Task 13.12**: 執行實際部署 ← **您現在在這裡**

### ⏭️ 待執行（測試與分析階段）
- Task 14-17: 需要 Task 13.12 完成後才能執行

---

## 🚀 Task 13.12 執行指南

### 為什麼 Task 13.12 很重要？

**Task 13.12 是關鍵里程碑**，因為：

1. **產生 Runtime ARN**: Task 14-15 需要這個 ARN 來連接遠端 MCP Server
2. **啟動實際服務**: Task 16 需要實際運行的服務來測試效能
3. **產生使用數據**: Task 17 需要 CloudWatch 的實際數據來分析成本
4. **驗證整合**: 確認所有準備工作是否正確

### 執行步驟

#### Step 1: 編譯 TypeScript

```bash
npm run build
```

**預期結果**:
```
> advocacy-content-generator@1.0.0 build
> tsc

✓ 編譯成功
```

#### Step 2: 執行部署腳本

```bash
./scripts/deploy-cloudformation.sh
```

**部署流程**（約 5-10 分鐘）:
1. ⏳ 登入 ECR
2. ⏳ 推送 Docker 映像
3. ⏳ 建立 CloudFormation Stack
4. ⏳ 等待 Stack 建立完成
5. ✅ 擷取 Runtime ARN 和 Endpoint
6. ✅ 儲存到 `agentcore-runtime.env`

#### Step 3: 驗證部署

```bash
# 載入環境變數
source agentcore-runtime.env

# 檢查 Runtime ARN
echo "Runtime ARN: $AGENT_ARN"

# 檢查 Stack 狀態
aws cloudformation describe-stacks \
    --stack-name advocacy-content-generator-agentcore \
    --region us-east-1 \
    --query 'Stacks[0].StackStatus'
```

**預期輸出**: `"CREATE_COMPLETE"`

#### Step 4: 檢查 Runtime 狀態

```bash
# 等待 2-3 分鐘讓 Runtime 完全啟動
sleep 180

# 檢查 Runtime 狀態（需要等 boto3 支援或使用 Console）
# 目前可以透過 CloudWatch Logs 確認
aws logs tail /aws/bedrock-agentcore/advocacy-content-generator-mcp --since 5m
```

### 成功標準

完成 Task 13.12 後，應該達成：

- ✅ CloudFormation Stack 建立成功
- ✅ `agentcore-runtime.env` 檔案存在
- ✅ `AGENT_ARN` 變數已設定
- ✅ CloudWatch Log Group 已建立
- ✅ 無錯誤訊息

### 如果部署失敗

參考故障排除指南：
```bash
# 查看詳細錯誤
aws cloudformation describe-stack-events \
    --stack-name advocacy-content-generator-agentcore \
    --region us-east-1 \
    --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`]'

# 回滾
./scripts/rollback-cloudformation.sh
```

---

## 📋 Task 14-17 的依賴說明

### Task 14: 建立遠端測試腳本

**依賴**: Task 13.12 的 `AGENT_ARN`

```typescript
// tests/remote-mcp-client.ts 需要使用
const agentArn = process.env.AGENT_ARN;
const encodedArn = agentArn.replace(/:/g, '%3A').replace(/\//g, '%2F');
const mcpUrl = `https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/${encodedArn}/invocations`;
```

### Task 15: 執行遠端端對端測試

**依賴**: 
- Task 13.12 的實際 Runtime
- Task 14 的測試腳本

```bash
# 需要實際的 Runtime 才能測試
source agentcore-runtime.env
export BEARER_TOKEN=$(./scripts/get-cognito-token.sh)
npm run test:remote-mcp
```

### Task 16: 執行效能測試

**依賴**: Task 13.12 的實際 Runtime

```bash
# 需要實際的 Runtime 來測試效能
# 執行 100 次請求並記錄回應時間
```

### Task 17: 執行成本分析

**依賴**: Task 13.12 部署後的 CloudWatch 數據

```bash
# 需要實際的使用數據
aws cloudwatch get-metric-statistics \
    --namespace AWS/BedrockAgentCore \
    --metric-name Invocations \
    ...
```

---

## 🎯 執行順序總結

### Phase 1: 準備（已完成）✅
- Task 1-12: 環境與開發
- Task 13.1-13.11: CloudFormation 準備

### Phase 2: 部署（當前階段）🚀
- **Task 13.12**: 執行實際部署 ← **您現在在這裡**

### Phase 3: 測試與分析（待執行）⏭️
- Task 14: 建立遠端測試腳本
- Task 15: 執行遠端測試
- Task 16: 效能測試
- Task 17: 成本分析

### Phase 4: 文件與轉移（待執行）⏭️
- Task 18: 整合文件
- Task 19: 回滾計畫
- Task 20: 知識轉移

---

## ⚠️ 重要提醒

**Task 13.12 是關鍵里程碑**：

1. 這是從「準備」到「測試」的轉折點
2. 後續 4 個任務（14-17）都依賴這個部署
3. 部署失敗會阻塞後續任務
4. 建議在執行前再次確認所有前置條件

**執行前檢查清單**：
- [ ] Task 1-13.11 都已完成
- [ ] TypeScript 可以成功編譯
- [ ] Docker 映像已建立
- [ ] AWS 憑證已配置
- [ ] Cognito 已設定
- [ ] 有足夠時間等待 5-10 分鐘

---

**建議**: 現在執行 Task 13.12 來部署到 AgentCore Runtime！
