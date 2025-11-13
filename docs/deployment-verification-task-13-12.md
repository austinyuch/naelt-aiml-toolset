# Task 13.12 Deployment Verification

## Deployment Summary

✅ **Task 13.12 完成**: CloudFormation 部署到 AgentCore Runtime 成功

**部署時間**: 2025-11-14 06:09 UTC  
**Stack 名稱**: advocacy-content-generator-agentcore  
**AWS Region**: us-east-1

## Deployment Steps Completed

### 1. TypeScript 編譯 ✅
```bash
npm run build
```
- 編譯成功，無錯誤

### 2. Multi-Platform Docker Build ✅

**重要發現**: AgentCore Runtime 只支援 ARM64 架構

**解決方案**:
- 使用 Docker buildx 建立 ARM64 image
- 設置 QEMU 模擬器支援跨平台建立
- 直接推送到 ECR（避免 `--load` 在 x86_64 上的 exec format error）

**執行命令**:
```bash
# 啟用 QEMU 支援
docker run --privileged --rm tonistiigi/binfmt --install all

# 建立並推送 ARM64 image
docker buildx build \
    --platform linux/arm64 \
    -t 533267166136.dkr.ecr.us-east-1.amazonaws.com/advocacy-content-generator:latest \
    --push \
    .
```

**結果**:
- ✅ ARM64 image 成功建立
- ✅ 推送到 ECR: `533267166136.dkr.ecr.us-east-1.amazonaws.com/advocacy-content-generator:latest`
- ✅ 包含時間戳標籤: `20251114-060901`

### 3. IAM Role Trust Policy 修正 ✅

**問題**: 原始 trust policy 使用 `bedrock.amazonaws.com`，但 AgentCore 需要 `bedrock-agentcore.amazonaws.com`

**修正**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AssumeRolePolicy",
      "Effect": "Allow",
      "Principal": {
        "Service": "bedrock-agentcore.amazonaws.com"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "aws:SourceAccount": "533267166136"
        },
        "ArnLike": {
          "aws:SourceArn": "arn:aws:bedrock-agentcore:us-east-1:533267166136:*"
        }
      }
    }
  ]
}
```

**執行**:
```bash
aws iam update-assume-role-policy \
  --role-name AgentCoreExecutionRole-advocacy-content-generator \
  --policy-document file://temp/trust-policy.json
```

### 4. CloudFormation Stack 建立 ✅

**Template**: `cloudformation/agentcore-mcp-server.yaml`

**主要配置**:
- Resource Type: `AWS::BedrockAgentCore::Runtime`
- Runtime Name: `advocacy_content_generator_mcp`
- Protocol: MCP
- Network Mode: PUBLIC
- Container URI: ARM64 image from ECR
- Authentication: Custom JWT Authorizer (Cognito)

**執行**:
```bash
aws cloudformation create-stack \
    --stack-name advocacy-content-generator-agentcore \
    --template-body file://cloudformation/agentcore-mcp-server.yaml \
    --region us-east-1 \
    --capabilities CAPABILITY_IAM
```

**結果**:
- ✅ Stack 狀態: `CREATE_COMPLETE`
- ✅ 建立時間: ~2 分鐘

## Deployment Outputs

### Runtime Information

```bash
Runtime ID: advocacy_content_generator_mcp-VrKkF1EzL3
Runtime ARN: arn:aws:bedrock-agentcore:us-east-1:533267166136:runtime/advocacy_content_generator_mcp-VrKkF1EzL3
AWS Region: us-east-1
Stack Name: advocacy-content-generator-agentcore
```

### Environment File

已建立 `agentcore-runtime.env`:
```bash
RUNTIME_ID=advocacy_content_generator_mcp-VrKkF1EzL3
AGENT_ARN=arn:aws:bedrock-agentcore:us-east-1:533267166136:runtime/advocacy_content_generator_mcp-VrKkF1EzL3
AWS_REGION=us-east-1
STACK_NAME=advocacy-content-generator-agentcore
```

### CloudWatch Logs

Log Group 已建立:
```
/aws/bedrock-agentcore/runtimes/advocacy_content_generator_mcp-VrKkF1EzL3-DEFAULT
```

Log Stream:
- `otel-rt-logs` (OpenTelemetry runtime logs)

## Verification Checklist

- [x] TypeScript 編譯成功
- [x] ARM64 Docker image 建立成功
- [x] Docker image 推送到 ECR
- [x] IAM Role trust policy 正確配置
- [x] CloudFormation Stack 建立成功
- [x] Stack 狀態為 `CREATE_COMPLETE`
- [x] `agentcore-runtime.env` 檔案已建立
- [x] `AGENT_ARN` 環境變數已設定
- [x] CloudWatch Log Group 已建立
- [x] Runtime ID 已取得

## Multi-Platform Build Documentation

已建立詳細的 multi-platform build 文件:
- `docs/docker-multi-platform.md`

包含:
- ARM64 vs x86_64 架構說明
- 本地測試與 AgentCore 部署的不同建立方式
- Docker buildx 設置指南
- 常見問題排解

## Next Steps

根據 tasks.md，以下任務需要先完成 Task 13.12:

### Day 5: 遠端測試（Task 14-17）

- [ ] Task 14: 取得 Cognito Bearer Token
- [ ] Task 15: 測試 MCP 工具調用
- [ ] Task 16: 驗證內容生成功能
- [ ] Task 17: 驗證錯誤處理

**準備工作**:
1. Source environment: `source agentcore-runtime.env`
2. Get Bearer Token: `./scripts/get-cognito-token.sh`
3. Run remote tests: `npm run test:remote-mcp`

## Issues Encountered and Resolved

### Issue 1: ARM64 Architecture Requirement

**Problem**: AgentCore Runtime 只支援 ARM64，但本地開發機器是 x86_64

**Solution**: 
- 使用 Docker buildx 建立 multi-platform images
- 設置 QEMU 模擬器
- 直接推送到 ECR 而不是 load 到本地

### Issue 2: IAM Role Trust Policy

**Problem**: Trust policy 使用錯誤的 service principal

**Solution**: 
- 更新為 `bedrock-agentcore.amazonaws.com`
- 添加適當的 Condition 限制

### Issue 3: Stack ROLLBACK_COMPLETE State

**Problem**: 舊的 stack 處於 ROLLBACK_COMPLETE 狀態無法更新

**Solution**: 
- 刪除舊 stack
- 重新建立新 stack

## Files Created/Modified

### Created:
- `agentcore-runtime.env` - Runtime 環境變數
- `docs/docker-multi-platform.md` - Multi-platform build 文件
- `docs/deployment-verification-task-13-12.md` - 本文件

### Modified:
- `Dockerfile` - 移除 `--platform` 指令（由 buildx 處理）
- `scripts/deploy-cloudformation.sh` - 更新為使用 buildx 直接推送
- `scripts/build-and-push-docker.sh` - 更新為支援 multi-platform
- `cloudformation/agentcore-mcp-server.yaml` - 修正屬性名稱符合 AWS 規範

## Lessons Learned

1. **AgentCore 架構需求**: 必須使用 ARM64 base images
2. **Multi-platform Build**: 在 x86_64 機器上建立 ARM64 需要 QEMU
3. **Trust Policy**: AgentCore 需要特定的 service principal
4. **CloudFormation 屬性**: 使用官方文件中的正確屬性名稱
5. **直接推送**: 使用 `--push` 而不是 `--load` 避免架構不匹配

## References

- [AWS AgentCore Documentation](https://aws.github.io/bedrock-agentcore-starter-toolkit/)
- [Docker Buildx Multi-platform](https://docs.docker.com/build/building/multi-platform/)
- [CloudFormation MCP Server Example](https://aws.github.io/bedrock-agentcore-starter-toolkit/examples/infrastructure-as-code/cloudformation/mcp-server-runtime/)
