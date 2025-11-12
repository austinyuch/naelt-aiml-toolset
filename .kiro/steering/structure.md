# Project Structure Guidelines

## Directory Structure

```
naelt-aiml-toolset/
├── src/                          # Source code
│   ├── api/                      # REST API layer
│   │   ├── routes/              # API route handlers
│   │   │   ├── health.ts        # Health check endpoint
│   │   │   ├── news.ts          # News search endpoints
│   │   │   ├── content.ts       # Content generation endpoints
│   │   │   └── templates.ts     # Template management endpoints
│   │   ├── middleware/          # Express middleware
│   │   │   ├── auth.ts          # API key authentication
│   │   │   ├── errorHandler.ts # Error handling
│   │   │   └── monitoring.ts   # Request logging & metrics
│   │   └── app.ts               # Express app configuration
│   │
│   ├── mcp/                      # MCP Server layer
│   │   ├── server.ts            # MCP server implementation
│   │   └── index.ts             # MCP entry point
│   │
│   ├── services/                 # Business logic layer
│   │   ├── NewsSearchService.ts          # News search orchestration
│   │   ├── ContentGenerationService.ts   # Content generation logic
│   │   ├── TemplateManagementService.ts  # Template management
│   │   └── ContentOrchestrator.ts        # Service coordination
│   │
│   ├── clients/                  # External API clients
│   │   ├── NewsAPIClient.ts     # Google News API client
│   │   └── BedrockClient.ts     # AWS Bedrock client
│   │
│   ├── prompts/                  # Prompt template system
│   │   ├── PromptTemplateLoader.ts  # Template file loader
│   │   └── PromptBuilder.ts         # Prompt construction logic
│   │
│   ├── core/                     # Core utilities
│   │   ├── exceptions.ts        # Custom exception classes
│   │   ├── cache.ts             # Cache manager (L1 + L2)
│   │   ├── rateLimiter.ts       # Rate limiting logic
│   │   ├── retry.ts             # Retry mechanism
│   │   ├── logger.ts            # Structured logging (winston)
│   │   └── metrics.ts           # Performance metrics (prom-client)
│   │
│   ├── types/                    # TypeScript type definitions
│   │   ├── requests.ts          # Request interfaces
│   │   ├── responses.ts         # Response interfaces
│   │   └── domain.ts            # Domain models
│   │
│   ├── config.ts                 # Configuration management
│   └── index.ts                  # Application entry point
│
├── prompts/                      # Prompt template files (Markdown)
│   ├── topics/                  # Topic-specific templates
│   │   ├── victim_rights.md     # Victim rights advocacy
│   │   ├── anti_death_penalty.md # Anti-death penalty
│   │   └── judicial_injustice.md # Judicial injustice
│   ├── platforms/               # Platform-specific requirements
│   │   ├── instagram.md         # Instagram format
│   │   ├── facebook.md          # Facebook format
│   │   └── line.md              # LINE format
│   ├── variants/                # Content variant styles
│   │   ├── rational_analysis.md     # Rational analysis
│   │   ├── emotional_resonance.md   # Emotional resonance
│   │   └── call_to_action.md        # Call to action
│   └── refine.md                # Content refinement template
│
├── tests/                        # Test files
│   ├── unit/                    # Unit tests (TDD)
│   │   ├── api/                 # API layer tests
│   │   ├── services/            # Service layer tests
│   │   ├── clients/             # Client tests (mocked)
│   │   ├── prompts/             # Prompt system tests
│   │   ├── core/                # Core utility tests
│   │   └── types.test.ts        # Type definition tests
│   ├── integration/             # Integration tests
│   │   ├── api.integration.test.ts  # Full API flow tests
│   │   └── mcp.integration.test.ts  # MCP tool tests
│   └── performance/             # Performance tests
│       └── baseline.test.ts     # Response time baselines
│
├── docs/                         # Documentation
│   ├── init-proposal.html       # Initial proposal
│   ├── api-guide.md             # API usage guide
│   ├── mcp-guide.md             # MCP integration guide
│   └── deployment-guide.md      # AWS deployment guide
│
├── .kiro/                        # Kiro IDE configuration
│   ├── specs/                   # Feature specifications
│   │   └── advocacy-content-generator/
│   │       ├── requirements.md  # Requirements document
│   │       ├── design.md        # Design document
│   │       └── tasks.md         # Implementation tasks
│   └── steering/                # Agent steering documents
│       ├── development.md       # Development guidelines
│       ├── product.md           # Product guidelines
│       ├── structure.md         # This file
│       └── tech.md              # Technical guidelines
│
├── .github/                      # GitHub configuration
│   └── workflows/               # CI/CD workflows
│       └── deploy.yml           # Deployment pipeline
│
├── Dockerfile                    # Docker build configuration
├── docker-compose.yml           # Local development setup
├── .dockerignore                # Docker ignore patterns
├── .gitignore                   # Git ignore patterns
├── .env.example                 # Environment variable template
├── package.json                 # Node.js dependencies
├── tsconfig.json                # TypeScript configuration
├── jest.config.js               # Jest test configuration
├── eslint.config.js             # ESLint configuration
├── task-definition.json         # ECS task definition
└── README.md                    # Project documentation
```

## Layer Architecture

### 1. API Layer (`src/api/`)

**Responsibility**: HTTP request handling, routing, middleware

**Key Components**:

- **Routes**: Define API endpoints and request/response handling
- **Middleware**: Authentication, error handling, logging, metrics
- **App Configuration**: Express setup, OpenAPI documentation

**Design Principles**:

- Thin controllers - delegate business logic to services
- Consistent error handling across all endpoints
- Request validation using Zod schemas
- OpenAPI documentation for all endpoints

### 2. MCP Layer (`src/mcp/`)

**Responsibility**: Model Context Protocol server implementation

**Key Components**:

- **MCP Server**: Tool definitions and handlers
- **Tool Integration**: Shared business logic with API layer

**Design Principles**:

- Zero code duplication - reuse service layer
- Clean tool names and descriptions
- Consistent error handling with API layer

### 3. Service Layer (`src/services/`)

**Responsibility**: Business logic orchestration

**Key Components**:

- **NewsSearchService**: News search and filtering
- **ContentGenerationService**: Content generation and refinement
- **TemplateManagementService**: Template CRUD operations
- **ContentOrchestrator**: Cross-service coordination

**Design Principles**:

- Single Responsibility Principle
- Dependency Injection for testability
- Clear interfaces and contracts
- Comprehensive error handling

### 4. Client Layer (`src/clients/`)

**Responsibility**: External API integration

**Key Components**:

- **NewsAPIClient**: Google News API wrapper
- **BedrockClient**: AWS Bedrock API wrapper

**Design Principles**:

- Retry mechanism with exponential backoff
- Timeout handling
- Error transformation to domain exceptions
- Rate limiting awareness

### 5. Core Layer (`src/core/`)

**Responsibility**: Shared utilities and infrastructure

**Key Components**:

- **Exceptions**: Custom exception hierarchy
- **Cache**: Multi-layer caching (L1 memory + L2 EFS)
- **RateLimiter**: Request rate limiting
- **Retry**: Exponential backoff retry logic
- **Logger**: Structured logging with winston
- **Metrics**: Performance metrics with prom-client

**Design Principles**:

- Reusable across all layers
- Well-tested and reliable
- Performance-optimized
- Clear documentation

### 6. Prompt Layer (`src/prompts/`)

**Responsibility**: Prompt template management

**Key Components**:

- **PromptTemplateLoader**: Load Markdown templates from filesystem
- **PromptBuilder**: Construct prompts with variable substitution

**Design Principles**:

- Template caching for performance
- Variable validation
- Multi-language support
- Version control friendly (Markdown files)

## File Naming Conventions

### TypeScript Files

- **Classes**: PascalCase (e.g., `NewsAPIClient.ts`, `ContentOrchestrator.ts`)
- **Utilities**: camelCase (e.g., `logger.ts`, `cache.ts`)
- **Types**: camelCase (e.g., `requests.ts`, `responses.ts`)
- **Routes**: camelCase (e.g., `news.ts`, `content.ts`)

### Test Files

- **Unit Tests**: `<FileName>.test.ts` (e.g., `NewsAPIClient.test.ts`)
- **Integration Tests**: `<feature>.integration.test.ts`
- **Performance Tests**: `<feature>.performance.test.ts`

### Prompt Templates

- **Topics**: snake_case (e.g., `victim_rights.md`)
- **Platforms**: lowercase (e.g., `instagram.md`)
- **Variants**: snake_case (e.g., `rational_analysis.md`)

## Module Dependencies

### Dependency Flow

```
API/MCP Layer
    ↓
Service Layer
    ↓
Client Layer + Prompt Layer + Core Layer
    ↓
Types Layer
```

### Dependency Rules

1. **No Circular Dependencies**: Enforce strict unidirectional flow
2. **Layer Isolation**: Upper layers depend on lower layers only
3. **Interface Segregation**: Use interfaces for loose coupling
4. **Dependency Injection**: Pass dependencies via constructor

## Code Organization Principles

### Single Responsibility

- Each file should have one clear purpose
- Each class should have one reason to change
- Each function should do one thing well

### Separation of Concerns

- API layer handles HTTP concerns
- Service layer handles business logic
- Client layer handles external integration
- Core layer provides shared utilities

### DRY (Don't Repeat Yourself)

- Extract common logic to core utilities
- Reuse service layer across API and MCP
- Share type definitions across layers

### SOLID Principles

- **S**ingle Responsibility: One class, one purpose
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Subtypes must be substitutable
- **I**nterface Segregation: Many specific interfaces over one general
- **D**ependency Inversion: Depend on abstractions, not concretions

## Testing Structure

### Test Organization

- Mirror source code structure in tests/
- One test file per source file
- Group related tests using `describe` blocks

### Test Naming

- Use descriptive test names: `should <expected behavior> when <condition>`
- Example: `should return cached results when cache is valid`

### Test Coverage

- Aim for 95%+ coverage on critical business logic
- 100% coverage on core utilities
- Focus on behavior, not implementation details

## Configuration Management

### Environment Variables

- Store in `.env` file (never commit)
- Provide `.env.example` template
- Validate on startup using Zod

### Configuration Files

- `config.ts`: Centralized configuration management
- Type-safe configuration access
- Environment-specific overrides

## Documentation Standards

### Code Documentation

- JSDoc comments for public APIs
- Inline comments for complex logic
- README.md for each major module

### API Documentation

- OpenAPI/Swagger specification
- Request/response examples
- Error code documentation

### Architecture Documentation

- High-level architecture diagrams
- Data flow diagrams
- Deployment architecture

## Version Control

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: Feature development
- `hotfix/*`: Production fixes

### Commit Messages

- Use conventional commits format
- Example: `feat(api): add content refinement endpoint`
- Types: feat, fix, docs, style, refactor, test, chore

## Build and Deployment

### Build Process

- TypeScript compilation
- Dependency bundling
- Environment variable validation
- Docker image creation

### Deployment Targets

- **Local**: Docker Compose
- **Staging**: AWS ECS Fargate (staging environment)
- **Production**: AWS ECS Fargate (production environment)

### Deployment Artifacts

- Docker image
- ECS task definition
- Environment configuration
- Infrastructure as Code (optional)
