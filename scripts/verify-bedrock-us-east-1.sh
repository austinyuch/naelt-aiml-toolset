#!/bin/bash

# Bedrock Verification Script for us-east-1
# Verifies Bedrock service availability and model access

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

REGION="us-east-1"

echo "=========================================="
echo "Bedrock Verification (us-east-1)"
echo "=========================================="
echo ""

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
    fi
}

print_info() {
    echo -e "ℹ $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Check AWS credentials
echo "1. Checking AWS credentials..."
if aws sts get-caller-identity >/dev/null 2>&1; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    print_status 0 "AWS credentials configured"
    print_info "Account ID: $ACCOUNT_ID"
else
    print_status 1 "AWS credentials not configured"
    exit 1
fi
echo ""

# 2. List foundation models
echo "2. Listing Bedrock foundation models in us-east-1..."
if aws bedrock list-foundation-models --region $REGION >/dev/null 2>&1; then
    print_status 0 "Bedrock service accessible in us-east-1"
    
    # Count Claude models
    CLAUDE_MODELS=$(aws bedrock list-foundation-models \
        --region $REGION \
        --query 'modelSummaries[?contains(modelId, `anthropic.claude`)].modelId' \
        --output text | wc -w)
    
    print_info "Available Claude models: $CLAUDE_MODELS"
    
    # List specific models
    echo ""
    echo "Available Claude Models:"
    aws bedrock list-foundation-models \
        --region $REGION \
        --query 'modelSummaries[?contains(modelId, `anthropic.claude`)].{ModelId:modelId,Name:modelName}' \
        --output table
else
    print_status 1 "Bedrock service not accessible in us-east-1"
    exit 1
fi
echo ""

# 3. Test Claude 3 Haiku invocation
echo "3. Testing Claude 3 Haiku model invocation..."
TEMP_OUTPUT=$(mktemp)
TEST_BODY='{"anthropic_version":"bedrock-2023-05-31","max_tokens":50,"messages":[{"role":"user","content":"Say hello in one word"}]}'

if aws bedrock-runtime invoke-model \
    --model-id anthropic.claude-3-haiku-20240307-v1:0 \
    --body "$TEST_BODY" \
    --region $REGION \
    "$TEMP_OUTPUT" 2>/dev/null; then
    
    print_status 0 "Claude 3 Haiku invocation successful"
    
    # Parse response
    RESPONSE=$(cat "$TEMP_OUTPUT" | jq -r '.content[0].text' 2>/dev/null || echo "Unable to parse response")
    print_info "Model response: $RESPONSE"
    
    # Show token usage
    INPUT_TOKENS=$(cat "$TEMP_OUTPUT" | jq -r '.usage.input_tokens' 2>/dev/null || echo "N/A")
    OUTPUT_TOKENS=$(cat "$TEMP_OUTPUT" | jq -r '.usage.output_tokens' 2>/dev/null || echo "N/A")
    print_info "Token usage: Input=$INPUT_TOKENS, Output=$OUTPUT_TOKENS"
else
    print_status 1 "Claude 3 Haiku invocation failed"
    print_warning "You may need to request model access in AWS Console"
    print_info "Go to: AWS Console → Bedrock → Model access"
fi
rm -f "$TEMP_OUTPUT"
echo ""

# 4. Test Claude 3.5 Sonnet invocation
echo "4. Testing Claude 3.5 Sonnet model invocation..."
TEMP_OUTPUT=$(mktemp)

if aws bedrock-runtime invoke-model \
    --model-id anthropic.claude-3-5-sonnet-20241022-v2:0 \
    --body "$TEST_BODY" \
    --region $REGION \
    "$TEMP_OUTPUT" 2>/dev/null; then
    
    print_status 0 "Claude 3.5 Sonnet invocation successful"
    
    # Parse response
    RESPONSE=$(cat "$TEMP_OUTPUT" | jq -r '.content[0].text' 2>/dev/null || echo "Unable to parse response")
    print_info "Model response: $RESPONSE"
    
    # Show token usage
    INPUT_TOKENS=$(cat "$TEMP_OUTPUT" | jq -r '.usage.input_tokens' 2>/dev/null || echo "N/A")
    OUTPUT_TOKENS=$(cat "$TEMP_OUTPUT" | jq -r '.usage.output_tokens' 2>/dev/null || echo "N/A")
    print_info "Token usage: Input=$INPUT_TOKENS, Output=$OUTPUT_TOKENS"
else
    print_status 1 "Claude 3.5 Sonnet invocation failed"
    print_warning "You may need to request model access in AWS Console"
fi
rm -f "$TEMP_OUTPUT"
echo ""

# 5. Check streaming capability
echo "5. Testing streaming invocation..."
TEMP_OUTPUT=$(mktemp)

if aws bedrock-runtime invoke-model-with-response-stream \
    --model-id anthropic.claude-3-haiku-20240307-v1:0 \
    --body "$TEST_BODY" \
    --region $REGION \
    "$TEMP_OUTPUT" 2>/dev/null; then
    
    print_status 0 "Streaming invocation supported"
else
    print_warning "Streaming invocation test inconclusive"
fi
rm -f "$TEMP_OUTPUT"
echo ""

# Summary
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo "Region: us-east-1"
echo "Account: $ACCOUNT_ID"
echo ""
echo "Bedrock Service Status:"
echo "  ✓ Service accessible"
echo "  ✓ Foundation models listed"
echo ""
echo "Model Access Status:"
echo "  - Claude 3 Haiku: Check output above"
echo "  - Claude 3.5 Sonnet: Check output above"
echo ""
echo "Next Steps:"
echo "1. If model access failed, request access in AWS Console:"
echo "   https://console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess"
echo ""
echo "2. Once access is granted, you can proceed with AgentCore deployment"
echo ""
echo "3. Use this region for AgentCore configuration:"
echo "   agentcore configure --region us-east-1"
echo ""
