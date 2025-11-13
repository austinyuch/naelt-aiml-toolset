#!/bin/bash

# Verify AgentCore Configuration
# This script validates all components of the AgentCore deployment configuration

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}AgentCore Configuration Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check configuration file exists
echo -e "${YELLOW}1. Checking configuration file...${NC}"
if [ ! -f ".bedrock_agentcore.yaml" ]; then
    echo -e "${RED}✗ .bedrock_agentcore.yaml not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Configuration file exists${NC}"

# Parse configuration
CONFIG_FILE=".bedrock_agentcore.yaml"
PROJECT_NAME=$(grep "^name:" "$CONFIG_FILE" | awk '{print $2}')
PROTOCOL=$(grep "^protocol:" "$CONFIG_FILE" | awk '{print $2}')
MEMORY=$(grep "memory:" "$CONFIG_FILE" | awk '{print $2}')
TIMEOUT=$(grep "timeout:" "$CONFIG_FILE" | awk '{print $2}')
EXEC_ROLE=$(grep "execution_role:" "$CONFIG_FILE" | awk '{print $2}')
IMAGE=$(grep "image:" "$CONFIG_FILE" | awk '{print $2}')
DISCOVERY_URL=$(grep "discovery_url:" "$CONFIG_FILE" | awk '{print $2}')
CLIENT_ID=$(grep "client_id:" "$CONFIG_FILE" | awk '{print $2}')

echo -e "${GREEN}  Name: $PROJECT_NAME${NC}"
echo -e "${GREEN}  Protocol: $PROTOCOL${NC}"
echo -e "${GREEN}  Memory: $MEMORY MB${NC}"
echo -e "${GREEN}  Timeout: $TIMEOUT seconds${NC}"
echo ""

# Check IAM execution role
echo -e "${YELLOW}2. Verifying IAM execution role...${NC}"
ROLE_NAME=$(echo "$EXEC_ROLE" | awk -F'/' '{print $2}')
if aws iam get-role --role-name "$ROLE_NAME" &> /dev/null; then
    echo -e "${GREEN}✓ IAM role exists: $ROLE_NAME${NC}"
else
    echo -e "${RED}✗ IAM role not found: $ROLE_NAME${NC}"
    exit 1
fi
echo ""

# Check ECR repository
echo -e "${YELLOW}3. Verifying ECR repository...${NC}"
REGION=$(echo "$IMAGE" | cut -d'.' -f4)
REPO_NAME=$(echo "$IMAGE" | cut -d'/' -f2 | cut -d':' -f1)
if aws ecr describe-repositories --repository-names "$REPO_NAME" --region "$REGION" &> /dev/null; then
    echo -e "${GREEN}✓ ECR repository exists: $REPO_NAME${NC}"
else
    echo -e "${RED}✗ ECR repository not found: $REPO_NAME${NC}"
    exit 1
fi
echo ""

# Check Cognito configuration
echo -e "${YELLOW}4. Verifying Cognito configuration...${NC}"
if [ -f "cognito-credentials.txt" ]; then
    # Extract values from credentials file
    USER_POOL_ID=$(grep "^USER_POOL_ID=" cognito-credentials.txt | cut -d'=' -f2)
    APP_CLIENT_ID=$(grep "^APP_CLIENT_ID=" cognito-credentials.txt | cut -d'=' -f2)
    ACCESS_TOKEN=$(grep "^ACCESS_TOKEN=" cognito-credentials.txt | cut -d'=' -f2)
    REGION=$(grep "^REGION=" cognito-credentials.txt | cut -d'=' -f2)
    echo -e "${GREEN}✓ Cognito credentials file exists${NC}"
    
    # Verify User Pool
    if aws cognito-idp describe-user-pool --user-pool-id "$USER_POOL_ID" --region "$REGION" &> /dev/null; then
        echo -e "${GREEN}✓ Cognito User Pool exists: $USER_POOL_ID${NC}"
    else
        echo -e "${RED}✗ Cognito User Pool not found${NC}"
        exit 1
    fi
    
    # Verify App Client
    if aws cognito-idp describe-user-pool-client --user-pool-id "$USER_POOL_ID" --client-id "$APP_CLIENT_ID" --region "$REGION" &> /dev/null; then
        echo -e "${GREEN}✓ Cognito App Client exists: $APP_CLIENT_ID${NC}"
    else
        echo -e "${RED}✗ Cognito App Client not found${NC}"
        exit 1
    fi
    
    # Check if Bearer Token is still valid
    if [ ! -z "$ACCESS_TOKEN" ]; then
        echo -e "${GREEN}✓ Bearer Token available${NC}"
        # Note: Token expires after 1 hour
        echo -e "${YELLOW}  Note: Token expires 1 hour after generation${NC}"
    fi
else
    echo -e "${RED}✗ cognito-credentials.txt not found${NC}"
    exit 1
fi
echo ""

# Check build artifacts
echo -e "${YELLOW}5. Verifying build artifacts...${NC}"
if [ -f "dist/index.js" ]; then
    echo -e "${GREEN}✓ Application built (dist/index.js exists)${NC}"
else
    echo -e "${RED}✗ Application not built${NC}"
    echo -e "${YELLOW}  Run: npm run build${NC}"
    exit 1
fi

if [ -f "Dockerfile" ]; then
    echo -e "${GREEN}✓ Dockerfile exists${NC}"
else
    echo -e "${RED}✗ Dockerfile not found${NC}"
    exit 1
fi
echo ""

# Check OAuth discovery endpoint
echo -e "${YELLOW}6. Verifying OAuth discovery endpoint...${NC}"
if curl -s "$DISCOVERY_URL" > /dev/null; then
    echo -e "${GREEN}✓ OAuth discovery endpoint accessible${NC}"
    echo -e "${GREEN}  URL: $DISCOVERY_URL${NC}"
else
    echo -e "${RED}✗ OAuth discovery endpoint not accessible${NC}"
    exit 1
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✓ All configuration components verified${NC}"
echo ""
echo -e "${YELLOW}Configuration Details:${NC}"
echo "  Project: $PROJECT_NAME"
echo "  Protocol: $PROTOCOL"
echo "  IAM Role: $EXEC_ROLE"
echo "  ECR Image: $IMAGE"
echo "  OAuth Discovery: $DISCOVERY_URL"
echo "  OAuth Client ID: $CLIENT_ID"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Build and push Docker image:"
echo "   ./scripts/build-and-push-docker.sh"
echo ""
echo "2. Deploy to AgentCore Runtime:"
echo "   ./scripts/deploy-agentcore.sh"
echo ""
echo -e "${GREEN}Configuration verification completed successfully!${NC}"
