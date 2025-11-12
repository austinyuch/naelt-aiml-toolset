# AWS 部署指南

本文件說明如何將司法正義論述生成器部署到 AWS ECS Fargate。

## 目錄

- [架構概覽](#架構概覽)
- [前置需求](#前置需求)
- [AWS 服務配置](#aws-服務配置)
- [部署步驟](#部署步驟)
- [CI/CD 設定](#cicd-設定)
- [監控與日誌](#監控與日誌)
- [故障排除](#故障排除)
- [成本估算](#成本估算)

## 架構概覽

### 部署架構圖

```
Internet
    ↓
Application Load Balancer (ALB)
    ↓
ECS Fargate Service
    ├── Task 1 (Container)
    ├── Task 2 (Container)
    └── Task 3 (Container)
    ↓
├── AWS Bedrock (Claude Sonnet 4.5)
├── EFS (快取儲存)
├── Secrets Manager (API Keys)
└── CloudWatch (日誌與監控)
```

### 使用的 AWS 服務

- **ECS Fargate**: 無伺服器容器運算
- **ECR**: Docker 映像倉庫
- **ALB**: 應用程式負載平衡器
- **EFS**: 彈性檔案系統（快取）
- **Bedrock**: Claude Sonnet 4.5 LLM
- **Secrets Manager**: 敏感資訊管理
- **CloudWatch**: 日誌與監控
- **IAM**: 身份與存取管理
- **VPC**: 虛擬私有雲

## 前置需求

### 本地環境

- AWS CLI 2.x
- Docker
- Node.js 20+
- Git

### AWS 帳號需求

- AWS 帳號（具有管理員權限）
- 已啟用 AWS Bedrock（需要申請存取權限）
- 信用卡（用於付費服務）

### 安裝 AWS CLI

```bash
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Windows
# 下載並執行 AWS CLI MSI 安裝程式
```

### 配置 AWS CLI

```bash
aws configure
# AWS Access Key ID: your-access-key
# AWS Secret Access Key: your-secret-key
# Default region name: us-east-1
# Default output format: json
```

## AWS 服務配置

### 1. 啟用 AWS Bedrock

1. 前往 AWS Console > Bedrock
2. 選擇 "Model access"
3. 申請 Claude Sonnet 4.5 存取權限
4. 等待審核通過（通常需要 1-2 個工作天）

### 2. 建立 VPC 和子網路

```bash
# 建立 VPC
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=advocacy-vpc}]'

# 記錄 VPC ID
VPC_ID=vpc-xxxxx

# 建立公開子網路（用於 ALB）
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=advocacy-public-1a}]'

aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=advocacy-public-1b}]'

# 建立私有子網路（用於 ECS）
aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.11.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=advocacy-private-1a}]'

aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.12.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=advocacy-private-1b}]'

# 建立 Internet Gateway
aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=advocacy-igw}]'

IGW_ID=igw-xxxxx

# 附加到 VPC
aws ec2 attach-internet-gateway \
  --vpc-id $VPC_ID \
  --internet-gateway-id $IGW_ID

# 建立 NAT Gateway（用於私有子網路存取網際網路）
aws ec2 allocate-address --domain vpc

EIP_ID=eipalloc-xxxxx

aws ec2 create-nat-gateway \
  --subnet-id subnet-xxxxx \
  --allocation-id $EIP_ID \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=advocacy-nat}]'
```

### 3. 建立 EFS 檔案系統

```bash
# 建立 EFS
aws efs create-file-system \
  --performance-mode generalPurpose \
  --throughput-mode bursting \
  --encrypted \
  --tags Key=Name,Value=advocacy-efs

EFS_ID=fs-xxxxx

# 建立掛載目標（每個私有子網路一個）
aws efs create-mount-target \
  --file-system-id $EFS_ID \
  --subnet-id subnet-private-1a \
  --security-groups sg-xxxxx

aws efs create-mount-target \
  --file-system-id $EFS_ID \
  --subnet-id subnet-private-1b \
  --security-groups sg-xxxxx
```

### 4. 建立 ECR 倉庫

```bash
# 建立 ECR 倉庫
aws ecr create-repository \
  --repository-name advocacy-content-generator \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256

# 記錄倉庫 URI
ECR_URI=123456789012.dkr.ecr.us-east-1.amazonaws.com/advocacy-content-generator
```

### 5. 配置 Secrets Manager

```bash
# 建立 News API Key secret
aws secretsmanager create-secret \
  --name advocacy/news-api-key \
  --description "Google News API Key" \
  --secret-string '{"NEWS_API_KEY":"your-news-api-key"}'

# 建立 API Keys secret
aws secretsmanager create-secret \
  --name advocacy/api-keys \
  --description "API authentication keys" \
  --secret-string '{"API_KEYS":"key1,key2,key3"}'
```

### 6. 建立 IAM 角色

#### ECS Task Execution Role

```bash
# 建立信任策略
cat > trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# 建立角色
aws iam create-role \
  --role-name advocacyECSTaskExecutionRole \
  --assume-role-policy-document file://trust-policy.json

# 附加 AWS 管理的政策
aws iam attach-role-policy \
  --role-name advocacyECSTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# 附加 Secrets Manager 存取權限
cat > secrets-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:*:secret:advocacy/*"
      ]
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name advocacyECSTaskExecutionRole \
  --policy-name SecretsManagerAccess \
  --policy-document file://secrets-policy.json
```

#### ECS Task Role

```bash
# 建立 Task Role
aws iam create-role \
  --role-name advocacyECSTaskRole \
  --assume-role-policy-document file://trust-policy.json

# 建立 Bedrock 存取政策
cat > bedrock-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0"
      ]
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name advocacyECSTaskRole \
  --policy-name BedrockAccess \
  --policy-document file://bedrock-policy.json

# 建立 EFS 存取政策
cat > efs-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "elasticfilesystem:ClientMount",
        "elasticfilesystem:ClientWrite"
      ],
      "Resource": "arn:aws:elasticfilesystem:us-east-1:*:file-system/$EFS_ID"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name advocacyECSTaskRole \
  --policy-name EFSAccess \
  --policy-document file://efs-policy.json

# 建立 CloudWatch Logs 存取政策
cat > logs-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:*:log-group:/ecs/advocacy-content-generator:*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name advocacyECSTaskRole \
  --policy-name CloudWatchLogsAccess \
  --policy-document file://logs-policy.json
```

## 部署步驟

### 步驟 1：建構並推送 Docker 映像

```bash
# 登入 ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_URI

# 建構映像
docker build -t advocacy-content-generator .

# 標記映像
docker tag advocacy-content-generator:latest $ECR_URI:latest
docker tag advocacy-content-generator:latest $ECR_URI:v1.0.0

# 推送映像
docker push $ECR_URI:latest
docker push $ECR_URI:v1.0.0
```

### 步驟 2：建立 CloudWatch Log Group

```bash
aws logs create-log-group \
  --log-group-name /ecs/advocacy-content-generator
```

### 步驟 3：建立 ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name advocacy-content-generator-cluster \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy \
    capacityProvider=FARGATE,weight=1 \
    capacityProvider=FARGATE_SPOT,weight=4
```

### 步驟 4：註冊 Task Definition

專案已包含 `task-definition.json` 檔案，請根據您的 AWS 帳號更新以下值：

1. 更新 ARN 中的帳號 ID (`123456789012` → 您的帳號 ID)
2. 更新 ECR 映像 URI
3. 更新 EFS 檔案系統 ID (`fs-12345678` → 您的 EFS ID)
4. 更新 Secrets Manager ARN

**重要配置說明：**

- **Port**: 容器使用 Port 3000（Node.js 預設）
- **CPU/Memory**: 1 vCPU / 2 GB RAM（可根據需求調整）
- **Health Check**: 每 30 秒檢查 `/health` 端點
- **Environment Variables**:
  - `SERVICE_MODE=unified` - 同時啟用 REST API 和 MCP
  - `NODE_ENV=production` - 生產環境模式
  - `BEDROCK_MODEL_ID` - Claude Sonnet 4.5 模型 ID
- **Secrets**: 從 Secrets Manager 載入 API Keys
- **EFS Mount**: 掛載到 `/mnt/efs/cache` 用於快取

註冊 Task Definition：

```bash
# 更新 task-definition.json 後執行
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json
```

### 步驟 5：建立 Application Load Balancer

```bash
# 建立 ALB
aws elbv2 create-load-balancer \
  --name advocacy-alb \
  --subnets subnet-public-1a subnet-public-1b \
  --security-groups sg-xxxxx \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4

ALB_ARN=arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/advocacy-alb/xxxxx

# 建立 Target Group
aws elbv2 create-target-group \
  --name advocacy-tg \
  --protocol HTTP \
  --port 8000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-enabled \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3

TG_ARN=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/advocacy-tg/xxxxx

# 建立 Listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN
```

### 步驟 6：建立 ECS Service

```bash
aws ecs create-service \
  --cluster advocacy-content-generator-cluster \
  --service-name advocacy-content-generator-service \
  --task-definition advocacy-content-generator \
  --desired-count 2 \
  --launch-type FARGATE \
  --platform-version LATEST \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-private-1a,subnet-private-1b],securityGroups=[sg-xxxxx],assignPublicIp=DISABLED}" \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=api,containerPort=8000" \
  --health-check-grace-period-seconds 60 \
  --deployment-configuration "maximumPercent=200,minimumHealthyPercent=100" \
  --enable-execute-command
```

### 步驟 7：配置 Auto Scaling

```bash
# 註冊可擴展目標
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/advocacy-content-generator-cluster/advocacy-content-generator-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# 建立 CPU 使用率擴展政策
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/advocacy-content-generator-cluster/advocacy-content-generator-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name cpu-scaling-policy \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }'

# 建立記憶體使用率擴展政策
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/advocacy-content-generator-cluster/advocacy-content-generator-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name memory-scaling-policy \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 80.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageMemoryUtilization"
    },
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }'
```

### 步驟 8：驗證部署

```bash
# 取得 ALB DNS 名稱
aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' \
  --output text

ALB_DNS=advocacy-alb-xxxxx.us-east-1.elb.amazonaws.com

# 測試健康檢查
curl http://$ALB_DNS/health

# 測試 API（需要 API Key）
curl -X POST http://$ALB_DNS/api/v1/news/search \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"keywords": ["司法改革"]}'
```

## CI/CD 設定

### GitHub Actions Workflow

專案已包含 `.github/workflows/deploy.yml` 檔案，提供完整的 CI/CD 流程：

**工作流程包含：**

1. **Test Job** - 執行測試、型別檢查和 Linting
2. **Build and Deploy Job** - 建構 Docker 映像並部署到 ECS
3. **Rollback Job** - 部署失敗時自動回滾

**主要功能：**

- ✅ 自動化測試和程式碼品質檢查
- ✅ Docker 映像建構和推送到 ECR
- ✅ 使用 Docker Buildx 和快取優化建構速度
- ✅ 自動更新 ECS Task Definition
- ✅ 等待服務穩定後才完成部署
- ✅ 部署失敗時自動回滾
- ✅ 支援手動觸發（workflow_dispatch）

**觸發條件：**

- Push 到 `main` 分支
- 手動觸發（GitHub Actions UI）

### 配置 GitHub Secrets

在 GitHub 倉庫設定中加入以下 Secrets：

- `AWS_ACCESS_KEY_ID`: AWS 存取金鑰 ID
- `AWS_SECRET_ACCESS_KEY`: AWS 秘密存取金鑰

### 手動部署

如果不使用 CI/CD，可以手動部署：

```bash
# 1. 建構並推送映像
./scripts/build-and-push.sh

# 2. 更新 Task Definition
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json

# 3. 更新服務
aws ecs update-service \
  --cluster advocacy-content-generator-cluster \
  --service advocacy-content-generator-service \
  --task-definition advocacy-content-generator \
  --force-new-deployment

# 4. 等待部署完成
aws ecs wait services-stable \
  --cluster advocacy-content-generator-cluster \
  --services advocacy-content-generator-service
```

## 監控與日誌

### CloudWatch Logs

查看應用程式日誌：

```bash
# 查看最新日誌
aws logs tail /ecs/advocacy-content-generator --follow

# 查看特定時間範圍的日誌
aws logs filter-log-events \
  --log-group-name /ecs/advocacy-content-generator \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
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

# 記憶體使用率
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --dimensions Name=ServiceName,Value=advocacy-content-generator-service \
              Name=ClusterName,Value=advocacy-content-generator-cluster \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

### CloudWatch Alarms

建立告警：

```bash
# CPU 使用率告警
aws cloudwatch put-metric-alarm \
  --alarm-name advocacy-high-cpu \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=advocacy-content-generator-service \
              Name=ClusterName,Value=advocacy-content-generator-cluster

# 記憶體使用率告警
aws cloudwatch put-metric-alarm \
  --alarm-name advocacy-high-memory \
  --alarm-description "Alert when memory exceeds 85%" \
  --metric-name MemoryUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 85 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ServiceName,Value=advocacy-content-generator-service \
              Name=ClusterName,Value=advocacy-content-generator-cluster

# 健康檢查失敗告警
aws cloudwatch put-metric-alarm \
  --alarm-name advocacy-unhealthy-targets \
  --alarm-description "Alert when targets are unhealthy" \
  --metric-name UnHealthyHostCount \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --dimensions Name=TargetGroup,Value=targetgroup/advocacy-tg/xxxxx \
              Name=LoadBalancer,Value=app/advocacy-alb/xxxxx
```

### ECS Exec（除錯）

連接到執行中的容器：

```bash
# 啟用 ECS Exec（如果尚未啟用）
aws ecs update-service \
  --cluster advocacy-content-generator-cluster \
  --service advocacy-content-generator-service \
  --enable-execute-command

# 列出執行中的任務
aws ecs list-tasks \
  --cluster advocacy-content-generator-cluster \
  --service-name advocacy-content-generator-service

TASK_ID=xxxxx

# 連接到容器
aws ecs execute-command \
  --cluster advocacy-content-generator-cluster \
  --task $TASK_ID \
  --container api \
  --interactive \
  --command "/bin/sh"
```

## 故障排除

### 問題 1：容器無法啟動

**症狀：** ECS 任務持續失敗，無法達到穩定狀態

**診斷步驟：**

```bash
# 查看任務狀態
aws ecs describe-tasks \
  --cluster advocacy-content-generator-cluster \
  --tasks $TASK_ID

# 查看容器日誌
aws logs tail /ecs/advocacy-content-generator --follow
```

**常見原因：**

1. **環境變數配置錯誤**

   - 檢查 Task Definition 中的環境變數
   - 確認 Secrets Manager 中的值正確

2. **IAM 權限不足**

   - 檢查 Task Role 是否有 Bedrock 存取權限
   - 檢查 Execution Role 是否有 Secrets Manager 存取權限

3. **映像拉取失敗**
   - 確認 ECR 倉庫存在且映像已推送
   - 檢查 Execution Role 是否有 ECR 存取權限

### 問題 2：健康檢查失敗

**症狀：** ALB 顯示目標不健康

**診斷步驟：**

```bash
# 檢查目標健康狀態
aws elbv2 describe-target-health \
  --target-group-arn $TG_ARN

# 測試健康檢查端點
curl http://$CONTAINER_IP:8000/health
```

**解決方案：**

1. 增加健康檢查寬限期：

```bash
aws ecs update-service \
  --cluster advocacy-content-generator-cluster \
  --service advocacy-content-generator-service \
  --health-check-grace-period-seconds 120
```

2. 調整健康檢查參數：

```bash
aws elbv2 modify-target-group \
  --target-group-arn $TG_ARN \
  --health-check-interval-seconds 60 \
  --health-check-timeout-seconds 10 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 5
```

### 問題 3：Bedrock API 錯誤

**症狀：** 內容生成失敗，日誌顯示 Bedrock 錯誤

**診斷步驟：**

```bash
# 檢查 Bedrock 模型存取權限
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

**常見原因：**

1. **模型存取未啟用**

   - 前往 Bedrock Console 申請模型存取權限

2. **IAM 權限不足**

   - 確認 Task Role 有 `bedrock:InvokeModel` 權限

3. **區域不支援**
   - 確認使用的區域支援 Claude Sonnet 4.5

### 問題 4：EFS 掛載失敗

**症狀：** 容器無法寫入快取

**診斷步驟：**

```bash
# 檢查 EFS 掛載目標
aws efs describe-mount-targets \
  --file-system-id $EFS_ID

# 檢查安全群組規則
aws ec2 describe-security-groups \
  --group-ids sg-xxxxx
```

**解決方案：**

1. 確認安全群組允許 NFS 流量（Port 2049）
2. 確認 Task Role 有 EFS 存取權限
3. 檢查 EFS 掛載目標與 ECS 任務在相同 VPC

### 問題 5：記憶體不足（OOM）

**症狀：** 容器因記憶體不足而終止

**診斷步驟：**

```bash
# 查看記憶體使用率
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --dimensions Name=ServiceName,Value=advocacy-content-generator-service \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Maximum
```

**解決方案：**

1. 增加 Task Definition 中的記憶體配置：

```json
{
  "cpu": "2048",
  "memory": "4096"
}
```

2. 優化應用程式記憶體使用
3. 實作記憶體快取清理機制

## 成本估算

### 每月成本估算（美國東部 1 區）

#### ECS Fargate

- **vCPU**: 1 vCPU × $0.04048/小時 × 730 小時 = $29.55
- **記憶體**: 2 GB × $0.004445/GB/小時 × 730 小時 = $6.49
- **任務數量**: 2 個任務
- **小計**: ($29.55 + $6.49) × 2 = **$72.08/月**

#### Application Load Balancer

- **ALB 小時費用**: $0.0225/小時 × 730 小時 = $16.43
- **LCU 費用**: 約 $5-10/月（取決於流量）
- **小計**: **$21.43-26.43/月**

#### EFS

- **標準儲存**: 1 GB × $0.30/GB/月 = $0.30
- **小計**: **$0.30/月**

#### AWS Bedrock

- **Claude Sonnet 4.5**:
  - 輸入: $3.00 / 1M tokens
  - 輸出: $15.00 / 1M tokens
- **估算**（每天 100 次生成，每次 2000 輸入 + 500 輸出 tokens）:
  - 輸入: 100 × 2000 × 30 / 1,000,000 × $3.00 = $18.00
  - 輸出: 100 × 500 × 30 / 1,000,000 × $15.00 = $22.50
- **小計**: **$40.50/月**

#### CloudWatch

- **日誌儲存**: 約 $0.50/GB/月
- **指標**: 前 10,000 個指標免費
- **小計**: **$5-10/月**

#### 其他服務

- **ECR**: $0.10/GB/月（儲存）
- **Secrets Manager**: $0.40/secret/月
- **NAT Gateway**: $0.045/小時 × 730 = $32.85/月
- **小計**: **$35/月**

### 總計

**每月總成本**: 約 **$174-184 USD**

### 成本優化建議

1. **使用 Fargate Spot**

   - 可節省最多 70% 的運算成本
   - 適合非關鍵工作負載

2. **調整 Auto Scaling**

   - 根據實際流量調整最小/最大任務數
   - 在低流量時段縮減規模

3. **優化 Bedrock 使用**

   - 實作更積極的快取策略
   - 減少不必要的 LLM 呼叫
   - 使用較小的 max_tokens 值

4. **使用 CloudWatch Logs Insights**

   - 設定日誌保留期限（如 7 天）
   - 只記錄必要的日誌等級

5. **考慮 Reserved Capacity**
   - 如果流量穩定，可購買 Savings Plans

## 安全性最佳實踐

### 1. 網路安全

- 使用私有子網路部署 ECS 任務
- 透過 NAT Gateway 存取網際網路
- 限制安全群組規則（最小權限原則）
- 啟用 VPC Flow Logs

### 2. 身份與存取管理

- 使用 IAM 角色而非存取金鑰
- 遵循最小權限原則
- 定期輪換 Secrets Manager 中的密鑰
- 啟用 CloudTrail 審計日誌

### 3. 資料保護

- 啟用 EFS 加密（傳輸中和靜態）
- 使用 Secrets Manager 管理敏感資訊
- 啟用 ALB 存取日誌
- 實作 API Key 認證

### 4. 監控與告警

- 設定 CloudWatch Alarms
- 啟用 Container Insights
- 定期檢查安全群組規則
- 監控異常流量模式

## 維護與更新

### 定期維護任務

1. **每週**

   - 檢查 CloudWatch Alarms
   - 查看錯誤日誌
   - 監控成本使用

2. **每月**

   - 更新 Docker 基礎映像
   - 檢查 npm 套件更新
   - 審查 IAM 權限
   - 清理舊的 ECR 映像

3. **每季**
   - 審查安全群組規則
   - 更新 Task Definition
   - 檢查 AWS 服務更新
   - 進行災難恢復演練

### 更新應用程式

```bash
# 1. 更新程式碼
git pull origin main

# 2. 執行測試
npm test

# 3. 建構新映像
docker build -t advocacy-content-generator:v1.1.0 .

# 4. 推送到 ECR
docker tag advocacy-content-generator:v1.1.0 $ECR_URI:v1.1.0
docker push $ECR_URI:v1.1.0

# 5. 更新 Task Definition
# 編輯 task-definition.json，更新映像標籤
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json

# 6. 更新服務
aws ecs update-service \
  --cluster advocacy-content-generator-cluster \
  --service advocacy-content-generator-service \
  --task-definition advocacy-content-generator:新版本號 \
  --force-new-deployment

# 7. 監控部署
aws ecs wait services-stable \
  --cluster advocacy-content-generator-cluster \
  --services advocacy-content-generator-service
```

### 回滾策略

如果部署出現問題：

```bash
# 1. 找到上一個穩定版本
aws ecs list-task-definitions \
  --family-prefix advocacy-content-generator \
  --sort DESC

# 2. 回滾到上一個版本
aws ecs update-service \
  --cluster advocacy-content-generator-cluster \
  --service advocacy-content-generator-service \
  --task-definition advocacy-content-generator:上一個版本號 \
  --force-new-deployment
```

## 相關資源

- [AWS ECS 文件](https://docs.aws.amazon.com/ecs/)
- [AWS Fargate 文件](https://docs.aws.amazon.com/fargate/)
- [AWS Bedrock 文件](https://docs.aws.amazon.com/bedrock/)
- [API 使用指南](./api-guide.md)
- [MCP 整合指南](./mcp-guide.md)

## 支援

如有問題或建議，請透過 GitHub Issues 聯繫。
