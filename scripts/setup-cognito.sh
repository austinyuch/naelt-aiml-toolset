#!/bin/bash

# Cognito Setup Script for AgentCore Integration
# This script creates a Cognito User Pool, App Client, and test user for AgentCore authentication

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGION="${AWS_REGION:-us-east-1}"
USER_POOL_NAME="${COGNITO_POOL_NAME:-agentcore-advocacy-content-generator}"
APP_CLIENT_NAME="${COGNITO_CLIENT_NAME:-agentcore-app-client}"
TEST_USERNAME="${TEST_USERNAME:-admin}"
TEST_PASSWORD="${TEST_PASSWORD:-TempPass123!}"

# Output file for credentials
OUTPUT_FILE="cognito-credentials.txt"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Cognito Setup for AgentCore Integration${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    echo "Please install AWS CLI: https://aws.amazon.com/cli/"
    exit 1
fi

# Check AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials are not configured${NC}"
    echo "Please run: aws configure"
    exit 1
fi

echo -e "${GREEN}✓ AWS CLI configured${NC}"
echo ""

# Step 1: Create Cognito User Pool
echo -e "${YELLOW}Step 1: Creating Cognito User Pool...${NC}"

USER_POOL_ID=$(aws cognito-idp create-user-pool \
    --pool-name "$USER_POOL_NAME" \
    --region "$REGION" \
    --policies '{
        "PasswordPolicy": {
            "MinimumLength": 8,
            "RequireUppercase": true,
            "RequireLowercase": true,
            "RequireNumbers": true,
            "RequireSymbols": true
        }
    }' \
    --auto-verified-attributes email \
    --username-attributes email \
    --mfa-configuration OFF \
    --account-recovery-setting '{
        "RecoveryMechanisms": [
            {
                "Priority": 1,
                "Name": "verified_email"
            }
        ]
    }' \
    --query 'UserPool.Id' \
    --output text 2>/dev/null || echo "")

if [ -z "$USER_POOL_ID" ]; then
    # Check if pool already exists
    USER_POOL_ID=$(aws cognito-idp list-user-pools \
        --max-results 60 \
        --region "$REGION" \
        --query "UserPools[?Name=='$USER_POOL_NAME'].Id" \
        --output text)
    
    if [ -z "$USER_POOL_ID" ]; then
        echo -e "${RED}Error: Failed to create or find User Pool${NC}"
        exit 1
    fi
    echo -e "${YELLOW}User Pool already exists: $USER_POOL_ID${NC}"
else
    echo -e "${GREEN}✓ User Pool created: $USER_POOL_ID${NC}"
fi

# Get User Pool ARN and Discovery URL
USER_POOL_ARN=$(aws cognito-idp describe-user-pool \
    --user-pool-id "$USER_POOL_ID" \
    --region "$REGION" \
    --query 'UserPool.Arn' \
    --output text)

DISCOVERY_URL="https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/openid-configuration"

echo ""

# Step 2: Create App Client
echo -e "${YELLOW}Step 2: Creating App Client...${NC}"

APP_CLIENT_ID=$(aws cognito-idp create-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-name "$APP_CLIENT_NAME" \
    --region "$REGION" \
    --generate-secret \
    --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
    --supported-identity-providers COGNITO \
    --allowed-o-auth-flows code implicit \
    --allowed-o-auth-scopes openid email profile \
    --allowed-o-auth-flows-user-pool-client \
    --callback-urls '["http://localhost:3000/callback"]' \
    --logout-urls '["http://localhost:3000/logout"]' \
    --query 'UserPoolClient.ClientId' \
    --output text 2>/dev/null || echo "")

if [ -z "$APP_CLIENT_ID" ]; then
    # Check if client already exists
    APP_CLIENT_ID=$(aws cognito-idp list-user-pool-clients \
        --user-pool-id "$USER_POOL_ID" \
        --region "$REGION" \
        --query "UserPoolClients[?ClientName=='$APP_CLIENT_NAME'].ClientId" \
        --output text | head -n1)
    
    if [ -z "$APP_CLIENT_ID" ]; then
        echo -e "${RED}Error: Failed to create or find App Client${NC}"
        exit 1
    fi
    echo -e "${YELLOW}App Client already exists: $APP_CLIENT_ID${NC}"
else
    echo -e "${GREEN}✓ App Client created: $APP_CLIENT_ID${NC}"
fi

# Get App Client Secret
APP_CLIENT_SECRET=$(aws cognito-idp describe-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-id "$APP_CLIENT_ID" \
    --region "$REGION" \
    --query 'UserPoolClient.ClientSecret' \
    --output text)

echo ""

# Step 3: Create Test User
echo -e "${YELLOW}Step 3: Creating test user...${NC}"

# Create user
aws cognito-idp admin-create-user \
    --user-pool-id "$USER_POOL_ID" \
    --username "$TEST_USERNAME" \
    --temporary-password "$TEST_PASSWORD" \
    --user-attributes Name=email,Value="${TEST_USERNAME}@example.com" Name=email_verified,Value=true \
    --message-action SUPPRESS \
    --region "$REGION" &> /dev/null || echo -e "${YELLOW}User may already exist${NC}"

# Set permanent password
aws cognito-idp admin-set-user-password \
    --user-pool-id "$USER_POOL_ID" \
    --username "$TEST_USERNAME" \
    --password "$TEST_PASSWORD" \
    --permanent \
    --region "$REGION" &> /dev/null

echo -e "${GREEN}✓ Test user created/updated: $TEST_USERNAME${NC}"
echo ""

# Step 4: Get Bearer Token
echo -e "${YELLOW}Step 4: Obtaining Bearer Token...${NC}"

# Authenticate and get tokens
AUTH_RESPONSE=$(aws cognito-idp admin-initiate-auth \
    --user-pool-id "$USER_POOL_ID" \
    --client-id "$APP_CLIENT_ID" \
    --auth-flow ADMIN_NO_SRP_AUTH \
    --auth-parameters USERNAME="$TEST_USERNAME",PASSWORD="$TEST_PASSWORD" \
    --region "$REGION" \
    --output json)

ACCESS_TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"AccessToken":"[^"]*' | cut -d'"' -f4)
ID_TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"IdToken":"[^"]*' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"RefreshToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}Error: Failed to obtain Bearer Token${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Bearer Token obtained successfully${NC}"
echo ""

# Step 5: Save credentials to file
echo -e "${YELLOW}Step 5: Saving credentials...${NC}"

cat > "$OUTPUT_FILE" << EOF
# Cognito Configuration for AgentCore Integration
# Generated: $(date)

# User Pool Information
USER_POOL_ID=$USER_POOL_ID
USER_POOL_ARN=$USER_POOL_ARN
REGION=$REGION

# App Client Information
APP_CLIENT_ID=$APP_CLIENT_ID
APP_CLIENT_SECRET=$APP_CLIENT_SECRET

# OAuth Configuration
DISCOVERY_URL=$DISCOVERY_URL
ISSUER=https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}

# Test User Credentials
TEST_USERNAME=$TEST_USERNAME
TEST_PASSWORD=$TEST_PASSWORD

# Authentication Tokens (Valid for 1 hour)
ACCESS_TOKEN=$ACCESS_TOKEN
ID_TOKEN=$ID_TOKEN
REFRESH_TOKEN=$REFRESH_TOKEN

# Usage Examples:

# 1. Use as Bearer Token in HTTP requests:
#    Authorization: Bearer $ACCESS_TOKEN

# 2. AgentCore Runtime URL format:
#    https://bedrock-agentcore.${REGION}.amazonaws.com/runtimes/{RUNTIME_ARN}/invocations?qualifier=DEFAULT

# 3. Environment variables for testing:
export COGNITO_USER_POOL_ID=$USER_POOL_ID
export COGNITO_CLIENT_ID=$APP_CLIENT_ID
export COGNITO_CLIENT_SECRET=$APP_CLIENT_SECRET
export BEARER_TOKEN=$ACCESS_TOKEN

# 4. .bedrock_agentcore.yaml configuration:
authentication:
  type: oauth
  discovery_url: $DISCOVERY_URL
  client_id: $APP_CLIENT_ID
EOF

echo -e "${GREEN}✓ Credentials saved to: $OUTPUT_FILE${NC}"
echo ""

# Display summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Setup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}User Pool ID:${NC} $USER_POOL_ID"
echo -e "${GREEN}App Client ID:${NC} $APP_CLIENT_ID"
echo -e "${GREEN}Discovery URL:${NC} $DISCOVERY_URL"
echo -e "${GREEN}Test Username:${NC} $TEST_USERNAME"
echo ""
echo -e "${YELLOW}Important Notes:${NC}"
echo "1. Credentials saved to: $OUTPUT_FILE"
echo "2. Bearer Token is valid for 1 hour"
echo "3. Use REFRESH_TOKEN to get new tokens when expired"
echo "4. Keep credentials secure and never commit to git"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update .bedrock_agentcore.yaml with Discovery URL and Client ID"
echo "2. Use Bearer Token for AgentCore Runtime authentication"
echo "3. Test authentication with remote MCP client"
echo ""
echo -e "${GREEN}Setup completed successfully!${NC}"
