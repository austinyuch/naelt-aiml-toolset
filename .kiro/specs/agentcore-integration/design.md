# Design Document - AgentCore Integration POC

## Overview

本設計文件描述如何在一週內完成 AWS Bedrock AgentCore 整合的 POC (Proof of Concept)。整合採用漸進式策略，優先驗證核心功能，最小化風險。

### 目標

1. **驗證可行性**: 確認現有服務可以成功部署到 AgentCore Runtime
2. **評估效能**: 測量回應時間、吞吐量和穩定性
3. **分析成本**: 計算實際使用成本並與現有方案比較
4. **知識累積**: 建立團隊對 AgentCore 的理解和經驗

### 非目標

- 生產環境部署（僅 POC 測試環境）
- 完整的 CI/CD pipeline
- 多區域部署
- 進階功能整合（Memory, Browser, Code Interpreter）

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                Development Environment                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Kiro IDE + AgentCore MCP Server                 │   │
│  │  • AI-assisted development                       │   │
│  │  • Documentation search                          │   │
│  │  • Code transformation                           │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Development & Testing
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Local Testing Environment                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  MCP Server (streamable-http)                    │   │
│  │  • Port: 8000                                    │   │
│  │  • Path: /mcp                                    │   │
│  │  • Tools: search_news, generate_content, refine │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Deploy
                         ▼
┌─────────────────────────────────────────────────────────┐
│           AWS Bedrock AgentCore Runtime                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Containerized MCP Server                        │   │
│  │  • Auto-scaling                                  │   │
│  │  • Session isolation                             │   │
│  │  • OAuth authentication (Cognito)               │   │
│  │  • 60-minute timeout                            │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │
                         │ Invoke
                         ▼
┌─────────────────────────────────────────────────────────┐
│                External Services                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ AWS Bedrock  │  │ Google News  │  │ Cache (EFS)  │  │
│  │ Claude 4.5   │  │ API          │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```


### Component Design

#### 1. Kiro IDE Integration

**Purpose**: 使用 AgentCore MCP Server 加速開發

**Configuration** (`.kiro/settings/mcp.json`):
```json
{
  "mcpServers": {
    "bedrock-agentcore-mcp-server": {
      "command": "uvx",
      "args": ["awslabs.amazon-bedrock-agentcore-mcp-server@latest"],
      "env": {
        "FASTMCP_LOG_LEVEL": "ERROR"
      },
      "disabled": false,
      "autoApprove": [
        "search_agentcore_docs",
        "fetch_agentcore_doc"
      ]
    }
  }
}
```

**Tools Available**:
- `search_agentcore_docs`: 搜尋 AgentCore 文件
- `fetch_agentcore_doc`: 取得特定文件內容

**Usage Pattern**:
1. 詢問 AI: "如何將 MCP Server 轉換為 streamable-http?"
2. AI 使用 `search_agentcore_docs` 搜尋相關文件
3. AI 使用 `fetch_agentcore_doc` 取得詳細內容
4. AI 提供程式碼範例和建議

#### 2. MCP Server Protocol Adaptation

**Current Implementation** (stdio):
```typescript
// src/mcp/server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export class MCPServer {
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
```

**Target Implementation** (streamable-http):
```typescript
// src/mcp/server.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { z } from 'zod';

export class MCPServer {
  private server: McpServer;
  private app: express.Application;
  
  constructor(orchestrator: ContentOrchestrator) {
    // Create MCP server
    this.server = new McpServer({
      name: 'advocacy-content-generator',
      version: '1.0.0'
    });
    
    this.setupTools(orchestrator);
    this.setupExpressApp();
  }
  
  private setupTools(orchestrator: ContentOrchestrator) {
    // Register search_news tool
    this.server.registerTool(
      'search_news',
      {
        title: 'News Search',
        description: 'Search for news articles related to judicial justice topics',
        inputSchema: {
          keywords: z.array(z.string()).min(1).max(10)
        },
        outputSchema: {
          results: z.array(z.object({
            title: z.string(),
            source: z.string(),
            published_date: z.string(),
            url: z.string(),
            summary: z.string()
          })),
          total: z.number()
        }
      },
      async ({ keywords }) => {
        const result = await orchestrator.newsService.searchNews(keywords);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result
        };
      }
    );
    
    // Register generate_content tool
    this.server.registerTool(
      'generate_content',
      {
        title: 'Content Generation',
        description: 'Generate advocacy content for different platforms',
        inputSchema: {
          user_input: z.string(),
          topic_templates: z.array(z.string()),
          platform_type: z.enum(['instagram', 'facebook', 'line']),
          selected_news_urls: z.array(z.string().url()).optional()
        },
        outputSchema: {
          variants: z.array(z.object({
            text: z.string(),
            image_suggestion: z.string(),
            hashtags: z.array(z.string())
          })),
          generation_id: z.string()
        }
      },
      async (args) => {
        const result = await orchestrator.orchestrateContentGeneration(args);
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result
        };
      }
    );
    
    // Register refine_content tool
    this.server.registerTool(
      'refine_content',
      {
        title: 'Content Refinement',
        description: 'Refine generated content based on feedback',
        inputSchema: {
          content_id: z.string(),
          feedback: z.string().min(10)
        },
        outputSchema: {
          text: z.string(),
          image_suggestion: z.string(),
          hashtags: z.array(z.string())
        }
      },
      async ({ content_id, feedback }) => {
        const result = await orchestrator.contentService.refineContent(
          content_id,
          feedback
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result
        };
      }
    );
  }
  
  private setupExpressApp() {
    this.app = express();
    this.app.use(express.json());
    
    // MCP endpoint
    this.app.post('/mcp', async (req, res) => {
      // Create a new transport for each request to prevent ID collisions
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true
      });
      
      res.on('close', () => {
        transport.close();
      });
      
      await this.server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    });
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', version: '1.0.0' });
    });
  }
  
  async startHttp(port: number = 8000, host: string = '0.0.0.0') {
    return new Promise<void>((resolve, reject) => {
      this.app.listen(port, host, () => {
        log.info(`MCP Server listening on ${host}:${port}/mcp`);
        resolve();
      }).on('error', reject);
    });
  }
  
  // Keep stdio support for local development
  async startStdio() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    log.info('MCP Server started on stdio');
  }
}
```

**Key Changes**:
1. Use `@modelcontextprotocol/sdk` TypeScript SDK
2. Use `McpServer` class for MCP server
3. Use `StreamableHTTPServerTransport` for HTTP transport
4. Use Express.js to handle HTTP requests
5. Create new transport for each request (stateless)
6. Listen on `0.0.0.0:8000`
7. Serve at `/mcp` path
8. Support both stdio (dev) and HTTP (production)

#### 3. Environment Configuration

**Development** (`.env.development`):
```bash
SERVICE_MODE=mcp-only
MCP_TRANSPORT=stdio
PORT=8000
LOG_LEVEL=debug
```

**Production** (`.env.production`):
```bash
SERVICE_MODE=mcp-only
MCP_TRANSPORT=streamable-http
PORT=8000
HOST=0.0.0.0
LOG_LEVEL=info
AWS_REGION=us-east-1
```

**Transport Selection Logic**:
```typescript
// src/index.ts
const transport = config.mcpTransport || 'stdio';

if (transport === 'streamable-http') {
  await mcpServer.startHttp();
} else {
  await mcpServer.startStdio();
}
```


#### 4. AWS Infrastructure Setup

**Required AWS Resources**:

1. **IAM Execution Role**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:*:*:model/anthropic.claude-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    }
  ]
}
```

2. **ECR Repository**
```bash
aws ecr create-repository \
  --repository-name advocacy-content-generator \
  --region us-east-1
```

3. **Cognito User Pool**
```bash
# Created via setup_cognito.sh script
# Outputs:
# - Pool ID
# - Discovery URL
# - Client ID
# - Bearer Token
```

#### 5. Docker Container

**Dockerfile**:
```dockerfile
FROM node:24-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY dist ./dist
COPY prompts ./prompts

# Expose MCP port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start MCP server
CMD ["node", "dist/index.js"]
```

**Build and Push**:
```bash
# Build
docker build -t advocacy-content-generator:latest .

# Tag
docker tag advocacy-content-generator:latest \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/advocacy-content-generator:latest

# Push
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/advocacy-content-generator:latest
```

#### 6. AgentCore Configuration

**`.bedrock_agentcore.yaml`**:
```yaml
name: advocacy-content-generator
protocol: MCP
runtime:
  memory: 1024
  timeout: 3600  # 60 minutes
  environment:
    SERVICE_MODE: mcp-only
    MCP_TRANSPORT: streamable-http
    AWS_REGION: us-east-1
    LOG_LEVEL: info
execution_role: arn:aws:iam::${AWS_ACCOUNT_ID}:role/AgentCoreExecutionRole
container:
  image: ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/advocacy-content-generator:latest
  port: 8000
authentication:
  type: oauth
  discovery_url: https://cognito-idp.${AWS_REGION}.amazonaws.com/${POOL_ID}/.well-known/openid-configuration
  client_id: ${CLIENT_ID}
```

#### 7. Testing Infrastructure

**Local Test Client** (`test/local-mcp-client.ts`):
```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function testLocalMCP() {
  const mcpUrl = 'http://localhost:8000/mcp';
  
  // Create client with streamable HTTP transport
  const transport = new StreamableHTTPClientTransport(mcpUrl);
  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });
  
  await client.connect(transport);
  
  try {
    // Test list tools
    const tools = await client.listTools();
    console.log('Available tools:', tools);
    
    // Test search_news
    const newsResult = await client.callTool({
      name: 'search_news',
      arguments: {
        keywords: ['司法改革', '受害者權益']
      }
    });
    console.log('News search result:', newsResult);
    
    // Test generate_content
    const contentResult = await client.callTool({
      name: 'generate_content',
      arguments: {
        user_input: '測試觀點',
        topic_templates: ['victim_rights'],
        platform_type: 'instagram',
        selected_news_urls: []
      }
    });
    console.log('Content generation result:', contentResult);
  } finally {
    await client.close();
  }
}

testLocalMCP().catch(console.error);
```

**Remote Test Client** (`test/remote-mcp-client.ts`):
```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

async function testRemoteMCP() {
  const agentArn = process.env.AGENT_ARN;
  const bearerToken = process.env.BEARER_TOKEN;
  
  if (!agentArn || !bearerToken) {
    throw new Error('AGENT_ARN and BEARER_TOKEN must be set');
  }
  
  const encodedArn = agentArn.replace(/:/g, '%3A').replace(/\//g, '%2F');
  const mcpUrl = `https://bedrock-agentcore.us-east-1.amazonaws.com/runtimes/${encodedArn}/invocations?qualifier=DEFAULT`;
  
  // Create client with authentication
  const transport = new StreamableHTTPClientTransport(mcpUrl, {
    headers: {
      'authorization': `Bearer ${bearerToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });
  
  await client.connect(transport);
  
  try {
    // Test tools
    const tools = await client.listTools();
    console.log('Available tools:', tools);
    
    // Test search_news
    const newsResult = await client.callTool({
      name: 'search_news',
      arguments: {
        keywords: ['司法改革']
      }
    });
    console.log('News search result:', newsResult);
  } finally {
    await client.close();
  }
}

testRemoteMCP().catch(console.error);
```


## Data Flow

### Request Flow

```
1. Client (Kiro/Claude Desktop)
   │
   ├─ MCP Request (JSON-RPC)
   │
   ▼
2. AgentCore Runtime
   │
   ├─ Add Mcp-Session-Id header
   ├─ Validate OAuth token
   │
   ▼
3. MCP Server Container
   │
   ├─ Parse MCP request
   ├─ Route to tool handler
   │
   ▼
4. ContentOrchestrator
   │
   ├─ Coordinate services
   │
   ▼
5. Services (News/Content/Template)
   │
   ├─ Call external APIs
   ├─ Generate content
   │
   ▼
6. Response (JSON)
   │
   ├─ Format as MCP response
   │
   ▼
7. Return to Client
```

### Authentication Flow

```
1. User authenticates with Cognito
   │
   ├─ Username + Password
   │
   ▼
2. Cognito returns tokens
   │
   ├─ Access Token (Bearer)
   ├─ ID Token
   ├─ Refresh Token
   │
   ▼
3. Client includes Bearer token in request
   │
   ├─ Authorization: Bearer <token>
   │
   ▼
4. AgentCore validates token
   │
   ├─ Check signature
   ├─ Check expiration
   ├─ Check permissions
   │
   ▼
5. Forward to MCP Server if valid
```

## Error Handling

### Error Categories

1. **Authentication Errors** (401)
   - Invalid token
   - Expired token
   - Missing token

2. **Authorization Errors** (403)
   - Insufficient permissions
   - Resource access denied

3. **Validation Errors** (400)
   - Invalid request format
   - Missing required parameters
   - Invalid parameter values

4. **Service Errors** (500, 502, 503)
   - External API failures
   - LLM errors
   - Internal server errors

5. **Timeout Errors** (504)
   - Request timeout (> 60 minutes)
   - External API timeout

### Error Response Format

```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "error": {
    "code": -32000,
    "message": "Service unavailable",
    "data": {
      "error_type": "NewsAPIUnavailable",
      "detail": "Google News API is temporarily unavailable",
      "request_id": "req_abc123",
      "timestamp": "2025-11-13T10:30:00Z",
      "retry_after": 60
    }
  }
}
```

## Performance Considerations

### Response Time Targets

| Operation | Target | Max |
|-----------|--------|-----|
| Tool listing | < 100ms | 500ms |
| News search | < 5s | 10s |
| Content generation | < 30s | 60s |
| Content refinement | < 20s | 40s |

### Optimization Strategies

1. **Caching**
   - Cache news search results (1 hour TTL)
   - Cache templates (24 hour TTL)
   - Cache LLM responses for identical prompts (1 hour TTL)

2. **Parallel Processing**
   - Generate 3 content variants in parallel
   - Fetch news articles concurrently

3. **Resource Limits**
   - Memory: 1GB (sufficient for most operations)
   - Timeout: 60 minutes (supports long-running content generation)

## Security Design

### Authentication & Authorization

1. **OAuth 2.0 with Cognito**
   - User Pool for user management
   - App Client for token issuance
   - Bearer tokens for API access

2. **IAM Roles**
   - Execution role for AgentCore Runtime
   - Least privilege principle
   - Resource-based policies

3. **Network Security**
   - HTTPS only
   - No public endpoints (AgentCore managed)
   - VPC integration (optional)

### Data Protection

1. **In Transit**
   - TLS 1.2+ for all communications
   - Encrypted MCP protocol

2. **At Rest**
   - EFS encryption for cache
   - CloudWatch Logs encryption

3. **Secrets Management**
   - AWS Secrets Manager for API keys
   - Environment variables for non-sensitive config

## Monitoring & Observability

### Metrics to Track

1. **Performance Metrics**
   - Request latency (P50, P95, P99)
   - Throughput (requests/second)
   - Error rate

2. **Business Metrics**
   - Tool invocation count
   - Content generation success rate
   - Average content quality score

3. **Cost Metrics**
   - Runtime execution time
   - Memory usage
   - LLM token consumption

### Logging Strategy

```typescript
// Structured logging
log.info('MCP tool invoked', {
  tool: 'generate_content',
  session_id: sessionId,
  user_id: userId,
  duration_ms: durationMs,
  tokens_used: tokensUsed,
  cost_usd: costUsd
});
```

### CloudWatch Integration

- Log Group: `/aws/bedrock-agentcore/advocacy-content-generator`
- Metrics Namespace: `AgentCore/AdvocacyContentGenerator`
- Alarms:
  - Error rate > 5%
  - P95 latency > 60s
  - Cost > $50/day

## Testing Strategy

### Test Levels

1. **Unit Tests** (existing)
   - Service layer logic
   - Tool handlers
   - Error handling

2. **Integration Tests** (new)
   - Local MCP server
   - Tool invocation
   - End-to-end flows

3. **Performance Tests** (new)
   - Load testing (100 concurrent requests)
   - Stress testing (sustained load)
   - Latency benchmarks

### Test Scenarios

**Scenario 1: News Search**
```typescript
test('should search news via MCP', async () => {
  const result = await mcpClient.call_tool('search_news', {
    keywords: ['司法改革']
  });
  
  expect(result.results).toHaveLength(greaterThan(5));
  expect(result.results[0]).toHaveProperty('title');
  expect(result.results[0]).toHaveProperty('url');
});
```

**Scenario 2: Content Generation**
```typescript
test('should generate content via MCP', async () => {
  const result = await mcpClient.call_tool('generate_content', {
    user_input: '測試觀點',
    topic_templates: ['victim_rights'],
    platform_type: 'instagram',
    selected_news_urls: []
  });
  
  expect(result.variants).toHaveLength(3);
  expect(result.variants[0].hashtags.length).toBeGreaterThanOrEqual(5);
});
```

## Deployment Process

### Step-by-Step Deployment

1. **Prepare Environment**
   ```bash
   # Install tools
   pip install bedrock-agentcore-starter-toolkit
   npm install -g mcp
   
   # Configure AWS
   aws configure
   ```

2. **Setup Authentication**
   ```bash
   # Run Cognito setup
   export REGION=us-east-1
   export USERNAME=admin
   export PASSWORD=SecurePass123!
   ./scripts/setup_cognito.sh
   ```

3. **Build Container**
   ```bash
   # Build TypeScript
   npm run build
   
   # Build Docker image
   docker build -t advocacy-content-generator:latest .
   ```

4. **Configure AgentCore**
   ```bash
   # Initialize configuration
   agentcore configure -e dist/index.js --protocol MCP
   ```

5. **Deploy**
   ```bash
   # Launch to AgentCore Runtime
   agentcore launch
   
   # Save Runtime ARN
   export AGENT_ARN="<output-arn>"
   ```

6. **Test**
   ```bash
   # Get bearer token
   export BEARER_TOKEN=$(./scripts/get_token.sh)
   
   # Run tests
   npm run test:agentcore
   ```

## Rollback Plan

### Rollback Triggers

- Deployment fails
- Health checks fail
- Error rate > 10%
- Critical functionality broken

### Rollback Steps

1. **Immediate Actions**
   ```bash
   # Delete AgentCore Runtime
   aws bedrock-agentcore delete-runtime --runtime-arn $AGENT_ARN
   
   # Verify existing ECS service still running
   aws ecs describe-services --cluster production --services advocacy-content-generator
   ```

2. **Cleanup**
   ```bash
   # Remove test resources
   aws cognito-idp delete-user-pool --user-pool-id $POOL_ID
   aws ecr delete-repository --repository-name advocacy-content-generator --force
   ```

3. **Documentation**
   - Record failure reason
   - Document lessons learned
   - Update risk assessment

## Success Criteria

### POC Success Metrics

1. **Functional**
   - ✅ All 3 MCP tools working
   - ✅ Authentication successful
   - ✅ End-to-end flow complete

2. **Performance**
   - ✅ P95 latency < 60s
   - ✅ Error rate < 1%
   - ✅ 100 concurrent requests handled

3. **Cost**
   - ✅ Cost per request < $0.001
   - ✅ Monthly cost < $30 (10K requests)

4. **Knowledge**
   - ✅ Team understands AgentCore
   - ✅ Documentation complete
   - ✅ Lessons learned documented

## Next Steps (Post-POC)

If POC successful:

1. **Phase 2: Production Deployment**
   - Setup production Cognito
   - Configure CI/CD pipeline
   - Implement monitoring
   - Load testing

2. **Phase 3: Gateway Integration**
   - Register tools in Gateway
   - Centralized authentication
   - Tool versioning

3. **Phase 4: Advanced Features**
   - AgentCore Memory
   - AgentCore Observability
   - Multi-agent orchestration

If POC unsuccessful:

1. Analyze failure reasons
2. Document blockers
3. Evaluate alternatives
4. Update integration strategy


## Agent-to-Agent (A2A) Protocol Support

### Overview

AgentCore Runtime 原生支援兩種協議：
1. **MCP (Model Context Protocol)**: Agent 與工具之間的通訊
2. **A2A (Agent-to-Agent Protocol)**: Agent 與 Agent 之間的通訊

### 當前 POC 範圍

**Phase 1 (本週 POC)**: 僅實作 MCP 協議
- 專注於將現有服務部署為 MCP Server
- 提供工具給其他 Agent 使用
- 驗證基本整合可行性

**Phase 2 (未來擴展)**: 加入 A2A 協議支援
- 實作 A2A Server 端點
- 發布 Agent Card (能力描述)
- 支援 Agent 間協作

### A2A 協議架構（未來）

```
┌─────────────────────────────────────────────────────────┐
│              Orchestrator Agent (A2A Client)             │
│  • 協調多個專業 Agent                                     │
│  • 動態發現 Agent 能力                                    │
│  • 路由請求到適當的 Agent                                 │
└────────────────────┬────────────────────────────────────┘
                     │ A2A Protocol
        ┌────────────┼────────────┐
        │            │            │
┌───────▼──────┐ ┌──▼──────────┐ ┌▼──────────────────┐
│ Content Gen  │ │ News Search │ │ Other Specialist  │
│ Agent (A2A)  │ │ Agent (A2A) │ │ Agents            │
│              │ │             │ │                   │
│ • MCP Tools  │ │ • MCP Tools │ │ • MCP Tools       │
└──────────────┘ └─────────────┘ └───────────────────┘
```

### A2A vs MCP 比較

| 特性 | MCP | A2A |
|------|-----|-----|
| **用途** | Agent ↔ 工具 | Agent ↔ Agent |
| **通訊模式** | 工具調用 | 任務委派 |
| **發現機制** | 工具列表 | Agent Card |
| **狀態管理** | 無狀態 | 支援長時間任務 |
| **回應類型** | 同步 | 同步/非同步 |
| **本 POC** | ✅ 實作 | ❌ 未實作 |

### 未來 A2A 整合計畫

當需要多 Agent 協作時，可以擴展為 A2A 架構：

**Scenario 1: 內容生成協作**
```
User Request
    ↓
Orchestrator Agent (A2A Client)
    ├─→ News Search Agent (A2A Server)
    │   └─→ 搜尋相關新聞
    ├─→ Content Generation Agent (A2A Server)
    │   └─→ 生成論述內容
    └─→ Fact Check Agent (A2A Server)
        └─→ 驗證內容準確性
```

**Scenario 2: 跨平台內容優化**
```
User Request: "生成多平台內容"
    ↓
Orchestrator Agent
    ├─→ Instagram Agent (專精 IG 格式)
    ├─→ Facebook Agent (專精 FB 格式)
    └─→ LINE Agent (專精 LINE 格式)
```

### A2A 實作要求（未來參考）

**1. Agent Card 發布**
```json
{
  "name": "advocacy-content-generator",
  "version": "1.0.0",
  "description": "Generate advocacy content for social media platforms",
  "capabilities": [
    {
      "name": "generate_content",
      "description": "Generate content for different platforms",
      "input_schema": { ... },
      "output_schema": { ... }
    }
  ],
  "endpoints": {
    "a2a": "https://bedrock-agentcore.../runtimes/.../a2a",
    "mcp": "https://bedrock-agentcore.../runtimes/.../mcp"
  },
  "authentication": {
    "type": "oauth",
    "discovery_url": "..."
  }
}
```

**2. A2A Server 端點**
```typescript
// 未來實作參考
app.post('/a2a', async (req, res) => {
  const { method, params } = req.body;
  
  switch (method) {
    case 'agent/card':
      // 回傳 Agent Card
      return res.json(agentCard);
      
    case 'task/create':
      // 建立新任務
      const task = await createTask(params);
      return res.json(task);
      
    case 'task/status':
      // 查詢任務狀態
      const status = await getTaskStatus(params.task_id);
      return res.json(status);
      
    case 'task/result':
      // 取得任務結果
      const result = await getTaskResult(params.task_id);
      return res.json(result);
  }
});
```

### 決策理由

**為什麼 POC 不包含 A2A？**

1. **複雜度**: A2A 需要額外的任務管理、狀態追蹤
2. **範圍**: POC 目標是驗證基本部署，不是多 Agent 協作
3. **依賴**: A2A 需要多個 Agent 才有意義
4. **時間**: 一週內專注於 MCP 整合更實際

**何時考慮 A2A？**

- 需要多個專業 Agent 協作
- 需要長時間運行的複雜任務
- 需要動態 Agent 發現和路由
- 需要跨框架/跨平台 Agent 通訊

### 參考資源

- [A2A Protocol Specification](https://github.com/agent-to-agent/specification)
- [AgentCore A2A Documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-a2a.html)
- [A2A Blog Post](https://aws.amazon.com/blogs/machine-learning/introducing-agent-to-agent-protocol-support-in-amazon-bedrock-agentcore-runtime/)
