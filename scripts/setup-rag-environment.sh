#!/bin/bash

# Setup RAG Environment Script
# This script sets up the necessary environment for RAG (Retrieval-Augmented Generation) functionality

set -e

echo "🚀 Setting up RAG Environment for Judicial Knowledge Base"
echo "=========================================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is installed${NC}"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker Compose is installed${NC}"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env file${NC}"
    echo -e "${YELLOW}⚠️  Please update .env with your actual credentials${NC}"
fi

# Check AWS credentials
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo -e "${YELLOW}⚠️  AWS credentials not found in environment${NC}"
    echo -e "${YELLOW}   Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY${NC}"
    echo -e "${YELLOW}   Or ensure ~/.aws/credentials is configured${NC}"
fi

# Start Chroma vector database
echo ""
echo "📦 Starting Chroma Vector Database..."
docker-compose up -d chroma

# Wait for Chroma to be ready
echo "⏳ Waiting for Chroma to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:8001/api/v1/heartbeat > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Chroma is ready!${NC}"
        break
    fi
    
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}❌ Chroma failed to start after $max_attempts attempts${NC}"
        exit 1
    fi
    
    echo "   Attempt $attempt/$max_attempts..."
    sleep 2
done

# Update .env to enable RAG
echo ""
echo "🔧 Configuring RAG settings..."

if grep -q "FEATURE_LANGCHAIN_RAG=" .env; then
    sed -i.bak 's/FEATURE_LANGCHAIN_RAG=.*/FEATURE_LANGCHAIN_RAG=true/' .env
    echo -e "${GREEN}✅ Enabled FEATURE_LANGCHAIN_RAG in .env${NC}"
else
    echo "FEATURE_LANGCHAIN_RAG=true" >> .env
    echo -e "${GREEN}✅ Added FEATURE_LANGCHAIN_RAG=true to .env${NC}"
fi

if grep -q "CHROMA_URL=" .env; then
    sed -i.bak 's|CHROMA_URL=.*|CHROMA_URL=http://localhost:8001|' .env
    echo -e "${GREEN}✅ Set CHROMA_URL in .env${NC}"
else
    echo "CHROMA_URL=http://localhost:8001" >> .env
    echo -e "${GREEN}✅ Added CHROMA_URL to .env${NC}"
fi

# Clean up backup files
rm -f .env.bak

echo ""
echo "=========================================================="
echo -e "${GREEN}✅ RAG Environment Setup Complete!${NC}"
echo ""
echo "📋 Next Steps:"
echo "   1. Verify Chroma is running: curl http://localhost:8001/api/v1/heartbeat"
echo "   2. Load sample judgment documents (see tests/fixtures/sample-judgment.json)"
echo "   3. Initialize JudicialKnowledgeBase in your application"
echo ""
echo "🔗 Useful Commands:"
echo "   - View Chroma logs: docker-compose logs -f chroma"
echo "   - Stop Chroma: docker-compose stop chroma"
echo "   - Restart Chroma: docker-compose restart chroma"
echo "   - Remove Chroma data: docker-compose down -v"
echo ""
echo "📚 Documentation:"
echo "   - See tests/unit/services/README-RAG-TESTS.md for testing guide"
echo "   - See src/services/JudicialKnowledgeBase.ts for API reference"
echo ""
