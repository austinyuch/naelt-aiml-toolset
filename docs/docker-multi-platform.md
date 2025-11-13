# Docker Multi-Platform Build Guide

## Overview

This project supports multi-platform Docker builds to accommodate different deployment scenarios:

- **ARM64**: Required for AWS AgentCore Runtime deployment
- **x86_64**: For local development and testing

## Architecture Requirements

### AgentCore Runtime
- **Required**: ARM64 (linux/arm64)
- AgentCore Runtime only supports ARM64 container images
- All production deployments must use ARM64 images

### Local Development
- **Flexible**: x86_64 or ARM64 (depending on your machine)
- Local testing can use native platform for faster builds

## Build Commands

### 1. Local Testing (Native Platform)

Build for your local machine's architecture:

```bash
# Build for local testing
docker build -t advocacy-content-generator:latest .

# Run locally
docker run -p 8000:8000 advocacy-content-generator:latest
```

### 2. AgentCore Deployment (ARM64)

Build ARM64 image for AgentCore Runtime:

```bash
# Build ARM64 image
docker buildx build --platform linux/arm64 -t advocacy-content-generator:latest-arm64 --load .

# Tag for ECR
docker tag advocacy-content-generator:latest-arm64 <ECR_URI>:latest

# Push to ECR
docker push <ECR_URI>:latest
```

### 3. Multi-Platform Build (Both)

Build both platforms simultaneously:

```bash
# Setup buildx (one-time)
docker buildx create --name multiplatform --use
docker buildx inspect --bootstrap

# Build and push both platforms
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t <ECR_URI>:latest \
  --push \
  .
```

## Automated Scripts

### Build and Push Script

The `scripts/build-and-push-docker.sh` script automatically:

1. Builds local platform image for testing
2. Builds ARM64 image for AgentCore
3. Pushes ARM64 image to ECR

```bash
./scripts/build-and-push-docker.sh
```

### CloudFormation Deployment Script

The `scripts/deploy-cloudformation.sh` script automatically:

1. Builds ARM64 image
2. Pushes to ECR
3. Deploys CloudFormation stack

```bash
./scripts/deploy-cloudformation.sh
```

## Docker Buildx Setup

If you haven't used buildx before, set it up:

```bash
# Create a new builder instance
docker buildx create --name multiplatform --driver docker-container --use

# Inspect and bootstrap
docker buildx inspect --bootstrap

# Verify platforms
docker buildx ls
```

## Troubleshooting

### Issue: "exec format error" on AgentCore

**Cause**: Deployed x86_64 image instead of ARM64

**Solution**: Rebuild with ARM64 platform:
```bash
docker buildx build --platform linux/arm64 -t advocacy-content-generator:latest-arm64 --load .
```

### Issue: Slow ARM64 builds on x86_64 machine

**Cause**: QEMU emulation is slower than native builds

**Solutions**:
1. Use GitHub Actions with ARM64 runners
2. Use AWS CodeBuild with ARM64 compute
3. Accept slower build times for cross-platform builds

### Issue: "multiple platforms feature is currently not supported"

**Cause**: Docker buildx not enabled

**Solution**: Enable buildx:
```bash
docker buildx create --use
```

## Best Practices

### Development Workflow

1. **Local Testing**: Use native platform for fast iteration
   ```bash
   docker build -t advocacy-content-generator:latest .
   docker run -p 8000:8000 advocacy-content-generator:latest
   ```

2. **Pre-Deployment Testing**: Build ARM64 locally to verify
   ```bash
   docker buildx build --platform linux/arm64 -t advocacy-content-generator:latest-arm64 --load .
   docker run -p 8000:8000 advocacy-content-generator:latest-arm64
   ```

3. **Production Deployment**: Use automated script
   ```bash
   ./scripts/deploy-cloudformation.sh
   ```

### CI/CD Pipeline

For GitHub Actions or similar CI/CD:

```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v2

- name: Build and push ARM64 image
  uses: docker/build-push-action@v4
  with:
    context: .
    platforms: linux/arm64
    push: true
    tags: ${{ secrets.ECR_URI }}:latest
```

## Image Tags

The build scripts create the following tags:

- `latest`: ARM64 image for AgentCore (pushed to ECR)
- `latest-arm64`: ARM64 image (explicit tag)
- `latest-local`: Native platform image for local testing
- `YYYYMMDD-HHMMSS`: Timestamped ARM64 image for versioning

## Verification

### Check Image Architecture

```bash
# Inspect local image
docker inspect advocacy-content-generator:latest-arm64 | grep Architecture

# Inspect ECR image
aws ecr describe-images --repository-name advocacy-content-generator --region us-east-1
```

### Test ARM64 Image Locally (on x86_64)

```bash
# Build ARM64 image
docker buildx build --platform linux/arm64 -t advocacy-content-generator:latest-arm64 --load .

# Run with QEMU emulation
docker run -p 8000:8000 advocacy-content-generator:latest-arm64

# Test health endpoint
curl http://localhost:8000/health
```

## References

- [Docker Buildx Documentation](https://docs.docker.com/buildx/working-with-buildx/)
- [Multi-platform Images](https://docs.docker.com/build/building/multi-platform/)
- [AWS AgentCore Runtime Requirements](https://aws.github.io/bedrock-agentcore-starter-toolkit/)
