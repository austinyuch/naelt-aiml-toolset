#!/bin/bash

##
# Local MCP Server Test Script
# 
# This script automates the process of starting the MCP server
# and running the local test client.
#
# Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
##

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MCP_PORT=${MCP_PORT:-8000}
MCP_HOST=${MCP_HOST:-localhost}
MCP_URL="http://${MCP_HOST}:${MCP_PORT}/mcp"
SERVER_PID=""

# Function to print colored messages
print_info() {
    echo -e "${BLUE}ℹ ${1}${NC}"
}

print_success() {
    echo -e "${GREEN}✓ ${1}${NC}"
}

print_error() {
    echo -e "${RED}✗ ${1}${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ ${1}${NC}"
}

# Function to cleanup on exit
cleanup() {
    if [ ! -z "$SERVER_PID" ]; then
        print_info "Stopping MCP server (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
        print_success "MCP server stopped"
    fi
}

# Register cleanup function
trap cleanup EXIT INT TERM

# Check if .env file exists
if [ ! -f .env ]; then
    print_error ".env file not found"
    print_info "Please create a .env file with required configuration"
    print_info "You can copy from .env.example:"
    echo ""
    echo "  cp .env.example .env"
    echo ""
    exit 1
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    print_error "node_modules not found"
    print_info "Please install dependencies first:"
    echo ""
    echo "  npm install"
    echo ""
    exit 1
fi

print_info "Starting Local MCP Server Test"
echo ""

# Step 1: Start MCP server
print_info "Step 1: Starting MCP server in HTTP mode..."
print_info "  Port: $MCP_PORT"
print_info "  URL: $MCP_URL"
echo ""

# Start server in background
MCP_TRANSPORT=streamable-http SERVICE_MODE=mcp-only PORT=$MCP_PORT npm run dev > /tmp/mcp-server.log 2>&1 &
SERVER_PID=$!

print_success "MCP server started (PID: $SERVER_PID)"
print_info "Server logs: /tmp/mcp-server.log"
echo ""

# Step 2: Wait for server to be ready
print_info "Step 2: Waiting for server to be ready..."

MAX_RETRIES=30
RETRY_COUNT=0
SERVER_READY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s -f "http://${MCP_HOST}:${MCP_PORT}/health" > /dev/null 2>&1; then
        SERVER_READY=true
        break
    fi
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo -n "."
    sleep 1
done

echo ""

if [ "$SERVER_READY" = false ]; then
    print_error "Server failed to start within 30 seconds"
    print_info "Check server logs at /tmp/mcp-server.log"
    cat /tmp/mcp-server.log
    exit 1
fi

print_success "Server is ready"
echo ""

# Step 3: Run test client
print_info "Step 3: Running test client..."
echo ""

if MCP_URL=$MCP_URL npm run test:local-mcp; then
    echo ""
    print_success "All tests passed!"
    exit 0
else
    echo ""
    print_error "Tests failed"
    print_info "Check server logs at /tmp/mcp-server.log"
    exit 1
fi
