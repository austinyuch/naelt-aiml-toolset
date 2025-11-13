#!/bin/bash

# AWS Permissions and Resources Verification Script
# This script verifies all required AWS permissions and resources for AgentCore integration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
ECR_REPO_NAME="advocacy-content-generator"
IAM_ROLE_NAME="AgentCoreExecutionRole"

echo "=========================================="
echo "AWS Permissions and Resources Verification"
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

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to print info
print_info() {
    echo -e "ℹ $1"
}

# Check AWS CLI installation
echo "1. Checking AWS CLI installation..."
if command -v aws &> /dev/null; then
    AWS_VERSION=$(aws --version 2>&1 | cut -d' ' -f1 | cut -d'/' -f2)
    print_status 0 "AWS CLI installed (version: $AWS_VERSION)"
    
    # Check if version is >= 2.0
    MAJOR_VERSION=$(echo $AWS_VERSION | cut -d'.' -f1)
    if [ "$MAJOR_VERSION" -ge 2 ]; then
        print_status 0 "AWS CLI version >= 2.0"
    else
        print_warning "AWS CLI version < 2.0. Please upgrade to version 2.0 or higher"
        exit 1
    fi
else
    print_status 1 "AWS CLI not installed"
    echo "Please install AWS CLI: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi
echo ""

# Check AWS credentials configuration
echo "2. Checking AWS credentials configuration..."
if aws sts get-caller-identity &> /dev/null; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    USER_ARN=$(aws sts get-caller-identity --query Arn --output text)
    print_status 0 "AWS credentials configured"
    print_info "Account ID: $ACCOUNT_ID"
    print_info "User/Role ARN: $USER_ARN"
else
    print_status 1 "AWS credentials not configured"
    echo "Please configure AWS credentials: aws configure"
    exit 1
fi
echo ""

# Check AWS region configuration
echo "3. Checking AWS region configuration..."
CONFIGURED_REGION=$(aws configure get region)
if [ -n "$CONFIGURED_REGION" ]; then
    print_status 0 "AWS region configured: $CONFIGURED_REGION"
    AWS_REGION=$CONFIGURED_REGION
else
    print_warning "AWS region not configured, using default: $AWS_REGION"
fi
echo ""

# Check Bedrock permissions
echo "4. Checking Bedrock permissions..."
BEDROCK_PERMISSIONS=0

# Check if user can list foundation models
if aws bedrock list-foundation-models --region $AWS_REGION &> /dev/null; then
    print_status 0 "bedrock:ListFoundationModels - OK"
    ((BEDROCK_PERMISSIONS++))
else
    print_status 1 "bedrock:ListFoundationModels - MISSING"
fi

# Check if user can invoke model (test with a simple call)
# Note: This test may fail if model access is not granted in the region
INVOKE_TEST_OUTPUT=$(mktemp)
if timeout 10 aws bedrock-runtime invoke-model \
    --model-id anthropic.claude-3-haiku-20240307-v1:0 \
    --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":10,"messages":[{"role":"user","content":"test"}]}' \
    --region $AWS_REGION \
    "$INVOKE_TEST_OUTPUT" 2>&1; then
    print_status 0 "bedrock:InvokeModel - OK"
    ((BEDROCK_PERMISSIONS++))
else
    print_warning "bedrock:InvokeModel - Could not verify (may need model access request)"
    print_info "You may need to request access to Claude models in AWS Console"
fi
rm -f "$INVOKE_TEST_OUTPUT"

if [ $BEDROCK_PERMISSIONS -eq 2 ]; then
    print_status 0 "All Bedrock permissions verified"
else
    print_warning "Some Bedrock permissions are missing"
fi
echo ""

# Check Bedrock AgentCore permissions (Note: AgentCore APIs may not be available yet)
echo "5. Checking Bedrock AgentCore permissions..."
print_warning "Bedrock AgentCore is a new service. API availability may vary by region."
print_info "Required permissions: bedrock-agentcore:CreateRuntime, bedrock-agentcore:InvokeRuntime"
print_info "These will be verified during actual deployment"
echo ""

# Check ECR permissions
echo "6. Checking ECR permissions..."
ECR_PERMISSIONS=0

# Check if user can describe repositories
if aws ecr describe-repositories --region $AWS_REGION &> /dev/null; then
    print_status 0 "ecr:DescribeRepositories - OK"
    ((ECR_PERMISSIONS++))
else
    print_status 1 "ecr:DescribeRepositories - MISSING"
fi

# Check if user can get authorization token
if aws ecr get-authorization-token --region $AWS_REGION &> /dev/null; then
    print_status 0 "ecr:GetAuthorizationToken - OK"
    ((ECR_PERMISSIONS++))
else
    print_status 1 "ecr:GetAuthorizationToken - MISSING"
fi

if [ $ECR_PERMISSIONS -eq 2 ]; then
    print_status 0 "All ECR permissions verified"
else
    print_warning "Some ECR permissions are missing"
fi
echo ""

# Check IAM permissions
echo "7. Checking IAM permissions..."
IAM_PERMISSIONS=0

# Check if user can list roles
if aws iam list-roles --max-items 1 &> /dev/null; then
    print_status 0 "iam:ListRoles - OK"
    ((IAM_PERMISSIONS++))
else
    print_status 1 "iam:ListRoles - MISSING"
fi

# Check if user can get role
if aws iam get-role --role-name $IAM_ROLE_NAME &> /dev/null 2>&1; then
    print_status 0 "iam:GetRole - OK"
    ((IAM_PERMISSIONS++))
else
    print_info "iam:GetRole - Will be tested during role creation"
fi

if [ $IAM_PERMISSIONS -ge 1 ]; then
    print_status 0 "Basic IAM permissions verified"
else
    print_warning "Some IAM permissions are missing"
fi
echo ""

# Check Cognito permissions
echo "8. Checking Cognito permissions..."
COGNITO_PERMISSIONS=0

# Check if user can list user pools
if aws cognito-idp list-user-pools --max-results 1 --region $AWS_REGION &> /dev/null; then
    print_status 0 "cognito-idp:ListUserPools - OK"
    ((COGNITO_PERMISSIONS++))
else
    print_status 1 "cognito-idp:ListUserPools - MISSING"
fi

if [ $COGNITO_PERMISSIONS -eq 1 ]; then
    print_status 0 "Cognito permissions verified"
else
    print_warning "Some Cognito permissions are missing"
fi
echo ""

# Check/Create ECR Repository
echo "9. Checking ECR repository..."
if aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $AWS_REGION &> /dev/null; then
    REPO_URI=$(aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $AWS_REGION --query 'repositories[0].repositoryUri' --output text)
    print_status 0 "ECR repository exists: $ECR_REPO_NAME"
    print_info "Repository URI: $REPO_URI"
else
    print_warning "ECR repository does not exist: $ECR_REPO_NAME"
    read -p "Do you want to create it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if aws ecr create-repository --repository-name $ECR_REPO_NAME --region $AWS_REGION &> /dev/null; then
            REPO_URI=$(aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $AWS_REGION --query 'repositories[0].repositoryUri' --output text)
            print_status 0 "ECR repository created: $ECR_REPO_NAME"
            print_info "Repository URI: $REPO_URI"
        else
            print_status 1 "Failed to create ECR repository"
        fi
    fi
fi
echo ""

# Check/Create IAM Execution Role
echo "10. Checking IAM execution role..."
if aws iam get-role --role-name $IAM_ROLE_NAME &> /dev/null; then
    ROLE_ARN=$(aws iam get-role --role-name $IAM_ROLE_NAME --query 'Role.Arn' --output text)
    print_status 0 "IAM execution role exists: $IAM_ROLE_NAME"
    print_info "Role ARN: $ROLE_ARN"
    
    # Check attached policies
    echo "   Checking attached policies..."
    POLICIES=$(aws iam list-attached-role-policies --role-name $IAM_ROLE_NAME --query 'AttachedPolicies[].PolicyName' --output text)
    if [ -n "$POLICIES" ]; then
        print_info "Attached policies: $POLICIES"
    else
        print_warning "No policies attached to role"
    fi
else
    print_warning "IAM execution role does not exist: $IAM_ROLE_NAME"
    print_info "You will need to create this role with appropriate permissions"
    print_info "Required permissions: Bedrock, ECR, CloudWatch Logs"
fi
echo ""

# Summary
echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo ""
echo "✓ AWS CLI: Installed and configured"
echo "✓ AWS Credentials: Valid"
echo "✓ AWS Region: $AWS_REGION"
echo ""
echo "Permissions Status:"
echo "  - Bedrock: $BEDROCK_PERMISSIONS/2 verified"
echo "  - ECR: $ECR_PERMISSIONS/2 verified"
echo "  - IAM: $IAM_PERMISSIONS/1+ verified"
echo "  - Cognito: $COGNITO_PERMISSIONS/1 verified"
echo ""

# Check if ECR repo exists
if aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $AWS_REGION &> /dev/null; then
    echo "✓ ECR Repository: Exists"
else
    echo "✗ ECR Repository: Does not exist"
fi

# Check if IAM role exists
if aws iam get-role --role-name $IAM_ROLE_NAME &> /dev/null; then
    echo "✓ IAM Execution Role: Exists"
else
    echo "✗ IAM Execution Role: Does not exist"
fi

echo ""
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo ""
echo "1. If any permissions are missing, contact your AWS administrator"
echo "2. If ECR repository doesn't exist, create it using:"
echo "   aws ecr create-repository --repository-name $ECR_REPO_NAME --region $AWS_REGION"
echo ""
echo "3. If IAM execution role doesn't exist, create it using the provided script:"
echo "   ./scripts/create-iam-execution-role.sh"
echo ""
echo "4. Save the following information for deployment:"
echo "   - AWS Account ID: $ACCOUNT_ID"
echo "   - AWS Region: $AWS_REGION"
if aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $AWS_REGION &> /dev/null; then
    echo "   - ECR Repository URI: $(aws ecr describe-repositories --repository-names $ECR_REPO_NAME --region $AWS_REGION --query 'repositories[0].repositoryUri' --output text)"
fi
if aws iam get-role --role-name $IAM_ROLE_NAME &> /dev/null; then
    echo "   - IAM Role ARN: $(aws iam get-role --role-name $IAM_ROLE_NAME --query 'Role.Arn' --output text)"
fi
echo ""
