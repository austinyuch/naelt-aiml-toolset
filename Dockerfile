# Multi-stage build for production optimization
FROM node:20-alpine AS builder

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
FROM node:20-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package.json and install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built code from builder
COPY --from=builder /app/dist ./dist

# Copy prompt templates
COPY prompts/ ./prompts/

# Create cache directory
RUN mkdir -p /mnt/efs/cache

# Create non-root user
RUN adduser -D -u 1000 appuser && \
    chown -R appuser:appuser /app && \
    chown -R appuser:appuser /mnt/efs/cache

USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Expose port
EXPOSE 8000

# Start command
CMD ["node", "dist/index.js"]
