#!/bin/bash

set -e

echo "=== Configuring AgentCore Agent ==="
echo ""

# Read values from .bedrock_agentcore.yaml
AGENT_NAME="advocacy-content-generator"
EXECUTION_ROLE="arn:aws:iam::533267166136:role/AgentCoreExecutionRole-advocacy-content-generator"
ECR_REPO="533267166136.dkr.ecr.us-east-1.amazonaws.com/advocacy-content-generator"
DISCOVERY_URL="https://cognito-idp.us-east-1.amazonaws.com/us-east-1_YYMy6hC3F/.well-known/openid-configuration"
CLIENT_ID="1eulh5t29s9rsk6a8r1ahv739g"

# Create OAuth authorizer JSON
OAUTH_JSON=$(cat <<EOF
{
  "type": "oauth",
  "discovery_url": "${DISCOVERY_URL}",
  "client_id": "${CLIENT_ID}"
}
EOF
)

echo "Configuring agent: ${AGENT_NAME}"
echo "Protocol: MCP"
echo "Deployment type: container"
echo ""

# Run agentcore configure
agentcore configure \
  --name "${AGENT_NAME}" \
  --entrypoint dist/index.js \
  --protocol MCP \
  --deployment-type container \
  --execution-role "${EXECUTION_ROLE}" \
  --container-registry "${ECR_REPO}" \
  --authorization-config "${OAUTH_JSON}" \
  --region us-east-1 \
  --non-interactive

echo ""
echo "=== Configuration Complete ==="
echo ""
echo "Verify configuration:"
echo "  agentcore configure list"
echo ""
echo "Next step:"
echo "  ./scripts/launch-agentcore.sh"
