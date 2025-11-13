#!/bin/bash

# Simplified AWS Setup Verification Script
# Checks AWS permissions and resources for AgentCore integration

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPO_NAME="advocacy-content-generator"
IAM_ROLE_NAME="AgentCoreExecutionRole"

echo "=========================================="
echo "AWS Setup Verification"
echo "=========================================="
echo ""

# 1. AWS CLI Check
echo "1. AWS CLI Version:"
aws --version
echo ""

# 2. AWS Credentials
echo "2. AWS Credentials:"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null)
USER_ARN=$(aws sts get-caller-identity --query Arn --output text 2>/dev/null)
if [ -n "$ACCOUNT_ID" ]; then
    echo "✓ Credentials configured"
    echo "  Account ID: $ACCOUNT_ID"
    echo "  User/Role: $USER_ARN"
else
    echo "✗ Credentials not configured"
    exit 1
fi
echo ""

# 3. AWS Region
echo "3. AWS Region:"
CONFIGURED_REGION=$(aws configure get region 2>/dev/null)
if [ -n "$CONFIGURED_REGION" ]; then
    echo "✓ Region configured: $CONFIGURED_REGION"
    AWS_REGION=$CONFIGURED_REGION
else
    echo "⚠ Using default region: $AWS_REGION"
fi
echo ""

# 4. Bedrock Permissions
echo "4. Bedrock Permissions:"
if aws bedrock list-foundation-models --region $AWS_REGION --max-results 1 >/dev/null 2>&1; then
    echo "✓ bedrock:ListFoundationModels"
else
    echo "✗ bedrock:ListFoundationModels"
fi

# Test invoke model with timeout
echo "  Testing bedrock:InvokeModel (this may take a few seconds)..."
TEMP_OUTPUT=$(mktemp)
if timeout 15 aws bedrock-runtime invoke-model \
    --model-id anthropic.claude-3-haiku-20240307-v1:0 \
    --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":10,"messages":[{"role":"user","content":"test"}]}' \
    --region $AWS_REGION \
    "$TEMP_OUTPUT" >/dev/null 2>&1; then
    echo "✓ bedrock:InvokeModel"
else
    echo "⚠ bedrock:InvokeModel - May need model access request"
fi
rm -f "$TEMP_OUTPUT"
echo ""

# 5. ECR Permissions
echo "5. ECR Permissions:"
if aws ecr describe-repositories --region $AWS_REGION --max-items 1 >/dev/null 2>&1; then
    echo "✓ ecr:DescribeRepositories"
else
    echo "✗ ecr:DescribeRepositories"
fi

if aws ecr get-authorization-token --region $AWS_REGION >/dev/null 2>&1; then
    echo "✓ ecr:GetAuthorizationToken"
else
    echo "✗ ecr:GetAuthorizationToken"
fi
echo ""

# 6. IAM Permissions
echo "6. IAM Permissions:"
if aws iam list-roles --max-items 1 >/dev/null 2>&1; then
    echo "✓ iam:ListRoles"
else
    echo "✗ iam:ListRoles"
fi
echo ""

# 7. Cognito Permissions
echo "7. Cognito Permissions:"
if aws cognito-idp list-user-pools --max-results 1 --region $AWS_REGION >/dev/null 2>&1; then
    echo "✓ cognito-idp:ListUserPools"
else
    echo "✗ cognito-idp:ListUserPools"
fi
echo ""

# 8. ECR Repository
echo "8. ECR Repository Status:"
if aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $AWS_REGION >/dev/null 2>&1; then
    REPO_URI=$(aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $AWS_REGION --query 'repositories[0].repositoryUri' --output text)
    echo "✓ Repository exists: $ECR_REPO_NAME"
    echo "  URI: $REPO_URI"
else
    echo "✗ Repository does not exist: $ECR_REPO_NAME"
    echo "  Create with: aws ecr create-repository --repository-name $ECR_REPO_NAME --region $AWS_REGION"
fi
echo ""

# 9. IAM Execution Role
echo "9. IAM Execution Role Status:"
if aws iam get-role --role-name $IAM_ROLE_NAME >/dev/null 2>&1; then
    ROLE_ARN=$(aws iam get-role --role-name $IAM_ROLE_NAME --query 'Role.Arn' --output text)
    echo "✓ Role exists: $IAM_ROLE_NAME"
    echo "  ARN: $ROLE_ARN"
    
    # Check attached policies
    POLICIES=$(aws iam list-attached-role-policies --role-name $IAM_ROLE_NAME --query 'AttachedPolicies[].PolicyName' --output text 2>/dev/null)
    if [ -n "$POLICIES" ]; then
        echo "  Policies: $POLICIES"
    fi
else
    echo "✗ Role does not exist: $IAM_ROLE_NAME"
    echo "  Create with: ./scripts/create-iam-execution-role.sh"
fi
echo ""

# Summary
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo "AWS Account: $ACCOUNT_ID"
echo "AWS Region: $AWS_REGION"
echo ""

# Check critical resources
MISSING_RESOURCES=0

if ! aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $AWS_REGION >/dev/null 2>&1; then
    echo "⚠ Missing: ECR Repository"
    ((MISSING_RESOURCES++))
fi

if ! aws iam get-role --role-name $IAM_ROLE_NAME >/dev/null 2>&1; then
    echo "⚠ Missing: IAM Execution Role"
    ((MISSING_RESOURCES++))
fi

if [ $MISSING_RESOURCES -eq 0 ]; then
    echo "✓ All required resources exist"
else
    echo ""
    echo "Next Steps:"
    echo "1. Create missing resources using provided scripts"
    echo "2. Verify permissions with your AWS administrator"
fi
echo ""
