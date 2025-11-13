#!/bin/bash

set -e

echo "=== CloudFormation AgentCore Runtime Rollback ==="
echo ""

# Configuration
STACK_NAME="advocacy-content-generator-agentcore"
AWS_REGION="us-east-1"

# Check if stack exists
if ! aws cloudformation describe-stacks --stack-name ${STACK_NAME} --region ${AWS_REGION} >/dev/null 2>&1; then
    echo "Stack ${STACK_NAME} does not exist. Nothing to rollback."
    exit 0
fi

# Show stack info
echo "Stack Name: ${STACK_NAME}"
echo "Region: ${AWS_REGION}"
echo ""

# Confirmation prompt
read -p "Are you sure you want to delete this stack? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Rollback cancelled."
    exit 0
fi

echo ""
echo "Deleting CloudFormation Stack..."
aws cloudformation delete-stack \
    --stack-name ${STACK_NAME} \
    --region ${AWS_REGION}

echo "Waiting for stack deletion to complete..."
aws cloudformation wait stack-delete-complete \
    --stack-name ${STACK_NAME} \
    --region ${AWS_REGION}

echo ""
echo "=== Rollback Complete ==="
echo ""
echo "Stack ${STACK_NAME} has been deleted."
echo "Note: ECR images have been preserved."
