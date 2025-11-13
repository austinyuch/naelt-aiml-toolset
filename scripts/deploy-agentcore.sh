#!/bin/bash

# Deploy to AgentCore Runtime
# This script deploys the application to AWS Bedrock AgentCore Runtime

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Deploy to AgentCore Runtime${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check configuration file exists
if [ ! -f ".bedrock_agentcore.yaml" ]; then
    echo -e "${RED}Error: .bedrock_agentcore.yaml not found${NC}"
    echo "Please run ./scripts/configure-agentcore.sh first"
    exit 1
fi

# Check if image is built and pushed
REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/advocacy-content-generator"

echo -e "${YELLOW}Checking Docker image in ECR...${NC}"
if aws ecr describe-images --repository-name advocacy-content-generator --image-ids imageTag=latest --region ${REGION} &> /dev/null; then
    echo -e "${GREEN}✓ Docker image found in ECR${NC}"
else
    echo -e "${RED}Error: Docker image not found in ECR${NC}"
    echo "Please run ./scripts/build-and-push-docker.sh first"
    exit 1
fi
echo ""

# Deploy using AgentCore toolkit
echo -e "${YELLOW}Deploying to AgentCore Runtime...${NC}"
echo -e "${YELLOW}This may take 5-10 minutes...${NC}"
echo ""

# Run deployment
uvx bedrock-agentcore-starter-toolkit launch

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Deployment Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo "1. Save the Runtime ARN from the output above"
echo ""
echo "2. Test the deployment:"
echo "   export AGENT_ARN='<runtime-arn>'"
echo "   export BEARER_TOKEN='<token-from-cognito-credentials.txt>'"
echo "   npm run test:remote"
echo ""
echo "3. Monitor logs:"
echo "   aws logs tail /aws/bedrock-agentcore/advocacy-content-generator --follow"
echo ""
