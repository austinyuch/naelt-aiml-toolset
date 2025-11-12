#!/bin/bash

# AWS ECS Infrastructure Setup Script
# This script helps set up the required AWS infrastructure for the advocacy content generator

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION=${AWS_REGION:-us-east-1}
PROJECT_NAME="advocacy-content-generator"
VPC_CIDR="10.0.0.0/16"

echo -e "${GREEN}=== AWS ECS Infrastructure Setup ===${NC}"
echo ""
echo "This script will create the following AWS resources:"
echo "  - VPC with public and private subnets"
echo "  - Internet Gateway and NAT Gateway"
echo "  - Security Groups"
echo "  - EFS File System"
echo "  - ECR Repository"
echo "  - IAM Roles and Policies"
echo "  - ECS Cluster"
echo "  - Application Load Balancer"
echo "  - CloudWatch Log Group"
echo ""
echo -e "${YELLOW}Region: ${AWS_REGION}${NC}"
echo ""

read -p "Do you want to continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 1
fi

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    exit 1
fi

# Check AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS credentials are not configured${NC}"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo -e "${GREEN}AWS Account ID: ${AWS_ACCOUNT_ID}${NC}"
echo ""

# Function to create VPC
create_vpc() {
    echo -e "${GREEN}Creating VPC...${NC}"
    
    VPC_ID=$(aws ec2 create-vpc \
        --cidr-block ${VPC_CIDR} \
        --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=${PROJECT_NAME}-vpc}]" \
        --query 'Vpc.VpcId' \
        --output text)
    
    echo "VPC ID: ${VPC_ID}"
    
    # Enable DNS hostnames
    aws ec2 modify-vpc-attribute \
        --vpc-id ${VPC_ID} \
        --enable-dns-hostnames
    
    echo -e "${GREEN}✓ VPC created${NC}"
}

# Function to create subnets
create_subnets() {
    echo -e "${GREEN}Creating subnets...${NC}"
    
    # Public subnet 1a
    PUBLIC_SUBNET_1A=$(aws ec2 create-subnet \
        --vpc-id ${VPC_ID} \
        --cidr-block 10.0.1.0/24 \
        --availability-zone ${AWS_REGION}a \
        --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-public-1a}]" \
        --query 'Subnet.SubnetId' \
        --output text)
    
    # Public subnet 1b
    PUBLIC_SUBNET_1B=$(aws ec2 create-subnet \
        --vpc-id ${VPC_ID} \
        --cidr-block 10.0.2.0/24 \
        --availability-zone ${AWS_REGION}b \
        --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-public-1b}]" \
        --query 'Subnet.SubnetId' \
        --output text)
    
    # Private subnet 1a
    PRIVATE_SUBNET_1A=$(aws ec2 create-subnet \
        --vpc-id ${VPC_ID} \
        --cidr-block 10.0.11.0/24 \
        --availability-zone ${AWS_REGION}a \
        --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-1a}]" \
        --query 'Subnet.SubnetId' \
        --output text)
    
    # Private subnet 1b
    PRIVATE_SUBNET_1B=$(aws ec2 create-subnet \
        --vpc-id ${VPC_ID} \
        --cidr-block 10.0.12.0/24 \
        --availability-zone ${AWS_REGION}b \
        --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-1b}]" \
        --query 'Subnet.SubnetId' \
        --output text)
    
    echo "Public Subnet 1a: ${PUBLIC_SUBNET_1A}"
    echo "Public Subnet 1b: ${PUBLIC_SUBNET_1B}"
    echo "Private Subnet 1a: ${PRIVATE_SUBNET_1A}"
    echo "Private Subnet 1b: ${PRIVATE_SUBNET_1B}"
    
    echo -e "${GREEN}✓ Subnets created${NC}"
}

# Function to create Internet Gateway
create_internet_gateway() {
    echo -e "${GREEN}Creating Internet Gateway...${NC}"
    
    IGW_ID=$(aws ec2 create-internet-gateway \
        --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=${PROJECT_NAME}-igw}]" \
        --query 'InternetGateway.InternetGatewayId' \
        --output text)
    
    aws ec2 attach-internet-gateway \
        --vpc-id ${VPC_ID} \
        --internet-gateway-id ${IGW_ID}
    
    echo "Internet Gateway ID: ${IGW_ID}"
    echo -e "${GREEN}✓ Internet Gateway created${NC}"
}

# Function to create NAT Gateway
create_nat_gateway() {
    echo -e "${GREEN}Creating NAT Gateway...${NC}"
    
    # Allocate Elastic IP
    EIP_ALLOC_ID=$(aws ec2 allocate-address \
        --domain vpc \
        --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=${PROJECT_NAME}-nat-eip}]" \
        --query 'AllocationId' \
        --output text)
    
    # Create NAT Gateway in public subnet
    NAT_GW_ID=$(aws ec2 create-nat-gateway \
        --subnet-id ${PUBLIC_SUBNET_1A} \
        --allocation-id ${EIP_ALLOC_ID} \
        --tag-specifications "ResourceType=natgateway,Tags=[{Key=Name,Value=${PROJECT_NAME}-nat}]" \
        --query 'NatGateway.NatGatewayId' \
        --output text)
    
    echo "NAT Gateway ID: ${NAT_GW_ID}"
    echo "Waiting for NAT Gateway to become available..."
    aws ec2 wait nat-gateway-available --nat-gateway-ids ${NAT_GW_ID}
    
    echo -e "${GREEN}✓ NAT Gateway created${NC}"
}

# Function to create route tables
create_route_tables() {
    echo -e "${GREEN}Creating route tables...${NC}"
    
    # Public route table
    PUBLIC_RT_ID=$(aws ec2 create-route-table \
        --vpc-id ${VPC_ID} \
        --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=${PROJECT_NAME}-public-rt}]" \
        --query 'RouteTable.RouteTableId' \
        --output text)
    
    # Add route to Internet Gateway
    aws ec2 create-route \
        --route-table-id ${PUBLIC_RT_ID} \
        --destination-cidr-block 0.0.0.0/0 \
        --gateway-id ${IGW_ID}
    
    # Associate public subnets
    aws ec2 associate-route-table \
        --route-table-id ${PUBLIC_RT_ID} \
        --subnet-id ${PUBLIC_SUBNET_1A}
    
    aws ec2 associate-route-table \
        --route-table-id ${PUBLIC_RT_ID} \
        --subnet-id ${PUBLIC_SUBNET_1B}
    
    # Private route table
    PRIVATE_RT_ID=$(aws ec2 create-route-table \
        --vpc-id ${VPC_ID} \
        --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=${PROJECT_NAME}-private-rt}]" \
        --query 'RouteTable.RouteTableId' \
        --output text)
    
    # Add route to NAT Gateway
    aws ec2 create-route \
        --route-table-id ${PRIVATE_RT_ID} \
        --destination-cidr-block 0.0.0.0/0 \
        --nat-gateway-id ${NAT_GW_ID}
    
    # Associate private subnets
    aws ec2 associate-route-table \
        --route-table-id ${PRIVATE_RT_ID} \
        --subnet-id ${PRIVATE_SUBNET_1A}
    
    aws ec2 associate-route-table \
        --route-table-id ${PRIVATE_RT_ID} \
        --subnet-id ${PRIVATE_SUBNET_1B}
    
    echo -e "${GREEN}✓ Route tables created${NC}"
}

# Function to create security groups
create_security_groups() {
    echo -e "${GREEN}Creating security groups...${NC}"
    
    # ALB Security Group
    ALB_SG_ID=$(aws ec2 create-security-group \
        --group-name ${PROJECT_NAME}-alb-sg \
        --description "Security group for ALB" \
        --vpc-id ${VPC_ID} \
        --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=${PROJECT_NAME}-alb-sg}]" \
        --query 'GroupId' \
        --output text)
    
    # Allow HTTP from anywhere
    aws ec2 authorize-security-group-ingress \
        --group-id ${ALB_SG_ID} \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0
    
    # ECS Security Group
    ECS_SG_ID=$(aws ec2 create-security-group \
        --group-name ${PROJECT_NAME}-ecs-sg \
        --description "Security group for ECS tasks" \
        --vpc-id ${VPC_ID} \
        --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=${PROJECT_NAME}-ecs-sg}]" \
        --query 'GroupId' \
        --output text)
    
    # Allow traffic from ALB
    aws ec2 authorize-security-group-ingress \
        --group-id ${ECS_SG_ID} \
        --protocol tcp \
        --port 3000 \
        --source-group ${ALB_SG_ID}
    
    # EFS Security Group
    EFS_SG_ID=$(aws ec2 create-security-group \
        --group-name ${PROJECT_NAME}-efs-sg \
        --description "Security group for EFS" \
        --vpc-id ${VPC_ID} \
        --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=${PROJECT_NAME}-efs-sg}]" \
        --query 'GroupId' \
        --output text)
    
    # Allow NFS from ECS
    aws ec2 authorize-security-group-ingress \
        --group-id ${EFS_SG_ID} \
        --protocol tcp \
        --port 2049 \
        --source-group ${ECS_SG_ID}
    
    echo "ALB Security Group: ${ALB_SG_ID}"
    echo "ECS Security Group: ${ECS_SG_ID}"
    echo "EFS Security Group: ${EFS_SG_ID}"
    
    echo -e "${GREEN}✓ Security groups created${NC}"
}

# Function to create EFS
create_efs() {
    echo -e "${GREEN}Creating EFS file system...${NC}"
    
    EFS_ID=$(aws efs create-file-system \
        --performance-mode generalPurpose \
        --throughput-mode bursting \
        --encrypted \
        --tags Key=Name,Value=${PROJECT_NAME}-efs \
        --query 'FileSystemId' \
        --output text)
    
    echo "EFS ID: ${EFS_ID}"
    echo "Waiting for EFS to become available..."
    aws efs describe-file-systems --file-system-id ${EFS_ID} --query 'FileSystems[0].LifeCycleState' --output text
    
    # Create mount targets
    aws efs create-mount-target \
        --file-system-id ${EFS_ID} \
        --subnet-id ${PRIVATE_SUBNET_1A} \
        --security-groups ${EFS_SG_ID}
    
    aws efs create-mount-target \
        --file-system-id ${EFS_ID} \
        --subnet-id ${PRIVATE_SUBNET_1B} \
        --security-groups ${EFS_SG_ID}
    
    echo -e "${GREEN}✓ EFS created${NC}"
}

# Function to create ECR repository
create_ecr() {
    echo -e "${GREEN}Creating ECR repository...${NC}"
    
    ECR_URI=$(aws ecr create-repository \
        --repository-name ${PROJECT_NAME} \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256 \
        --query 'repository.repositoryUri' \
        --output text 2>/dev/null || \
        aws ecr describe-repositories \
        --repository-names ${PROJECT_NAME} \
        --query 'repositories[0].repositoryUri' \
        --output text)
    
    echo "ECR URI: ${ECR_URI}"
    echo -e "${GREEN}✓ ECR repository ready${NC}"
}

# Function to create IAM roles
create_iam_roles() {
    echo -e "${GREEN}Creating IAM roles...${NC}"
    
    # Trust policy for ECS tasks
    cat > /tmp/ecs-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
    
    # Create Task Execution Role
    aws iam create-role \
        --role-name ${PROJECT_NAME}TaskExecutionRole \
        --assume-role-policy-document file:///tmp/ecs-trust-policy.json \
        --description "ECS Task Execution Role for ${PROJECT_NAME}" \
        2>/dev/null || echo "Task Execution Role already exists"
    
    aws iam attach-role-policy \
        --role-name ${PROJECT_NAME}TaskExecutionRole \
        --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
    
    # Create Task Role
    aws iam create-role \
        --role-name ${PROJECT_NAME}TaskRole \
        --assume-role-policy-document file:///tmp/ecs-trust-policy.json \
        --description "ECS Task Role for ${PROJECT_NAME}" \
        2>/dev/null || echo "Task Role already exists"
    
    # Attach Bedrock policy
    cat > /tmp/bedrock-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "arn:aws:bedrock:${AWS_REGION}::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0"
    }
  ]
}
EOF
    
    aws iam put-role-policy \
        --role-name ${PROJECT_NAME}TaskRole \
        --policy-name BedrockAccess \
        --policy-document file:///tmp/bedrock-policy.json
    
    # Attach EFS policy
    cat > /tmp/efs-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "elasticfilesystem:ClientMount",
        "elasticfilesystem:ClientWrite"
      ],
      "Resource": "arn:aws:elasticfilesystem:${AWS_REGION}:${AWS_ACCOUNT_ID}:file-system/${EFS_ID}"
    }
  ]
}
EOF
    
    aws iam put-role-policy \
        --role-name ${PROJECT_NAME}TaskRole \
        --policy-name EFSAccess \
        --policy-document file:///tmp/efs-policy.json
    
    echo -e "${GREEN}✓ IAM roles created${NC}"
}

# Function to create CloudWatch log group
create_log_group() {
    echo -e "${GREEN}Creating CloudWatch log group...${NC}"
    
    aws logs create-log-group \
        --log-group-name /ecs/${PROJECT_NAME} \
        2>/dev/null || echo "Log group already exists"
    
    aws logs put-retention-policy \
        --log-group-name /ecs/${PROJECT_NAME} \
        --retention-in-days 7
    
    echo -e "${GREEN}✓ CloudWatch log group created${NC}"
}

# Function to create ECS cluster
create_ecs_cluster() {
    echo -e "${GREEN}Creating ECS cluster...${NC}"
    
    aws ecs create-cluster \
        --cluster-name ${PROJECT_NAME}-cluster \
        --capacity-providers FARGATE FARGATE_SPOT \
        --default-capacity-provider-strategy \
            capacityProvider=FARGATE,weight=1 \
            capacityProvider=FARGATE_SPOT,weight=4 \
        2>/dev/null || echo "ECS cluster already exists"
    
    echo -e "${GREEN}✓ ECS cluster created${NC}"
}

# Function to create ALB
create_alb() {
    echo -e "${GREEN}Creating Application Load Balancer...${NC}"
    
    ALB_ARN=$(aws elbv2 create-load-balancer \
        --name ${PROJECT_NAME}-alb \
        --subnets ${PUBLIC_SUBNET_1A} ${PUBLIC_SUBNET_1B} \
        --security-groups ${ALB_SG_ID} \
        --scheme internet-facing \
        --type application \
        --ip-address-type ipv4 \
        --tags Key=Name,Value=${PROJECT_NAME}-alb \
        --query 'LoadBalancers[0].LoadBalancerArn' \
        --output text 2>/dev/null || \
        aws elbv2 describe-load-balancers \
        --names ${PROJECT_NAME}-alb \
        --query 'LoadBalancers[0].LoadBalancerArn' \
        --output text)
    
    # Create target group
    TG_ARN=$(aws elbv2 create-target-group \
        --name ${PROJECT_NAME}-tg \
        --protocol HTTP \
        --port 3000 \
        --vpc-id ${VPC_ID} \
        --target-type ip \
        --health-check-enabled \
        --health-check-path /health \
        --health-check-interval-seconds 30 \
        --health-check-timeout-seconds 5 \
        --healthy-threshold-count 2 \
        --unhealthy-threshold-count 3 \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text 2>/dev/null || \
        aws elbv2 describe-target-groups \
        --names ${PROJECT_NAME}-tg \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text)
    
    # Create listener
    aws elbv2 create-listener \
        --load-balancer-arn ${ALB_ARN} \
        --protocol HTTP \
        --port 80 \
        --default-actions Type=forward,TargetGroupArn=${TG_ARN} \
        2>/dev/null || echo "Listener already exists"
    
    ALB_DNS=$(aws elbv2 describe-load-balancers \
        --load-balancer-arns ${ALB_ARN} \
        --query 'LoadBalancers[0].DNSName' \
        --output text)
    
    echo "ALB DNS: ${ALB_DNS}"
    echo -e "${GREEN}✓ Application Load Balancer created${NC}"
}

# Function to save configuration
save_configuration() {
    echo -e "${GREEN}Saving configuration...${NC}"
    
    cat > infrastructure-config.txt << EOF
# AWS Infrastructure Configuration
# Generated on $(date)

AWS_REGION=${AWS_REGION}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID}

# VPC
VPC_ID=${VPC_ID}
PUBLIC_SUBNET_1A=${PUBLIC_SUBNET_1A}
PUBLIC_SUBNET_1B=${PUBLIC_SUBNET_1B}
PRIVATE_SUBNET_1A=${PRIVATE_SUBNET_1A}
PRIVATE_SUBNET_1B=${PRIVATE_SUBNET_1B}

# Security Groups
ALB_SG_ID=${ALB_SG_ID}
ECS_SG_ID=${ECS_SG_ID}
EFS_SG_ID=${EFS_SG_ID}

# EFS
EFS_ID=${EFS_ID}

# ECR
ECR_URI=${ECR_URI}

# ALB
ALB_ARN=${ALB_ARN}
ALB_DNS=${ALB_DNS}
TG_ARN=${TG_ARN}

# ECS
ECS_CLUSTER=${PROJECT_NAME}-cluster

# IAM Roles
TASK_EXECUTION_ROLE=arn:aws:iam::${AWS_ACCOUNT_ID}:role/${PROJECT_NAME}TaskExecutionRole
TASK_ROLE=arn:aws:iam::${AWS_ACCOUNT_ID}:role/${PROJECT_NAME}TaskRole
EOF
    
    echo -e "${GREEN}✓ Configuration saved to infrastructure-config.txt${NC}"
}

# Main execution
main() {
    create_vpc
    create_subnets
    create_internet_gateway
    create_nat_gateway
    create_route_tables
    create_security_groups
    create_efs
    create_ecr
    create_iam_roles
    create_log_group
    create_ecs_cluster
    create_alb
    save_configuration
    
    echo ""
    echo -e "${GREEN}=== Setup Complete ===${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Update task-definition.json with the values from infrastructure-config.txt"
    echo "2. Create secrets in AWS Secrets Manager:"
    echo "   - ${PROJECT_NAME}/news-api-key"
    echo "   - ${PROJECT_NAME}/api-keys"
    echo "3. Build and push Docker image to ECR: ${ECR_URI}"
    echo "4. Register task definition and create ECS service"
    echo ""
    echo "Your application will be available at: http://${ALB_DNS}"
    echo ""
}

# Run main function
main
