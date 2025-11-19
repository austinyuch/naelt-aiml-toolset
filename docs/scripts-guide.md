# 腳本使用指南 (Scripts Guide)

本文件整理專案中所有腳本的用途、使用方式和執行順序。

## 目錄

- [快速開始](#快速開始)
- [腳本分類](#腳本分類)
- [完整部署流程](#完整部署流程)
- [腳本詳細說明](#腳本詳細說明)
- [常見問題](#常見問題)

---

## 快速開始

### AgentCore 部署（推薦流程）

```bash
# 1. 設定 Cognito 認證
./scripts/setup-cognito.sh

# 2. 建置並推送 Docker 映像
./scripts/build-and-push-docker.sh

# 3. 配置 AgentCore
./scripts/configure-agentcore.sh

# 4. 啟動 AgentCore Runtime
./scripts/launch-agentcore.sh

# 5. 驗證部署
./scripts/verify-agentcore-config.sh
```

### ECS 部署（傳統方式）

```bash
# 1. 建立 AWS 基礎設施
./scripts/setup-aws-infrastructure.sh

# 2. 設定 Cognito（如需要）
./scripts/setup-cognito.sh

# 3. 建置並推送 Docker 映像
./scripts/build-and-push-docker.sh

# 4. 部署到 ECS（使用 task-definition.json）
```

---

## 腳本分類

### 1. AgentCore 部署腳本

| 腳本名稱 | 用途 | 執行時機 |
|---------|------|---------|
| `configure-agentcore.sh` | 配置 AgentCore agent | 首次部署或更新配置 |
| `launch-agentcore.sh` | 啟動 AgentCore Runtime | 配置完成後 |
| `deploy-agentcore.sh` | 使用 toolkit 部署 | 自動化部署 |
| `deploy-agentcore-direct.sh` | 直接部署（無 toolkit） | 替代方案 |
| `configure-container-agent.sh` | 配置容器 agent | 容器化部署 |

### 2. CloudFormation 部署腳本

| 腳本名稱 | 用途 | 執行時機 |
|---------|------|---------|
| `deploy-cloudformation.sh` | 部署 CloudFormation Stack | 生產環境部署 |
| `rollback-cloudformation.sh` | 回滾 CloudFormation | 部署失敗時 |

### 3. AWS 基礎設施腳本

| 腳本名稱 | 用途 | 執行時機 |
|---------|------|---------|
| `setup-aws-infrastructure.sh` | 建立完整 AWS 基礎設施 | 首次設定 |
| `create-iam-execution-role.sh` | 建立 IAM 執行角色 | 權限設定 |
| `setup-cognito.sh` | 設定 Cognito 認證 | 認證設定 |

### 4. Docker 相關腳本

| 腳本名稱 | 用途 | 執行時機 |
|---------|------|---------|
| `build-and-push-docker.sh` | 建置並推送 Docker 映像 | 每次程式碼更新 |
| `test-docker-mcp.sh` | 測試 Docker MCP | 本地測試 |

### 5. 驗證與測試腳本

| 腳本名稱 | 用途 | 執行時機 |
|---------|------|---------|
| `verify-agentcore-config.sh` | 驗證 AgentCore 配置 | 配置後驗證 |
| `verify-aws-setup.sh` | 驗證 AWS 設定 | 基礎設施建立後 |
| `verify-aws-permissions.sh` | 驗證 AWS 權限 | 權限問題排查 |
| `verify-bedrock-us-east-1.sh` | 驗證 Bedrock 設定 | Bedrock 相關問題 |
| `verify-task-7.sh` | 驗證特定任務 | 任務驗證 |

### 6. 認證與 Token 管理

| 腳本名稱 | 用途 | 執行時機 |
|---------|------|---------|
| `refresh-cognito-token.sh` | 更新 Cognito Token | Token 過期時 |
| `fix-cognito-auth.sh` | 修復 Cognito 認證問題 | 認證失敗時 |

### 7. 測試腳本

| 腳本名稱 | 用途 | 執行時機 |
|---------|------|---------|
| `test-local-mcp.sh` | 測試本地 MCP | 本地開發 |
| `test-claude-sonnet-4-5.sh` | 測試 Claude Sonnet 4.5 | 模型測試 |
| `test-claude-haiku-4-5.sh` | 測試 Claude Haiku 4.5 | 模型測試 |

### 8. Python 部署腳本

| 腳本名稱 | 用途 | 執行時機 |
|---------|------|---------|
| `deploy_agentcore.py` | Python 版本部署腳本 | 程式化部署 |
| `check_boto3_methods.py` | 檢查 Boto3 方法 | API 驗證 |

---

## 完整部署流程

### 流程 A: AgentCore 部署（推薦）

#### 前置需求

- AWS CLI 已安裝並配置
- Docker 已安裝
- Node.js 20+ 已安裝
- AWS 帳號有 Bedrock 權限

#### 步驟 1: 設定 Cognito 認證

```bash
./scripts/setup-cognito.sh
```

**功能**:
- 建立 Cognito User Pool
- 建立 App Client
- 建立測試使用者
- 產生 `cognito-credentials.txt`

**輸出檔案**:
- `cognito-credentials.txt` - 包含 User Pool ID、Client ID、測試使用者憑證

**驗證**:
```bash
cat cognito-credentials.txt
```

#### 步驟 2: 建置並推送 Docker 映像

```bash
./scripts/build-and-push-docker.sh
```

**功能**:
- 編譯 TypeScript
- 建置 Docker 映像
- 登入 ECR
- 推送映像到 ECR

**前置條件**:
- ECR Repository 已建立
- AWS 憑證已配置

**驗證**:
```bash
aws ecr describe-images \
  --repository-name advocacy-content-generator \
  --region us-east-1
```

#### 步驟 3: 配置 AgentCore

```bash
./scripts/configure-agentcore.sh
```

**功能**:
- 讀取 `.bedrock_agentcore.yaml` 配置
- 設定 agent 名稱、執行角色、ECR URI
- 配置 OAuth 認證
- 產生 AgentCore 配置

**配置內容**:
- Agent Name: `advocacy-content-generator`
- Protocol: `MCP`
- Deployment Type: `container`
- Region: `us-east-1`

**驗證**:
```bash
agentcore configure list
```

#### 步驟 4: 啟動 AgentCore Runtime

```bash
./scripts/launch-agentcore.sh
```

**功能**:
- 登入 ECR
- 標記並推送最新映像
- 啟動 AgentCore Runtime（約 5 分鐘）
- 擷取 Runtime ARN
- 產生 `agentcore-runtime.env`

**輸出檔案**:
- `agentcore-runtime.env` - 包含 AGENT_ARN
- `agentcore-launch-output.txt` - 部署日誌

**驗證**:
```bash
source agentcore-runtime.env
echo $AGENT_ARN
```

#### 步驟 5: 驗證部署

```bash
./scripts/verify-agentcore-config.sh
```

**功能**:
- 檢查 Runtime 狀態
- 驗證配置正確性
- 測試端點可用性

**預期結果**:
- Runtime 狀態: `Active`
- 配置驗證: `✓ Passed`

#### 步驟 6: 測試 MCP 工具

```bash
# 取得 Bearer Token
./scripts/refresh-cognito-token.sh

# 執行遠端測試
npm run test:remote-mcp
```

---

### 流程 B: CloudFormation 部署（生產環境）

#### 步驟 1: 準備 Docker 映像

```bash
npm run build
./scripts/build-and-push-docker.sh
```

#### 步驟 2: 部署 CloudFormation Stack

```bash
./scripts/deploy-cloudformation.sh
```

**功能**:
- 登入 ECR 並推送映像
- 建立/更新 CloudFormation Stack
- 等待部署完成（5-10 分鐘）
- 擷取 Outputs
- 產生 `agentcore-runtime.env`

**CloudFormation 資源**:
- AgentCore Runtime
- IAM Roles
- CloudWatch Log Groups
- OAuth Configuration

**驗證**:
```bash
aws cloudformation describe-stacks \
  --stack-name advocacy-content-generator-agentcore \
  --region us-east-1
```

#### 步驟 3: 回滾（如需要）

```bash
./scripts/rollback-cloudformation.sh
```

**功能**:
- 刪除 CloudFormation Stack
- 保留 ECR 映像
- 清理資源

---

### 流程 C: ECS 部署（傳統方式）

#### 步驟 1: 建立 AWS 基礎設施

```bash
./scripts/setup-aws-infrastructure.sh
```

**功能**:
- 建立 VPC 和子網路
- 建立 Internet Gateway 和 NAT Gateway
- 建立安全群組
- 建立 EFS 檔案系統
- 建立 ECR Repository
- 建立 IAM 角色
- 建立 ECS Cluster
- 建立 Application Load Balancer
- 建立 CloudWatch Log Group

**輸出檔案**:
- `infrastructure-config.txt` - 包含所有資源 ID

**預估時間**: 10-15 分鐘

**驗證**:
```bash
cat infrastructure-config.txt
```

#### 步驟 2: 建立 Secrets Manager 密鑰

```bash
# 建立 News API Key
aws secretsmanager create-secret \
  --name advocacy-content-generator/news-api-key \
  --secret-string '{"NEWS_API_KEY":"your-api-key"}'

# 建立 API Keys
aws secretsmanager create-secret \
  --name advocacy-content-generator/api-keys \
  --secret-string '{"API_KEYS":"key1,key2,key3"}'
```

#### 步驟 3: 更新 Task Definition

```bash
# 從 infrastructure-config.txt 取得值
source infrastructure-config.txt

# 更新 task-definition.json
sed -i "s/123456789012/${AWS_ACCOUNT_ID}/g" task-definition.json
sed -i "s/fs-12345678/${EFS_ID}/g" task-definition.json
```

#### 步驟 4: 建置並推送 Docker 映像

```bash
./scripts/build-and-push-docker.sh
```

#### 步驟 5: 部署 ECS Service

```bash
# 註冊 Task Definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# 建立 ECS Service
aws ecs create-service \
  --cluster advocacy-content-generator-cluster \
  --service-name advocacy-content-generator-service \
  --task-definition advocacy-content-generator \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[${PRIVATE_SUBNET_1A},${PRIVATE_SUBNET_1B}],securityGroups=[${ECS_SG_ID}]}" \
  --load-balancers "targetGroupArn=${TG_ARN},containerName=api,containerPort=3000"
```

---

## 腳本詳細說明

### configure-agentcore.sh

**用途**: 配置 AgentCore agent 的基本設定

**使用方式**:
```bash
./scripts/configure-agentcore.sh
```

**前置條件**:
- `.bedrock_agentcore.yaml` 檔案存在
- IAM 執行角色已建立
- ECR Repository 已建立
- Cognito User Pool 已設定

**配置項目**:
- Agent Name
- Execution Role ARN
- ECR Repository URI
- OAuth Discovery URL
- OAuth Client ID
- Protocol (MCP)
- Deployment Type (container)

**輸出**:
- AgentCore 配置已儲存
- 可使用 `agentcore configure list` 查看

**下一步**:
```bash
./scripts/launch-agentcore.sh
```

---

### launch-agentcore.sh

**用途**: 啟動 AgentCore Runtime 並部署容器

**使用方式**:
```bash
./scripts/launch-agentcore.sh
```

**前置條件**:
- AgentCore 已配置（執行過 `configure-agentcore.sh`）
- Docker 映像已建置
- `.bedrock_agentcore.yaml` 檔案存在

**執行流程**:
1. 登入 ECR
2. 標記 Docker 映像
3. 推送映像到 ECR
4. 啟動 AgentCore Runtime（約 5 分鐘）
5. 擷取 Runtime ARN
6. 儲存到 `agentcore-runtime.env`

**輸出檔案**:
- `agentcore-runtime.env` - 環境變數
- `agentcore-launch-output.txt` - 部署日誌

**驗證**:
```bash
source agentcore-runtime.env
echo $AGENT_ARN
```

**下一步**:
```bash
./scripts/refresh-cognito-token.sh
npm run test:remote-mcp
```

---

### deploy-cloudformation.sh

**用途**: 使用 CloudFormation 部署 AgentCore Runtime

**使用方式**:
```bash
./scripts/deploy-cloudformation.sh
```

**前置條件**:
- `cloudformation/agentcore-mcp-server.yaml` 存在
- Docker 映像已建置
- AWS CLI 已配置

**執行流程**:
1. 登入 ECR
2. 推送 Docker 映像
3. 建立/更新 CloudFormation Stack
4. 等待部署完成（5-10 分鐘）
5. 擷取 Stack Outputs
6. 儲存環境變數

**CloudFormation 資源**:
- `AWS::BedrockAgentCore::Runtime`
- CloudWatch Log Groups
- IAM Roles（如需要）

**輸出檔案**:
- `agentcore-runtime.env`

**驗證**:
```bash
aws cloudformation describe-stacks \
  --stack-name advocacy-content-generator-agentcore \
  --region us-east-1
```

**回滾**:
```bash
./scripts/rollback-cloudformation.sh
```

---

### setup-cognito.sh

**用途**: 設定 Cognito User Pool 和認證

**使用方式**:
```bash
./scripts/setup-cognito.sh
```

**執行流程**:
1. 建立 Cognito User Pool
2. 配置密碼政策
3. 建立 App Client
4. 建立測試使用者
5. 設定使用者密碼
6. 產生憑證檔案

**輸出檔案**:
- `cognito-credentials.txt`

**憑證內容**:
```
User Pool ID: us-east-1_XXXXXXXXX
Client ID: xxxxxxxxxxxxxxxxxxxx
Username: testuser
Password: MyPassword123!
Discovery URL: https://cognito-idp.us-east-1.amazonaws.com/...
```

**驗證**:
```bash
cat cognito-credentials.txt
```

**取得 Token**:
```bash
./scripts/refresh-cognito-token.sh
```

---

### refresh-cognito-token.sh

**用途**: 更新 Cognito Bearer Token

**使用方式**:
```bash
./scripts/refresh-cognito-token.sh
```

**前置條件**:
- `cognito-credentials.txt` 存在
- Cognito User Pool 已設定

**執行流程**:
1. 讀取 Cognito 憑證
2. 使用 USER_PASSWORD_AUTH 流程
3. 取得 Access Token
4. 匯出為環境變數

**輸出**:
```bash
export BEARER_TOKEN=eyJraWQ...
```

**使用方式**:
```bash
# 方法 1: 直接執行
./scripts/refresh-cognito-token.sh

# 方法 2: Source 到當前 shell
source ./scripts/refresh-cognito-token.sh

# 驗證
echo $BEARER_TOKEN
```

**Token 有效期**: 1 小時

---

### build-and-push-docker.sh

**用途**: 建置並推送 Docker 映像到 ECR

**使用方式**:
```bash
./scripts/build-and-push-docker.sh
```

**前置條件**:
- Docker 已安裝
- AWS CLI 已配置
- ECR Repository 已建立
- TypeScript 已編譯（或腳本會自動編譯）

**執行流程**:
1. 編譯 TypeScript（`npm run build`）
2. 建置 Docker 映像
3. 登入 ECR
4. 標記映像
5. 推送到 ECR

**映像標籤**:
- `latest`
- `<git-commit-hash>`（如果在 git repo 中）

**驗證**:
```bash
aws ecr describe-images \
  --repository-name advocacy-content-generator \
  --region us-east-1
```

---

### verify-agentcore-config.sh

**用途**: 驗證 AgentCore 配置和部署狀態

**使用方式**:
```bash
./scripts/verify-agentcore-config.sh
```

**檢查項目**:
- ✓ `.bedrock_agentcore.yaml` 存在
- ✓ AgentCore 配置有效
- ✓ Runtime 狀態為 Active
- ✓ ECR 映像存在
- ✓ IAM 角色有效
- ✓ Cognito 配置正確

**輸出範例**:
```
=== AgentCore Configuration Verification ===

✓ Configuration file exists
✓ AgentCore configured
✓ Runtime status: Active
✓ ECR image available
✓ IAM role valid
✓ Cognito configured

All checks passed!
```

---

### verify-aws-setup.sh

**用途**: 驗證 AWS 基礎設施設定

**使用方式**:
```bash
./scripts/verify-aws-setup.sh
```

**檢查項目**:
- AWS CLI 已安裝
- AWS 憑證已配置
- 必要的 AWS 服務可用
- 區域設定正確
- IAM 權限充足

---

### setup-aws-infrastructure.sh

**用途**: 建立完整的 AWS ECS 基礎設施

**使用方式**:
```bash
./scripts/setup-aws-infrastructure.sh
```

**建立資源**:
1. VPC (10.0.0.0/16)
2. Public Subnets (2 個 AZ)
3. Private Subnets (2 個 AZ)
4. Internet Gateway
5. NAT Gateway
6. Route Tables
7. Security Groups (ALB, ECS, EFS)
8. EFS File System
9. ECR Repository
10. IAM Roles (Task Execution, Task Role)
11. ECS Cluster
12. Application Load Balancer
13. Target Group
14. CloudWatch Log Group

**預估時間**: 10-15 分鐘

**輸出檔案**:
- `infrastructure-config.txt`

**成本估算**:
- NAT Gateway: ~$33/月
- ALB: ~$22-27/月
- EFS: ~$0.30/GB/月
- 其他: ~$5-10/月

**清理**:
```bash
# 需要手動刪除資源
aws cloudformation delete-stack --stack-name <stack-name>
```

---

### rollback-cloudformation.sh

**用途**: 回滾 CloudFormation 部署

**使用方式**:
```bash
./scripts/rollback-cloudformation.sh
```

**執行流程**:
1. 確認回滾操作
2. 刪除 CloudFormation Stack
3. 等待刪除完成
4. 保留 ECR 映像

**互動式確認**:
```
Are you sure you want to delete this stack? (yes/no): yes
```

**注意事項**:
- ECR 映像不會被刪除
- CloudWatch Logs 會被保留
- 可以重新部署

---

## 常見問題

### Q1: 如何選擇部署方式？

**AgentCore 部署** (推薦):
- ✅ 快速部署（< 10 分鐘）
- ✅ 自動擴展
- ✅ 無需管理基礎設施
- ✅ 按使用量計費
- ❌ 較新的服務，文件較少

**CloudFormation 部署**:
- ✅ 基礎設施即程式碼
- ✅ 可重複部署
- ✅ 版本控制
- ✅ 適合生產環境
- ⚠️ 需要 CloudFormation 知識

**ECS 部署**:
- ✅ 完全控制
- ✅ 成熟穩定
- ✅ 豐富的文件
- ❌ 需要管理基礎設施
- ❌ 設定複雜

### Q2: Token 過期怎麼辦？

```bash
./scripts/refresh-cognito-token.sh
```

Token 有效期為 1 小時，過期後重新執行此腳本。

### Q3: 如何查看部署日誌？

**AgentCore**:
```bash
aws logs tail /aws/bedrock-agentcore/advocacy-content-generator-mcp --follow
```

**ECS**:
```bash
aws logs tail /ecs/advocacy-content-generator --follow
```

### Q4: 部署失敗如何排查？

1. 檢查 CloudWatch Logs
2. 驗證 IAM 權限
3. 確認 ECR 映像存在
4. 檢查 Cognito 配置
5. 查看 CloudFormation Events

```bash
# 檢查 Stack 事件
aws cloudformation describe-stack-events \
  --stack-name advocacy-content-generator-agentcore \
  --region us-east-1 \
  --max-items 20
```

### Q5: 如何更新部署？

**更新程式碼**:
```bash
npm run build
./scripts/build-and-push-docker.sh
./scripts/deploy-cloudformation.sh  # 或 launch-agentcore.sh
```

**更新配置**:
```bash
# 修改 .bedrock_agentcore.yaml 或 cloudformation/*.yaml
./scripts/configure-agentcore.sh
./scripts/launch-agentcore.sh
```

### Q6: 如何測試部署？

**本地測試**:
```bash
./scripts/test-local-mcp.sh
```

**遠端測試**:
```bash
source agentcore-runtime.env
./scripts/refresh-cognito-token.sh
npm run test:remote-mcp
```

### Q7: 部署成本是多少？

**AgentCore**:
- Runtime: ~$0.001/請求
- 每月 10,000 次請求: ~$10-15

**ECS**:
- Fargate (2 tasks): ~$72/月
- ALB: ~$22-27/月
- NAT Gateway: ~$33/月
- 其他: ~$10-15/月
- **總計**: ~$137-147/月

### Q8: 如何清理資源？

**AgentCore**:
```bash
./scripts/rollback-cloudformation.sh
```

**ECS**:
```bash
# 刪除 ECS Service
aws ecs delete-service \
  --cluster advocacy-content-generator-cluster \
  --service advocacy-content-generator-service \
  --force

# 刪除其他資源（需要手動或使用 CloudFormation）
```

---

## 相關文件

- [DEPLOYMENT.md](../DEPLOYMENT.md) - ECS 部署快速指南
- [agentcore-deployment-next-steps.md](./agentcore-deployment-next-steps.md) - AgentCore 部署步驟
- [agentcore-cloudformation-deployment-guide.md](./agentcore-cloudformation-deployment-guide.md) - CloudFormation 詳細指南
- [README.md](../README.md) - 專案總覽

---

**文件版本**: 1.0  
**最後更新**: 2025年11月19日  
**維護者**: AI Development Team
