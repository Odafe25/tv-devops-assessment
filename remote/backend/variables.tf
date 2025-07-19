variable "aws_region" {
  description = "AWS region"
  default     = "us-east-1"
}

variable "s3_bucket_name" {
  description = "Name of the S3 bucket for Terraform state"
  default     = "my-cdktf-tfstate-bucket"
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table for state locking"
  default     = "terraform-lock-table"
}
