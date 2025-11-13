# Cognito Setup Guide for AgentCore Integration

This guide explains how to set up AWS Cognito authentication for AgentCore Runtime deployment.

## Overview

AgentCore Runtime requires OAuth 2.0 authentication. We use AWS Cognito to provide:

- User Pool for identity management
- App Client for OAuth configuration
- Bearer Tokens for API authentication

## Prerequisites

1. **AWS CLI** installed and configured
   ```bash
   aws --version  # Should be >= 2.0
   aws configure  # Set up credentials
   ```

2. **AWS Permissions** - Your IAM user/role needs:
   - `cognito-idp:CreateUserPool`
   - `cognito-idp:CreateUserPoolClient`
   - `cognito-idp:AdminCreateUser`
   - `cognito-idp:AdminSetUserPassword`
   - `cognito-idp:AdminInitiateAuth`

## Quick Start

### 1. Run Setup Script

```bash
./scripts/setup-cognito.sh
```

This script will:
- ✅ Create Cognito User Pool
- ✅ Create App Client with OAuth configuration
- ✅ Create test user account
- ✅ Obtain Bearer Token
- ✅ Save all credentials to `cognito-credentials.txt`

### 2. Review Credentials

The script generates `cognito-credentials.txt` with:

```bash
# User Pool Information
USER_POOL_ID=us-east-1_XXXXXXXXX
DISCOVERY_URL=https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX/.well-known/openid-configuration

# App Client Information
APP_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
APP_CLIENT_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXX

# Test User
TEST_USERNAME=admin
TEST_PASSWORD=TempPass123!

# Bearer Token (valid for 1 hour)
ACCESS_TOKEN=eyJraWQiOiJ...
```

**⚠️ Important**: Never commit `cognito-credentials.txt` to git!

## Configuration

### Environment Variables

Export credentials for testing:

```bash
source cognito-credentials.txt
```

Or manually:

```bash
export COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
export COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
export BEARER_TOKEN=eyJraWQiOiJ...
```

### AgentCore Configuration

Update `.bedrock_agentcore.yaml`:

```yaml
authentication:
  type: oauth
  discovery_url: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXXXXXX/.well-known/openid-configuration
  client_id: XXXXXXXXXXXXXXXXXXXXXXXXXX
```

## Token Management

### Token Expiration

Bearer Tokens expire after **1 hour**. You'll see this error when expired:

```
401 Unauthorized: Token has expired
```

### Refresh Token

Use the refresh script to get a new token:

```bash
./scripts/refresh-cognito-token.sh
```

This updates `cognito-credentials.txt` with new tokens.

### Manual Token Refresh

```bash
aws cognito-idp admin-initiate-auth \
  --user-pool-id $USER_POOL_ID \
  --client-id $APP_CLIENT_ID \
  --auth-flow REFRESH_TOKEN_AUTH \
  --auth-parameters REFRESH_TOKEN=$REFRESH_TOKEN \
  --region us-east-1
```

## Testing Authentication

### Test with curl

```bash
# Load credentials
source cognito-credentials.txt

# Test authentication
curl -X POST \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/{RUNTIME_ARN}/invocations
```

### Test with MCP Client

```typescript
const transport = new StreamableHTTPClientTransport(mcpUrl, {
  headers: {
    'authorization': `Bearer ${process.env.BEARER_TOKEN}`,
    'Content-Type': 'application/json'
  }
});
```

## Customization

### Custom Configuration

Set environment variables before running setup:

```bash
export AWS_REGION=us-west-2
export COGNITO_POOL_NAME=my-custom-pool
export COGNITO_CLIENT_NAME=my-app-client
export TEST_USERNAME=testuser
export TEST_PASSWORD=MySecurePass123!

./scripts/setup-cognito.sh
```

### Multiple Environments

Create separate User Pools for different environments:

```bash
# Development
COGNITO_POOL_NAME=agentcore-dev ./scripts/setup-cognito.sh

# Staging
COGNITO_POOL_NAME=agentcore-staging ./scripts/setup-cognito.sh

# Production
COGNITO_POOL_NAME=agentcore-prod ./scripts/setup-cognito.sh
```

## Troubleshooting

### Error: AWS CLI not installed

```bash
# Install AWS CLI
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### Error: AWS credentials not configured

```bash
aws configure
# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region (us-east-1)
# - Default output format (json)
```

### Error: Insufficient permissions

Your IAM user needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:CreateUserPool",
        "cognito-idp:CreateUserPoolClient",
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminSetUserPassword",
        "cognito-idp:AdminInitiateAuth",
        "cognito-idp:DescribeUserPool",
        "cognito-idp:DescribeUserPoolClient",
        "cognito-idp:ListUserPools",
        "cognito-idp:ListUserPoolClients"
      ],
      "Resource": "*"
    }
  ]
}
```

### Error: User Pool already exists

The script handles existing resources. If you want to start fresh:

```bash
# Delete existing User Pool
aws cognito-idp delete-user-pool \
  --user-pool-id $USER_POOL_ID \
  --region us-east-1

# Run setup again
./scripts/setup-cognito.sh
```

### Error: Token expired

Refresh the token:

```bash
./scripts/refresh-cognito-token.sh
```

## Security Best Practices

### 1. Secure Credentials

```bash
# Add to .gitignore
echo "cognito-credentials.txt" >> .gitignore

# Set restrictive permissions
chmod 600 cognito-credentials.txt
```

### 2. Use Strong Passwords

For production, use strong passwords:

```bash
export TEST_PASSWORD='MyV3ry$ecur3P@ssw0rd!'
./scripts/setup-cognito.sh
```

### 3. Rotate Tokens Regularly

- Access Tokens expire after 1 hour (good)
- Refresh Tokens expire after 30 days
- Rotate credentials monthly in production

### 4. Use Secrets Manager (Production)

For production deployments, store credentials in AWS Secrets Manager:

```bash
aws secretsmanager create-secret \
  --name agentcore/cognito \
  --secret-string file://cognito-credentials.txt
```

## Cleanup

### Remove Cognito Resources

```bash
# Delete User Pool (this deletes everything)
aws cognito-idp delete-user-pool \
  --user-pool-id $USER_POOL_ID \
  --region us-east-1

# Remove credentials file
rm cognito-credentials.txt
```

## Next Steps

After Cognito setup:

1. ✅ Update `.bedrock_agentcore.yaml` with Discovery URL and Client ID
2. ✅ Configure AgentCore deployment with `agentcore configure`
3. ✅ Deploy to AgentCore Runtime with `agentcore launch`
4. ✅ Test authentication with remote MCP client

## Reference

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [AgentCore Authentication](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/authentication.html)
- [OAuth 2.0 Specification](https://oauth.net/2/)

## Support

For issues or questions:

1. Check CloudWatch Logs for Cognito events
2. Verify IAM permissions
3. Test with AWS CLI commands
4. Review AgentCore Runtime logs
