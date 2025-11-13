# AgentCore Deployment - Next Steps Guide

## Quick Start: Choose Your Path

### Path A: CloudFormation (Recommended for Production)
**Time**: 2-3 hours | **Reproducibility**: ✅ High | **Complexity**: Medium

### Path B: AWS Console (Fastest for POC)
**Time**: 30-60 minutes | **Reproducibility**: ❌ Low | **Complexity**: Low

---

## Path A: CloudFormation Deployment

### Step 1: Create CloudFormation Template

Create `cloudformation/agentcore-mcp-server.yaml`:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'AgentCore MCP Server - Advocacy Content Generator'

Parameters:
  ImageUri:
    Type: String
    Default: '533267166136.dkr.ecr.us-east-1.amazonaws.com/advocacy-content-generator:latest'
    Description: ECR image URI
  
  ExecutionRoleArn:
    Type: String
    Default: 'arn:aws:iam::533267166136:role/AgentCoreExecutionRole-advocacy-content-generator'
    Description: IAM execution role ARN
  
  CognitoUserPoolId:
    Type: String
    Default: 'us-east-1_YYMy6hC3F'
    Description: Cognito User Pool ID
  
  CognitoClientId:
    Type: String
    Default: '1eulh5t29s9rsk6a8r1ahv739g'
    Description: Cognito Client ID

Resources:
  AgentCoreRuntime:
    Type: AWS::BedrockAgentCore::Runtime
    Properties:
      RuntimeName: advocacy-content-generator-mcp
      Protocol: MCP
      RuntimeRoleArn: !Ref ExecutionRoleArn
      ContainerConfig:
        ImageUri: !Ref ImageUri
        Port: 8000
        Environment:
          - Name: SERVICE_MODE
            Value: mcp-only
          - Name: MCP_TRANSPORT
            Value: streamable-http
          - Name: AWS_REGION
            Value: !Ref AWS::Region
          - Name: LOG_LEVEL
            Value: info
          - Name: PORT
            Value: '8000'
      AuthenticationConfig:
        Type: OAUTH
        OAuthConfig:
          DiscoveryUrl: !Sub 'https://cognito-idp.${AWS::Region}.amazonaws.com/${CognitoUserPoolId}/.well-known/openid-configuration'
          ClientId: !Ref CognitoClientId
      MemorySize: 1024
      TimeoutInSeconds: 3600

Outputs:
  RuntimeArn:
    Description: AgentCore Runtime ARN
    Value: !GetAtt AgentCoreRuntime.RuntimeArn
    Export:
      Name: !Sub '${AWS::StackName}-RuntimeArn'
  
  RuntimeEndpoint:
    Description: AgentCore Runtime Endpoint
    Value: !GetAtt AgentCoreRuntime.RuntimeEndpoint
    Export:
      Name: !Sub '${AWS::StackName}-RuntimeEndpoint'
```

### Step 2: Deploy CloudFormation Stack

```bash
# Create the stack
aws cloudformation create-stack \
  --stack-name advocacy-content-generator-agentcore \
  --template-body file://cloudformation/agentcore-mcp-server.yaml \
  --region us-east-1 \
  --capabilities CAPABILITY_IAM

# Wait for completion (5-10 minutes)
aws cloudformation wait stack-create-complete \
  --stack-name advocacy-content-generator-agentcore \
  --region us-east-1

# Get outputs
aws cloudformation describe-stacks \
  --stack-name advocacy-content-generator-agentcore \
  --region us-east-1 \
  --query 'Stacks[0].Outputs'
```

### Step 3: Save Runtime ARN

```bash
# Extract Runtime ARN
RUNTIME_ARN=$(aws cloudformation describe-stacks \
  --stack-name advocacy-content-generator-agentcore \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`RuntimeArn`].OutputValue' \
  --output text)

# Save to environment file
echo "AGENT_ARN=${RUNTIME_ARN}" > agentcore-runtime.env
echo "AWS_REGION=us-east-1" >> agentcore-runtime.env

echo "Runtime ARN saved to agentcore-runtime.env"
```

### Step 4: Test Deployment

```bash
# Source environment variables
source agentcore-runtime.env

# Get Bearer Token
./scripts/get-cognito-token.sh

# Run remote tests
npm run test:remote-mcp
```

---

## Path B: AWS Console Deployment

### Step 1: Navigate to AgentCore Console

1. Open AWS Console
2. Go to **Amazon Bedrock** service
3. Click **AgentCore** in the left sidebar
4. Click **Runtimes**
5. Click **Create runtime**

### Step 2: Configure Runtime

**Basic Configuration:**
- **Runtime name**: `advocacy-content-generator-mcp`
- **Protocol**: `MCP`
- **Description**: `MCP Server for advocacy content generation`

**Container Configuration:**
- **Image URI**: `533267166136.dkr.ecr.us-east-1.amazonaws.com/advocacy-content-generator:latest`
- **Port**: `8000`
- **Environment variables**:
  ```
  SERVICE_MODE=mcp-only
  MCP_TRANSPORT=streamable-http
  AWS_REGION=us-east-1
  LOG_LEVEL=info
  PORT=8000
  ```

**Authentication:**
- **Type**: `OAuth`
- **Discovery URL**: `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_YYMy6hC3F/.well-known/openid-configuration`
- **Client ID**: `1eulh5t29s9rsk6a8r1ahv739g`

**Runtime Configuration:**
- **Memory**: `1024 MB`
- **Timeout**: `3600 seconds` (60 minutes)
- **Execution role**: `arn:aws:iam::533267166136:role/AgentCoreExecutionRole-advocacy-content-generator`

### Step 3: Create and Wait

1. Click **Create runtime**
2. Wait 5-10 minutes for deployment
3. Status will change from `Creating` → `Active`

### Step 4: Get Runtime ARN

1. Click on the created runtime
2. Copy the **Runtime ARN**
3. Save to environment file:

```bash
echo "AGENT_ARN=<paste-runtime-arn-here>" > agentcore-runtime.env
echo "AWS_REGION=us-east-1" >> agentcore-runtime.env
```

### Step 5: Test Deployment

```bash
# Source environment variables
source agentcore-runtime.env

# Get Bearer Token
./scripts/get-cognito-token.sh

# Run remote tests
npm run test:remote-mcp
```

---

## Testing After Deployment

### 1. Get Bearer Token

```bash
./scripts/get-cognito-token.sh
# Or manually:
export BEARER_TOKEN=$(aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id 1eulh5t29s9rsk6a8r1ahv739g \
  --auth-parameters USERNAME=testuser,PASSWORD=MyPassword123! \
  --region us-east-1 \
  --query 'AuthenticationResult.AccessToken' \
  --output text)
```

### 2. Test MCP Tools

```bash
# Source environment
source agentcore-runtime.env

# Test search_news
npm run test:remote-mcp -- --tool search_news

# Test generate_content
npm run test:remote-mcp -- --tool generate_content

# Test refine_content
npm run test:remote-mcp -- --tool refine_content
```

### 3. Monitor Logs

```bash
# View CloudWatch logs
aws logs tail /aws/bedrock-agentcore/advocacy-content-generator-mcp --follow

# Filter for errors
aws logs filter-log-events \
  --log-group-name /aws/bedrock-agentcore/advocacy-content-generator-mcp \
  --filter-pattern "ERROR"
```

---

## Troubleshooting

### Issue: Runtime Creation Fails

**Check**:
1. ECR image is accessible
2. IAM role has correct permissions
3. Cognito configuration is valid
4. Region is correct (us-east-1)

**Solution**:
```bash
# Verify ECR image
aws ecr describe-images \
  --repository-name advocacy-content-generator \
  --region us-east-1

# Verify IAM role
aws iam get-role \
  --role-name AgentCoreExecutionRole-advocacy-content-generator
```

### Issue: Authentication Fails

**Check**:
1. Cognito User Pool exists
2. Client ID is correct
3. Discovery URL is accessible
4. Bearer token is valid

**Solution**:
```bash
# Test Cognito authentication
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id 1eulh5t29s9rsk6a8r1ahv739g \
  --auth-parameters USERNAME=testuser,PASSWORD=MyPassword123! \
  --region us-east-1
```

### Issue: MCP Tools Not Working

**Check**:
1. Container is running
2. Port 8000 is exposed
3. `/mcp` endpoint is accessible
4. Environment variables are set

**Solution**:
```bash
# Check runtime status
aws bedrock-agentcore describe-runtime \
  --runtime-arn $AGENT_ARN \
  --region us-east-1

# View logs
aws logs tail /aws/bedrock-agentcore/advocacy-content-generator-mcp --follow
```

---

## Cleanup (If Needed)

### CloudFormation:
```bash
aws cloudformation delete-stack \
  --stack-name advocacy-content-generator-agentcore \
  --region us-east-1
```

### Console:
1. Go to AgentCore → Runtimes
2. Select the runtime
3. Click **Delete**
4. Confirm deletion

---

## Success Criteria

✅ Runtime status is `Active`  
✅ Bearer token authentication works  
✅ All 3 MCP tools respond successfully  
✅ Response times < 60 seconds  
✅ No errors in CloudWatch logs  

---

## Next Steps After Successful Deployment

1. **Performance Testing** (Task 16)
   - Run 100 concurrent requests
   - Measure P50, P95, P99 latency
   - Calculate error rate

2. **Cost Analysis** (Task 17)
   - Monitor CloudWatch metrics
   - Calculate per-request cost
   - Project monthly costs

3. **Documentation** (Task 18)
   - Complete POC report
   - Document deployment process
   - Create troubleshooting guide

4. **Team Knowledge Transfer** (Task 20)
   - Present findings
   - Demo deployment
   - Answer questions

---

**Estimated Total Time**: 2-4 hours (including testing)  
**Recommended Path**: CloudFormation for reproducibility  
**Alternative Path**: Console for speed
