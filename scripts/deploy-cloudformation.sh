#!/bin/bash

set -e

echo "=== CloudFormation AgentCore Runtime Deployment ==="
echo ""

# Configuration
STACK_NAME="advocacy-content-generator-agentcore"
TEMPLATE_FILE="cloudformation/agentcore-mcp-server.yaml"
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/advocacy-content-generator"

echo "Step 1: Build and push ARM64 Docker image for AgentCore"

# Login to ECR first
echo "Logging in to ECR..."
aws ecr get-login-password --region ${AWS_REGION} | \
    docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build and push ARM64 image directly to ECR (no --load to avoid exec format error on x86_64)
echo "Building and pushing ARM64 image directly to ECR..."
docker buildx build \
    --platform linux/arm64 \
    -t ${ECR_URI}:latest \
    -t ${ECR_URI}:$(date +%Y%m%d-%H%M%S) \
    --push \
    .

echo "✓ ARM64 image built and pushed to ECR"

echo ""
echo "Step 2: Deploy CloudFormation Stack"
echo "Stack Name: ${STACK_NAME}"
echo "Template: ${TEMPLATE_FILE}"
echo ""

# Check if stack exists
if aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${AWS_REGION} >/dev/null 2>&1; then
    echo "Stack exists, updating..."
    aws cloudformation update-stack \
        --stack-name ${STACK_NAME} \
        --template-body file://${TEMPLATE_FILE} \
        --region ${AWS_REGION} \
        --capabilities CAPABILITY_IAM || echo "No updates to perform"
    
    echo "Waiting for stack update to complete..."
    aws cloudformation wait stack-update-complete \
        --stack-name ${STACK_NAME} \
        --region ${AWS_REGION} || true
else
    echo "Creating new stack..."
    aws cloudformation create-stack \
        --stack-name ${STACK_NAME} \
        --template-body file://${TEMPLATE_FILE} \
        --region ${AWS_REGION} \
        --capabilities CAPABILITY_IAM
    
    echo "Waiting for stack creation to complete (this may take 5-10 minutes)..."
    aws cloudformation wait stack-create-complete \
        --stack-name ${STACK_NAME} \
        --region ${AWS_REGION}
fi

echo ""
echo "Step 3: Extract Outputs"
RUNTIME_ID=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${AWS_REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`RuntimeId`].OutputValue' \
    --output text)

RUNTIME_ARN=$(aws cloudformation describe-stacks \
    --stack-name ${STACK_NAME} \
    --region ${AWS_REGION} \
    --query 'Stacks[0].Outputs[?OutputKey==`RuntimeArn`].OutputValue' \
    --output text)

echo "Runtime ID: ${RUNTIME_ID}"
echo "Runtime ARN: ${RUNTIME_ARN}"

echo ""
echo "Step 4: Save to environment file"
cat > agentcore-runtime.env <<EOF
RUNTIME_ID=${RUNTIME_ID}
AGENT_ARN=${RUNTIME_ARN}
AWS_REGION=${AWS_REGION}
STACK_NAME=${STACK_NAME}
EOF

echo "Saved to: agentcore-runtime.env"
echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Next steps:"
echo "1. Source environment: source agentcore-runtime.env"
echo "2. Get Bearer Token: ./scripts/get-cognito-token.sh"
echo "3. Run remote tests: npm run test:remote-mcp"
