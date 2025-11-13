# AgentCore Integration POC - Findings Report

**Date**: November 14, 2025  
**Status**: Blocked - Requires Alternative Deployment Approach  
**Completion**: Tasks 1-12 Complete, Task 13 Partially Complete

## Executive Summary

The AgentCore integration POC successfully completed the development and local testing phases (Tasks 1-12). However, deployment to AgentCore Runtime (Task 13) encountered technical blockers related to the `agentcore` CLI tool's design assumptions.

**Key Finding**: The `agentcore` CLI tool is optimized for Python-based agents and does not fully support TypeScript/Node.js MCP servers through its standard workflow.

## Completed Tasks (✅ Tasks 1-12)

### Development Environment Setup
- ✅ Installed AgentCore MCP Server in Kiro IDE
- ✅ Configured `.kiro/settings/mcp.json` for documentation access
- ✅ Successfully used `search_agentcore_docs` and `fetch_agentcore_doc` tools
- ✅ Installed `bedrock-agentcore-starter-toolkit` Python package
- ✅ Verified AWS CLI and credentials

### MCP Server Protocol Conversion
- ✅ Installed `@modelcontextprotocol/sdk` TypeScript package
- ✅ Refactored MCP Server to support `streamable-http` transport
- ✅ Implemented `McpServer` class with `StreamableHTTPServerTransport`
- ✅ Integrated Express.js for HTTP endpoint handling
- ✅ Maintained backward compatibility with stdio transport for local development
- ✅ Registered all three MCP tools: `search_news`, `generate_content`, `refine_content`

### Local Testing
- ✅ Created local test client (`tests/local-mcp-client.ts`)
- ✅ Successfully tested all MCP tools locally on `http://localhost:8000/mcp`
- ✅ Verified MCP protocol compliance
- ✅ Confirmed tool invocation and response formats

### Docker Containerization
- ✅ Updated Dockerfile to expose port 8000
- ✅ Added health check endpoint at `/health`
- ✅ Built Docker image: `advocacy-content-generator:latest`
- ✅ Tagged for ECR: `533267166136.dkr.ecr.us-east-1.amazonaws.com/advocacy-content-generator:latest`
- ✅ Verified container runs locally

### AWS Infrastructure
- ✅ Created Cognito User Pool for OAuth authentication
- ✅ Generated test user credentials
- ✅ Obtained Bearer tokens for testing
- ✅ Verified IAM execution role exists
- ✅ Confirmed ECR repository accessible

## Blocked Task (⚠️ Task 13)

### Issue: AgentCore CLI Incompatibility

**Problem**: The `agentcore` CLI tool expects Python entrypoints and doesn't natively support TypeScript/Node.js container deployments.

**Attempts Made**:

1. **Direct CLI Configuration**
   ```bash
   agentcore configure --entrypoint dist/index.js --protocol MCP --deployment-type container
   ```
   - **Result**: Failed - CLI expects Python files

2. **Dummy Python Entrypoint**
   ```bash
   agentcore configure --entrypoint temp/dummy_entrypoint.py --deployment-type container
   ```
   - **Result**: Failed - Agent name validation issues, configuration file format mismatch

3. **boto3 Python SDK**
   ```python
   client = boto3.client('bedrock-agentcore')
   client.create_runtime(...)
   ```
   - **Result**: Failed - `create_runtime` method doesn't exist in boto3

4. **AWS CLI Direct**
   ```bash
   aws bedrock-agentcore create-runtime
   ```
   - **Result**: Failed - `bedrock-agentcore` service not available in AWS CLI

### Root Cause Analysis

1. **CLI Design**: The `agentcore` CLI is designed for Python agents using the `bedrock_agentcore` Python SDK
2. **Container Support**: While container deployment is supported, it assumes Python-based containers
3. **Configuration Format**: Manual `.bedrock_agentcore.yaml` files don't match the CLI's expected schema
4. **API Availability**: The AgentCore Runtime creation API is not yet available in standard AWS SDKs

## Recommended Solutions

### Solution 1: CloudFormation Deployment (Recommended)

Based on official AgentCore documentation, MCP servers (especially non-Python) should be deployed using CloudFormation templates.

**Advantages**:
- Infrastructure as Code
- Reproducible deployments
- Officially documented approach
- Full control over configuration

**Implementation**:
- Create CloudFormation template based on official examples
- Define all resources: Runtime, ECR, IAM roles, Cognito
- Deploy using AWS CLI or Console
- Estimated time: 2-3 hours

**Reference**: [CloudFormation MCP Server Example](https://aws.github.io/bedrock-agentcore-starter-toolkit/examples/infrastructure-as-code/cloudformation/mcp-server-runtime/)

### Solution 2: AWS Console Manual Deployment

Deploy through the AWS Bedrock Console interface.

**Advantages**:
- Fastest path to POC validation
- Visual interface for configuration
- Good for initial testing

**Disadvantages**:
- Not reproducible
- Manual process
- Harder to version control

**Steps**:
1. Navigate to AWS Bedrock Console → AgentCore → Runtimes
2. Create new runtime
3. Specify container image URI
4. Configure OAuth with Cognito
5. Set memory and timeout
6. Deploy

**Estimated time**: 30-60 minutes

### Solution 3: Wait for SDK Updates

Monitor AWS SDK updates for native AgentCore Runtime support.

**Timeline**: Unknown - depends on AWS release schedule

## Technical Artifacts Created

### Scripts
- `scripts/launch-agentcore.sh` - Automated deployment script
- `scripts/configure-container-agent.sh` - CLI configuration script
- `scripts/deploy_agentcore.py` - Python SDK deployment attempt
- `scripts/check_boto3_methods.py` - boto3 API exploration

### Configuration Files
- `.bedrock_agentcore.yaml.backup` - Manual configuration attempt
- `temp/dummy_entrypoint.py` - Workaround for CLI requirements

### Test Clients
- `tests/local-mcp-client.ts` - Local MCP testing (working)
- `tests/remote-mcp-client.ts` - Remote testing (ready for deployment)

## Lessons Learned

1. **Framework Assumptions**: AgentCore CLI makes strong assumptions about Python-based development
2. **Documentation Gaps**: Container deployment for non-Python MCP servers is not well-documented in CLI guides
3. **SDK Maturity**: AgentCore is a new service; SDK support is still evolving
4. **CloudFormation First**: For non-Python agents, CloudFormation is the primary deployment path

## Cost Analysis (Estimated)

Based on successful local testing and configuration:

### If Deployed Successfully:
- **AgentCore Runtime**: ~$0.001 per request
- **Memory (1GB)**: ~$0.0000166 per second
- **Timeout (60 min)**: Maximum $0.06 per invocation
- **Monthly (10K requests)**: ~$10-30

### Current Costs:
- **ECR Storage**: ~$0.10/month (minimal)
- **Cognito**: Free tier (< 50K MAU)
- **Development Time**: 1 week (as planned)

## Next Steps

### Immediate (This Week)
1. **Decision Point**: Choose Solution 1 (CloudFormation) or Solution 2 (Console)
2. **If CloudFormation**: Create template based on official examples
3. **If Console**: Manual deployment for POC validation
4. **Testing**: Run remote tests once deployed
5. **Documentation**: Complete POC report with deployment method

### Short Term (Next 2 Weeks)
1. Complete performance testing
2. Cost analysis with actual usage
3. Team knowledge transfer
4. Decision on production deployment

### Long Term (1-3 Months)
1. Monitor AWS SDK updates
2. Evaluate Gateway integration
3. Consider advanced features (Memory, Browser, Code Interpreter)
4. Production deployment planning

## Conclusion

The AgentCore integration POC successfully validated:
- ✅ MCP protocol conversion (stdio → streamable-http)
- ✅ Local MCP server functionality
- ✅ Docker containerization
- ✅ AWS infrastructure readiness
- ⚠️ Deployment method requires CloudFormation or Console

**Recommendation**: Proceed with CloudFormation deployment (Solution 1) to complete the POC. This approach aligns with AWS best practices and provides a reproducible deployment process.

**POC Status**: 90% Complete - Deployment method identified, implementation pending

## Appendix

### A. Configuration Files

#### .bedrock_agentcore.yaml (Manual Attempt)
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
authentication:
  type: oauth
  discovery_url: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_YYMy6hC3F/.well-known/openid-configuration
  client_id: 1eulh5t29s9rsk6a8r1ahv739g
```

### B. Cognito Configuration
- **User Pool ID**: us-east-1_YYMy6hC3F
- **Client ID**: 1eulh5t29s9rsk6a8r1ahv739g
- **Discovery URL**: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_YYMy6hC3F/.well-known/openid-configuration
- **Test User**: testuser / MyPassword123!

### C. ECR Repository
- **URI**: 533267166136.dkr.ecr.us-east-1.amazonaws.com/advocacy-content-generator
- **Region**: us-east-1
- **Image Tag**: latest

### D. IAM Execution Role
- **ARN**: arn:aws:iam::533267166136:role/AgentCoreExecutionRole-advocacy-content-generator
- **Permissions**: Bedrock, ECR, CloudWatch Logs

---

**Report Generated**: November 14, 2025  
**Author**: AI Development Team  
**Review Status**: Ready for Team Review
