# AWS 憑證配置指南

## 概述

本項目需要 AWS 憑證來訪問以下服務：
- **AWS Bedrock** - 用於 LLM 和 Embeddings
- **AWS S3** - 用於存儲（可選）
- **AWS ECS** - 用於部署（可選）

## 推薦方式：使用 AWS Profile

### 1. 安裝 AWS CLI

```bash
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# 驗證安裝
aws --version
```

### 2. 配置 AWS Profile

```bash
# 配置默認 profile
aws configure

# 輸入以下信息：
# AWS Access Key ID: your_access_key
# AWS Secret Access Key: your_secret_key
# Default region name: us-east-1
# Default output format: json
```

### 3. 驗證配置

```bash
# 驗證憑證
aws sts get-caller-identity

# 預期輸出：
# {
#     "UserId": "AIDAXXXXXXXXXXXXXXXXX",
#     "Account": "123456789012",
#     "Arn": "arn:aws:iam::123456789012:user/your-username"
# }
```

### 4. 驗證 Bedrock 訪問

```bash
# 列出可用的 Bedrock 模型
aws bedrock list-foundation-models --region us-east-1

# 測試 Bedrock Embeddings
aws bedrock-runtime invoke-model \
  --model-id amazon.titan-embed-text-v1 \
  --body '{"inputText":"test"}' \
  --region us-east-1 \
  output.json

# 查看結果
cat output.json
```

## 配置多個 Profile

如果您有多個 AWS 帳戶：

```bash
# 配置開發環境 profile
aws configure --profile dev

# 配置生產環境 profile
aws configure --profile prod

# 使用特定 profile
export AWS_PROFILE=dev

# 或在 .env 文件中設置
AWS_PROFILE=dev
```

## 環境變數配置

### 方式 1: 使用 AWS Profile（推薦）

在 `.env` 文件中：

```bash
# 使用默認 profile
AWS_REGION=us-east-1
AWS_DEFAULT_REGION=us-east-1

# 或指定特定 profile
AWS_PROFILE=dev
AWS_REGION=us-east-1
```

### 方式 2: 直接使用環境變數（不推薦）

```bash
# 在 .env 文件中
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

⚠️ **警告**: 不要將包含真實憑證的 `.env` 文件提交到 Git！

## 測試環境配置

### 運行測試前的準備

```bash
# 1. 確認 AWS 憑證已配置
aws sts get-caller-identity

# 2. 確認 Bedrock 訪問權限
aws bedrock list-foundation-models --region us-east-1

# 3. 啟動 Chroma 服務器
docker-compose up -d chroma

# 4. 驗證 Chroma 連接
npx tsx scripts/test-chroma-connection.ts

# 5. 運行測試
npm run test:vitest
```

### 測試特定功能

```bash
# 只運行單元測試（不需要 AWS）
npm run test:vitest -- -t "Unit Tests"

# 運行 RAG 整合測試（需要 AWS + Chroma）
npm run test:vitest -- tests/unit/services/JudicialKnowledgeBase.vitest.ts

# 運行完整 RAG 測試套件
./scripts/run-rag-tests.sh dev
```

## 權限要求

### 最小權限策略

您的 AWS 用戶需要以下權限：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:ListFoundationModels"
      ],
      "Resource": [
        "arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-embed-text-v1",
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-5-*"
      ]
    }
  ]
}
```

### 檢查權限

```bash
# 測試 Bedrock 權限
aws bedrock list-foundation-models --region us-east-1

# 如果收到 AccessDenied 錯誤，請聯繫 AWS 管理員添加權限
```

## 常見問題

### 問題 1: "The security token included in the request is invalid"

**原因**: AWS 憑證無效或過期

**解決方案**:
```bash
# 重新配置 AWS CLI
aws configure

# 驗證憑證
aws sts get-caller-identity
```

### 問題 2: "Could not connect to the endpoint URL"

**原因**: 區域配置錯誤或網絡問題

**解決方案**:
```bash
# 確認區域設置
echo $AWS_REGION

# 測試連接
aws bedrock list-foundation-models --region us-east-1
```

### 問題 3: "AccessDeniedException"

**原因**: IAM 權限不足

**解決方案**:
1. 檢查 IAM 用戶權限
2. 確保有 Bedrock 訪問權限
3. 聯繫 AWS 管理員添加必要權限

### 問題 4: 測試失敗 "UnrecognizedClientException"

**原因**: AWS 憑證未正確載入

**解決方案**:
```bash
# 確認環境變數
env | grep AWS

# 確認 AWS CLI 配置
cat ~/.aws/credentials
cat ~/.aws/config

# 重新運行測試
npm run test:vitest
```

## Docker 環境中的 AWS 憑證

### 方式 1: 掛載 AWS 憑證目錄（推薦）

在 `docker-compose.yml` 中已配置：

```yaml
volumes:
  - ~/.aws:/home/appuser/.aws:ro
```

### 方式 2: 使用環境變數

```yaml
environment:
  - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
  - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
  - AWS_REGION=${AWS_REGION}
```

### 驗證 Docker 中的 AWS 訪問

```bash
# 進入容器
docker-compose exec api bash

# 驗證 AWS 憑證
aws sts get-caller-identity

# 測試 Bedrock
aws bedrock list-foundation-models --region us-east-1
```

## CI/CD 環境配置

### GitHub Actions

在 GitHub repository settings 中添加 secrets：

```yaml
# .github/workflows/test.yml
env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  AWS_REGION: us-east-1
```

### 本地 CI 測試

```bash
# 模擬 CI 環境
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_REGION=us-east-1

# 運行測試
npm test
```

## 安全最佳實踐

### ✅ 推薦做法

1. **使用 AWS Profile** - 憑證存儲在 `~/.aws/credentials`
2. **使用 IAM Roles** - 在 EC2/ECS 上運行時
3. **最小權限原則** - 只授予必要的權限
4. **定期輪換憑證** - 每 90 天更新一次
5. **使用 AWS Secrets Manager** - 存儲敏感信息

### ❌ 避免做法

1. **不要**將憑證硬編碼在代碼中
2. **不要**將 `.env` 文件提交到 Git
3. **不要**在公共場所分享憑證
4. **不要**使用 root 帳戶憑證
5. **不要**在日誌中記錄憑證

## 快速檢查清單

在運行測試前，確認以下項目：

- [ ] AWS CLI 已安裝並配置
- [ ] 可以運行 `aws sts get-caller-identity`
- [ ] 可以列出 Bedrock 模型
- [ ] Chroma 服務器正在運行
- [ ] `.env` 文件已配置
- [ ] 環境變數已設置（如果需要）

## 相關文件

- `.env.example` - 環境變數範例
- `docker-compose.yml` - Docker 配置
- `docs/rag-setup-guide.md` - RAG 設置指南
- `docs/test-status-report.md` - 測試狀態報告

## 獲取幫助

如果遇到問題：

1. 檢查 AWS CLI 配置：`aws configure list`
2. 驗證憑證：`aws sts get-caller-identity`
3. 查看錯誤日誌
4. 參考 AWS 文檔：https://docs.aws.amazon.com/cli/
