#!/bin/bash

# Verification script for Task 7: 更新主程式入口點
# This script verifies that the MCP transport mode selection works correctly

set -e

echo "=========================================="
echo "Task 7 Verification Script"
echo "=========================================="
echo ""

# Check if TypeScript compiles
echo "1. Verifying TypeScript compilation..."
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ TypeScript compilation successful"
else
    echo "   ❌ TypeScript compilation failed"
    exit 1
fi
echo ""

# Check if tests pass
echo "2. Running MCP transport tests..."
npm test -- --testPathPattern=mcp-transport --silent 2>&1 | grep -E "(PASS|FAIL|Tests:)" || true
if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo "   ✅ All MCP transport tests passed"
else
    echo "   ❌ Some tests failed"
    exit 1
fi
echo ""

# Verify configuration files exist
echo "3. Verifying configuration files..."
if [ -f "src/config.ts" ]; then
    echo "   ✅ src/config.ts exists"
else
    echo "   ❌ src/config.ts not found"
    exit 1
fi

if [ -f "src/index.ts" ]; then
    echo "   ✅ src/index.ts exists"
else
    echo "   ❌ src/index.ts not found"
    exit 1
fi

if [ -f "src/mcp/server.ts" ]; then
    echo "   ✅ src/mcp/server.ts exists"
else
    echo "   ❌ src/mcp/server.ts not found"
    exit 1
fi
echo ""

# Check for MCP_TRANSPORT in config
echo "4. Verifying MCP_TRANSPORT configuration..."
if grep -q "mcpTransport" src/config.ts; then
    echo "   ✅ mcpTransport configuration found"
else
    echo "   ❌ mcpTransport configuration not found"
    exit 1
fi
echo ""

# Check for transport branching logic
echo "5. Verifying transport branching logic..."
if grep -q "startHttp\|startStdio" src/index.ts; then
    echo "   ✅ Transport branching logic found"
else
    echo "   ❌ Transport branching logic not found"
    exit 1
fi
echo ""

# Check for graceful shutdown
echo "6. Verifying graceful shutdown support..."
if grep -q "gracefulShutdown" src/index.ts; then
    echo "   ✅ Graceful shutdown handler found"
else
    echo "   ❌ Graceful shutdown handler not found"
    exit 1
fi
echo ""

echo "=========================================="
echo "✅ Task 7 Verification Complete"
echo "=========================================="
echo ""
echo "All checks passed! The implementation is ready for:"
echo "  - Local testing (Task 8)"
echo "  - Docker configuration (Task 9)"
echo "  - Docker testing (Task 10)"
echo ""
