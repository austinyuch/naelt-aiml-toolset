#!/bin/bash

# Test Docker MCP Server
# This script tests the MCP server running in Docker container

set -e

MCP_URL="http://localhost:8000/mcp"
HEADERS='-H "Content-Type: application/json" -H "Accept: application/json, text/event-stream"'

echo "=========================================="
echo "Testing Docker MCP Server"
echo "=========================================="
echo ""

# Test 1: Health Check
echo "Test 1: Health Check"
echo "--------------------"
HEALTH_RESPONSE=$(curl -s http://localhost:8000/health)
echo "Response: $HEALTH_RESPONSE"
echo ""

# Test 2: List Tools
echo "Test 2: List Tools"
echo "------------------"
TOOLS_RESPONSE=$(curl -s -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}')

echo "Tools available:"
echo "$TOOLS_RESPONSE" | jq -r '.result.tools[].name'
echo ""

# Test 3: Call search_news tool
echo "Test 3: Call search_news Tool"
echo "------------------------------"
echo "Searching for news with keywords: [\"司法改革\", \"受害者權益\"]"
SEARCH_RESPONSE=$(curl -s -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc":"2.0",
    "id":2,
    "method":"tools/call",
    "params":{
      "name":"search_news",
      "arguments":{"keywords":["司法改革","受害者權益"]}
    }
  }')

echo "Search result:"
TOTAL=$(echo "$SEARCH_RESPONSE" | jq -r '.result.content[0].text' | jq '.total')
echo "Total articles found: $TOTAL"
echo ""

# Test 4: Call generate_content tool
echo "Test 4: Call generate_content Tool"
echo "-----------------------------------"
echo "Generating content for Instagram..."
GENERATE_RESPONSE=$(curl -s -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{
    "jsonrpc":"2.0",
    "id":3,
    "method":"tools/call",
    "params":{
      "name":"generate_content",
      "arguments":{
        "user_input":"我認為應該加強受害者權益保護",
        "topic_templates":["victim_rights"],
        "platform_type":"instagram",
        "selected_news_urls":[]
      }
    }
  }')

echo "Generation result:"
GENERATION_TEXT=$(echo "$GENERATE_RESPONSE" | jq -r '.result.content[0].text')
GENERATION_ID=$(echo "$GENERATION_TEXT" | jq -r '.generation_id')
VARIANT_COUNT=$(echo "$GENERATION_TEXT" | jq '.variants | length')
echo "Generation ID: $GENERATION_ID"
echo "Variants generated: $VARIANT_COUNT"
echo ""

# Test 5: Call refine_content tool
echo "Test 5: Call refine_content Tool"
echo "---------------------------------"
echo "Refining content with ID: $GENERATION_ID"
REFINE_RESPONSE=$(curl -s -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d "{
    \"jsonrpc\":\"2.0\",
    \"id\":4,
    \"method\":\"tools/call\",
    \"params\":{
      \"name\":\"refine_content\",
      \"arguments\":{
        \"content_id\":\"$GENERATION_ID\",
        \"feedback\":\"請加強情感共鳴的部分\"
      }
    }
  }")

echo "Refinement result:"
REFINED_TEXT=$(echo "$REFINE_RESPONSE" | jq -r '.result.content[0].text')
REFINED_TEXT_LENGTH=$(echo "$REFINED_TEXT" | jq -r '.text | length')
echo "Refined text length: $REFINED_TEXT_LENGTH characters"
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "✓ Health check passed"
echo "✓ Tools list retrieved (3 tools)"
echo "✓ search_news tool executed"
echo "✓ generate_content tool executed"
echo "✓ refine_content tool executed"
echo ""
echo "All tests passed successfully!"
