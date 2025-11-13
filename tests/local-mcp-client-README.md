# Local MCP Client Test

This directory contains a test script for validating the MCP server running in streamable-http mode on localhost.

## Purpose

The `local-mcp-client.ts` script tests the following requirements:

- **3.1**: Local MCP server listening on port 8000
- **3.2**: `search_news` tool invocation
- **3.3**: `generate_content` tool invocation
- **3.4**: `refine_content` tool invocation
- **3.5**: MCP protocol response format compliance

## Prerequisites

1. **Environment Setup**: Ensure all required environment variables are configured in `.env`:
   ```bash
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   GOOGLE_NEWS_API_KEY=your-news-api-key
   ```

2. **Dependencies**: Install all npm dependencies:
   ```bash
   npm install
   ```

3. **Build**: Compile TypeScript code:
   ```bash
   npm run build
   ```

## Running the Test

### Step 1: Start the MCP Server

Start the MCP server in HTTP mode on localhost:

```bash
# Using npm script
MCP_TRANSPORT=streamable-http SERVICE_MODE=mcp-only npm run dev

# Or using the built version
MCP_TRANSPORT=streamable-http SERVICE_MODE=mcp-only npm start
```

The server should start and display:
```
MCP Server listening on 0.0.0.0:8000/mcp
```

### Step 2: Run the Test Client

In a separate terminal, run the test client:

```bash
# Using tsx (recommended for development)
npx tsx tests/local-mcp-client.ts

# Or compile and run
npm run build
node dist/tests/local-mcp-client.js
```

### Custom MCP URL

If your MCP server is running on a different port or host:

```bash
MCP_URL=http://localhost:9000/mcp npx tsx tests/local-mcp-client.ts
```

## Expected Output

The test script will:

1. **Connect to MCP Server**: Establish connection to `http://localhost:8000/mcp`
2. **List Tools**: Display all available MCP tools
3. **Test search_news**: Search for news articles with keywords
4. **Test generate_content**: Generate advocacy content for Instagram
5. **Test refine_content**: Refine the generated content with feedback
6. **Performance Summary**: Display execution times for each tool

### Sample Output

```
🚀 Starting Local MCP Client Test
📍 Connecting to: http://localhost:8000/mcp

============================================================
Step 1: Connecting to MCP Server
============================================================
✓ Connected to MCP server
  http://localhost:8000/mcp

============================================================
Step 2: Listing Available Tools
============================================================
✓ Listed tools
  Found 3 tools
  • search_news: 搜尋新聞文章，用於為內容生成提供事實依據
  • generate_content: 生成論述內容，針對不同平台和主題產出適合的倡議內容
  • refine_content: 精煉內容，根據使用者反饋改進已生成的內容
✓ Tool 'search_news' available
✓ Tool 'generate_content' available
✓ Tool 'refine_content' available

============================================================
Step 3: Testing search_news Tool
============================================================
Calling search_news with keywords: ["司法改革", "受害者權益"]
✓ search_news executed
  Duration: 2341ms
✓ Response has results
  Found 15 news articles
  Sample result:
    Title: 司法改革新進展...
    Source: 自由時報
    URL: https://...

============================================================
Step 4: Testing generate_content Tool
============================================================
Calling generate_content...
  User input: "我認為應該加強受害者權益保護"
  Topic: victim_rights
  Platform: instagram
✓ generate_content executed
  Duration: 12456ms
✓ Generated variants
  Generated 3 variants
  Sample variant:
    Text: 在司法程序中，受害者的聲音往往被忽視...
    Hashtags: #受害者權益, #司法改革, #正義, #人權, #法治
    Image: 法庭場景，受害者家屬在旁聽席上...
  Generation ID: gen_1234567890

============================================================
Step 5: Testing refine_content Tool
============================================================
Calling refine_content...
  Content ID: gen_1234567890
  Feedback: "請加強情感共鳴的部分"
✓ refine_content executed
  Duration: 8234ms
✓ Content refined
  Refined text length: 456 characters
  Refined text: 當我們談論司法改革時，不能忘記那些在案件中受傷的心靈...
  Hashtags: #受害者權益, #司法改革, #正義, #同理心, #支持受害者

============================================================
Test Summary
============================================================
✓ All tests passed successfully!

Performance Summary:
  • search_news: 2341ms
  • generate_content: 12456ms
  • refine_content: 8234ms
  • Total: 23031ms

============================================================
Performance Validation
============================================================
✓ search_news < 10s
  2341ms
✓ generate_content < 60s
  12456ms
✓ refine_content < 30s
  8234ms

✓ Client connection closed

✅ Local MCP Client Test Completed Successfully
```

## Troubleshooting

### Connection Refused

If you see `ECONNREFUSED` error:
- Ensure the MCP server is running
- Check that it's listening on the correct port (default: 8000)
- Verify the `MCP_URL` environment variable if using a custom URL

### Tool Not Found

If a tool is not found:
- Verify the MCP server started successfully
- Check server logs for any errors during tool registration
- Ensure you're using the correct MCP server version

### Timeout Errors

If tools timeout:
- Check AWS credentials are configured correctly
- Verify AWS Bedrock access in your region
- Check Google News API key is valid
- Increase timeout values if needed

### Invalid Response Format

If you see "Invalid response format" errors:
- Ensure you're using compatible versions of `@modelcontextprotocol/sdk`
- Check server logs for any errors during request handling
- Verify the MCP server is running in `streamable-http` mode

## Performance Targets

The test validates the following performance targets:

| Tool | Target | Acceptable Range |
|------|--------|------------------|
| search_news | < 10s | 2-5s typical |
| generate_content | < 60s | 10-30s typical |
| refine_content | < 30s | 5-15s typical |

## Integration with CI/CD

To run this test in CI/CD pipelines:

```bash
# Start server in background
MCP_TRANSPORT=streamable-http SERVICE_MODE=mcp-only npm start &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Run test
npx tsx tests/local-mcp-client.ts

# Cleanup
kill $SERVER_PID
```

## Next Steps

After successful local testing:

1. **Docker Testing**: Test the containerized version (Task 9)
2. **Remote Testing**: Test the deployed AgentCore Runtime (Task 14-15)
3. **Performance Testing**: Run comprehensive performance tests (Task 16)

## Related Files

- `tests/integration/mcp.integration.test.ts`: Jest-based integration tests using stdio transport
- `src/mcp/server.ts`: MCP server implementation
- `src/index.ts`: Application entry point with transport mode selection
- `.kiro/specs/agentcore-integration/tasks.md`: Full implementation plan
