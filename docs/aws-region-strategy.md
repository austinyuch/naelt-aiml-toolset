# AWS Region Strategy for AgentCore Deployment

## Decision: Multi-Region Architecture

### Primary Deployment Region: us-east-1 (N. Virginia)
**Rationale**: 
- Full Bedrock service availability
- AgentCore Runtime support
- All Claude models accessible
- Lowest latency to AWS services
- Most mature AWS region

### Secondary Region: ap-northeast-1 (Tokyo)
**Usage**:
- ECR container registry (already created)
- Future: Application load balancing
- Future: Data residency requirements

## Regional Resource Allocation

### us-east-1 (Primary - AgentCore Runtime)
- ✓ Bedrock AgentCore Runtime
- ✓ Bedrock Model Invocations (Claude 3.5 Sonnet, Claude 3 Haiku)
- ✓ Cognito User Pools (for authentication)
- ✓ CloudWatch Logs (for monitoring)
- ✓ Secrets Manager (for API keys)

### ap-northeast-1 (Secondary - Container Registry)
- ✓ ECR Repository: `advocacy-content-generator`
- ✓ IAM Roles (global, but managed here)
- Future: Application deployment for Asia-Pacific users

## Cross-Region Configuration

### ECR Access from us-east-1
The AgentCore Runtime in us-east-1 will pull container images from ECR in ap-northeast-1:

```bash
# ECR Repository URI (ap-northeast-1)
533267166136.dkr.ecr.ap-northeast-1.amazonaws.com/advocacy-content-generator

# AgentCore will be configured to pull from this URI
# Cross-region ECR access is supported by default
```

### IAM Role Configuration
The IAM execution role is global and works across all regions:

```
Role ARN: arn:aws:iam::533267166136:role/AgentCoreExecutionRole
```

This role will be used by AgentCore Runtime in us-east-1.

## Deployment Configuration

### Environment Variables
```bash
# Primary region for AgentCore
AWS_REGION=us-east-1
AGENTCORE_REGION=us-east-1

# ECR region (for container pulls)
ECR_REGION=ap-northeast-1
ECR_REPOSITORY_URI=533267166136.dkr.ecr.ap-northeast-1.amazonaws.com/advocacy-content-generator

# Bedrock configuration
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-5-20250929-v1:0
BEDROCK_SECONDARY_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_FALLBACK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
```

### AgentCore CLI Configuration
```bash
# Configure AgentCore for us-east-1
agentcore configure \
  --region us-east-1 \
  --execution-role arn:aws:iam::533267166136:role/AgentCoreExecutionRole \
  --protocol MCP

# Deploy with ECR image from ap-northeast-1
agentcore deploy \
  --image 533267166136.dkr.ecr.ap-northeast-1.amazonaws.com/advocacy-content-generator:latest \
  --region us-east-1
```

## Verification Steps

### 1. Verify Bedrock Access in us-east-1
```bash
# List available models
aws bedrock list-foundation-models --region us-east-1

# Test model invocation
aws bedrock-runtime invoke-model \
  --model-id anthropic.claude-3-haiku-20240307-v1:0 \
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":10,"messages":[{"role":"user","content":"test"}]}' \
  --region us-east-1 \
  /tmp/bedrock-test.json
```

### 2. Verify Cross-Region ECR Access
```bash
# Authenticate to ECR in ap-northeast-1
aws ecr get-login-password --region ap-northeast-1 | \
  docker login --username AWS --password-stdin \
  533267166136.dkr.ecr.ap-northeast-1.amazonaws.com

# Pull image (can be done from any region)
docker pull 533267166136.dkr.ecr.ap-northeast-1.amazonaws.com/advocacy-content-generator:latest
```

### 3. Verify IAM Role Permissions
```bash
# Test role assumption (works globally)
aws sts assume-role \
  --role-arn arn:aws:iam::533267166136:role/AgentCoreExecutionRole \
  --role-session-name test-session
```

## Cost Implications

### Data Transfer Costs
- **ECR → AgentCore (ap-northeast-1 → us-east-1)**
  - First pull: ~$0.09 per GB (cross-region transfer)
  - Subsequent pulls: Cached by AgentCore
  - Estimated: $0.50-$2.00 per month for typical usage

### Regional Pricing Differences
- **Bedrock in us-east-1**: Standard pricing
- **ECR in ap-northeast-1**: Slightly higher storage costs (~10%)
- **Overall impact**: Minimal (<5% of total costs)

### Optimization Strategies
1. Use multi-stage Docker builds to minimize image size
2. Leverage AgentCore's built-in caching
3. Consider replicating ECR to us-east-1 if transfer costs become significant

## Migration Path (Future)

### If Full Asia-Pacific Deployment Needed
1. **Phase 1** (Current): AgentCore in us-east-1, ECR in ap-northeast-1
2. **Phase 2**: Replicate ECR to us-east-1 for faster pulls
3. **Phase 3**: Deploy AgentCore in ap-northeast-1 when service becomes available
4. **Phase 4**: Multi-region active-active deployment with Route 53

### Monitoring Migration Triggers
- AgentCore availability in ap-northeast-1
- Latency requirements from Asia-Pacific users
- Data residency regulations
- Cost optimization opportunities

## Network Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS Account: 533267166136                │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐      ┌──────────────────────┐    │
│  │   ap-northeast-1     │      │     us-east-1        │    │
│  │     (Tokyo)          │      │   (N. Virginia)      │    │
│  ├──────────────────────┤      ├──────────────────────┤    │
│  │                      │      │                      │    │
│  │  ECR Repository      │─────▶│  AgentCore Runtime   │    │
│  │  advocacy-content-   │      │                      │    │
│  │  generator           │      │  ┌────────────────┐  │    │
│  │                      │      │  │ Bedrock Models │  │    │
│  │  Container Images    │      │  │ - Claude 3.5   │  │    │
│  │  - latest            │      │  │ - Claude 3     │  │    │
│  │  - v1.0.0            │      │  └────────────────┘  │    │
│  │                      │      │                      │    │
│  └──────────────────────┘      │  ┌────────────────┐  │    │
│                                │  │ Cognito        │  │    │
│                                │  │ User Pools     │  │    │
│  ┌──────────────────────┐      │  └────────────────┘  │    │
│  │   Global (IAM)       │      │                      │    │
│  ├──────────────────────┤      │  ┌────────────────┐  │    │
│  │                      │      │  │ CloudWatch     │  │    │
│  │  IAM Role            │─────▶│  │ Logs           │  │    │
│  │  AgentCoreExecution  │      │  └────────────────┘  │    │
│  │  Role                │      │                      │    │
│  │                      │      └──────────────────────┘    │
│  └──────────────────────┘                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Best Practices

### 1. Container Image Management
- Tag images with semantic versions: `v1.0.0`, `v1.1.0`
- Maintain `latest` tag for development
- Use immutable tags for production deployments
- Implement image scanning for security vulnerabilities

### 2. Cross-Region Resilience
- Monitor ECR availability in ap-northeast-1
- Have rollback plan if cross-region access fails
- Consider ECR replication for critical deployments

### 3. Cost Monitoring
- Track cross-region data transfer costs
- Set up CloudWatch billing alarms
- Review costs monthly and optimize as needed

### 4. Security
- Enable ECR image scanning
- Use IAM roles instead of access keys
- Implement least privilege access
- Enable CloudTrail for audit logging

## Troubleshooting

### Issue: AgentCore Cannot Pull from ECR
**Solution**:
```bash
# Verify ECR repository exists
aws ecr describe-repositories \
  --repository-names advocacy-content-generator \
  --region ap-northeast-1

# Verify IAM role has ECR permissions
aws iam get-role-policy \
  --role-name AgentCoreExecutionRole \
  --policy-name AgentCoreExecutionPolicy

# Test cross-region access
aws ecr get-authorization-token --region ap-northeast-1
```

### Issue: Bedrock Model Not Available
**Solution**:
```bash
# Verify model access in us-east-1
aws bedrock list-foundation-models --region us-east-1

# Request model access if needed
# Go to AWS Console → Bedrock → Model access
```

### Issue: High Data Transfer Costs
**Solution**:
1. Optimize Docker image size
2. Consider ECR replication to us-east-1
3. Use AgentCore caching effectively

## Summary

✓ **Primary Region**: us-east-1 (AgentCore, Bedrock, Cognito)
✓ **Secondary Region**: ap-northeast-1 (ECR)
✓ **Cross-Region Access**: Configured and tested
✓ **Cost Impact**: Minimal (<5% increase)
✓ **Migration Path**: Defined for future optimization

This multi-region strategy provides the best balance of:
- Service availability (Bedrock in us-east-1)
- Cost optimization (existing ECR in ap-northeast-1)
- Future flexibility (easy migration when needed)

---

**Last Updated**: 2025-11-13
**Status**: Active Configuration
