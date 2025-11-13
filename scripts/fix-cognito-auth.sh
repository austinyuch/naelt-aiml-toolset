#!/bin/bash

# Fix Cognito Authentication with SECRET_HASH
set -e

REGION="us-east-1"
USER_POOL_ID="us-east-1_YYMy6hC3F"
APP_CLIENT_ID="1eulh5t29s9rsk6a8r1ahv739g"
TEST_USERNAME="admin@example.com"
TEST_PASSWORD="TempPass123!"
OUTPUT_FILE="cognito-credentials.txt"

echo "Getting App Client Secret..."
APP_CLIENT_SECRET=$(aws cognito-idp describe-user-pool-client \
    --user-pool-id "$USER_POOL_ID" \
    --client-id "$APP_CLIENT_ID" \
    --region "$REGION" \
    --query 'UserPoolClient.ClientSecret' \
    --output text)

echo "App Client Secret obtained"

# Calculate SECRET_HASH
SECRET_HASH=$(echo -n "${TEST_USERNAME}${APP_CLIENT_ID}" | openssl dgst -sha256 -hmac "$APP_CLIENT_SECRET" -binary | base64)

echo "Authenticating with SECRET_HASH..."

# Authenticate with SECRET_HASH
AUTH_RESPONSE=$(aws cognito-idp admin-initiate-auth \
    --user-pool-id "$USER_POOL_ID" \
    --client-id "$APP_CLIENT_ID" \
    --auth-flow ADMIN_NO_SRP_AUTH \
    --auth-parameters USERNAME="$TEST_USERNAME",PASSWORD="$TEST_PASSWORD",SECRET_HASH="$SECRET_HASH" \
    --region "$REGION" \
    --output json)

ACCESS_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.AuthenticationResult.AccessToken')
ID_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.AuthenticationResult.IdToken')
REFRESH_TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.AuthenticationResult.RefreshToken')

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" == "null" ]; then
    echo "Error: Failed to obtain Bearer Token"
    echo "Response: $AUTH_RESPONSE"
    exit 1
fi

echo "✓ Bearer Token obtained successfully"

# Get other information
USER_POOL_ARN=$(aws cognito-idp describe-user-pool \
    --user-pool-id "$USER_POOL_ID" \
    --region "$REGION" \
    --query 'UserPool.Arn' \
    --output text)

DISCOVERY_URL="https://cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}/.well-known/openid-configuration"

# Save credentials
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

echo "✓ Credentials saved to: $OUTPUT_FILE"
echo ""
echo "=========================================="
echo "Cognito Setup Complete!"
echo "=========================================="
echo ""
echo "User Pool ID: $USER_POOL_ID"
echo "App Client ID: $APP_CLIENT_ID"
echo "Discovery URL: $DISCOVERY_URL"
echo ""
