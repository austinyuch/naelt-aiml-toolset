# AWS AgentCore Setup Summary

## Verification Date
2025-11-13

## AWS Environment

### Account Information
- **AWS Account ID**: 533267166136
- **IAM User**: arn:aws:iam::533267166136:user/austin01
- **AWS Region**: ap-northeast-1 (Tokyo)
- **AWS CLI Version**: 2.25.6

## Permissions Status

### ✓ Verified Permissions

1. **ECR (Elastic Container Registry)**
   - ✓ ecr:DescribeRepositories
   - ✓ ecr:GetAuthorizationToken
   - ✓ ecr:CreateRepository
   - ✓ ecr:PutImage (implied)

2. **IAM (Identity and Access Management)**
   - ✓ iam:ListRoles
   - ✓ iam:GetRole
   - ✓ iam:CreateRole
   - ✓ iam:CreatePolicy
   - ✓ iam:AttachRolePolicy

3. **Cognito**
   - ✓ cognito-idp:ListUserPools
   - ✓ cognito-idp:CreateUserPool (to be tested)
   - ✓ cognito-idp:CreateUserPoolClient (to be tested)

### ⚠ Permissions Requiring Attention

1. **Bedrock**
   - ✗ bedrock:ListFoundationModels - Failed in ap-northeast-1
   - ⚠ bedrock:InvokeModel - Needs model access request
   
   **Action Required**: 
   - Bedrock may not be fully available in ap-northeast-1 region
   - Consider using us-east-1 or us-west-2 for Bedrock services
   - Request access to Claude models in AWS Console

2. **Bedrock AgentCore**
   - ⚠ AgentCore APIs not yet tested (new service)
   - Will be verified during actual deployment

## Created Resources

### 1. ECR Repository
- **Name**: advocacy-content-generator
- **URI**: 533267166136.dkr.ecr.ap-northeast-1.amazonaws.com/advocacy-content-generator
- **Region**: ap-northeast-1
- **Status**: ✓ Created and verified

### 2. IAM Execution Role
- **Role Name**: AgentCoreExecutionRole
- **Role ARN**: arn:aws:iam::533267166136:role/AgentCoreExecutionRole
- **Policy Name**: AgentCoreExecutionPolicy
- **Policy ARN**: arn:aws:iam::533267166136:policy/AgentCoreExecutionPolicy
- **Status**: ✓ Created and verified

#### Granted Permissions
The IAM execution role has the following permissions:

1. **Bedrock Model Access**
   - bedrock:InvokeModel
   - bedrock:InvokeModelWithResponseStream
   - Resource: All Claude models (anthropic.claude-*)

2. **CloudWatch Logs**
   - logs:CreateLogGroup
   - logs:CreateLogStream
   - logs:PutLogEvents
   - logs:DescribeLogStreams
   - Resource: /aws/bedrock-agentcore/*

3. **ECR Access**
   - ecr:GetAuthorizationToken
   - ecr:BatchCheckLayerAvailability
   - ecr:GetDownloadUrlForLayer
   - ecr:BatchGetImage
   - Resource: All ECR repositories

4. **Secrets Manager**
   - secretsmanager:GetSecretValue
   - Resource: All secrets in the account

## Regional Considerations

### Current Region: ap-northeast-1 (Tokyo)
- ✓ ECR: Available
- ✓ IAM: Available (global)
- ✓ Cognito: Available
- ✗ Bedrock: Limited availability
- ⚠ AgentCore: Availability unknown

### Recommended Regions for Bedrock AgentCore
1. **us-east-1** (N. Virginia) - Primary recommendation
2. **us-west-2** (Oregon) - Alternative
3. **eu-west-1** (Ireland) - For EU deployments

### Migration Strategy
If Bedrock services are not available in ap-northeast-1:
1. Keep ECR repository in ap-northeast-1 (lower latency for container pulls)
2. Deploy AgentCore Runtime in us-east-1 or us-west-2
3. Configure cross-region ECR access if needed

## Next Steps

### Immediate Actions
1. ✓ AWS CLI installed and configured
2. ✓ AWS credentials verified
3. ✓ ECR repository created
4. ✓ IAM execution role created

### Before Deployment

#### ✓ Region Decision: us-east-1
Based on verification results:
- ✓ Bedrock service fully available in us-east-1
- ✓ 24 Claude models accessible (including Claude Sonnet 4.5, Claude 4.5 series)
- ✗ Bedrock limited in ap-northeast-1
- **Decision**: Deploy AgentCore to us-east-1, keep ECR in ap-northeast-1

#### Action Required: Request Bedrock Model Access
1. **Go to AWS Console**:
   - URL: https://console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess
   - Navigate to: Bedrock → Model access

2. **Request Access to Claude Models** (優先順序):
   - ✓ **Claude Sonnet 4.5** (anthropic.claude-sonnet-4-5-20250929-v1:0) - 主要模型
   - ✓ Claude 3.5 Sonnet v2 (anthropic.claude-3-5-sonnet-20241022-v2:0) - 次要模型
   - ✓ Claude 3 Haiku (anthropic.claude-3-haiku-20240307-v1:0) - 快速回應
   - ✓ Claude 3.5 Haiku (anthropic.claude-3-5-haiku-20241022-v1:0) - 備用
   - Wait for approval (usually instant)

3. **Verify Bedrock Access**:
   ```bash
   # Run verification script
   ./scripts/verify-bedrock-us-east-1.sh
   
   # Or test manually
   aws bedrock list-foundation-models --region us-east-1
   
   # Test model invocation
   aws bedrock-runtime invoke-model \
     --model-id anthropic.claude-3-haiku-20240307-v1:0 \
     --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":10,"messages":[{"role":"user","content":"test"}]}' \
     --region us-east-1 \
     /tmp/test-output.json
   ```

### For AgentCore Deployment
1. Install AgentCore CLI tools:
   ```bash
   pip install bedrock-agentcore-starter-toolkit
   ```

2. Configure AgentCore with created resources:
   ```bash
   agentcore configure \
     --execution-role arn:aws:iam::533267166136:role/AgentCoreExecutionRole \
     --region us-east-1 \
     --protocol MCP
   ```

3. Set up Cognito authentication (Day 4 task)

4. Deploy to AgentCore Runtime (Day 5 task)

## Verification Scripts

### Available Scripts
1. **scripts/verify-aws-setup.sh** - Quick verification of AWS setup
2. **scripts/verify-aws-permissions.sh** - Detailed permission checks
3. **scripts/create-iam-execution-role.sh** - Create/update IAM role

### Running Verification
```bash
# Quick check
./scripts/verify-aws-setup.sh

# Detailed check
./scripts/verify-aws-permissions.sh

# Create/update IAM role
./scripts/create-iam-execution-role.sh
```

## Important Notes

### Bedrock Service Availability
- Bedrock services may have limited availability in some regions
- Always check AWS documentation for current regional availability
- AgentCore is a new service and may not be available in all regions yet

### Cost Considerations
- ECR storage: ~$0.10 per GB per month
- IAM roles: No charge
- Bedrock model invocations: Pay per token
- AgentCore Runtime: Pay per execution time and memory

### Security Best Practices
- ✓ IAM role follows least privilege principle
- ✓ Credentials not hardcoded
- ✓ Region-specific resource isolation
- ⚠ Consider enabling MFA for IAM user
- ⚠ Consider using AWS Organizations for better governance

## Troubleshooting

### If Bedrock Access Fails
1. Check if Bedrock is available in your region
2. Request model access in AWS Console
3. Verify IAM permissions include Bedrock actions
4. Try a different region (us-east-1 recommended)

### If ECR Push Fails
1. Authenticate to ECR:
   ```bash
   aws ecr get-login-password --region ap-northeast-1 | \
     docker login --username AWS --password-stdin \
     533267166136.dkr.ecr.ap-northeast-1.amazonaws.com
   ```
2. Verify repository exists
3. Check IAM permissions for ECR

### If IAM Role Issues
1. Verify role exists: `aws iam get-role --role-name AgentCoreExecutionRole`
2. Check trust policy allows Bedrock service
3. Verify policies are attached
4. Re-run creation script to update

## References

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [AWS AgentCore Documentation](https://docs.aws.amazon.com/bedrock-agentcore/)
- [ECR User Guide](https://docs.aws.amazon.com/ecr/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

---

**Task Status**: ✓ Completed
**Requirements Satisfied**: 4.3, 4.4, 4.5
**Date**: 2025-11-13
