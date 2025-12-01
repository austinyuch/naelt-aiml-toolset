# RAG (Retrieval-Augmented Generation) Setup Guide

## Overview

This guide explains how to set up and use the RAG functionality for the Judicial Knowledge Base, which is part of Module 3: 判決資料分析模組 (Judicial Data Analysis Module).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         JudicialKnowledgeBase Service                │  │
│  │  - Document Loading                                  │  │
│  │  - Vector Search                                     │  │
│  │  - Question Answering                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    LangChain Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ Text         │  │ Embeddings   │  │ QA Chain         │ │
│  │ Splitter     │  │ (Bedrock)    │  │ (Bedrock LLM)    │ │
│  └──────────────┘  └──────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  Vector Database Layer                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Chroma Vector Database                  │  │
│  │  - Document Storage                                  │  │
│  │  - Similarity Search                                 │  │
│  │  - Persistent Storage                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### 1. Docker and Docker Compose

```bash
# Check Docker installation
docker --version

# Check Docker Compose installation
docker-compose --version
# or
docker compose version
```

### 2. AWS Credentials

You need AWS credentials with access to:
- AWS Bedrock (for embeddings and LLM)
- Specifically: `amazon.titan-embed-text-v1` and `anthropic.claude-sonnet-4-5-20250929-v1:0`

Configure credentials:
```bash
# Option 1: Environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1

# Option 2: AWS CLI configuration
aws configure
```

### 3. Node.js Dependencies

```bash
npm install
```

## Quick Start

### Automated Setup (Recommended)

We provide comprehensive setup scripts for different environments:

#### Development Environment

```bash
# Quick setup for development (includes admin UI)
./scripts/setup-chroma.sh setup dev

# This will:
# 1. Check prerequisites
# 2. Create environment configuration
# 3. Start Chroma with admin UI
# 4. Verify the setup
```

#### Test Environment

```bash
# Setup for testing (with authentication)
./scripts/setup-chroma.sh setup test

# This will:
# 1. Generate test authentication token
# 2. Start Chroma on port 8001
# 3. Configure test environment
```

#### Production Environment

```bash
# Setup for production (with strong authentication)
./scripts/setup-chroma.sh setup prod

# This will:
# 1. Generate strong authentication token
# 2. Configure production settings
# 3. Start Chroma with security enabled
# 4. Display credentials (save them securely!)
```

### Complete RAG Environment Setup

For a complete RAG testing environment:

```bash
# Run the comprehensive setup script
./scripts/setup-rag-environment.sh

# This will:
# 1. Setup Chroma authentication
# 2. Start Chroma server
# 3. Verify Chroma connection
# 4. Install dependencies
# 5. Run RAG integration tests
```

### Manual Setup

#### Step 1: Start Chroma

**Option 1: Using setup script (recommended)**
```bash
./scripts/setup-chroma.sh start dev
```

**Option 2: Using Docker Compose**
```bash
# Development mode (with admin UI)
docker-compose -f docker-compose.chroma.yml --profile dev up -d

# Production mode
docker-compose -f docker-compose.chroma.yml up -d
```

**Option 3: Using Docker directly**
```bash
docker run -d \
  -p 8001:8000 \
  -v chroma-data:/chroma/chroma \
  --name advocacy-chroma \
  chromadb/chroma:latest
```

#### Step 2: Configure Environment

The setup script automatically creates environment files. For manual configuration:

```bash
# Development (.env.chroma.dev)
CHROMA_PORT=8000
CHROMA_UI_PORT=3001
CHROMA_TELEMETRY=FALSE
CHROMA_URL=http://localhost:8000

# Test (.env.chroma.test)
CHROMA_PORT=8001
CHROMA_AUTH_TOKEN=test-token-xxxxx
CHROMA_URL=http://localhost:8001

# Production (.env.chroma.prod)
CHROMA_PORT=8000
CHROMA_AUTH_TOKEN=<strong-token>
CHROMA_URL=http://chroma:8000
```

Update your main `.env` file:

```bash
# Enable RAG feature
FEATURE_LANGCHAIN_RAG=true

# Chroma configuration
CHROMA_URL=http://localhost:8000
CHROMA_USERNAME=admin
CHROMA_PASSWORD=your_chroma_password_here

# AWS configuration (if not using ~/.aws/credentials)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

#### Step 3: Verify Setup

**Using the test script:**
```bash
npx tsx scripts/test-chroma-connection.ts
```

**Manual verification:**
```bash
# Check Chroma is running
curl http://localhost:8000/api/v1/heartbeat

# Expected response: {"nanosecond heartbeat": ...}

# Check version
curl http://localhost:8000/api/v1/version

# List collections
curl http://localhost:8000/api/v1/collections
```

## Usage

### Basic Example

```typescript
import { JudicialKnowledgeBase } from './src/services/JudicialKnowledgeBase';
import { JudicialDocumentLoader } from './src/services/JudicialDocumentLoader';

// Initialize knowledge base
const kb = new JudicialKnowledgeBase({
    chromaUrl: 'http://localhost:8001',
    collectionName: 'judicial-cases',
    awsRegion: 'us-east-1'
});

// Load documents
const loader = new JudicialDocumentLoader();
const documents = await loader.loadFromJSON('path/to/judgments.json');

// Initialize with documents
await kb.initialize(documents);

// Search for similar cases
const results = await kb.searchSimilarCases('殺人案件', 5);

// Ask questions
const answer = await kb.query('哪些案件被判處死刑？');
```

### Running the Example

```bash
# Run the complete example
tsx examples/rag-judicial-knowledge-base.ts
```

## Document Loading

### From JSON File

```typescript
const loader = new JudicialDocumentLoader();
const documents = await loader.loadFromJSON('judgments.json');
```

JSON format:
```json
[
  {
    "caseId": "111-重訴-123",
    "court": "臺灣高等法院",
    "year": 2022,
    "caseType": "刑事",
    "defendant": "張三",
    "charge": "故意殺人罪",
    "verdict": "死刑",
    "content": "完整判決書內容..."
  }
]
```

### From Directory

```typescript
const documents = await loader.loadFromDirectory('./judgments');
```

### From Single File

```typescript
const document = await loader.loadFromFile('./judgment.txt');
```

### Sample Documents

```typescript
const documents = loader.createSampleDocuments();
```

## API Reference

### JudicialKnowledgeBase

#### Constructor

```typescript
new JudicialKnowledgeBase(config?: JudicialKnowledgeBaseConfig)
```

Config options:
- `chromaUrl`: Chroma server URL (default: `http://localhost:8000`)
- `collectionName`: Collection name (default: `judicial-cases`)
- `awsRegion`: AWS region (default: `us-east-1`)
- `embeddingModel`: Embedding model (default: `amazon.titan-embed-text-v1`)
- `llmModel`: LLM model (default: `anthropic.claude-sonnet-4-5-20250929-v1:0`)
- `chunkSize`: Text chunk size (default: `1000`)
- `chunkOverlap`: Chunk overlap (default: `200`)

#### Methods

**initialize(documents: Document[]): Promise<void>**
- Initialize the knowledge base with documents
- Splits documents into chunks
- Creates vector embeddings
- Stores in Chroma

**searchSimilarCases(query: string, k?: number): Promise<Document[]>**
- Search for similar cases
- Returns top k results (default: 5)
- Uses semantic similarity

**query(question: string): Promise<string>**
- Ask a question about the cases
- Uses RAG to generate answer
- Returns natural language response

**getStats(): Promise<KnowledgeBaseStats>**
- Get statistics about the knowledge base
- Returns document count, chunk count, etc.

**isInitialized(): boolean**
- Check if knowledge base is initialized

**cleanup(): Promise<void>**
- Clean up resources
- Should be called when done

## Configuration

### Environment Variables

```bash
# Feature Flags
FEATURE_LANGCHAIN_RAG=true          # Enable RAG functionality

# Chroma Configuration
CHROMA_URL=http://localhost:8001    # Chroma server URL

# AWS Configuration
AWS_REGION=us-east-1                # AWS region
AWS_ACCESS_KEY_ID=...               # AWS access key
AWS_SECRET_ACCESS_KEY=...           # AWS secret key

# Model Configuration (optional)
BEDROCK_EMBEDDING_MODEL=amazon.titan-embed-text-v1
BEDROCK_LLM_MODEL=anthropic.claude-sonnet-4-5-20250929-v1:0
```

### Docker Compose Configuration

The `docker-compose.yml` includes Chroma service:

```yaml
services:
  chroma:
    image: chromadb/chroma:latest
    ports:
      - "8001:8000"
    volumes:
      - chroma-data:/chroma/chroma
    environment:
      - IS_PERSISTENT=TRUE
```

## Testing

### Unit Tests with Vitest ✅

We use Vitest for RAG tests - it has native ESM support and works perfectly with LangChain.

```bash
# Run unit tests (no external dependencies required)
npm run test:vitest -- -t "Unit Tests"

# Expected output: ✓ 4 tests passed
```

### Integration Tests

Integration tests require Chroma and AWS credentials:

```bash
# Start Chroma
docker-compose up -d chroma

# Set AWS credentials
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_REGION=us-east-1

# Run all tests (including integration)
npm run test:rag
```

### Test with UI

```bash
# Run Vitest with interactive UI
npm run test:vitest:ui
```

### Manual Testing

```bash
# Run the example script
tsx examples/rag-judicial-knowledge-base.ts
```

## Management Commands

### Chroma Manager Script

The `chroma-manager.sh` script provides comprehensive management:

```bash
# Setup and start
./scripts/chroma-manager.sh setup dev     # Development
./scripts/chroma-manager.sh setup test    # Testing
./scripts/chroma-manager.sh setup prod    # Production

# Start/Stop
./scripts/chroma-manager.sh start dev     # Start Chroma
./scripts/chroma-manager.sh stop          # Stop Chroma
./scripts/chroma-manager.sh restart dev   # Restart Chroma

# Status and Monitoring
./scripts/chroma-manager.sh status        # Show status
./scripts/chroma-manager.sh verify        # Verify connection

# Data Management
./scripts/chroma-manager.sh cleanup       # Delete all data (dangerous!)

# Help
./scripts/chroma-manager.sh help          # Show usage
```

### Running RAG Tests

```bash
# Run complete RAG test suite
./scripts/run-rag-tests.sh

# Run with specific environment
./scripts/run-rag-tests.sh test
./scripts/run-rag-tests.sh dev
```

## Troubleshooting

### Chroma Connection Issues

**Using management script:**
```bash
# Check status
./scripts/chroma-manager.sh status

# View logs
./scripts/chroma-manager.sh logs

# Restart service
./scripts/chroma-manager.sh restart dev
```

**Manual checks:**
```bash
# Check if Chroma is running
docker ps | grep chroma

# Check Chroma logs
docker-compose -f docker-compose.chroma.yml logs chroma

# Restart Chroma
docker-compose -f docker-compose.chroma.yml restart chroma
```

### Connection Test Script

```bash
# Run comprehensive connection test
npx tsx scripts/test-chroma-connection.ts

# This will:
# 1. Test heartbeat
# 2. Get version info
# 3. List collections
# 4. Create test collection
# 5. Add test documents
# 6. Query documents
# 7. Clean up test data
```

### AWS Credentials Issues

```bash
# Verify AWS credentials
aws sts get-caller-identity

# Check Bedrock access
aws bedrock list-foundation-models --region us-east-1

# Test Bedrock embeddings
aws bedrock-runtime invoke-model \
  --model-id amazon.titan-embed-text-v1 \
  --body '{"inputText":"test"}' \
  --region us-east-1 \
  output.json
```

### Memory Issues

If you encounter memory issues with large document sets:

1. Reduce `chunkSize` in configuration
2. Process documents in batches
3. Increase Docker memory limits:

```yaml
# docker-compose.chroma.yml
services:
  chroma:
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G
```

### Port Conflicts

If port 8000 is already in use:

```bash
# Change port in environment file
echo "CHROMA_PORT=8002" >> .env.chroma.dev

# Or use environment variable
CHROMA_PORT=8002 ./scripts/chroma-manager.sh start dev
```

### Authentication Issues

```bash
# Regenerate authentication credentials
./scripts/setup-chroma-auth.sh

# Check credentials
cat config/server.htpasswd

# Test with authentication
curl -u admin:password http://localhost:8000/api/v1/heartbeat
```

### Data Corruption

```bash
# Reset all data (WARNING: deletes everything)
./scripts/chroma-manager.sh cleanup

# Restart fresh
./scripts/chroma-manager.sh setup dev
```

### Testing with Vitest

✅ **We use Vitest for RAG tests** - it has native ESM support and works perfectly with LangChain.

```bash
# Run unit tests (no external dependencies)
npm run test:vitest -- -t "Unit Tests"

# Run all RAG tests
npm run test:rag

# Run with UI
npm run test:vitest:ui

# Run specific test file
npm run test:vitest tests/unit/services/JudicialKnowledgeBase.vitest.ts
```

See `tests/unit/services/README-RAG-TESTS.md` for details.

### Common Error Messages

**"Connection refused"**
- Chroma is not running
- Solution: `./scripts/chroma-manager.sh start dev`

**"Authentication failed"**
- Invalid credentials
- Solution: `./scripts/setup-chroma-auth.sh`

**"Collection not found"**
- Knowledge base not initialized
- Solution: Run `kb.initialize(documents)` first

**"AWS credentials not found"**
- AWS credentials not configured
- Solution: Set AWS environment variables or configure `~/.aws/credentials`

## Performance Optimization

### Chunk Size Tuning

```typescript
const kb = new JudicialKnowledgeBase({
    chunkSize: 1000,      // Larger = fewer chunks, less granular
    chunkOverlap: 200     // Overlap for context preservation
});
```

### Batch Processing

For large document sets:

```typescript
const batchSize = 100;
for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    await kb.initialize(batch);
}
```

### Caching

Chroma automatically caches embeddings. For additional caching:

```typescript
// Cache search results
const cache = new Map();
const cacheKey = `search:${query}`;

if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
}

const results = await kb.searchSimilarCases(query);
cache.set(cacheKey, results);
```

## Production Deployment

### AWS ECS Deployment

1. Deploy Chroma as a separate ECS service
2. Use EFS for persistent storage
3. Configure security groups for inter-service communication

### Scaling Considerations

- Chroma can be scaled horizontally
- Consider using managed vector databases (Pinecone, Weaviate) for production
- Monitor embedding API costs (AWS Bedrock)

### Security

- Use IAM roles instead of access keys
- Encrypt data at rest (EFS encryption)
- Use VPC for network isolation
- Implement rate limiting

## Deployment Options

### Development Deployment

```bash
# Quick start for development
./scripts/setup-chroma.sh setup dev

# Access points:
# - Chroma API: http://localhost:8000
# - Admin UI: http://localhost:3001
```

### Test Deployment

```bash
# Setup test environment with authentication
./scripts/setup-chroma.sh setup test

# Run tests
./scripts/run-rag-tests.sh test
```

### Production Deployment

For production deployment, see the comprehensive guide:

```bash
# Deploy production environment
./scripts/deploy-production.sh

# This includes:
# - SSL/TLS certificates
# - Nginx reverse proxy
# - Strong authentication
# - Health monitoring
# - Backup procedures
```

See `docs/chroma-deployment-guide.md` for detailed production deployment instructions.

### Docker Compose Configurations

**Development:**
```bash
docker-compose -f docker-compose.chroma.yml --profile dev up -d
```

**Production:**
```bash
docker-compose -f docker-compose.chroma.prod.yml up -d
```

## Available Scripts

### Setup and Management

| Script | Purpose | Usage |
|--------|---------|-------|
| `setup-chroma.sh` | Setup and manage Chroma server | `./scripts/setup-chroma.sh [command] [env]` |
| `chroma-manager.sh` | Comprehensive Chroma management | `./scripts/chroma-manager.sh [command]` |
| `setup-chroma-auth.sh` | Setup authentication | `./scripts/setup-chroma-auth.sh` |
| `setup-rag-environment.sh` | Complete RAG environment setup | `./scripts/setup-rag-environment.sh` |
| `deploy-production.sh` | Production deployment | `./scripts/deploy-production.sh` |

### Testing Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `test-chroma-connection.ts` | Test Chroma connection | `npx tsx scripts/test-chroma-connection.ts` |
| `run-rag-tests.sh` | Run RAG integration tests | `./scripts/run-rag-tests.sh [env]` |

### Script Examples

```bash
# Complete setup workflow
./scripts/setup-chroma.sh setup dev
npx tsx scripts/test-chroma-connection.ts
./scripts/run-rag-tests.sh dev

# Production deployment workflow
./scripts/deploy-production.sh deploy
./scripts/deploy-production.sh status

# Maintenance workflow
./scripts/chroma-manager.sh backup
./scripts/chroma-manager.sh status
./scripts/chroma-manager.sh logs
```

## CI/CD Integration

### GitHub Actions

The project includes GitHub Actions workflow for automated testing:

```yaml
# .github/workflows/chroma-tests.yml
name: Chroma Integration Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  chroma-tests:
    runs-on: ubuntu-latest
    services:
      chroma:
        image: chromadb/chroma:latest
        ports:
          - 8000:8000
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test -- tests/integration/langchain-rag.integration.test.ts
```

### Local CI Testing

```bash
# Simulate CI environment locally
docker-compose -f docker-compose.chroma.yml up -d
npm ci
npm test -- tests/integration/langchain-rag.integration.test.ts
docker-compose -f docker-compose.chroma.yml down
```

## Backup and Recovery

### Automated Backups

```bash
# Create backup
./scripts/chroma-manager.sh backup

# Backups are stored in: ./backups/chroma/
# Format: chroma_backup_YYYYMMDD_HHMMSS.tar.gz
```

### Manual Backup

```bash
# Backup Docker volume
docker run --rm \
  -v advocacy-content-generator_chroma_data:/source:ro \
  -v $(pwd)/backups:/backup \
  alpine:latest \
  tar czf /backup/manual_backup_$(date +%Y%m%d_%H%M%S).tar.gz -C /source .
```

### Recovery

```bash
# Stop Chroma
./scripts/chroma-manager.sh stop

# Restore from backup
docker run --rm \
  -v advocacy-content-generator_chroma_data:/target \
  -v $(pwd)/backups:/backup \
  alpine:latest \
  tar xzf /backup/your_backup_file.tar.gz -C /target

# Start Chroma
./scripts/chroma-manager.sh start dev
```

## Monitoring and Observability

### Health Checks

```bash
# Quick health check
curl http://localhost:8000/api/v1/heartbeat

# Detailed status
./scripts/chroma-manager.sh status

# Verify connection with tests
npx tsx scripts/test-chroma-connection.ts
```

### Logging

```bash
# View real-time logs
./scripts/chroma-manager.sh logs

# View last 100 lines
docker-compose -f docker-compose.chroma.yml logs --tail=100 chroma

# Follow logs
docker-compose -f docker-compose.chroma.yml logs -f chroma
```

### Metrics

```bash
# Get collection statistics
curl http://localhost:8000/api/v1/collections

# Get version info
curl http://localhost:8000/api/v1/version

# Check resource usage
docker stats advocacy-chroma
```

## Resources

### Documentation

- [LangChain Documentation](https://js.langchain.com/docs/)
- [Chroma Documentation](https://docs.trychroma.com/)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Project Design Document](.kiro/specs/advocacy-content-generator/design.md)
- [Chroma Deployment Guide](docs/chroma-deployment-guide.md)

### Project Files

- Setup Scripts: `scripts/setup-chroma.sh`, `scripts/chroma-manager.sh`
- Test Scripts: `scripts/test-chroma-connection.ts`, `scripts/run-rag-tests.sh`
- Docker Configs: `docker-compose.chroma.yml`, `docker-compose.chroma.prod.yml`
- Examples: `examples/rag-judicial-knowledge-base.ts`
- Tests: `tests/unit/services/JudicialKnowledgeBase.vitest.ts`

## Support

For issues or questions:

1. **Check Documentation**
   - `tests/unit/services/README-RAG-TESTS.md` - Testing guide
   - `docs/chroma-deployment-guide.md` - Deployment guide
   - This file - Setup and usage guide

2. **Run Diagnostics**
   ```bash
   ./scripts/chroma-manager.sh status
   npx tsx scripts/test-chroma-connection.ts
   ```

3. **Check Logs**
   ```bash
   ./scripts/chroma-manager.sh logs
   docker-compose -f docker-compose.chroma.yml logs chroma
   ```

4. **Review Examples**
   - `examples/rag-judicial-knowledge-base.ts` - Complete usage example
   - `tests/integration/langchain-rag.integration.test.ts` - Integration tests

5. **Common Solutions**
   - Connection issues: `./scripts/chroma-manager.sh restart dev`
   - Authentication issues: `./scripts/setup-chroma-auth.sh`
   - Data issues: `./scripts/chroma-manager.sh cleanup` (then re-setup)
