variable "aws_region" {
  type        = string
  description = "Target AWS Region"
  default     = "ap-south-1"
}

variable "environment" {
  type        = string
  description = "Deployment environment (production, staging)"
  default     = "production"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
  default     = "10.0.0.0/16"
}

# RDS
variable "db_instance_class" {
  type        = string
  description = "Instance class for RDS PostgreSQL primary"
  default     = "db.r6g.large"
}

variable "db_replica_instance_class" {
  type        = string
  description = "Instance class for RDS PostgreSQL read replica"
  default     = "db.r6g.large"
}

variable "db_allocated_storage" {
  type        = number
  description = "Allocated storage size in GB for RDS"
  default     = 100
}

variable "db_master_password" {
  type        = string
  description = "Master password for RDS PostgreSQL (overridden by Secrets Manager)"
  sensitive   = true
  default     = ""
}

# ElastiCache
variable "redis_node_type" {
  type        = string
  description = "Node type for ElastiCache Redis"
  default     = "cache.m6g.large"
}

# ECS
variable "backend_cpu" {
  type        = number
  description = "CPU units for backend Fargate task (256 = 0.25 vCPU)"
  default     = 512
}

variable "backend_memory" {
  type        = number
  description = "Memory (MB) for backend Fargate task"
  default     = 1024
}

variable "backend_desired_count" {
  type        = number
  description = "Desired number of backend ECS tasks"
  default     = 2
}

variable "backend_max_count" {
  type        = number
  description = "Maximum number of backend ECS tasks for auto-scaling"
  default     = 6
}

variable "chatbot_cpu" {
  type        = number
  description = "CPU units for chatbot Fargate task"
  default     = 1024
}

variable "chatbot_memory" {
  type        = number
  description = "Memory (MB) for chatbot Fargate task"
  default     = 4096
}

variable "chatbot_desired_count" {
  type        = number
  description = "Desired number of chatbot ECS tasks"
  default     = 1
}

variable "chatbot_max_count" {
  type        = number
  description = "Maximum number of chatbot ECS tasks for auto-scaling"
  default     = 3
}

variable "frontend_cpu" {
  type        = number
  description = "CPU units for frontend Fargate task"
  default     = 256
}

variable "frontend_memory" {
  type        = number
  description = "Memory (MB) for frontend Fargate task"
  default     = 512
}

variable "frontend_desired_count" {
  type        = number
  description = "Desired number of frontend ECS tasks"
  default     = 2
}

variable "frontend_max_count" {
  type        = number
  description = "Maximum number of frontend ECS tasks for auto-scaling"
  default     = 4
}

# LLM
variable "default_llm_provider" {
  type        = string
  description = "Default LLM provider for chatbot"
  default     = "groq"
}

variable "default_llm_model" {
  type        = string
  description = "Default LLM model for chatbot"
  default     = "llama-3.3-70b-versatile"
}

# DNS & TLS
variable "domain_name" {
  type        = string
  description = "Domain name for the application (e.g., safevixai.com)"
  default     = ""
}

variable "acm_certificate_arn" {
  type        = string
  description = "ARN of ACM certificate for HTTPS"
  default     = ""
}

# Monitoring
variable "alert_email_recipients" {
  type        = list(string)
  description = "Email addresses for CloudWatch alarm notifications"
  default     = []
}

variable "log_retention_days" {
  type        = number
  description = "Retention period for CloudWatch logs in days"
  default     = 90
}

# Features
variable "enable_read_replica" {
  type        = bool
  description = "Provision a read replica for RDS PostgreSQL"
  default     = false
}

variable "enable_cross_region_backup" {
  type        = bool
  description = "Enable cross-region automated backup replication"
  default     = false
}

variable "cross_region_backup_kms_key" {
  type        = string
  description = "KMS key ARN for cross-region backup encryption"
  default     = ""
}
