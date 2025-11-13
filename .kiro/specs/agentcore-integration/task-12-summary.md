# Task 12 Summary: AgentCore Deployment Configuration

## Completion Date
November 14, 2025

## Task Overview
Successfully configured AgentCore deployment with all required components including IAM roles, ECR repository, Cognito authentication, and the `.bedrock_agentcore.yaml` configuration file.

## Completed Sub-tasks

### 1. ✅ IAM Execution Role Configuration
- **Role Name**: `AgentCoreExecutionRole-advocacy-content-generator`
- **Role ARN**: `arn:aws:iam::533267166136:role/AgentCoreExecutionRole-advocacy-content-generator`
- **Permissions**: 
  - Bedrock model invocation
  - CloudWatch Logs
  - ECR image access

### 2. ✅ ECR Repository Configuration
- **Repository Name**: `advocacy-content-generator`
- **Repository URI**: `533267166136.dkr.ecr.us-east-1.amazonaws.com/advocacy-content-generator`
- **Region**: `us-east-1`
- **Features**: Image scanning enabled, AES256 encryption

### 3. ✅ Cognito Authentication Setup
- **User Pool ID**: `us-east-1_YYMy6hC3F`
- **App Client ID**: `1eulh5t29s9rsk6a8r1ahv739g`
- **Discovery URL**: `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_YYMy6hC3F/.well-known/openid-configuration`
- **Test User**: `admin@example.com`
- **Auth Flows**: ALLOW_ADMIN_USER_PASSWORD_AUTH, ALLOW_REFRESH_TOKEN_AUTH

### 4. ✅ AgentCore Configuration File
Created `.bedrock_agentcore.yaml` with:
- **Protocol**: MCP
- **Runtime Memory**: 1024 MB
- **Timeout**: 3600 seconds (60 minutes)
- **Environment Variables**: SERVICE_MODE, MCP_TRANSPORT, AWS_REGION, LOG_LEVEL, PORT
- **OAuth Authentication**: Configured with Cognito discovery URL and client ID

### 5. ✅ Verification Scripts
Created verification scripts:
- `scripts/configure-agentcore.sh` - Main configuration script
- `scripts/fix-cognito-auth.sh` - Cognito authentication with SECRET_HASH
- `scripts/verify-agentcore-config.sh` - Comprehensive configuration verification

## Configuration Files Created

### 1. `.bedrock_agentcore.yaml`
```yaml
name: advocacy-content-generator
protocol: MCP
version: 1.0.0

runtime:
  memory: 1024
  timeout: 3600
  environment:
    SERVICE_MODE: mcp-only
    MCP_TRANSPORT: streamable-http
    AWS_REGION: us-east-1
    LOG_LEVEL: info
    PORT: "8000"

execution_role: arn:aws:iam::533267166136:role/AgentCoreExecutionRole-advocacy-content-generator

container:
  image: 533267166136.dkr.ecr.us-east-1.amazonaws.com/advocacy-content-generator:latest
  port: 8000
  dockerfile: Dockerfile

authentication:
  type: oauth
  discovery_url: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_YYMy6hC3F/.well-known/openid-configuration
  client_id: 1eulh5t29s9rsk6a8r1ahv739g
```

### 2. `cognito-credentials.txt`
Contains:
- User Pool information
- App Client credentials
- OAuth configuration
- Test user credentials
- Bearer tokens (valid for 1 hour)

## Issues Encountered and Resolved

### Issue 1: Cognito App Client Secret Hash
**Problem**: Initial authentication failed because the app client was created with a secret but SECRET_HASH was not provided.

**Solution**: 
1. Updated app client to enable ALLOW_ADMIN_USER_PASSWORD_AUTH flow
2. Created `fix-cognito-auth.sh` script to calculate SECRET_HASH using OpenSSL
3. Successfully authenticated and obtained Bearer tokens

### Issue 2: Username Format
**Problem**: Cognito User Pool was configured to use email as username, but initial setup used plain username.

**Solution**: Updated test username to `admin@example.com` format to match User Pool configuration.

### Issue 3: Auth Flow Not Enabled
**Problem**: ADMIN_NO_SRP_AUTH flow was not enabled on the app client.

**Solution**: Updated app client with correct explicit auth flows using AWS CLI.

## Verification Results

All configuration components verified successfully:
- ✅ Configuration file exists and is valid
- ✅ IAM execution role exists with correct permissions
- ✅ ECR repository exists and is accessible
- ✅ Cognito User Pool and App Client configured correctly
- ✅ OAuth discovery endpoint is accessible
- ✅ Application build artifacts exist (dist/index.js)
- ✅ Dockerfile exists

## Requirements Satisfied

- **Requirement 6.1**: ✅ Configuration file created with `agentcore configure` equivalent
- **Requirement 6.2**: ✅ IAM execution role configured
- **Requirement 6.3**: ✅ ECR repository configured
- **Requirement 6.4**: ✅ N/A for Node.js project (no requirements.txt needed)
- **Requirement 6.5**: ✅ OAuth discovery URL and client ID configured

## Next Steps

1. **Build and Push Docker Image**
   ```bash
   ./scripts/build-and-push-docker.sh
   ```

2. **Deploy to AgentCore Runtime**
   ```bash
   ./scripts/deploy-agentcore.sh
   ```
   Or manually:
   ```bash
   uvx bedrock-agentcore-starter-toolkit launch
   ```

3. **Test Remote MCP Server**
   - Use Bearer token from `cognito-credentials.txt`
   - Test with remote MCP client
   - Verify all three tools work correctly

## Important Notes

1. **Bearer Token Expiration**: Access tokens expire after 1 hour. Use the refresh token to obtain new tokens when needed.

2. **Security**: The `cognito-credentials.txt` file contains sensitive information and should never be committed to version control. It's already in `.gitignore`.

3. **Token Refresh**: To get a new Bearer token after expiration:
   ```bash
   ./scripts/refresh-cognito-token.sh
   ```

4. **Configuration Updates**: If you need to update the configuration, you can:
   - Manually edit `.bedrock_agentcore.yaml`
   - Re-run `./scripts/configure-agentcore.sh`

## Files Modified/Created

### Created:
- `.bedrock_agentcore.yaml` - AgentCore deployment configuration
- `cognito-credentials.txt` - Cognito authentication credentials
- `scripts/fix-cognito-auth.sh` - Cognito authentication script
- `scripts/verify-agentcore-config.sh` - Configuration verification script

### Modified:
- None (all configuration was new)

## Lessons Learned

1. **Cognito App Client Configuration**: When creating app clients with secrets, ensure the correct auth flows are enabled and SECRET_HASH is calculated properly.

2. **Username Format**: Always check User Pool configuration for username requirements (email vs username).

3. **Configuration Validation**: Comprehensive verification scripts help catch configuration issues early before deployment.

4. **Token Management**: Bearer tokens have limited lifetime (1 hour), so refresh token mechanism is essential for long-running operations.

## Task Status
✅ **COMPLETED** - All sub-tasks completed successfully and verified.
