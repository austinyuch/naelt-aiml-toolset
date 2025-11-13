#!/bin/bash

set -e

echo "=== Configuring AgentCore for Container Deployment ==="
echo ""

# For container deployments, we need a dummy Python file as entrypoint
# The actual container will use Node.js, but the CLI needs a Python file reference
mkdir -p temp
cat > temp/dummy_entrypoint.py <<'EOF'
# Dummy entrypoint for container deployment
# The actual MCP server runs in the container (Node.js/TypeScript)
# This file is only needed for agentcore CLI configuration
pass
EOF

echo "Created dummy entrypoint file"
echo ""

# Configure with container deployment
# Note: Agent name must use underscores, not hyphens
agentcore configure \
  --entrypoint temp/dummy_entrypoint.py \
  --name advocacy_content_generator \
  --protocol MCP \
  --deployment-type container \
  --execution-role arn:aws:iam::533267166136:role/AgentCoreExecutionRole-advocacy-content-generator \
  --container-runtime 533267166136.dkr.ecr.us-east-1.amazonaws.com/advocacy-content-generator \
  --authorizer-config '{"type":"oauth","discovery_url":"https://cognito-idp.us-east-1.amazonaws.com/us-east-1_YYMy6hC3F/.well-known/openid-configuration","client_id":"1eulh5t29s9rsk6a8r1ahv739g"}' \
  --region us-east-1 \
  --disable-memory \
  --non-interactive

echo ""
echo "=== Configuration Complete ==="
echo ""
echo "Verify configuration:"
echo "  agentcore configure list"
echo ""
echo "Next step:"
echo "  agentcore launch --agent advocacy_content_generator"
