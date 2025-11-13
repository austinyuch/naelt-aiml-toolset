#!/bin/bash

# Cognito Token Refresh Script
# This script refreshes the Bearer Token using the refresh token

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if credentials file exists
CREDENTIALS_FILE="cognito-credentials.txt"

if [ ! -f "$CREDENTIALS_FILE" ]; then
    echo -e "${RED}Error: $CREDENTIALS_FILE not found${NC}"
    echo "Please run setup-cognito.sh first"
    exit 1
fi

# Source credentials
source "$CREDENTIALS_FILE"

echo -e "${BLUE}Refreshing Cognito Bearer Token...${NC}"
echo ""

# Check required variables
if [ -z "$USER_POOL_ID" ] || [ -z "$APP_CLIENT_ID" ] || [ -z "$REFRESH_TOKEN" ]; then
    echo -e "${RED}Error: Missing required credentials${NC}"
    echo "Please run setup-cognito.sh again"
    exit 1
fi

# Refresh tokens
AUTH_RESPONSE=$(aws cognito-idp admin-initiate-auth \
    --user-pool-id "$USER_POOL_ID" \
    --client-id "$APP_CLIENT_ID" \
    --auth-flow REFRESH_TOKEN_AUTH \
    --auth-parameters REFRESH_TOKEN="$REFRESH_TOKEN" \
    --region "${REGION:-us-east-1}" \
    --output json)

NEW_ACCESS_TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"AccessToken":"[^"]*' | cut -d'"' -f4)
NEW_ID_TOKEN=$(echo "$AUTH_RESPONSE" | grep -o '"IdToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$NEW_ACCESS_TOKEN" ]; then
    echo -e "${RED}Error: Failed to refresh token${NC}"
    echo "You may need to run setup-cognito.sh again"
    exit 1
fi

# Update credentials file
sed -i.bak "s|ACCESS_TOKEN=.*|ACCESS_TOKEN=$NEW_ACCESS_TOKEN|" "$CREDENTIALS_FILE"
sed -i.bak "s|ID_TOKEN=.*|ID_TOKEN=$NEW_ID_TOKEN|" "$CREDENTIALS_FILE"
sed -i.bak "s|export BEARER_TOKEN=.*|export BEARER_TOKEN=$NEW_ACCESS_TOKEN|" "$CREDENTIALS_FILE"

rm -f "${CREDENTIALS_FILE}.bak"

echo -e "${GREEN}✓ Token refreshed successfully${NC}"
echo ""
echo -e "${GREEN}New Access Token:${NC}"
echo "$NEW_ACCESS_TOKEN"
echo ""
echo -e "${YELLOW}Updated credentials saved to: $CREDENTIALS_FILE${NC}"
echo ""
echo -e "${GREEN}Export to environment:${NC}"
echo "export BEARER_TOKEN=$NEW_ACCESS_TOKEN"
