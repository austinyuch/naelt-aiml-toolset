#!/usr/bin/env python3
"""
Deploy MCP Server to AgentCore Runtime using boto3
"""

import boto3
import json
import time
import sys

# Configuration
AGENT_NAME = "advocacy-content-generator"
AWS_REGION = "us-east-1"
EXECUTION_ROLE = (
    "arn:aws:iam::533267166136:role/AgentCoreExecutionRole-advocacy-content-generator"
)
ECR_IMAGE = (
    "533267166136.dkr.ecr.us-east-1.amazonaws.com/advocacy-content-generator:latest"
)
DISCOVERY_URL = "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_YYMy6hC3F/.well-known/openid-configuration"
CLIENT_ID = "1eulh5t29s9rsk6a8r1ahv739g"


def main():
    print("=== AgentCore Runtime Deployment (Python SDK) ===")
    print()

    # Initialize boto3 client
    try:
        client = boto3.client("bedrock-agent", region_name=AWS_REGION)
        print(f"✓ Connected to AWS region: {AWS_REGION}")
    except Exception as e:
        print(f"✗ Failed to connect to AWS: {e}")
        sys.exit(1)

    # Prepare runtime configuration
    runtime_config = {
        "runtimeName": AGENT_NAME,
        "runtimeRoleArn": EXECUTION_ROLE,
        "containerConfig": {
            "imageUri": ECR_IMAGE,
            "port": 8000,
            "environment": {
                "SERVICE_MODE": "mcp-only",
                "MCP_TRANSPORT": "streamable-http",
                "AWS_REGION": AWS_REGION,
                "LOG_LEVEL": "info",
                "PORT": "8000",
            },
        },
        "authenticationConfig": {
            "type": "OAUTH",
            "oauthConfig": {"discoveryUrl": DISCOVERY_URL, "clientId": CLIENT_ID},
        },
        "protocol": "MCP",
        "memorySize": 1024,
        "timeoutInSeconds": 3600,
    }

    print()
    print("Configuration:")
    print(f"  Name: {AGENT_NAME}")
    print(f"  Image: {ECR_IMAGE}")
    print(f"  Protocol: MCP")
    print(f"  Memory: 1024 MB")
    print(f"  Timeout: 3600 seconds")
    print()

    # Create runtime
    print("Creating AgentCore Runtime...")
    print("This may take 5-10 minutes...")
    print()

    try:
        response = client.create_runtime(**runtime_config)

        runtime_arn = response["runtimeArn"]
        print("=== Deployment Successful ===")
        print()
        print(f"Runtime ARN: {runtime_arn}")
        print()

        # Save to environment file
        with open("agentcore-runtime.env", "w") as f:
            f.write(f"AGENT_ARN={runtime_arn}\n")
            f.write(f"AWS_REGION={AWS_REGION}\n")

        print("Saved to: agentcore-runtime.env")
        print()
        print("Next steps:")
        print("1. Wait 2-3 minutes for runtime to be ready")
        print("2. Export variables: source agentcore-runtime.env")
        print("3. Get Bearer Token: ./scripts/get-cognito-token.sh")
        print("4. Run remote tests: npm run test:remote-mcp")

    except client.exceptions.ConflictException as e:
        print("✗ Runtime with this name already exists")
        print()
        print("To update existing runtime, use:")
        print(f"  agentcore launch --agent {AGENT_NAME} --auto-update-on-conflict")
        print()
        print("Or delete the existing runtime first:")
        print(
            f"  aws bedrock-agent delete-runtime --runtime-name {AGENT_NAME} --region {AWS_REGION}"
        )
        sys.exit(1)

    except Exception as e:
        print(f"✗ Deployment failed: {e}")
        print()
        print("Common issues:")
        print("- Check if IAM role has correct permissions")
        print("- Ensure ECR image is accessible")
        print("- Verify Cognito configuration")
        print("- Check AWS service quotas")
        sys.exit(1)


if __name__ == "__main__":
    main()
