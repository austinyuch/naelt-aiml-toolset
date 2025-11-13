#!/bin/bash

set -e

echo "=== Direct AgentCore Runtime Deployment (AWS CLI) ==="
echo ""

# Configuration from .bedrock_agentcore.yaml
AGENT_NAME="advocacy-content-generator"
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/advocacy-content-generator"
EXECUTION_ROLE="arn:aws:iam::${AWS_ACCOUNT_ID}:role/AgentCoreExecutionRole-advocacy-content-generator"
DISCOVERY_URL="https://cognito-idp.us-east-1.amazonaws.com/us-east-1_YYMy6hC3F/.well-known/openid-configuration"
CLIENT_ID="1eulh5t29s9rsk6a8r1ahv739g"

echo "Step 1: Login to ECR and push Docker image"
aws ecr get-login-password --region ${AWS_REGION} | \
    docker login --username AWS --password-stdin ${ECR_URI}

docker tag advocacy-content-generator:latest ${ECR_URI}:latest
docker push ${ECR_URI}:latest

echo ""
echo "Step 2: Create AgentCore Runtime using AWS Bedrock API"
echo "This may take 5-10 minutes..."
echo ""

# Create the runtime configuration JSON
cat > temp/runtime-config.json <<EOF
{
  "runtimeName": "${AGENT_NAME}",
  "runtimeRoleArn": "${EXECUTION_ROLE}",
  "containerConfig": {
    "imageUri": "${ECR_URI}:latest",
    "port": 8000,
    "environment": {
      "SERVICE_MODE": "mcp-only",
      "MCP_TRANSPORT": "streamable-http",
      "AWS_REGION": "${AWS_REGION}",
      "LOG_LEVEL": "info",
      "PORT": "8000"
    }
  },
  "authenticationConfig": {
    "type": "OAUTH",
    "oauthConfig": {
      "discoveryUrl": "${DISCOVERY_URL}",
      "clientId": "${CLIENT_ID}"
    }
  },
  "protocol": "MCP",
  "memorySize": 1024,
  "timeoutInSeconds": 3600
}
EOF

echo "Runtime configuration created at: temp/runtime-config.json"
echo ""

# Create the runtime
aws bedrock-agentcore create-runtime \
  --cli-input-json file://temp/runtime-config.json \
  --region ${AWS_REGION} \
  > temp/runtime-response.json 2>&1

if [ $? -eq 0 ]; then
    echo "=== Deployment Successful ==="
    echo ""
    
    # Extract Runtime ARN
    RUNTIME_ARN=$(jq -r '.runtimeArn' temp/runtime-response.json)
    echo "Runtime ARN: ${RUNTIME_ARN}"
    echo ""
    
    # Save to environment file
    echo "AGENT_ARN=${RUNTIME_ARN}" > agentcore-runtime.env
    echo "AWS_REGION=${AWS_REGION}" >> agentcore-runtime.env
    echo "Saved to: agentcore-runtime.env"
    echo ""
    
    echo "Next steps:"
    echo "1. Wait 2-3 minutes for runtime to be ready"
    echo "2. Export variables: source agentcore-runtime.env"
    echo "3. Get Bearer Token: ./scripts/get-cognito-token.sh"
    echo "4. Run remote tests: npm run test:remote-mcp"
else
    echo "=== Deployment Failed ==="
    echo ""
    echo "Error details:"
    cat temp/runtime-response.json
    echo ""
    echo "Common issues:"
    echo "- Check if runtime with same name already exists"
    echo "- Verify IAM role has correct permissions"
    echo "- Ensure ECR image is accessible"
    echo "- Check Cognito configuration"
    exit 1
fi
