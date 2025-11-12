# Development Guidelines

## Table of Contents

- [High Level Instructions](#high-level-instructions)
- [Security and Sensitive Files Management](#security-and-sensitive-files-management)
- [Test-Driven Development (TDD)](#test-driven-development-tdd)
- [Testing Guidelines](#testing-guidelines)
- [Code Review Guidelines](#code-review-guidelines)
- [Performance Optimization](#performance-optimization)
- [Production Deployment](#production-deployment)
- [Code Quality Tools](#code-quality-tools)
- [Unified Service Architecture](#unified-service-architecture)

---

## High Level Instructions

- For command line execution for temporary inspection purposes, larger than 5 lines, use temporary script file, and print to temporary output file. Do not run it like python -c "{the_long_scripts}"
- Remove the temporary files when goal achieved or task or sub-task completed.
- Ask questions if uncertainties and risks are high.
- Do not respond "understood" and then do nothing. Keep on working.
- 針對重複範的錯請在 steering document 建立 lesson learned, 並提出其他建議更新
- 如果採用 dependency injection 模式, 在 read 程式碼時應該要一起讀進去使用的程式碼以避免遺漏
- 你在執行 command 長指令的時候都不會自己讀取螢幕上的結果,請改作法成產出到暫時性的檔案在讀取; 蒐集完資料後經該要移除

### Common Development Pitfalls

1. **Long Command Execution** - Always output to temporary files for commands longer than 5 lines
2. **Dependency Injection Reading** - When reading code with DI patterns, always include the injected dependencies
3. **Temporary File Cleanup** - Always clean up temporary files after task completion
4. **Error Pattern Recognition** - Document recurring errors in steering documents for future reference
5. **Command Output Reading** - When executing long commands, always redirect output to temporary files and read them instead of trying to capture output directly from command execution

### Lessons Learned

#### Command Output Handling

**Problem**: Agent fails to read command output when executing long commands directly.

**Solution**:

- Always redirect command output to temporary files
- Read the temporary file content after command execution
- Clean up temporary files after reading

**Example**:

```bash
# Wrong approach
python -c "long_script_here"

# Correct approach
cat > /tmp/script.py << 'EOF'
# script content here
EOF
python /tmp/script.py > /tmp/output.txt 2>&1
# Read /tmp/output.txt
# Clean up /tmp/script.py and /tmp/output.txt
```

---

## Test-Driven Development (TDD)

### TDD Cycle (Red-Green-Refactor)

All development tasks MUST follow Test-Driven Development (TDD) methodology:

1. **RED Phase - Write Failing Test First**

   - Write test cases BEFORE implementing any functionality
   - Tests should fail initially (no implementation exists yet)
   - Define expected behavior through test assertions
   - Cover edge cases and error scenarios in test design

2. **GREEN Phase - Implement Minimum Code**

   - Write ONLY enough code to make the test pass
   - Focus on functionality, not optimization
   - Ensure all tests pass before proceeding
   - Verify test coverage meets requirements

3. **REFACTOR Phase - Improve Code Quality**
   - Refactor code while keeping tests green
   - Improve readability, maintainability, and performance
   - Remove duplication and apply design patterns
   - Update documentation and comments

### TDD Implementation Rules

- **Test First, Always**: No production code without a failing test
- **One Test at a Time**: Focus on one test case, make it pass, then move to next
- **Minimal Implementation**: Write the simplest code that makes the test pass
- **Continuous Testing**: Run tests frequently during development
- **Test Coverage**: Aim for 95%+ coverage for critical business logic
- **Test Independence**: Each test should be independent and repeatable

### Quality Gates

Before marking any task as complete:

- ✅ All tests pass (pytest exit code 0)
- ✅ Test coverage meets threshold (95%+ for critical code)
- ✅ No test warnings or errors
- ✅ Tests are documented with requirement references
- ✅ Code follows project coding standards
- ✅ Documentation updated to reflect changes

---

## Testing Guidelines

### Testing Strategy and Architecture

#### Hybrid Testing Approach

Use a three-tier testing strategy:

```
Testing Pyramid:
├── Unit Tests (Mock-based) - Fast feedback, 100% reliable
├── Integration Tests (Docker-based) - Real environment validation
└── End-to-End Tests (Production-like) - Complete system validation
```

### Test Categories

#### 1. Mock-Based Unit Tests

**When to use**: Fast CI/CD feedback, development testing, regression prevention

```python
# Example mock-based test
from tests.fixtures.simple_performance_optimization import FastMockClient

def test_api_authentication():
    """Test API authentication using proven mock approach."""
    client = FastMockClient(["valid-api-key"])

    response = client.post("/api/v1/query/natural-language",
                          json={"question": "test"},
                          headers={"X-API-Key": "valid-api-key"})

    assert response["status_code"] == 200
    assert response["content"]["success"] is True
```

#### 2. Docker-Based Integration Tests

**When to use**: Pre-deployment validation, comprehensive testing

```python
# Example Docker-based integration test
from tests.integration.real_environment_test_runner import RealEnvironmentTestRunner

def test_real_fastapi_integration():
    """Test real FastAPI integration in Docker environment."""
    runner = RealEnvironmentTestRunner()
    result = runner.run_integration_tests()

    assert result.overall_success
    assert result.passed_tests > 0
```

#### 3. Performance Tests

**When to use**: Baseline establishment, regression detection

```python
# Example performance test
def test_performance_baseline():
    """Test performance against established baselines."""
    times = []
    for _ in range(100):
        start = time.time()
        # Execute test
        times.append(time.time() - start)

    avg_time = sum(times) / len(times)
    assert avg_time < 0.001, f"Performance regression: {avg_time:.6f}s"
```

### Security Testing

#### Comprehensive Authentication Testing

Test all authentication scenarios systematically:

```python
scenarios = [
    ("valid_user_key", "sk-valid-user-key", 200),
    ("invalid_key", "sk-invalid-key", 401),
    ("expired_key", "sk-expired-key", 401),
    ("suspended_key", "sk-suspended-key", 401),
    ("malformed_key", "invalid", 401),
    ("missing_key", None, 401),
]

for scenario_name, api_key, expected_status in scenarios:
    # Test each scenario
    pass
```

### CI/CD Pipeline Testing

```yaml
stages:
  - fast_feedback # Mock tests < 5 minutes
  - comprehensive_testing # Docker tests < 15 minutes
  - performance_validation # Benchmarks
  - security_testing # Security scans
```

---

## Code Review Guidelines

### General Principles

- **Readability First**: Code should be self-documenting
- **Consistency**: Follow established patterns
- **Simplicity**: Prefer simple solutions
- **Testability**: Design for easy testing
- **Security**: Security built into every component

### Review Process

1. **Automated Checks**: Ensure all automated quality checks pass
2. **Manual Review**: Focus on logic, design, and maintainability
3. **Security Review**: Specific focus on security implications
4. **Performance Review**: Consider performance impact
5. **Documentation Review**: Ensure documentation is updated

### Python Backend Review Criteria

#### Code Structure & Design

- **Single Responsibility**: Each class/function has one clear purpose
- **Dependency Injection**: Use FastAPI's DI system appropriately
- **Abstract Interfaces**: Leverage abstract interfaces for pluggable components
- **Error Handling**: Proper exception handling with custom exception classes
- **Resource Management**: Proper cleanup of resources

#### FastAPI Specific

- **Router Organization**: Logical grouping of endpoints
- **Pydantic Models**: Proper request/response model design
- **Dependency Usage**: Appropriate use of FastAPI dependencies
- **Middleware**: Proper middleware implementation
- **Documentation**: OpenAPI documentation completeness

#### Security Considerations

- **API Key Management**: Proper handling of enhanced API key system
- **Input Validation**: Comprehensive validation of all inputs
- **SQL Injection Prevention**: Critical for Text2SQL feature
- **Authentication**: Proper authentication middleware
- **Authorization**: User isolation and permission checking

### TypeScript Frontend Review Criteria

#### React Best Practices

- **Component Design**: Single responsibility, reusable components
- **Hook Usage**: Proper use of React hooks with correct dependencies
- **State Management**: Appropriate state management patterns
- **Performance**: Use of useMemo, useCallback, React.memo
- **Error Boundaries**: Proper error handling

#### TypeScript Quality

- **Type Safety**: Avoid 'any' types
- **Interface Design**: Clear, well-defined interfaces
- **Generic Usage**: Appropriate use of generics
- **Null Safety**: Proper handling of null/undefined
- **Type Guards**: Use of type guards for runtime checking

### Review Checklist

#### Pre-Review Automated Checks

- [ ] All tests pass
- [ ] Code formatting passes (Ruff/ESLint)
- [ ] Type checking passes (mypy/TypeScript)
- [ ] Security scans pass
- [ ] Build process completes

#### Manual Review Items

- [ ] Code correctly implements intended functionality
- [ ] Edge cases properly handled
- [ ] Error conditions appropriately managed
- [ ] Code follows established patterns
- [ ] No code duplication
- [ ] Appropriate use of design patterns

---

## Performance Optimization

### Performance Baselines and Targets

#### Response Time Targets

- **API Endpoints**: 95th percentile < 500ms
- **Health Checks**: < 50ms
- **Authentication**: < 100ms
- **Text2SQL Queries**: < 2 seconds
- **File Processing**: < 30 seconds

#### Throughput Targets

- **Concurrent Users**: Support 100+ concurrent users
- **Requests per Second**: 1000+ RPS for read operations
- **API Calls per Minute**: 60,000+ per minute system-wide

### Caching Strategies

#### Multi-Layer Caching Implementation

```python
class ProductionCacheManager:
    """Production-ready cache manager."""

    def __init__(self):
        self.memory_cache = {}  # L1 Cache
        self.redis_cache = None  # L2 Cache
        self.s3_cache = None     # L3 Cache

    @lru_cache(maxsize=1000)
    def get_cached_config(self, config_type: str):
        """Use LRU cache for frequently accessed configurations."""
        return self._load_config(config_type)
```

### Database and Query Optimization

#### DuckDB Performance Optimization

```python
class OptimizedDuckDBManager:
    """Optimized DuckDB manager for production performance."""

    def create_optimized_table(self, df: pd.DataFrame, table_name: str):
        """Create table with performance optimizations."""
        conn = self.get_connection()

        # Create table
        conn.execute(f"CREATE TABLE {table_name} AS SELECT * FROM df")

        # Create indexes for common query patterns
        key_columns = ['Part No', 'Fed Rcv Date', 'Vendor Id']
        for col in key_columns:
            if col in df.columns:
                conn.execute(f"CREATE INDEX idx_{table_name}_{col.replace(' ', '_')} ON {table_name} ({col})")
```

### Memory Management

```python
class MemoryOptimizedProcessor:
    """Memory-optimized processing for large datasets."""

    def process_large_dataset(self, data_source: str) -> Iterator[Dict[str, Any]]:
        """Process large datasets in memory-efficient chunks."""

        # Monitor memory usage
        if self._get_memory_usage() > 0.8:
            self._trigger_garbage_collection()

        # Process in chunks
        for chunk in self._read_data_chunks(data_source, 10000):
            processed_chunk = self._process_chunk(chunk)
            yield from processed_chunk
            del chunk, processed_chunk
```

### Monitoring and Performance Tracking

```python
class ProductionPerformanceMonitor:
    """Production performance monitoring with alerting."""

    def track_api_performance(self, endpoint: str, duration: float, status_code: int):
        """Track API performance metrics."""
        # Track response time and error rates
        # Check for performance issues
        pass
```

---

## Production Deployment

### Pre-Deployment Checklist

#### Environment Preparation

- [ ] Verify Docker environment available
- [ ] Confirm environment variables configured
- [ ] Validate API key configuration
- [ ] Test database connectivity
- [ ] Verify monitoring systems configured

#### Security Validation

- [ ] Run all 14 authentication test scenarios
- [ ] Validate IP restrictions and access controls
- [ ] Confirm API key lifecycle management
- [ ] Test rate limiting
- [ ] Verify security audit logging

#### Performance Validation

- [ ] Execute load testing at 2x expected traffic
- [ ] Validate response times meet SLA
- [ ] Confirm graceful degradation
- [ ] Test monitoring thresholds
- [ ] Validate performance baselines

### Deployment Process

#### 1. Pre-Deployment Testing

```bash
# Run comprehensive test suite
python tests/integration/real_environment_test_runner.py

# Validate production configuration
python -m src.utils.validate_production_config

# Execute security tests
python tests/security/test_comprehensive_authentication.py
```

#### 2. Staging Deployment

```bash
# Deploy to staging
docker-compose -f docker-compose.staging.yml up -d

# Run validation tests
python tests/integration/staging_validation.py
```

#### 3. Production Deployment

```bash
# Execute production deployment
docker-compose -f docker-compose.prod.yml up -d

# Validate deployment health
python scripts/production_health_check.py
```

### Post-Deployment Validation

#### Immediate Checks (0-15 minutes)

- [ ] Health endpoints responding
- [ ] Authentication system functional
- [ ] Database connectivity confirmed
- [ ] Monitoring systems active
- [ ] Basic API functionality verified

#### Short-term Monitoring (15 minutes - 2 hours)

- [ ] Performance metrics within ranges
- [ ] No critical errors in logs
- [ ] Security monitoring active
- [ ] Load balancing working
- [ ] Cache systems performing

### Rollback Procedures

#### Automatic Rollback Triggers

- Health check failures for > 5 minutes
- Error rate > 5% for > 2 minutes
- Response time 95th percentile > 2 seconds for > 5 minutes
- Security breach detection

#### Manual Rollback Process

```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Deploy previous version
docker-compose -f docker-compose.prod.yml up -d --scale app=3

# Validate rollback
python scripts/rollback_validation.py
```

### Monitoring and Alerting

#### Key Metrics to Monitor

- **Response Time**: 95th percentile < 500ms
- **Error Rate**: < 0.1%
- **Authentication Success Rate**: > 99.9%
- **System Availability**: > 99.9%
- **Resource Usage**: CPU < 80%, Memory < 80%

#### Alert Thresholds

- **Critical**: Response time > 2s, Error rate > 5%, System down
- **Warning**: Response time > 1s, Error rate > 1%, Resource > 80%
- **Info**: Performance degradation, Unusual traffic patterns

---

## Code Quality Tools

### Backend Code Quality (Python with Ruff)

The backend uses **Ruff** for unified code quality:

**Current Setup:**

- **Ruff** - Unified formatting, linting, and import sorting
- **mypy** - Advanced static type checking

#### Backend Development Commands

```bash
# Format code
poetry run ruff format src/

# Lint and auto-fix issues
poetry run ruff check src/ --fix

# Type checking
poetry run mypy src/

# Complete workflow
poetry run ruff format src/ && poetry run ruff check src/ --fix && poetry run mypy src/
```

### Frontend Code Quality (TypeScript with ESLint)

**Current Setup:**

- **ESLint** - TypeScript and React linting
- **TypeScript Compiler** - Static type checking
- **Prettier** (via ESLint) - Code formatting
- **Vitest** - Unit testing framework
- **Playwright** - End-to-end testing

#### Frontend Development Commands

```bash
cd frontend

# Development
npm run dev

# Code quality
npm run lint
npm run lint:fix
npm run type-check

# Testing
npm run test
npm run test:e2e
```

---

## Unified Service Architecture

### Service Modes

The system supports three deployment modes:

- **unified** (default) - Both FastAPI REST API and MCP server
- **api-only** - FastAPI REST API only
- **mcp-only** - MCP server only

### Running Services

```bash
# Default unified mode
python -m src.main

# Specific service modes
python -m src.main --mode api-only
python -m src.main --mode mcp-only
python -m src.main --mode unified

# Environment variable configuration
SERVICE_MODE=api-only python -m src.main
```

### FastAPI-MCP Integration

- **Automatic Tool Generation** - FastAPI endpoints become MCP tools
- **Shared Business Logic** - Same orchestrator and authentication
- **Clean Tool Names** - Use explicit `operation_id` parameters
- **Zero Code Duplication** - MCP tools call existing FastAPI logic

---

## Best Practices Summary

### Development Workflow

1. Write failing tests first (TDD Red phase)
2. Implement minimum code to pass (TDD Green phase)
3. Refactor while keeping tests green (TDD Refactor phase)
4. Run code quality checks (Ruff/ESLint)
5. Submit for code review
6. Deploy to staging for validation
7. Deploy to production with monitoring

### Quality Standards

- **Test Coverage**: 95%+ for critical business logic
- **Response Time**: 95th percentile < 500ms
- **Error Rate**: < 0.1%
- **Code Review**: All changes reviewed before merge
- **Security**: All authentication scenarios tested

### Emergency Procedures

If issues occur in production:

1. **Immediate**: Check system health and error logs
2. **Short-term**: Implement temporary fix or rollback
3. **Long-term**: Root cause analysis and permanent solution
4. **Documentation**: Update procedures and lessons learned
