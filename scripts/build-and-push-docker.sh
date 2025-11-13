#!/bin/bash

# Build and Push Docker Image for AgentCore
# This script builds the Docker image and pushes it to ECR

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Build and Push Docker Image${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Configuration
REGION="${AWS_REGION:-us-east-1}"
PROJECT_NAME="advocacy-content-generator"

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${PROJECT_NAME}"

echo -e "${GREEN}AWS Account:${NC} $AWS_ACCOUNT_ID"
echo -e "${GREEN}ECR Repository:${NC} $ECR_URI"
echo ""

# Step 1: Build TypeScript
echo -e "${YELLOW}Step 1: Building TypeScript...${NC}"
npm run build
echo -e "${GREEN}✓ TypeScript compiled${NC}"
echo ""

# Step 2: Build Docker image (multi-platform)
echo -e "${YELLOW}Step 2: Building Docker image for multiple platforms...${NC}"
echo -e "${BLUE}Building for local testing (current platform)...${NC}"
docker build -t ${PROJECT_NAME}:latest .
echo -e "${GREEN}✓ Local platform image built${NC}"
echo ""

# Step 3: Login to ECR
echo -e "${YELLOW}Step 3: Logging in to ECR...${NC}"
aws ecr get-login-password --region ${REGION} | \
    docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com
echo -e "${GREEN}✓ Logged in to ECR${NC}"
echo ""

# Step 4: Tag local image
echo -e "${YELLOW}Step 4: Tagging local image...${NC}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
docker tag ${PROJECT_NAME}:latest ${ECR_URI}:latest-local
echo -e "${GREEN}✓ Local image tagged${NC}"
echo ""

# Step 5: Build and push ARM64 image directly to ECR
echo -e "${YELLOW}Step 5: Building and pushing ARM64 image to ECR for AgentCore...${NC}"
docker buildx build \
    --platform linux/arm64 \
    -t ${ECR_URI}:latest \
    -t ${ECR_URI}:${TIMESTAMP} \
    -t ${ECR_URI}:latest-arm64 \
    --push \
    .
echo -e "${GREEN}✓ ARM64 image built and pushed to ECR${NC}"

echo -e "${BLUE}Note: Local platform image (${PROJECT_NAME}:latest) is available for local testing${NC}"
echo ""

# Display image info
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Build Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Image URI:${NC} ${ECR_URI}:latest"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Deploy to AgentCore Runtime:"
echo "   uvx bedrock-agentcore-starter-toolkit launch"
echo ""
echo "   Or use the deployment script:"
echo "   ./scripts/deploy-agentcore.sh"
echo ""
