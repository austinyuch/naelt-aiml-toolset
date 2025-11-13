#!/bin/bash

set -e

echo "=== AgentCore Runtime Deployment ==="
echo ""

# Check if we're in the right directory
if [ ! -f ".bedrock_agentcore.yaml" ]; then
    echo "Error: .bedrock_agentcore.yaml not found"
    exit 1
fi

echo "Step 1: Login to ECR"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION="us-east-1"
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

aws ecr get-login-password --region ${AWS_REGION} | \
    docker login --username AWS --password-stdin ${ECR_URI}

echo ""
echo "Step 2: Tag and push Docker image to ECR"
docker tag advocacy-content-generator:latest ${ECR_URI}/advocacy-content-generator:latest
docker push ${ECR_URI}/advocacy-content-generator:latest

echo ""
echo "Step 3: Launch AgentCore Runtime"
echo "This will take approximately 5 minutes..."
echo ""

# Run agentcore launch and capture output
# The agent name is read from .bedrock_agentcore.yaml
agentcore launch --agent advocacy-content-generator 2>&1 | tee agentcore-launch-output.txt

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Checking for Runtime ARN..."
if grep -q "arn:aws:bedrock-agentcore" agentcore-launch-output.txt; then
    RUNTIME_ARN=$(grep -o "arn:aws:bedrock-agentcore[^[:space:]]*" agentcore-launch-output.txt | head -1)
    echo "Runtime ARN: ${RUNTIME_ARN}"
    echo ""
    echo "Saving to environment file..."
    echo "AGENT_ARN=${RUNTIME_ARN}" > agentcore-runtime.env
    echo "Saved to: agentcore-runtime.env"
else
    echo "Warning: Could not find Runtime ARN in output"
    echo "Please check agentcore-launch-output.txt for details"
fi

echo ""
echo "Next steps:"
echo "1. Export the Runtime ARN: source agentcore-runtime.env"
echo "2. Get Bearer Token: ./scripts/get-cognito-token.sh"
echo "3. Run remote tests: npm run test:remote-mcp"
