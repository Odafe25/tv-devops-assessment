This project deploys a containerized Node.js app using CDK for Terraform, AWS Fargate, ECR, and ALB with HTTPS + Route53 support.

Prerequisites
Node.js + npm

AWS credentials (via env vars or AWS profile)

Terraform installed (used by CDKTF behind the scenes)



---

##  Modules Overview

### `vpc.ts`
Defines a custom VPC with:
- DNS support and hostname resolution
- One public subnet per availability zone (`10.0.1.0/24`, `10.0.2.0/24`, etc.)
- A security group allowing inbound HTTP (80) and HTTPS (443) traffic

### `ecr.ts`
Provisions an **Elastic Container Registry** to store Docker images for ECS deployment.

### `ecs.ts`
Sets up:
- An **ECS Cluster** using **AWS Fargate**
- A **service** to run containers from the specified ECR image
- Uses the VPC subnets and attaches security groups

### `alb.ts`
Deploys an **Application Load Balancer**:
- Attaches it to the public subnets
- Creates a target group pointing to the ECS service
- Includes an HTTPS listener (using ACM certificate)

### `certificate.ts`
Automates:
- **ACM certificate creation** for your domain/subdomain
- **DNS validation** via Route 53
- Attaches the validated cert to the ALB listener

### `logging.ts`
Creates **CloudWatch log group and stream** for capturing ECS container logs.

---

## Stack Logic – `infra-stack.ts`

The `InfraStack` composes all modules in a single deployment:
- Initializes the AWS provider
- Reads availability zones
- Applies all modules in sequence
- Outputs key values like ALB DNS name and ECS Cluster ARN

---

## 🚀Deployment Instructions


cd iac 
run: cdktf deploy --auto-approve


## TypeScript Configuration – tsconfig.json

The tsconfig.json file defines how the TypeScript compiler (tsc) should process the codebase.