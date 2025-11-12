# AWS ECS Deployment Quick Start

本文件提供快速部署到 AWS ECS Fargate 的步驟指引。

## 📋 前置需求

- AWS 帳號（已啟用 Bedrock Claude Sonnet 4.5 存取權限）
- AWS CLI 2.x 已安裝並配置
- Docker 已安裝
- Node.js 20+ 已安裝
- GitHub 帳號（用於 CI/CD）

## 🚀 快速部署（5 步驟）

### 步驟 1：建立 AWS 基礎設施

使用自動化腳本建立所有必要的 AWS 資源：

```bash
# 執行基礎設施建立腳本
./scripts/setup-aws-infrastructure.sh
```

這會建立：

- ✅ VPC 和子網路
- ✅ Internet Gateway 和 NAT Gateway
- ✅ 安全群組
- ✅ EFS 檔案系統
- ✅ ECR 倉庫
- ✅ IAM 角色
- ✅ ECS Cluster
- ✅ Application Load Balancer
- ✅ CloudWatch Log Group

完成後會產生 `infrastructure-config.txt` 包含所有資源 ID。

### 步驟 2：建立 Secrets Manager 密鑰

```bash
# 建立 News API Key
aws secretsmanager create-secret \
  --name advocacy-content-generator/news-api-key \
  --secret-string '{"NEWS_API_KEY":"your-google-news-api-key"}'

# 建立 API Keys（用於 API 認證）
aws secretsmanager create-secret \
  --name advocacy-content-generator/api-keys \
  --secret-string '{"API_KEYS":"key1,key2,key3"}'
```

### 步驟 3：更新 Task Definition

```bash
# 取得帳號 ID 和 EFS ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
EFS_ID=$(grep "EFS_ID=" infrastructure-config.txt | cut -d'=' -f2)

# 更新 task-definition.json
sed -i "s/123456789012/${AWS_ACCOUNT_ID}/g" task-definition.json
sed -i "s/fs-12345678/${EFS_ID}/g" task-definition.json
```

### 步驟 4：建構並推送 Docker 映像

```bash
# 登入 ECR
ECR_URI=$(grep "ECR_URI=" infrastructure-config.txt | cut -d'=' -f2)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin ${ECR_URI}

# 建構並推送映像
docker build -t advocacy-content-generator .
docker tag advocacy-content-generator:latest ${ECR_URI}:latest
docker push ${ECR_URI}:latest
```

### 步驟 5：部署 ECS Service

```bash
# 載入配置
source infrastructure-config.txt

# 註冊 Task Definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# 建立 ECS Service
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

## ✅ 驗證部署

```bash
# 取得 ALB DNS
ALB_DNS=$(grep "ALB_DNS=" infrastructure-config.txt | cut -d'=' -f2)

# 測試健康檢查
curl http://${ALB_DNS}/health

# 測試 API（需要 API Key）
curl -X POST http://${ALB_DNS}/api/v1/news/search \
  -H "Content-Type: application/json" \
  -H "X-API-Key: key1" \
  -d '{"keywords": ["司法改革"]}'
```

## 🔄 設定 CI/CD（GitHub Actions）

### 配置 GitHub Secrets

1. 前往 GitHub 倉庫 > Settings > Secrets and variables > Actions
2. 新增以下 Secrets：
   - `AWS_ACCESS_KEY_ID`: 您的 AWS 存取金鑰 ID
   - `AWS_SECRET_ACCESS_KEY`: 您的 AWS 秘密存取金鑰

### 觸發自動部署

```bash
# Push 到 main 分支會自動觸發部署
git add .
git commit -m "Deploy to ECS"
git push origin main
```

GitHub Actions 會自動：

1. ✅ 執行測試
2. ✅ 建構 Docker 映像
3. ✅ 推送到 ECR
4. ✅ 更新 ECS Service
5. ✅ 等待服務穩定

## 📊 監控與日誌

### 查看日誌

```bash
# 即時查看日誌
aws logs tail /ecs/advocacy-content-generator --follow

# 查看錯誤日誌
aws logs filter-log-events \
  --log-group-name /ecs/advocacy-content-generator \
  --filter-pattern "ERROR"
```

### 監控指標

```bash
# CPU 使用率
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=advocacy-content-generator-service \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

## 💰 成本估算

| 服務                        | 每月成本     |
| --------------------------- | ------------ |
| ECS Fargate (2 tasks)       | $72          |
| Application Load Balancer   | $22-27       |
| AWS Bedrock (100 次/天)     | $41          |
| NAT Gateway                 | $33          |
| 其他 (EFS, CloudWatch, ECR) | $7-12        |
| **總計**                    | **$175-185** |

## 🔧 故障排除

### 容器無法啟動

```bash
# 查看任務狀態
aws ecs describe-tasks \
  --cluster advocacy-content-generator-cluster \
  --tasks TASK_ID

# 查看日誌
aws logs tail /ecs/advocacy-content-generator --follow
```

### 健康檢查失敗

```bash
# 增加健康檢查寬限期
aws ecs update-service \
  --cluster advocacy-content-generator-cluster \
  --service advocacy-content-generator-service \
  --health-check-grace-period-seconds 120
```

### Bedrock API 錯誤

```bash
# 檢查模型存取權限
aws bedrock list-foundation-models \
  --region us-east-1 \
  --query 'modelSummaries[?contains(modelId, `claude-sonnet-4-5`)]'
```

## 📚 詳細文件

- [完整部署指南](docs/deployment-guide.md) - 詳細的部署步驟和配置說明
- [ECS 部署配置說明](docs/aws-ecs-deployment-README.md) - 配置檔案詳細說明
- [IAM 政策範本](docs/iam-policies.json) - IAM 角色和政策定義
- [API 使用指南](docs/api-guide.md) - REST API 使用說明
- [MCP 整合指南](docs/mcp-guide.md) - MCP 協議整合說明

## 🔐 安全性最佳實踐

1. ✅ ECS 任務部署在私有子網路
2. ✅ 使用 IAM 角色而非存取金鑰
3. ✅ Secrets Manager 管理敏感資訊
4. ✅ EFS 啟用傳輸中和靜態加密
5. ✅ 安全群組限制最小權限
6. ✅ CloudWatch 日誌和監控

## 🆘 支援

如有問題或建議，請透過 GitHub Issues 聯繫。

## 📝 授權

本專案採用 MIT 授權。
