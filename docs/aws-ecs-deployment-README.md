# AWS ECS Deployment Configuration

本文件說明 AWS ECS 部署配置檔案的用途和使用方式。

## 檔案清單

### 1. `task-definition.json`

ECS Fargate Task Definition 配置檔案，定義容器的執行環境。

**主要配置：**

- **CPU/Memory**: 1 vCPU / 2 GB RAM
- **Container Port**: 3000 (Node.js Express 預設)
- **Service Mode**: unified (同時啟用 REST API 和 MCP)
- **Health Check**: 每 30 秒檢查 `/health` 端點
- **EFS Mount**: `/mnt/efs/cache` 用於快取儲存
- **Secrets**: 從 AWS Secrets Manager 載入敏感資訊

**需要更新的值：**

```json
{
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/...",
  "taskRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role
```

...",
"image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/advocacy-content-generator:latest",
"fileSystemId": "fs-YOUR_EFS_ID",
"secrets": [
{
"valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:..."
}
]
}

````

### 2. `.github/workflows/deploy.yml`

GitHub Actions CI/CD 工作流程，自動化測試和部署。

**工作流程：**

1. **Test Job**: 執行測試、型別檢查、Linting
2. **Build and Deploy Job**: 建構 Docker 映像並部署到 ECS
3. **Rollback Job**: 部署失敗時自動回滾

**觸發條件：**

- Push 到 `main` 分支
- 手動觸發（workflow_dispatch）

**需要的 GitHub Secrets：**

- `AWS_ACCESS_KEY_ID`: AWS 存取金鑰 ID
- `AWS_SECRET_ACCESS_KEY`: AWS 秘密存取金鑰

### 3. `docs/iam-policies.json`

IAM 角色和政策範本，包含：

- **TaskRolePolicy**: ECS Task 執行時需要的權限
  - Bedrock API 存取
  - Secrets Manager 讀取
  - CloudWatch Logs 寫入
  - EFS 檔案系統存取

- **ExecutionRolePolicy**: ECS Task 啟動時需要的權限
  - ECR 映像拉取
  - CloudWatch Logs 建立
  - Secrets Manager 讀取

- **GitHubActionsPolicy**: CI/CD 部署需要的權限
  - ECR 推送映像
  - ECS 服務更新
  - IAM PassRole

### 4. `scripts/setup-aws-infrastructure.sh`

自動化基礎設施建立腳本，會建立：

- VPC 和子網路（公開/私有）
- Internet Gateway 和 NAT Gateway
- 安全群組（ALB、ECS、EFS）
- EFS 檔案系統
- ECR 倉庫
- IAM 角色和政策
- ECS Cluster
- Application Load Balancer
- CloudWatch Log Group

**使用方式：**

```bash
# 設定 AWS 區域（可選，預設為 us-east-1）
export AWS_REGION=us-east-1

# 執行腳本
./scripts/setup-aws-infrastructure.sh
````

腳本執行完成後會產生 `infrastructure-config.txt`，包含所有建立的資源 ID。

## 快速開始

### 步驟 1：建立 AWS 基礎設施

```bash
# 確認 AWS CLI 已配置
aws sts get-caller-identity

# 執行基礎設施建立腳本
./scripts/setup-aws-infrastructure.sh
```

### 步驟 2：建立 Secrets Manager 密鑰

```bash
# 建立 News API Key
aws secretsmanager create-secret \
  --name advocacy-content-generator/news-api-key \
  --secret-string '{"NEWS_API_KEY":"your-news-api-key"}'

# 建立 API Keys
aws secretsmanager create-secret \
  --name advocacy-content-generator/api-keys \
  --secret-string '{"API_KEYS":"key1,key2,key3"}'
```

### 步驟 3：更新 Task Definition

使用 `infrastructure-config.txt` 中的值更新 `task-definition.json`：

```bash
# 取得帳號 ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# 取得 EFS ID
EFS_ID=$(grep "EFS_ID=" infrastructure-config.txt | cut -d'=' -f2)

# 更新 task-definition.json
sed -i "s/123456789012/${AWS_ACCOUNT_ID}/g" task-definition.json
sed -i "s/fs-12345678/${EFS_ID}/g" task-definition.json
```

### 步驟 4：建構並推送 Docker 映像

```bash
# 登入 ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com

# 建構映像
docker build -t advocacy-content-generator .

# 標記並推送
docker tag advocacy-content-generator:latest \
  ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/advocacy-content-generator:latest

docker push ${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com/advocacy-content-generator:latest
```

### 步驟 5：註冊 Task Definition

```bash
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json
```

### 步驟 6：建立 ECS Service

```bash
# 從 infrastructure-config.txt 取得值
source infrastructure-config.txt

# 建立服務
aws ecs create-service \
  --cluster advocacy-content-generator-cluster \
  --service-name advocacy-content-generator-service \
  --task-definition advocacy-content-generator \
  --desired-count 2 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[${PRIVATE_SUBNET_1A},${PRIVATE_SUBNET_1B}],securityGroups=[${ECS_SG_ID}],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=${TG_ARN},containerName=api,containerPort=3000" \
  --health-check-grace-period-seconds 60 \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100"
```

### 步驟 7：配置 GitHub Actions

1. 前往 GitHub 倉庫設定 > Secrets and variables > Actions
2. 新增以下 Secrets：

   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`

3. Push 程式碼到 `main` 分支觸發自動部署

### 步驟 8：驗證部署

```bash
# 取得 ALB DNS
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names advocacy-content-generator-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# 測試健康檢查
curl http://${ALB_DNS}/health

# 測試 API（需要 API Key）
curl -X POST http://${ALB_DNS}/api/v1/news/search \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"keywords": ["司法改革"]}'
```

## 環境變數說明

### Task Definition 環境變數

| 變數名稱                | 說明                                 | 預設值                                      |
| ----------------------- | ------------------------------------ | ------------------------------------------- |
| `SERVICE_MODE`          | 服務模式 (unified/api-only/mcp-only) | `unified`                                   |
| `PORT`                  | 服務監聽端口                         | `3000`                                      |
| `NODE_ENV`              | Node.js 環境                         | `production`                                |
| `AWS_REGION`            | AWS 區域                             | `us-east-1`                                 |
| `BEDROCK_MODEL_ID`      | Bedrock 模型 ID                      | `anthropic.claude-sonnet-4-5-20250929-v1:0` |
| `BEDROCK_REGION`        | Bedrock 服務區域                     | `us-east-1`                                 |
| `LOG_LEVEL`             | 日誌等級                             | `INFO`                                      |
| `CACHE_DIR`             | 快取目錄                             | `/mnt/efs/cache`                            |
| `CACHE_TTL`             | 快取過期時間（秒）                   | `3600`                                      |
| `REFINE_LIMIT_PER_HOUR` | 每小時精煉次數限制                   | `5`                                         |

### Secrets Manager 密鑰

| 密鑰名稱                                  | 說明                     | 格式                            |
| ----------------------------------------- | ------------------------ | ------------------------------- |
| `advocacy-content-generator/news-api-key` | Google News API Key      | `{"NEWS_API_KEY":"..."}`        |
| `advocacy-content-generator/api-keys`     | API 認證金鑰（逗號分隔） | `{"API_KEYS":"key1,key2,key3"}` |

## 監控與日誌

### CloudWatch Logs

查看應用程式日誌：

```bash
# 即時查看日誌
aws logs tail /ecs/advocacy-content-generator --follow

# 查看錯誤日誌
aws logs filter-log-events \
  --log-group-name /ecs/advocacy-content-generator \
  --filter-pattern "ERROR"
```

### CloudWatch Metrics

監控關鍵指標：

```bash
# CPU 使用率
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=advocacy-content-generator-service \
              Name=ClusterName,Value=advocacy-content-generator-cluster \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

### ECS Exec（除錯）

連接到執行中的容器：

```bash
# 列出任務
aws ecs list-tasks \
  --cluster advocacy-content-generator-cluster \
  --service-name advocacy-content-generator-service

# 連接到容器
aws ecs execute-command \
  --cluster advocacy-content-generator-cluster \
  --task TASK_ID \
  --container api \
  --interactive \
  --command "/bin/sh"
```

## 成本估算

### 每月成本（美國東部 1 區）

| 服務                      | 配置                      | 估算成本        |
| ------------------------- | ------------------------- | --------------- |
| ECS Fargate               | 2 tasks × (1 vCPU + 2 GB) | $72/月          |
| Application Load Balancer | 標準配置                  | $22-27/月       |
| EFS                       | 1 GB 標準儲存             | $0.30/月        |
| AWS Bedrock               | 100 次/天生成             | $41/月          |
| CloudWatch                | 日誌和指標                | $5-10/月        |
| NAT Gateway               | 單一 NAT                  | $33/月          |
| 其他                      | ECR, Secrets Manager      | $2/月           |
| **總計**                  |                           | **$175-185/月** |

### 成本優化建議

1. **使用 Fargate Spot** - 節省最多 70% 運算成本
2. **調整 Auto Scaling** - 根據流量動態調整任務數
3. **優化 Bedrock 使用** - 實作更積極的快取策略
4. **設定日誌保留期限** - 減少 CloudWatch Logs 成本

## 故障排除

### 常見問題

#### 1. 容器無法啟動

**檢查步驟：**

```bash
# 查看任務狀態
aws ecs describe-tasks \
  --cluster advocacy-content-generator-cluster \
  --tasks TASK_ID

# 查看日誌
aws logs tail /ecs/advocacy-content-generator --follow
```

**常見原因：**

- 環境變數配置錯誤
- IAM 權限不足
- Secrets Manager 密鑰不存在

#### 2. 健康檢查失敗

**解決方案：**

```bash
# 增加健康檢查寬限期
aws ecs update-service \
  --cluster advocacy-content-generator-cluster \
  --service advocacy-content-generator-service \
  --health-check-grace-period-seconds 120
```

#### 3. Bedrock API 錯誤

**檢查步驟：**

```bash
# 檢查模型存取權限
aws bedrock list-foundation-models \
  --region us-east-1 \
  --query 'modelSummaries[?contains(modelId, `claude-sonnet-4-5`)]'

# 測試 Bedrock API
aws bedrock-runtime invoke-model \
  --model-id anthropic.claude-sonnet-4-5-20250929-v1:0 \
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":100,"messages":[{"role":"user","content":[{"type":"text","text":"Hello"}]}]}' \
  --cli-binary-format raw-in-base64-out \
  output.json
```

## 安全性最佳實踐

1. **網路隔離**

   - ECS 任務部署在私有子網路
   - 透過 NAT Gateway 存取網際網路
   - 使用安全群組限制流量

2. **身份與存取管理**

   - 使用 IAM 角色而非存取金鑰
   - 遵循最小權限原則
   - 定期輪換 Secrets Manager 密鑰

3. **資料保護**

   - EFS 啟用傳輸中和靜態加密
   - 使用 Secrets Manager 管理敏感資訊
   - 啟用 ALB 存取日誌

4. **監控與告警**
   - 設定 CloudWatch Alarms
   - 啟用 Container Insights
   - 監控異常流量模式

## 維護與更新

### 更新應用程式

```bash
# 1. 建構新映像
docker build -t advocacy-content-generator:v1.1.0 .

# 2. 推送到 ECR
docker tag advocacy-content-generator:v1.1.0 \
  ${ECR_URI}:v1.1.0
docker push ${ECR_URI}:v1.1.0

# 3. 更新服務
aws ecs update-service \
  --cluster advocacy-content-generator-cluster \
  --service advocacy-content-generator-service \
  --force-new-deployment
```

### 回滾部署

```bash
# 回滾到上一個版本
aws ecs update-service \
  --cluster advocacy-content-generator-cluster \
  --service advocacy-content-generator-service \
  --task-definition advocacy-content-generator:PREVIOUS_VERSION \
  --force-new-deployment
```

## 相關文件

- [完整部署指南](./deployment-guide.md)
- [API 使用指南](./api-guide.md)
- [MCP 整合指南](./mcp-guide.md)
- [AWS ECS 文件](https://docs.aws.amazon.com/ecs/)
- [AWS Bedrock 文件](https://docs.aws.amazon.com/bedrock/)

## 支援

如有問題或建議，請透過 GitHub Issues 聯繫。
