# AgentCore CloudFormation 部署指南

## 概述

本指南說明如何使用 CloudFormation 將 TypeScript/Node.js MCP Server 部署到 AWS Bedrock AgentCore Runtime。

## 目錄

- [前置需求](#前置需求)
- [CloudFormation 模板結構](#cloudformation-模板結構)
- [部署步驟](#部署步驟)
- [驗證部署](#驗證部署)
- [更新部署](#更新部署)
- [回滾部署](#回滾部署)
- [故障排除](#故障排除)
- [常見問題](#常見問題)

---

## 前置需求

### 必要工具
- ✅ AWS CLI 2.0+ 已安裝並配置
- ✅ Docker 已安裝
- ✅ Node.js 20+ 已安裝
- ✅ npm 已安裝

### AWS 資源
- ✅ ECR Repository: `advocacy-content-generator`
- ✅ IAM Execution Role: `AgentCoreExecutionRole-advocacy-content-generator`
- ✅ Cognito User Pool 已設定
- ✅ Cognito Client ID 已取得

### 驗證前置需求

```bash
# 檢查 AWS CLI
aws --version
# 應顯示: aws-cli/2.x.x

# 檢查 Docker
docker --version
# 應顯示: Docker version 20.x.x

# 檢查 Node.js
node --version
# 應顯示: v20.x.x

# 檢查 AWS 憑證
aws sts get-caller-identity
# 應顯示您的 AWS 帳號資訊

# 檢查 ECR Repository
aws ecr describe-repositories --repository-names advocacy-content-generator
# 應顯示 repository 資訊
```

---

## CloudFormation 模板結構

### 檔案位置
```
cloudformation/agentcore-mcp-server.yaml
```

### 模板組成

#### 1. Parameters（參數）

| 參數名稱 | 類型 | 說明 | 預設值 |
|---------|------|------|--------|
| `ImageUri` | String | ECR 映像 URI | `533267166136.dkr.ecr.us-east-1.amazonaws.com/advocacy-content-generator:latest` |
| `ExecutionRoleArn` | String | IAM 執行角色 ARN | `arn:aws:iam::533267166136:role/AgentCoreExecutionRole-advocacy-content-generator` |
| `CognitoUserPoolId` | String | Cognito User Pool ID | `us-east-1_YYMy6hC3F` |
| `CognitoClientId` | String | Cognito Client ID | `1eulh5t29s9rsk6a8r1ahv739g` |

#### 2. Resources（資源）

**AgentCoreRuntime**
- **Type**: `AWS::BedrockAgentCore::Runtime`
- **Properties**:
  - `RuntimeName`: `advocacy-content-generator-mcp`
  - `Protocol`: `MCP`
  - `MemorySize`: `1024` MB
  - `TimeoutInSeconds`: `3600` (60 分鐘)

**ContainerConfig**:
```yaml
ContainerConfig:
  ImageUri: !Ref ImageUri
  Port: 8000
  Environment:
    - Name: SERVICE_MODE
      Value: mcp-only
    - Name: MCP_TRANSPORT
      Value: streamable-http
    - Name: AWS_REGION
      Value: !Ref AWS::Region
    - Name: LOG_LEVEL
      Value: info
    - Name: PORT
      Value: '8000'
```

**AuthenticationConfig**:
```yaml
AuthenticationConfig:
  Type: OAUTH
  OAuthConfig:
    DiscoveryUrl: !Sub 'https://cognito-idp.${AWS::Region}.amazonaws.com/${CognitoUserPoolId}/.well-known/openid-configuration'
    ClientId: !Ref CognitoClientId
```

#### 3. Outputs（輸出）

| 輸出名稱 | 說明 | Export 名稱 |
|---------|------|------------|
| `RuntimeArn` | AgentCore Runtime ARN | `${StackName}-RuntimeArn` |
| `RuntimeEndpoint` | AgentCore Runtime Endpoint | `${StackName}-RuntimeEndpoint` |

---

## 部署步驟

### 方法 1: 使用自動化腳本（推薦）

#### Step 1: 編譯 TypeScript

```bash
npm run build
```

**預期輸出**:
```
> advocacy-content-generator@1.0.0 build
> tsc

✓ TypeScript 編譯成功
```

#### Step 2: 執行部署腳本

```bash
./scripts/deploy-cloudformation.sh
```

**部署流程**:
1. 登入 ECR
2. 推送 Docker 映像
3. 建立/更新 CloudFormation Stack
4. 等待部署完成（5-10 分鐘）
5. 擷取 Outputs
6. 儲存環境變數

**預期輸出**:
```
=== CloudFormation AgentCore Runtime Deployment ===

Step 1: Login to ECR and push Docker image
Login Succeeded
The push refers to repository [533267166136.dkr.ecr.us-east-1.amazonaws.com/advocacy-content-generator]
...

Step 2: Deploy CloudFormation Stack
Stack Name: advocacy-content-generator-agentcore
Template: cloudformation/agentcore-mcp-server.yaml

Creating new stack...
Waiting for stack creation to complete (this may take 5-10 minutes)...

Step 3: Extract Outputs
Runtime ARN: arn:aws:bedrock-agentcore:us-east-1:533267166136:runtime/advocacy-content-generator-mcp
Runtime Endpoint: https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/...

Step 4: Save to environment file
Saved to: agentcore-runtime.env

=== Deployment Complete ===
```

#### Step 3: 驗證環境變數

```bash
cat agentcore-runtime.env
```

**應包含**:
```bash
AGENT_ARN=arn:aws:bedrock-agentcore:us-east-1:533267166136:runtime/advocacy-content-generator-mcp
RUNTIME_ENDPOINT=https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/...
AWS_REGION=us-east-1
STACK_NAME=advocacy-content-generator-agentcore
```

### 方法 2: 手動使用 AWS CLI

#### Step 1: 推送 Docker 映像

```bash
# 登入 ECR
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws ecr get-login-password --region us-east-1 | \
    docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com

# 標記並推送映像
docker tag advocacy-content-generator:latest \
    ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/advocacy-content-generator:latest
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/advocacy-content-generator:latest
```

#### Step 2: 建立 CloudFormation Stack

```bash
aws cloudformation create-stack \
    --stack-name advocacy-content-generator-agentcore \
    --template-body file://cloudformation/agentcore-mcp-server.yaml \
    --region us-east-1 \
    --capabilities CAPABILITY_IAM
```

#### Step 3: 等待 Stack 建立完成

```bash
aws cloudformation wait stack-create-complete \
    --stack-name advocacy-content-generator-agentcore \
    --region us-east-1
```

#### Step 4: 取得 Outputs

```bash
aws cloudformation describe-stacks \
    --stack-name advocacy-content-generator-agentcore \
    --region us-east-1 \
    --query 'Stacks[0].Outputs'
```

---

## 驗證部署

### 1. 檢查 Stack 狀態

```bash
aws cloudformation describe-stacks \
    --stack-name advocacy-content-generator-agentcore \
    --region us-east-1 \
    --query 'Stacks[0].StackStatus'
```

**預期輸出**: `"CREATE_COMPLETE"` 或 `"UPDATE_COMPLETE"`

### 2. 檢查 Runtime 狀態

```bash
source agentcore-runtime.env

aws bedrock-agentcore describe-runtime \
    --runtime-arn $AGENT_ARN \
    --region us-east-1
```

**預期狀態**: `"Active"`

### 3. 檢查 CloudWatch Logs

```bash
aws logs describe-log-groups \
    --log-group-name-prefix /aws/bedrock-agentcore/advocacy-content-generator \
    --region us-east-1
```

### 4. 測試 MCP 端點

```bash
# 取得 Bearer Token
./scripts/get-cognito-token.sh

# 執行遠端測試
npm run test:remote-mcp
```

---

## 更新部署

### 更新 Docker 映像

```bash
# 1. 重新建構映像
docker build -t advocacy-content-generator:latest .

# 2. 執行部署腳本（會自動更新）
./scripts/deploy-cloudformation.sh
```

### 更新 CloudFormation 模板

```bash
# 1. 修改 cloudformation/agentcore-mcp-server.yaml

# 2. 更新 Stack
aws cloudformation update-stack \
    --stack-name advocacy-content-generator-agentcore \
    --template-body file://cloudformation/agentcore-mcp-server.yaml \
    --region us-east-1 \
    --capabilities CAPABILITY_IAM

# 3. 等待更新完成
aws cloudformation wait stack-update-complete \
    --stack-name advocacy-content-generator-agentcore \
    --region us-east-1
```

---

## 回滾部署

### 使用回滾腳本

```bash
./scripts/rollback-cloudformation.sh
```

**互動式確認**:
```
=== CloudFormation AgentCore Runtime Rollback ===

Stack Name: advocacy-content-generator-agentcore
Region: us-east-1

Are you sure you want to delete this stack? (yes/no): yes

Deleting CloudFormation Stack...
Waiting for stack deletion to complete...

=== Rollback Complete ===

Stack advocacy-content-generator-agentcore has been deleted.
Note: ECR images have been preserved.
```

### 手動回滾

```bash
# 刪除 Stack
aws cloudformation delete-stack \
    --stack-name advocacy-content-generator-agentcore \
    --region us-east-1

# 等待刪除完成
aws cloudformation wait stack-delete-complete \
    --stack-name advocacy-content-generator-agentcore \
    --region us-east-1
```

---

## 故障排除

### 問題 1: Stack 建立失敗

**症狀**: Stack 狀態為 `CREATE_FAILED` 或 `ROLLBACK_COMPLETE`

**診斷**:
```bash
aws cloudformation describe-stack-events \
    --stack-name advocacy-content-generator-agentcore \
    --region us-east-1 \
    --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`]'
```

**常見原因**:
1. IAM 權限不足
2. ECR 映像不存在或無法訪問
3. Cognito 配置錯誤
4. 資源配額限制

**解決方案**:
```bash
# 檢查 IAM 角色
aws iam get-role --role-name AgentCoreExecutionRole-advocacy-content-generator

# 檢查 ECR 映像
aws ecr describe-images \
    --repository-name advocacy-content-generator \
    --region us-east-1

# 檢查 Cognito
aws cognito-idp describe-user-pool \
    --user-pool-id us-east-1_YYMy6hC3F \
    --region us-east-1
```

### 問題 2: Runtime 無法啟動

**症狀**: Runtime 狀態為 `Failed` 或持續 `Creating`

**診斷**:
```bash
# 查看 CloudWatch Logs
aws logs tail /aws/bedrock-agentcore/advocacy-content-generator-mcp --follow

# 查看錯誤日誌
aws logs filter-log-events \
    --log-group-name /aws/bedrock-agentcore/advocacy-content-generator-mcp \
    --filter-pattern "ERROR"
```

**常見原因**:
1. 容器啟動失敗
2. 環境變數配置錯誤
3. 端口配置錯誤
4. 記憶體不足

**解決方案**:
- 檢查 Docker 映像本地是否可運行
- 驗證環境變數設定
- 增加 MemorySize 配置

### 問題 3: 認證失敗

**症狀**: 401 Unauthorized 錯誤

**診斷**:
```bash
# 測試 Cognito 認證
aws cognito-idp initiate-auth \
    --auth-flow USER_PASSWORD_AUTH \
    --client-id 1eulh5t29s9rsk6a8r1ahv739g \
    --auth-parameters USERNAME=testuser,PASSWORD=MyPassword123! \
    --region us-east-1
```

**解決方案**:
- 確認 Cognito User Pool ID 正確
- 確認 Client ID 正確
- 確認 Discovery URL 可訪問
- 重新產生 Bearer Token

### 問題 4: 部署超時

**症狀**: 部署超過 10 分鐘仍未完成

**診斷**:
```bash
# 檢查 Stack 事件
aws cloudformation describe-stack-events \
    --stack-name advocacy-content-generator-agentcore \
    --region us-east-1 \
    --max-items 20
```

**解決方案**:
- 等待更長時間（首次部署可能需要 15 分鐘）
- 檢查 AWS 服務狀態
- 檢查網路連線

---

## 常見問題

### Q1: 如何查看部署日誌？

```bash
# 即時查看日誌
aws logs tail /aws/bedrock-agentcore/advocacy-content-generator-mcp --follow

# 查看最近 1 小時的日誌
aws logs tail /aws/bedrock-agentcore/advocacy-content-generator-mcp --since 1h
```

### Q2: 如何更新環境變數？

修改 `cloudformation/agentcore-mcp-server.yaml` 中的 `Environment` 區段，然後執行更新：

```bash
./scripts/deploy-cloudformation.sh
```

### Q3: 如何增加記憶體或超時時間？

修改 `cloudformation/agentcore-mcp-server.yaml`:

```yaml
MemorySize: 2048  # 從 1024 增加到 2048
TimeoutInSeconds: 7200  # 從 3600 增加到 7200
```

然後執行更新。

### Q4: 如何切換到不同的 Cognito User Pool？

更新 Parameters 的 Default 值或在部署時覆寫：

```bash
aws cloudformation update-stack \
    --stack-name advocacy-content-generator-agentcore \
    --template-body file://cloudformation/agentcore-mcp-server.yaml \
    --parameters \
        ParameterKey=CognitoUserPoolId,ParameterValue=us-east-1_NEWPOOLID \
        ParameterKey=CognitoClientId,ParameterValue=newclientid \
    --region us-east-1
```

### Q5: 部署成本是多少？

**預估成本**:
- CloudFormation: 免費
- AgentCore Runtime: ~$0.001/請求
- ECR 儲存: ~$0.10/月
- CloudWatch Logs: ~$0.50/月
- 資料傳輸: 依使用量計費

**每月 10,000 次請求**: 約 $10-15

### Q6: 如何監控 Runtime 效能？

```bash
# 查看 CloudWatch 指標
aws cloudwatch get-metric-statistics \
    --namespace AWS/BedrockAgentCore \
    --metric-name Invocations \
    --dimensions Name=RuntimeName,Value=advocacy-content-generator-mcp \
    --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 300 \
    --statistics Sum \
    --region us-east-1
```

### Q7: 如何設定告警？

建立 CloudWatch Alarm:

```bash
aws cloudwatch put-metric-alarm \
    --alarm-name agentcore-high-error-rate \
    --alarm-description "Alert when error rate exceeds 5%" \
    --metric-name Errors \
    --namespace AWS/BedrockAgentCore \
    --statistic Average \
    --period 300 \
    --threshold 0.05 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --region us-east-1
```

---

## 參考資源

### 官方文件
- [AWS CloudFormation 文件](https://docs.aws.amazon.com/cloudformation/)
- [AgentCore Runtime 文件](https://docs.aws.amazon.com/bedrock/latest/userguide/agentcore.html)
- [CloudFormation 資源參考](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/AWS_BedrockAgentCore.html)

### 內部文件
- [POC 發現報告](./agentcore-poc-findings.md)
- [部署步驟指南](./agentcore-deployment-next-steps.md)
- [Task 13 完成報告](./task-13-completion-report.md)
- [TDD 快速參考](./task-13-tdd-quick-reference.md)

### 相關腳本
- `scripts/deploy-cloudformation.sh` - 部署腳本
- `scripts/rollback-cloudformation.sh` - 回滾腳本
- `scripts/get-cognito-token.sh` - 取得認證 Token

### 測試檔案
- `tests/cloudformation/validate-template.test.ts` - 模板驗證測試
- `tests/cloudformation/deploy-script.test.ts` - 部署腳本測試

---

## 附錄

### A. CloudFormation 模板完整範例

參見: `cloudformation/agentcore-mcp-server.yaml`

### B. 環境變數說明

| 變數名稱 | 說明 | 範例值 |
|---------|------|--------|
| `SERVICE_MODE` | 服務模式 | `mcp-only` |
| `MCP_TRANSPORT` | MCP 傳輸協議 | `streamable-http` |
| `AWS_REGION` | AWS 區域 | `us-east-1` |
| `LOG_LEVEL` | 日誌級別 | `info` |
| `PORT` | 服務端口 | `8000` |

### C. IAM 權限需求

執行角色需要以下權限:
- `bedrock:InvokeModel`
- `bedrock:InvokeModelWithResponseStream`
- `logs:CreateLogGroup`
- `logs:CreateLogStream`
- `logs:PutLogEvents`
- `ecr:GetAuthorizationToken`
- `ecr:BatchCheckLayerAvailability`
- `ecr:GetDownloadUrlForLayer`
- `ecr:BatchGetImage`

### D. 網路架構

```
Internet
    ↓
AWS ALB (AgentCore Managed)
    ↓
AgentCore Runtime
    ↓
Docker Container (Port 8000)
    ↓
MCP Server (/mcp endpoint)
```

---

**文件版本**: 1.0  
**最後更新**: 2025年11月14日  
**維護者**: AI Development Team
