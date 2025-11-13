#!/bin/bash

# IAM Execution Role Creation Script for AgentCore
# This script creates an IAM role with necessary permissions for AgentCore Runtime

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
IAM_ROLE_NAME="AgentCoreExecutionRole"
POLICY_NAME="AgentCoreExecutionPolicy"

echo "=========================================="
echo "IAM Execution Role Creation"
echo "=========================================="
echo ""

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
    fi
}

# Function to print info
print_info() {
    echo -e "ℹ $1"
}

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
print_info "AWS Account ID: $ACCOUNT_ID"
print_info "AWS Region: $AWS_REGION"
echo ""

# Check if role already exists
if aws iam get-role --role-name $IAM_ROLE_NAME &> /dev/null; then
    print_info "IAM role already exists: $IAM_ROLE_NAME"
    ROLE_ARN=$(aws iam get-role --role-name $IAM_ROLE_NAME --query 'Role.Arn' --output text)
    print_info "Role ARN: $ROLE_ARN"
    echo ""
    read -p "Do you want to update the role policies? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
else
    # Create trust policy document
    print_info "Creating trust policy document..."
    cat > /tmp/trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": [
          "bedrock.amazonaws.com",
          "ecs-tasks.amazonaws.com"
        ]
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

    # Create IAM role
    print_info "Creating IAM role: $IAM_ROLE_NAME..."
    aws iam create-role \
        --role-name $IAM_ROLE_NAME \
        --assume-role-policy-document file:///tmp/trust-policy.json \
        --description "Execution role for AWS Bedrock AgentCore Runtime" \
        > /dev/null

    ROLE_ARN=$(aws iam get-role --role-name $IAM_ROLE_NAME --query 'Role.Arn' --output text)
    print_status 0 "IAM role created: $IAM_ROLE_NAME"
    print_info "Role ARN: $ROLE_ARN"
    echo ""
fi

# Create execution policy document
print_info "Creating execution policy document..."
cat > /tmp/execution-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockModelAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-*"
      ]
    },
    {
      "Sid": "CloudWatchLogsAccess",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogStreams"
      ],
      "Resource": [
        "arn:aws:logs:${AWS_REGION}:${ACCOUNT_ID}:log-group:/aws/bedrock-agentcore/*"
      ]
    },
    {
      "Sid": "ECRAccess",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage"
      ],
      "Resource": "*"
    },
    {
      "Sid": "SecretsManagerAccess",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:${AWS_REGION}:${ACCOUNT_ID}:secret:*"
      ]
    }
  ]
}
EOF

# Check if policy already exists
POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${POLICY_NAME}"
if aws iam get-policy --policy-arn $POLICY_ARN &> /dev/null; then
    print_info "Policy already exists: $POLICY_NAME"
    
    # Create new policy version
    print_info "Creating new policy version..."
    aws iam create-policy-version \
        --policy-arn $POLICY_ARN \
        --policy-document file:///tmp/execution-policy.json \
        --set-as-default \
        > /dev/null
    print_status 0 "Policy updated: $POLICY_NAME"
else
    # Create IAM policy
    print_info "Creating IAM policy: $POLICY_NAME..."
    aws iam create-policy \
        --policy-name $POLICY_NAME \
        --policy-document file:///tmp/execution-policy.json \
        --description "Execution policy for AWS Bedrock AgentCore Runtime" \
        > /dev/null
    print_status 0 "IAM policy created: $POLICY_NAME"
fi
echo ""

# Attach policy to role
print_info "Attaching policy to role..."
if aws iam attach-role-policy \
    --role-name $IAM_ROLE_NAME \
    --policy-arn $POLICY_ARN 2> /dev/null; then
    print_status 0 "Policy attached to role"
else
    print_info "Policy already attached to role"
fi
echo ""

# Clean up temporary files
rm -f /tmp/trust-policy.json /tmp/execution-policy.json

# Summary
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
print_status 0 "IAM Execution Role configured successfully"
echo ""
echo "Role Details:"
echo "  - Role Name: $IAM_ROLE_NAME"
echo "  - Role ARN: $ROLE_ARN"
echo "  - Policy Name: $POLICY_NAME"
echo "  - Policy ARN: $POLICY_ARN"
echo ""
echo "Permissions Granted:"
echo "  ✓ Bedrock Model Invocation (Claude models)"
echo "  ✓ CloudWatch Logs (for monitoring)"
echo "  ✓ ECR Access (for container images)"
echo "  ✓ Secrets Manager (for API keys)"
echo ""
echo "Next Steps:"
echo "  1. Use this role ARN when configuring AgentCore"
echo "  2. Run: agentcore configure --execution-role $ROLE_ARN"
echo ""
