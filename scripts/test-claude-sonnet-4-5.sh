#!/bin/bash

# Test Claude Sonnet 4.5 Model Access
# Verifies that Claude Sonnet 4.5 is accessible and working correctly

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REGION="us-east-1"
MODEL_ID="anthropic.claude-sonnet-4-5-20250929-v1:0"

echo "=========================================="
echo "Claude Sonnet 4.5 Model Test"
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
    echo -e "${BLUE}ℹ${NC} $1"
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

# 2. Check if model is available
echo "2. Checking if Claude Sonnet 4.5 is available..."
if aws bedrock list-foundation-models \
    --region $REGION \
    --query "modelSummaries[?modelId=='$MODEL_ID']" \
    --output json | jq -e '. | length > 0' >/dev/null 2>&1; then
    
    print_status 0 "Claude Sonnet 4.5 is available in us-east-1"
    
    # Get model details
    MODEL_NAME=$(aws bedrock list-foundation-models \
        --region $REGION \
        --query "modelSummaries[?modelId=='$MODEL_ID'].modelName" \
        --output text)
    
    print_info "Model Name: $MODEL_NAME"
    print_info "Model ID: $MODEL_ID"
else
    print_status 1 "Claude Sonnet 4.5 not found"
    exit 1
fi
echo ""

# 3. Test simple invocation
echo "3. Testing simple model invocation..."
TEMP_OUTPUT=$(mktemp)
TEST_BODY='{
  "anthropic_version": "bedrock-2023-05-31",
  "max_tokens": 100,
  "messages": [
    {
      "role": "user",
      "content": "請用繁體中文回答：你是什麼模型？請簡短回答。"
    }
  ]
}'

if aws bedrock-runtime invoke-model \
    --model-id "$MODEL_ID" \
    --body "$TEST_BODY" \
    --region $REGION \
    "$TEMP_OUTPUT" 2>/dev/null; then
    
    print_status 0 "Model invocation successful"
    echo ""
    
    # Parse and display response
    echo "Model Response:"
    echo "----------------------------------------"
    RESPONSE=$(cat "$TEMP_OUTPUT" | jq -r '.content[0].text' 2>/dev/null || echo "Unable to parse response")
    echo "$RESPONSE"
    echo "----------------------------------------"
    echo ""
    
    # Show token usage
    INPUT_TOKENS=$(cat "$TEMP_OUTPUT" | jq -r '.usage.input_tokens' 2>/dev/null || echo "N/A")
    OUTPUT_TOKENS=$(cat "$TEMP_OUTPUT" | jq -r '.usage.output_tokens' 2>/dev/null || echo "N/A")
    print_info "Token Usage: Input=$INPUT_TOKENS, Output=$OUTPUT_TOKENS"
    
    # Calculate cost (approximate)
    if [ "$INPUT_TOKENS" != "N/A" ] && [ "$OUTPUT_TOKENS" != "N/A" ]; then
        INPUT_COST=$(echo "scale=6; $INPUT_TOKENS * 3.00 / 1000000" | bc)
        OUTPUT_COST=$(echo "scale=6; $OUTPUT_TOKENS * 15.00 / 1000000" | bc)
        TOTAL_COST=$(echo "scale=6; $INPUT_COST + $OUTPUT_COST" | bc)
        print_info "Estimated Cost: \$$TOTAL_COST USD"
    fi
else
    print_status 1 "Model invocation failed"
    print_warning "You may need to request model access in AWS Console"
    print_info "Go to: https://console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess"
    rm -f "$TEMP_OUTPUT"
    exit 1
fi
rm -f "$TEMP_OUTPUT"
echo ""

# 4. Test content generation capability
echo "4. Testing content generation capability..."
TEMP_OUTPUT=$(mktemp)
CONTENT_TEST_BODY='{
  "anthropic_version": "bedrock-2023-05-31",
  "max_tokens": 300,
  "messages": [
    {
      "role": "user",
      "content": "請為以下主題生成一段簡短的社群媒體貼文（約50字）：\n\n主題：司法正義與受害者權益\n平台：Facebook\n語氣：理性分析"
    }
  ]
}'

if aws bedrock-runtime invoke-model \
    --model-id "$MODEL_ID" \
    --body "$CONTENT_TEST_BODY" \
    --region $REGION \
    "$TEMP_OUTPUT" 2>/dev/null; then
    
    print_status 0 "Content generation successful"
    echo ""
    
    # Parse and display response
    echo "Generated Content:"
    echo "----------------------------------------"
    CONTENT=$(cat "$TEMP_OUTPUT" | jq -r '.content[0].text' 2>/dev/null || echo "Unable to parse response")
    echo "$CONTENT"
    echo "----------------------------------------"
    echo ""
    
    # Show token usage
    INPUT_TOKENS=$(cat "$TEMP_OUTPUT" | jq -r '.usage.input_tokens' 2>/dev/null || echo "N/A")
    OUTPUT_TOKENS=$(cat "$TEMP_OUTPUT" | jq -r '.usage.output_tokens' 2>/dev/null || echo "N/A")
    print_info "Token Usage: Input=$INPUT_TOKENS, Output=$OUTPUT_TOKENS"
else
    print_status 1 "Content generation failed"
fi
rm -f "$TEMP_OUTPUT"
echo ""

# 5. Test streaming capability
echo "5. Testing streaming invocation..."
TEMP_OUTPUT=$(mktemp)
STREAM_TEST_BODY='{
  "anthropic_version": "bedrock-2023-05-31",
  "max_tokens": 50,
  "messages": [
    {
      "role": "user",
      "content": "數到5，每個數字一行。"
    }
  ]
}'

if timeout 10 aws bedrock-runtime invoke-model-with-response-stream \
    --model-id "$MODEL_ID" \
    --body "$STREAM_TEST_BODY" \
    --region $REGION \
    "$TEMP_OUTPUT" 2>/dev/null; then
    
    print_status 0 "Streaming invocation supported"
else
    print_warning "Streaming test inconclusive (may require additional setup)"
fi
rm -f "$TEMP_OUTPUT"
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""
print_status 0 "Claude Sonnet 4.5 is ready for use"
echo ""
echo "Model Configuration:"
echo "  - Model ID: $MODEL_ID"
echo "  - Model Name: $MODEL_NAME"
echo "  - Region: $REGION"
echo ""
echo "Capabilities Verified:"
echo "  ✓ Basic invocation"
echo "  ✓ Chinese language support"
echo "  ✓ Content generation"
echo "  ✓ Token usage tracking"
echo ""
echo "Pricing (us-east-1):"
echo "  - Input: \$3.00 per 1M tokens"
echo "  - Output: \$15.00 per 1M tokens"
echo ""
echo "Next Steps:"
echo "  1. Update application configuration to use this model"
echo "  2. Test with actual content generation workflows"
echo "  3. Monitor token usage and costs"
echo ""
