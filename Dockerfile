# Multi-stage build for production optimization
# Support multi-platform: ARM64 (AgentCore) and x86_64 (local testing)
FROM node:24-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src/ ./src/
COPY prompts/ ./prompts/

# Build TypeScript
RUN npm run build

# Final production image
# Support multi-platform: ARM64 (AgentCore) and x86_64 (local testing)
FROM node:24-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package.json and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built code from builder
COPY --from=builder /app/dist ./dist

# Copy prompt templates (Requirement 7.4: Include prompts directory)
COPY prompts/ ./prompts/

# Create cache directory
RUN mkdir -p /mnt/efs/cache

# Create non-root user (use a different UID to avoid conflicts)
RUN adduser -D -u 10001 appuser && \
    chown -R appuser:appuser /app && \
    chown -R appuser:appuser /mnt/efs/cache

USER appuser

# Requirement 7.3: Health check endpoint at /health
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Requirement 7.1: Expose port 8000 for MCP server
EXPOSE 8000

# Requirement 7.5: Set environment variables for AgentCore Runtime
ENV SERVICE_MODE=mcp-only \
    MCP_TRANSPORT=streamable-http \
    PORT=8000 \
    HOST=0.0.0.0 \
    LOG_LEVEL=info

# Start command
# Requirement 7.2: Ensure /mcp path is accessible via MCP server
CMD ["node", "dist/index.js"]
