# Deployment Configuration Reference

Quick reference for AWS AgentCore deployment configuration.

## AWS Account Information

```bash
AWS_ACCOUNT_ID=533267166136
AWS_USER=arn:aws:iam::533267166136:user/austin01
```

## Regional Configuration

### Primary Region: us-east-1 (N. Virginia)
**Purpose**: AgentCore Runtime, Bedrock, Cognito

```bash
AGENTCORE_REGION=us-east-1
BEDROCK_REGION=us-east-1
COGNITO_REGION=us-east-1
```

### Secondary Region: ap-northeast-1 (Tokyo)
**Purpose**: ECR Container Registry

```bash
ECR_REGION=ap-northeast-1
```

## Resource ARNs and URIs

### ECR Repository
```bash
ECR_REPOSITORY_NAME=advocacy-content-generator
ECR_REPOSITORY_URI=533267166136.dkr.ecr.ap-northeast-1.amazonaws.com/advocacy-content-generator
```

### IAM Execution Role
```bash
IAM_ROLE_NAME=AgentCoreExecutionRole
IAM_ROLE_ARN=arn:aws:iam::533267166136:role/AgentCoreExecutionRole
IAM_POLICY_NAME=AgentCoreExecutionPolicy
IAM_POLICY_ARN=arn:aws:iam::533267166136:policy/AgentCoreExecutionPolicy
```

## Bedrock Model Configuration

### Recommended Models

#### Primary Model: Claude Haiku 4.5
```bash
BEDROCK_MODEL_ID=anthropic.claude-haiku-4-5-20251001-v1:0
BEDROCK_MODEL_NAME="Claude Haiku 4.5"
```

**Use Cases**:
- Fast content generation
- Production workloads
- Cost-effective high quality
- Real-time responses
- Best speed-to-quality ratio

**Pricing** (us-east-1):
- Input: $1.00 per 1M tokens
- Output: $5.00 per 1M tokens

#### Secondary Model: Claude Sonnet 4.5
```bash
BEDROCK_SECONDARY_MODEL_ID=anthropic.claude-sonnet-4-5-20250929-v1:0
BEDROCK_SECONDARY_MODEL_NAME="Claude Sonnet 4.5"
```

**Use Cases**:
- Complex reasoning tasks
- Highest quality requirements
- Fallback for critical content

#### Fallback Model: Claude 3 Haiku
```bash
BEDROCK_FALLBACK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
BEDROCK_FALLBACK_MODEL_NAME="Claude 3 Haiku"
```

**Use Cases**:
- Fast responses
- Simple queries
- Cost optimization
- Development/testing

**Pricing** (us-east-1):
- Input: $0.25 per 1M tokens
- Output: $1.25 per 1M tokens

#### Alternative: Claude 3.5 Haiku
```bash
BEDROCK_ALTERNATIVE_MODEL_ID=anthropic.claude-3-5-haiku-20241022-v1:0
BEDROCK_ALTERNATIVE_MODEL_NAME="Claude 3.5 Haiku"
```

**Use Cases**:
- Balance of speed and quality
- Medium complexity tasks
- Cost-effective production

## Environment Variables Template

### For Local Development
```bash
# AWS Configuration
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=533267166136

# Bedrock Configuration
export BEDROCK_REGION=us-east-1
export BEDROCK_MODEL_ID=anthropic.claude-haiku-4-5-20251001-v1:0
export BEDROCK_SECONDARY_MODEL_ID=anthropic.claude-sonnet-4-5-20250929-v1:0
export BEDROCK_FALLBACK_MODEL_ID=anthropic.claude-3-5-haiku-20241022-v1:0

# ECR Configuration
export ECR_REGION=ap-northeast-1
export ECR_REPOSITORY_URI=533267166136.dkr.ecr.ap-northeast-1.amazonaws.com/advocacy-content-generator

# IAM Configuration
export IAM_EXECUTION_ROLE_ARN=arn:aws:iam::533267166136:role/AgentCoreExecutionRole

# Service Configuration
export SERVICE_MODE=unified
export PORT=3000
```

### For AgentCore Deployment
```bash
# AgentCore Configuration
export AGENTCORE_REGION=us-east-1
export AGENTCORE_EXECUTION_ROLE=arn:aws:iam::533267166136:role/AgentCoreExecutionRole
export AGENTCORE_PROTOCOL=MCP

# Container Configuration
export CONTAINER_IMAGE=533267166136.dkr.ecr.ap-northeast-1.amazonaws.com/advocacy-content-generator:latest
export CONTAINER_PORT=3000

# Logging Configuration
export LOG_GROUP=/aws/bedrock-agentcore/advocacy-content-generator
export LOG_LEVEL=info
```

## Docker Commands

### Build and Tag
```bash
# Build image
docker build -t advocacy-content-generator:latest .

# Tag for ECR
docker tag advocacy-content-generator:latest \
  533267166136.dkr.ecr.ap-northeast-1.amazonaws.com/advocacy-content-generator:latest

# Tag with version
docker tag advocacy-content-generator:latest \
  533267166136.dkr.ecr.ap-northeast-1.amazonaws.com/advocacy-content-generator:v1.0.0
```

### Push to ECR
```bash
# Authenticate to ECR
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin \
  533267166136.dkr.ecr.ap-northeast-1.amazonaws.com

# Push latest
docker push 533267166136.dkr.ecr.ap-northeast-1.amazonaws.com/advocacy-content-generator:latest

# Push version
docker push 533267166136.dkr.ecr.ap-northeast-1.amazonaws.com/advocacy-content-generator:v1.0.0
```

## AgentCore CLI Commands

### Configure AgentCore
```bash
agentcore configure \
  --region us-east-1 \
  --execution-role arn:aws:iam::533267166136:role/AgentCoreExecutionRole \
  --protocol MCP
```

### Deploy to AgentCore
```bash
agentcore deploy \
  --image 533267166136.dkr.ecr.ap-northeast-1.amazonaws.com/advocacy-content-generator:latest \
  --region us-east-1 \
  --name advocacy-content-generator \
  --port 3000
```

### Check Deployment Status
```bash
agentcore status \
  --name advocacy-content-generator \
  --region us-east-1
```

### View Logs
```bash
agentcore logs \
  --name advocacy-content-generator \
  --region us-east-1 \
  --follow
```

## Verification Commands

### Verify AWS Setup
```bash
# Quick verification
./scripts/verify-aws-setup.sh

# Detailed verification
./scripts/verify-aws-permissions.sh

# Bedrock verification (us-east-1)
./scripts/verify-bedrock-us-east-1.sh
```

### Verify ECR Access
```bash
# List repositories
aws ecr describe-repositories \
  --repository-names advocacy-content-generator \
  --region ap-northeast-1

# List images
aws ecr list-images \
  --repository-name advocacy-content-generator \
  --region ap-northeast-1
```

### Verify IAM Role
```bash
# Get role details
aws iam get-role \
  --role-name AgentCoreExecutionRole

# List attached policies
aws iam list-attached-role-policies \
  --role-name AgentCoreExecutionRole

# Get policy details
aws iam get-policy \
  --policy-arn arn:aws:iam::533267166136:policy/AgentCoreExecutionPolicy
```

### Verify Bedrock Access
```bash
# List models
aws bedrock list-foundation-models --region us-east-1

# Test invocation
aws bedrock-runtime invoke-model \
  --model-id anthropic.claude-3-haiku-20240307-v1:0 \
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":10,"messages":[{"role":"user","content":"test"}]}' \
  --region us-east-1 \
  /tmp/test-output.json

# View response
cat /tmp/test-output.json | jq
```

## Troubleshooting Quick Reference

### Issue: Cannot authenticate to ECR
```bash
# Re-authenticate
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin \
  533267166136.dkr.ecr.ap-northeast-1.amazonaws.com
```

### Issue: Bedrock model access denied
```bash
# Check model access status
aws bedrock list-foundation-models --region us-east-1

# Request access in console
# https://console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess
```

### Issue: IAM role permissions error
```bash
# Verify role exists
aws iam get-role --role-name AgentCoreExecutionRole

# Re-create role if needed
./scripts/create-iam-execution-role.sh
```

### Issue: Cross-region ECR access fails
```bash
# Verify ECR repository exists
aws ecr describe-repositories \
  --repository-names advocacy-content-generator \
  --region ap-northeast-1

# Test pull from us-east-1
docker pull 533267166136.dkr.ecr.ap-northeast-1.amazonaws.com/advocacy-content-generator:latest
```

## Cost Estimation

### Monthly Cost Breakdown (Estimated)

#### ECR Storage (ap-northeast-1)
- Image size: ~500 MB
- Cost: ~$0.05/month

#### Bedrock Usage (us-east-1)
- Estimated: 1M input tokens, 500K output tokens/month
- Claude 3.5 Sonnet: ~$10.50/month
- Claude 3 Haiku: ~$0.88/month

#### AgentCore Runtime (us-east-1)
- Pricing: TBD (service in preview)
- Estimated: $20-50/month

#### Data Transfer
- ECR → AgentCore: ~$0.50/month
- Bedrock API: Included

#### CloudWatch Logs
- Log volume: ~1 GB/month
- Cost: ~$0.50/month

**Total Estimated**: $32-62/month

## Security Checklist

- [x] IAM role uses least privilege principle
- [x] No hardcoded credentials
- [x] ECR repository created
- [x] IAM execution role created
- [ ] MFA enabled on IAM user (recommended)
- [ ] CloudTrail enabled for audit logging (recommended)
- [ ] ECR image scanning enabled (recommended)
- [ ] Secrets stored in AWS Secrets Manager (to be implemented)

## Next Steps

1. **Request Bedrock Model Access** (if not done)
   - https://console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess

2. **Build and Push Docker Image**
   - See Docker Commands section above

3. **Install AgentCore CLI**
   - `pip install bedrock-agentcore-starter-toolkit`

4. **Deploy to AgentCore**
   - See AgentCore CLI Commands section above

5. **Configure Cognito Authentication** (Day 4)

6. **Test MCP Integration** (Day 2-3)

---

**Last Updated**: 2025-11-13
**Status**: Ready for Deployment
