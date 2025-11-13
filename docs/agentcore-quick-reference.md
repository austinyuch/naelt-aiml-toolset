# AgentCore Quick Reference

## Configuration (One-time)

```bash
# 1. Setup Cognito (if not done)
./scripts/setup-cognito.sh

# 2. Configure AgentCore
./scripts/configure-agentcore.sh

# Review configuration
cat .bedrock_agentcore.yaml
```

## Build and Deploy

```bash
# 1. Build and push Docker image
./scripts/build-and-push-docker.sh

# 2. Deploy to AgentCore Runtime
./scripts/deploy-agentcore.sh

# Save the Runtime ARN from output!
```

## Testing

```bash
# Load credentials
source cognito-credentials.txt

# Set Runtime ARN
export AGENT_ARN='arn:aws:bedrock-agentcore:us-east-1:ACCOUNT_ID:runtime/RUNTIME_ID'

# Test deployment
npm run test:remote
```

## Monitoring

```bash
# View logs
aws logs tail /aws/bedrock-agentcore/advocacy-content-generator --follow

# Check runtime status
aws bedrock-agentcore describe-runtime --runtime-arn $AGENT_ARN
```

## Update Deployment

```bash
# 1. Make code changes
# 2. Build and push new image
./scripts/build-and-push-docker.sh

# 3. Redeploy
./scripts/deploy-agentcore.sh
```

## Key Files

| File | Purpose |
|------|---------|
| `.bedrock_agentcore.yaml` | AgentCore configuration |
| `scripts/configure-agentcore.sh` | Setup script |
| `scripts/build-and-push-docker.sh` | Build script |
| `scripts/deploy-agentcore.sh` | Deploy script |
| `cognito-credentials.txt` | Auth credentials |

## Important Values

```bash
# From .bedrock_agentcore.yaml:
ECR_URI=ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/advocacy-content-generator
EXECUTION_ROLE=arn:aws:iam::ACCOUNT_ID:role/AgentCoreExecutionRole-advocacy-content-generator

# From deployment output:
AGENT_ARN=arn:aws:bedrock-agentcore:us-east-1:ACCOUNT_ID:runtime/RUNTIME_ID
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| AgentCore CLI not found | Install uv: `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Docker image not in ECR | Run `./scripts/build-and-push-docker.sh` |
| Authentication failed | Run `./scripts/refresh-cognito-token.sh` |
| Deployment timeout | Check CloudWatch Logs |

## Cost Estimate

~$5-10/month for 10,000 requests (30s average)

## Cleanup

```bash
# Delete runtime
aws bedrock-agentcore delete-runtime --runtime-arn $AGENT_ARN

# Delete ECR images
aws ecr batch-delete-image \
  --repository-name advocacy-content-generator \
  --image-ids imageTag=latest
```
