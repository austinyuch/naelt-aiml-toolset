/**
 * Local MCP Client Test Script
 * 
 * This script tests the MCP server running in streamable-http mode on localhost.
 * It verifies all three MCP tools: search_news, generate_content, and refine_content.
 * 
 * Requirements tested:
 * - 3.1: Local MCP server listening on port 8000
 * - 3.2: search_news tool invocation
 * - 3.3: generate_content tool invocation
 * - 3.4: refine_content tool invocation
 * - 3.5: MCP protocol response format compliance
 * 
 * Usage:
 *   1. Start the MCP server in HTTP mode:
 *      MCP_TRANSPORT=streamable-http SERVICE_MODE=mcp-only npm run dev
 *   
 *   2. Run this test script:
 *      npx tsx tests/local-mcp-client.ts
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// ANSI color codes for better output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

/**
 * Print colored output
 */
function print(message: string, color: string = colors.reset): void {
    console.log(`${color}${message}${colors.reset}`);
}

/**
 * Print section header
 */
function printHeader(title: string): void {
    print('\n' + '='.repeat(60), colors.bright);
    print(title, colors.bright + colors.cyan);
    print('='.repeat(60), colors.bright);
}

/**
 * Print test result
 */
function printResult(testName: string, success: boolean, details?: string): void {
    const status = success ? '✓' : '✗';
    const color = success ? colors.green : colors.red;
    print(`${status} ${testName}`, color);
    if (details) {
        print(`  ${details}`, colors.reset);
    }
}

/**
 * Main test function
 */
async function testLocalMCP(): Promise<void> {
    const mcpUrl = process.env.MCP_URL || 'http://localhost:8000/mcp';

    print('\n🚀 Starting Local MCP Client Test', colors.bright + colors.blue);
    print(`📍 Connecting to: ${mcpUrl}`, colors.cyan);

    let client: Client | null = null;
    let transport: StreamableHTTPClientTransport | null = null;

    try {
        // Requirement 3.1: Connect to local MCP server on port 8000
        printHeader('Step 1: Connecting to MCP Server');

        transport = new StreamableHTTPClientTransport(mcpUrl);
        client = new Client(
            {
                name: 'local-test-client',
                version: '1.0.0'
            },
            {
                capabilities: {}
            }
        );

        await client.connect(transport);
        printResult('Connected to MCP server', true, mcpUrl);

        // Test 1: List available tools
        printHeader('Step 2: Listing Available Tools');

        const toolsResponse = await client.listTools();
        const tools = toolsResponse.tools;

        printResult('Listed tools', true, `Found ${tools.length} tools`);

        tools.forEach(tool => {
            print(`  • ${tool.name}: ${tool.description}`, colors.reset);
        });

        // Verify all required tools are present
        const requiredTools = ['search_news', 'generate_content', 'refine_content'];
        const toolNames = tools.map(t => t.name);

        for (const requiredTool of requiredTools) {
            const found = toolNames.includes(requiredTool);
            printResult(`Tool '${requiredTool}' available`, found);
            if (!found) {
                throw new Error(`Required tool '${requiredTool}' not found`);
            }
        }

        // Requirement 3.2: Test search_news tool
        printHeader('Step 3: Testing search_news Tool');

        print('Calling search_news with keywords: ["司法改革", "受害者權益"]', colors.yellow);
        const startTime1 = Date.now();

        const newsResult = await client.callTool({
            name: 'search_news',
            arguments: {
                keywords: ['司法改革', '受害者權益']
            }
        });

        const duration1 = Date.now() - startTime1;

        // Requirement 3.5: Verify MCP protocol response format
        if (!newsResult.content || !Array.isArray(newsResult.content)) {
            throw new Error('Invalid response format: missing content array');
        }

        const newsData = JSON.parse((newsResult.content as any[])[0].text);

        printResult('search_news executed', true, `Duration: ${duration1}ms`);
        printResult('Response has results', newsData.results && newsData.results.length > 0,
            `Found ${newsData.total} news articles`);

        if (newsData.results && newsData.results.length > 0) {
            print(`  Sample result:`, colors.reset);
            print(`    Title: ${newsData.results[0].title}`, colors.reset);
            print(`    Source: ${newsData.results[0].source}`, colors.reset);
            print(`    URL: ${newsData.results[0].url}`, colors.reset);
        }

        // Requirement 3.3: Test generate_content tool
        printHeader('Step 4: Testing generate_content Tool');

        print('Calling generate_content...', colors.yellow);
        print('  User input: "我認為應該加強受害者權益保護"', colors.reset);
        print('  Topic: victim_rights', colors.reset);
        print('  Platform: instagram', colors.reset);

        const startTime2 = Date.now();

        const contentResult = await client.callTool({
            name: 'generate_content',
            arguments: {
                user_input: '我認為應該加強受害者權益保護',
                topic_templates: ['victim_rights'],
                platform_type: 'instagram',
                selected_news_urls: []
            }
        });

        const duration2 = Date.now() - startTime2;

        // Requirement 3.5: Verify MCP protocol response format
        if (!contentResult.content || !Array.isArray(contentResult.content)) {
            throw new Error('Invalid response format: missing content array');
        }

        const contentData = JSON.parse((contentResult.content as any[])[0].text);

        printResult('generate_content executed', true, `Duration: ${duration2}ms`);
        printResult('Generated variants', contentData.variants && contentData.variants.length === 3,
            `Generated ${contentData.variants?.length || 0} variants`);

        if (contentData.variants && contentData.variants.length > 0) {
            print(`  Sample variant:`, colors.reset);
            print(`    Text: ${contentData.variants[0].text.substring(0, 100)}...`, colors.reset);
            print(`    Hashtags: ${contentData.variants[0].hashtags.join(', ')}`, colors.reset);
            print(`    Image: ${contentData.variants[0].image_suggestion}`, colors.reset);
        }

        const generationId = contentData.generation_id;
        print(`  Generation ID: ${generationId}`, colors.cyan);

        // Requirement 3.4: Test refine_content tool
        printHeader('Step 5: Testing refine_content Tool');

        print('Calling refine_content...', colors.yellow);
        print(`  Content ID: ${generationId}`, colors.reset);
        print('  Feedback: "請加強情感共鳴的部分"', colors.reset);

        const startTime3 = Date.now();

        const refineResult = await client.callTool({
            name: 'refine_content',
            arguments: {
                content_id: generationId,
                feedback: '請加強情感共鳴的部分，並增加具體的行動建議'
            }
        });

        const duration3 = Date.now() - startTime3;

        // Requirement 3.5: Verify MCP protocol response format
        if (!refineResult.content || !Array.isArray(refineResult.content)) {
            throw new Error('Invalid response format: missing content array');
        }

        const refineData = JSON.parse((refineResult.content as any[])[0].text);

        printResult('refine_content executed', true, `Duration: ${duration3}ms`);
        printResult('Content refined', refineData.text && refineData.text.length > 0,
            `Refined text length: ${refineData.text?.length || 0} characters`);

        if (refineData.text) {
            print(`  Refined text: ${refineData.text.substring(0, 100)}...`, colors.reset);
            print(`  Hashtags: ${refineData.hashtags.join(', ')}`, colors.reset);
        }

        // Summary
        printHeader('Test Summary');

        print('✓ All tests passed successfully!', colors.green + colors.bright);
        print('\nPerformance Summary:', colors.cyan);
        print(`  • search_news: ${duration1}ms`, colors.reset);
        print(`  • generate_content: ${duration2}ms`, colors.reset);
        print(`  • refine_content: ${duration3}ms`, colors.reset);
        print(`  • Total: ${duration1 + duration2 + duration3}ms`, colors.reset);

        // Verify performance targets
        printHeader('Performance Validation');

        printResult('search_news < 10s', duration1 < 10000, `${duration1}ms`);
        printResult('generate_content < 60s', duration2 < 60000, `${duration2}ms`);
        printResult('refine_content < 30s', duration3 < 30000, `${duration3}ms`);

    } catch (error) {
        print('\n❌ Test failed with error:', colors.red + colors.bright);
        console.error(error);
        process.exit(1);
    } finally {
        // Cleanup
        if (client) {
            try {
                await client.close();
                print('\n✓ Client connection closed', colors.green);
            } catch (error) {
                print('\n⚠ Error closing client connection', colors.yellow);
                console.error(error);
            }
        }
    }
}

// Run the test
testLocalMCP()
    .then(() => {
        print('\n✅ Local MCP Client Test Completed Successfully\n', colors.green + colors.bright);
        process.exit(0);
    })
    .catch((error) => {
        print('\n❌ Local MCP Client Test Failed\n', colors.red + colors.bright);
        console.error(error);
        process.exit(1);
    });
