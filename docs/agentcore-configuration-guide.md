# AgentCore Configuration Guide

This guide explains how to configure and deploy the application to AWS Bedrock AgentCore Runtime.

## Overview

AgentCore Runtime provides serverless deployment for MCP servers with:

- **Auto-scaling**: Automatic scaling based on demand
- **Session isolation**: Each invocation runs in isolated environment
- **OAuth authentication**: Secure authentication via Cognito
- **60-minute timeout**: Support for long-running operations

## Prerequisites

Before configuring AgentCore, ensure you have:

1. ✅ Completed Cognito setup (`./scripts/setup-cognito.sh`)
2. ✅ AWS CLI configured with appropriate permissions
3. ✅ Docker installed and running
4. ✅ Node.js 20+ and npm installed
5. ✅ Python 3.10+ installed

## Quick Start

### 1. Configure AgentCore

```bash
./scripts/configure-agentcore.sh
```

This script will:
- Install AgentCore toolkit (via uvx)
- Create/verify ECR repository
- Create/verify IAM execution role
- Generate `.bedrock_agentcore.yaml` configuration
- Verify build artifacts

### 2. Build and Push Docker Image

```bash
./scripts/build-and-push-docker.sh
```

This script will:
- Compile TypeScript to JavaScript
- Build Docker image
- Login to ECR
- Push image to ECR

### 3. Deploy to AgentCore Runtime

```bash
./scripts/deploy-agentcore.sh
```

This script will:
- Verify prerequisites
- Deploy to AgentCore Runtime
- Display Runtime ARN

## Configuration File

The `.bedrock_agentcore.yaml` file contains all deployment settings:

```yaml
name: advocacy-content-generator
protocol: MCP
version: 1.0.0

runtime:
  memory: 1024              # Memory in MB
  timeout: 3600             # Timeout in seconds (60 minutes)
  environment:
    SERVICE_MODE: mcp-only
    MCP_TRANSPORT: streamable-http
    AWS_REGION: us-east-1
    LOG_LEVEL: info
    PORT: "8000"

execution_role: arn:aws:iam::ACCOUNT_ID:role/AgentCoreExecutionRole-advocacy-content-generator

container:
  image: ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/advocacy-content-generator:latest
  port: 8000
  dockerfile: Dockerfile

authentication:
  type: oauth
  discovery_url: https://cognito-idp.us-east-1.amazonaws.com/POOL_ID/.well-known/openid-configuration
  client_id: CLIENT_ID
```

## Manual Configuration (Alternative)

If you prefer manual configuration:

### 1. Install AgentCore Toolkit

```bash
# Install uv (Python package manager)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install AgentCore toolkit
pip install bedrock-agentcore-starter-toolkit
```

### 2. Run Interactive Configuration

```bash
agentcore configure -e dist/index.js --protocol MCP
```

Follow the prompts to:
- Select or create IAM execution role
- Configure ECR repository
- Set OAuth discovery URL and client ID

### 3. Verify Configuration

```bash
cat .bedrock_agentcore.yaml
```

## IAM Execution Role

The execution role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:*:*:model/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    }
  ]
}
```

## Environment Variables

The runtime uses these environment variables:

| Variable | Value | Description |
|----------|-------|-------------|
| SERVICE_MODE | mcp-only | Run MCP server only |
| MCP_TRANSPORT | streamable-http | Use HTTP transport |
| AWS_REGION | us-east-1 | AWS region |
| LOG_LEVEL | info | Logging level |
| PORT | 8000 | Server port |

## Deployment Process

### Step-by-Step Deployment

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Build Docker Image**
   ```bash
   docker build -t advocacy-content-generator:latest .
   ```

3. **Push to ECR**
   ```bash
   aws ecr get-login-password --region us-east-1 | \
     docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
   
   docker tag advocacy-content-generator:latest ECR_URI:latest
   docker push ECR_URI:latest
   ```

4. **Deploy to AgentCore**
   ```bash
   uvx bedrock-agentcore-starter-toolkit launch
   ```

### Deployment Output

After successful deployment, you'll receive:

```
Runtime ARN: arn:aws:bedrock-agentcore:us-east-1:ACCOUNT_ID:runtime/RUNTIME_ID
Endpoint: https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/RUNTIME_ARN/invocations
Status: ACTIVE
```

**Save the Runtime ARN** - you'll need it for testing!

## Testing Deployment

### 1. Load Credentials

```bash
source cognito-credentials.txt
export AGENT_ARN='arn:aws:bedrock-agentcore:us-east-1:ACCOUNT_ID:runtime/RUNTIME_ID'
```

### 2. Test with MCP Client

```bash
npm run test:remote
```

### 3. Test with curl

```bash
curl -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' \
  https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/${AGENT_ARN}/invocations?qualifier=DEFAULT
```

## Monitoring

### View Logs

```bash
# Tail logs in real-time
aws logs tail /aws/bedrock-agentcore/advocacy-content-generator --follow

# Filter error logs
aws logs filter-log-events \
  --log-group-name /aws/bedrock-agentcore/advocacy-content-generator \
  --filter-pattern "ERROR"
```

### Check Runtime Status

```bash
aws bedrock-agentcore describe-runtime \
  --runtime-arn $AGENT_ARN \
  --region us-east-1
```

## Updating Deployment

To update the deployment:

1. Make code changes
2. Build and push new image:
   ```bash
   ./scripts/build-and-push-docker.sh
   ```
3. Redeploy:
   ```bash
   uvx bedrock-agentcore-starter-toolkit launch
   ```

AgentCore will automatically use the latest image tag.

## Troubleshooting

### Error: AgentCore CLI not found

```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Add to PATH
export PATH="$HOME/.cargo/bin:$PATH"
```

### Error: Docker image not found in ECR

```bash
# Build and push image
./scripts/build-and-push-docker.sh
```

### Error: IAM role doesn't exist

```bash
# Run configuration script
./scripts/configure-agentcore.sh
```

### Error: Authentication failed

```bash
# Refresh Cognito token
./scripts/refresh-cognito-token.sh

# Reload credentials
source cognito-credentials.txt
```

### Deployment takes too long

- Normal deployment time: 5-10 minutes
- Check CloudWatch Logs for progress
- Verify Docker image size (should be < 1GB)

## Cost Estimation

AgentCore Runtime pricing (us-east-1):

| Component | Cost |
|-----------|------|
| Runtime execution | $0.00001667 per second |
| Memory (1GB) | $0.00000167 per GB-second |
| Data transfer | Standard AWS rates |

**Example**: 10,000 requests/month, 30s average:
- Execution: 10,000 × 30 × $0.00001667 = $5.00
- Memory: 10,000 × 30 × 1 × $0.00000167 = $0.50
- **Total**: ~$5.50/month

## Cleanup

To remove AgentCore deployment:

```bash
# Delete runtime
aws bedrock-agentcore delete-runtime \
  --runtime-arn $AGENT_ARN \
  --region us-east-1

# Delete ECR images
aws ecr batch-delete-image \
  --repository-name advocacy-content-generator \
  --image-ids imageTag=latest \
  --region us-east-1

# Delete IAM role
aws iam delete-role-policy \
  --role-name AgentCoreExecutionRole-advocacy-content-generator \
  --policy-name AgentCoreExecutionPolicy

aws iam delete-role \
  --role-name AgentCoreExecutionRole-advocacy-content-generator
```

## Next Steps

After successful deployment:

1. ✅ Test all MCP tools remotely
2. ✅ Run performance tests
3. ✅ Analyze costs
4. ✅ Document lessons learned
5. ✅ Consider Gateway integration

## Reference

- [AgentCore Documentation](https://docs.aws.amazon.com/bedrock-agentcore/)
- [AgentCore Starter Toolkit](https://pypi.org/project/bedrock-agentcore-starter-toolkit/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
