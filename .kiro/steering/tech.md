# Technical Guidelines

## Technology Stack

### Backend Framework

- **Runtime**: Node.js 20+ LTS
- **Language**: TypeScript 5.x
- **Framework**: Express.js 4.x
- **MCP SDK**: @modelcontextprotocol/sdk

### AI/ML Services

- **LLM Provider**: AWS Bedrock
- **Model**: Claude Sonnet 4.5
- **Parameters**:
  - Temperature: 0.7
  - Max Tokens: 4096
  - Top P: 0.9

### External APIs

- **News API**: Google News API
- **Rate Limits**: Respect API quotas and implement backoff

### Data Storage

- **Cache L1**: In-memory (LRU cache)
- **Cache L2**: AWS EFS (Elastic File System)
- **Database**: PostgreSQL (future - for sentiment analysis module)
- **Object Storage**: AWS S3 (future - for raw data)

### Infrastructure

- **Container**: Docker
- **Orchestration**: AWS ECS Fargate
- **Load Balancer**: AWS ALB (Application Load Balancer)
- **Monitoring**: AWS CloudWatch
- **Logging**: Winston + CloudWatch Logs
- **Metrics**: Prometheus client + CloudWatch Metrics

### Development Tools

- **Package Manager**: npm or yarn
- **Testing**: Jest
- **Linting**: ESLint
- **Formatting**: Prettier
- **Type Checking**: TypeScript compiler
- **API Documentation**: Swagger/OpenAPI

## Architecture Patterns

### Unified Service Architecture

The system supports three deployment modes:

1. **unified** (default): Both REST API and MCP server
2. **api-only**: REST API only
3. **mcp-only**: MCP server only

```typescript
// Service mode selection
const mode = process.env.SERVICE_MODE || "unified";

if (mode === "unified" || mode === "api-only") {
  // Start Express API
}

if (mode === "unified" || mode === "mcp-only") {
  // Start MCP server
}
```

### Dependency Injection

Use constructor-based dependency injection for testability:

```typescript
class ContentGenerationService {
  constructor(
    private bedrockClient: BedrockClient,
    private promptBuilder: PromptBuilder,
    private cache: CacheManager
  ) {}
}
```

### Error Handling

Implement custom exception hierarchy:

```typescript
class APIException extends Error {
  constructor(public statusCode: number, message: string, public code: string) {
    super(message);
  }
}

class NewsAPIUnavailable extends APIException {
  constructor(message: string) {
    super(503, message, "NEWS_API_UNAVAILABLE");
  }
}
```

### Retry Mechanism

Implement exponential backoff for external API calls:

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(baseDelay * Math.pow(2, i));
    }
  }
}
```

### Caching Strategy

Implement multi-layer caching:

```typescript
class CacheManager {
  private l1Cache: Map<string, CacheEntry>; // Memory cache
  private l2CachePath: string; // EFS path

  async get(key: string): Promise<any> {
    // Try L1 cache first
    const l1Result = this.l1Cache.get(key);
    if (l1Result && !this.isExpired(l1Result)) {
      return l1Result.value;
    }

    // Try L2 cache
    const l2Result = await this.readFromEFS(key);
    if (l2Result) {
      this.l1Cache.set(key, l2Result); // Promote to L1
      return l2Result.value;
    }

    return null;
  }
}
```

## API Design

### RESTful Principles

Follow REST conventions:

- **GET**: Retrieve resources
- **POST**: Create resources or trigger actions
- **PUT**: Update resources (full replacement)
- **PATCH**: Update resources (partial update)
- **DELETE**: Remove resources

### Endpoint Naming

Use clear, hierarchical naming:

```
GET    /api/v1/health              # Health check
GET    /api/v1/news/search         # Search news
POST   /api/v1/content/generate    # Generate content
POST   /api/v1/content/refine      # Refine content
GET    /api/v1/templates           # List templates
GET    /api/v1/templates/:id       # Get template by ID
```

### Request/Response Format

Use consistent JSON structure:

```typescript
// Request
interface ContentGenerationRequest {
  topic: string;
  platform: PlatformType;
  newsContext?: NewsArticle[];
  language?: string;
}

// Success Response
interface ContentGenerationResponse {
  success: true;
  data: {
    variants: ContentVariant[];
    generatedAt: string;
  };
}

// Error Response
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### Status Codes

Use appropriate HTTP status codes:

- **200 OK**: Successful GET/PUT/PATCH
- **201 Created**: Successful POST
- **204 No Content**: Successful DELETE
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Missing or invalid API key
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error
- **503 Service Unavailable**: External service unavailable

## MCP Integration

### Tool Definition

Define MCP tools with clear names and descriptions:

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "search_news",
      description:
        "Search for news articles related to judicial justice topics",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          limit: { type: "number", description: "Max results" },
        },
        required: ["query"],
      },
    },
  ],
}));
```

### Shared Business Logic

Reuse service layer for both API and MCP:

```typescript
// API route
app.post("/api/v1/content/generate", async (req, res) => {
  const result = await orchestrator.generateContent(req.body);
  res.json({ success: true, data: result });
});

// MCP tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "generate_content") {
    const result = await orchestrator.generateContent(request.params.arguments);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  }
});
```

## Security Best Practices

### API Key Authentication

Implement API key authentication:

```typescript
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || !isValidApiKey(apiKey)) {
    return res.status(401).json({
      success: false,
      error: { code: "UNAUTHORIZED", message: "Invalid API key" },
    });
  }

  next();
};
```

### Input Validation

Use Zod for runtime validation:

```typescript
const ContentGenerationRequestSchema = z.object({
  topic: z.enum(["victim_rights", "anti_death_penalty", "judicial_injustice"]),
  platform: z.enum(["instagram", "facebook", "line"]),
  newsContext: z.array(NewsArticleSchema).optional(),
  language: z.enum(["zh_TW", "en"]).default("zh_TW"),
});

// Validate request
const validated = ContentGenerationRequestSchema.parse(req.body);
```

### Sensitive Data Handling

- Never log API keys or credentials
- Sanitize error messages before sending to client
- Use environment variables for secrets
- Implement log sanitization

```typescript
const sanitizeLog = (data: any): any => {
  const sensitive = ["apiKey", "password", "token", "secret"];
  // Recursively remove sensitive fields
  return sanitize(data, sensitive);
};
```

### Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  isAllowed(userId: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];

    // Remove old requests outside window
    const validRequests = userRequests.filter((time) => now - time < windowMs);

    if (validRequests.length >= limit) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(userId, validRequests);
    return true;
  }
}
```

## Performance Optimization

### Response Time Targets

- **Health Check**: < 50ms
- **News Search**: < 2s
- **Content Generation**: < 10s
- **Content Refinement**: < 8s
- **Template Listing**: < 100ms

### Caching Strategy

Cache aggressively to reduce latency:

- **News Search**: Cache for 1 hour
- **Templates**: Cache for 24 hours
- **Generated Content**: Cache for 15 minutes
- **LLM Responses**: Cache identical prompts for 1 hour

### Async Processing

Use async/await for I/O operations:

```typescript
// Parallel execution
const [news, templates] = await Promise.all([
  newsService.search(query),
  templateService.getTemplates(),
]);

// Sequential execution (when needed)
const content = await contentService.generate(request);
const refined = await contentService.refine(content, feedback);
```

### Memory Management

- Implement LRU cache with size limits
- Clean up resources in finally blocks
- Use streams for large data processing
- Monitor memory usage with metrics

## Logging and Monitoring

### Structured Logging

Use winston for structured logging:

```typescript
logger.info("Content generated", {
  requestId: req.id,
  topic: request.topic,
  platform: request.platform,
  duration: Date.now() - startTime,
  variantCount: result.variants.length,
});
```

### Log Levels

- **error**: System errors, exceptions
- **warn**: Degraded performance, retries
- **info**: Important business events
- **debug**: Detailed debugging information
- **trace**: Very detailed debugging (disabled in production)

### Metrics Collection

Track key metrics:

```typescript
// Request metrics
metrics.httpRequestDuration.observe(duration);
metrics.httpRequestTotal.inc({ method, path, status });

// Business metrics
metrics.contentGenerationTotal.inc({ topic, platform });
metrics.cacheHitRate.set(hits / (hits + misses));

// System metrics
metrics.memoryUsage.set(process.memoryUsage().heapUsed);
metrics.activeConnections.set(server.connections);
```

### Request Tracing

Implement request ID tracking:

```typescript
app.use((req, res, next) => {
  req.id = req.headers["x-request-id"] || generateId();
  res.setHeader("x-request-id", req.id);
  next();
});
```

## Testing Strategy

### Test-Driven Development (TDD)

Follow the Red-Green-Refactor cycle:

1. **Red**: Write failing test first
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code while keeping tests green

### Unit Testing

Test individual components in isolation:

```typescript
describe('ContentGenerationService', () => {
  let service: ContentGenerationService;
  let mockBedrockClient: jest.Mocked<BedrockClient>;

  beforeEach(() => {
    mockBedrockClient = createMockBedrockClient();
    service = new ContentGenerationService(mockBedrockClient, ...);
  });

  it('should generate 3 content variants', async () => {
    const result = await service.generateContent(request);
    expect(result.variants).toHaveLength(3);
  });
});
```

### Integration Testing

Test component interactions:

```typescript
describe("API Integration", () => {
  let app: Express;

  beforeAll(async () => {
    app = await createTestApp();
  });

  it("should generate content via API", async () => {
    const response = await request(app)
      .post("/api/v1/content/generate")
      .set("x-api-key", TEST_API_KEY)
      .send(validRequest);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### Mocking External Services

Mock external APIs in tests:

```typescript
jest.mock("../clients/BedrockClient");

const mockBedrockClient = BedrockClient as jest.MockedClass<
  typeof BedrockClient
>;
mockBedrockClient.prototype.generateText.mockResolvedValue({
  text: "Generated content",
  usage: { inputTokens: 100, outputTokens: 200 },
});
```

## Docker and Deployment

### Multi-Stage Docker Build

Optimize Docker image size:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Environment Configuration

Use environment variables for configuration:

```bash
# Required
NODE_ENV=production
PORT=3000
API_KEY=your-api-key

# AWS Bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
BEDROCK_MODEL_ID=anthropic.claude-sonnet-4.5

# Google News API
GOOGLE_NEWS_API_KEY=your-news-api-key

# Cache
CACHE_L2_PATH=/mnt/efs/cache

# Service Mode
SERVICE_MODE=unified
```

### ECS Task Definition

Configure ECS Fargate task:

```json
{
  "family": "advocacy-content-generator",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "your-ecr-repo/advocacy-content-generator:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "SERVICE_MODE", "value": "unified" }
      ],
      "secrets": [
        {
          "name": "API_KEY",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:api-key"
        }
      ],
      "mountPoints": [
        {
          "sourceVolume": "efs-cache",
          "containerPath": "/mnt/efs/cache"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/advocacy-content-generator",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ],
  "volumes": [
    {
      "name": "efs-cache",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-12345678",
        "transitEncryption": "ENABLED"
      }
    }
  ]
}
```

## CI/CD Pipeline

### GitHub Actions Workflow

Automate testing and deployment:

```yaml
name: Deploy to ECS

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: "20"
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - name: Build and push Docker image
        run: |
          docker build -t advocacy-content-generator .
          docker tag advocacy-content-generator:latest $ECR_REPO:latest
          docker push $ECR_REPO:latest
      - name: Deploy to ECS
        run: |
          aws ecs update-service \
            --cluster production \
            --service advocacy-content-generator \
            --force-new-deployment
```

## Code Quality Standards

### TypeScript Configuration

Use strict TypeScript settings:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### ESLint Configuration

Enforce code quality rules:

```javascript
module.exports = {
  parser: "@typescript-eslint/parser",
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier",
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "no-console": "warn",
    "prefer-const": "error",
  },
};
```

### Code Review Checklist

Before merging code:

- [ ] All tests pass
- [ ] Code coverage meets threshold (95%+)
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] API documentation updated
- [ ] Error handling implemented
- [ ] Logging added for important events
- [ ] Performance considerations addressed
- [ ] Security best practices followed
