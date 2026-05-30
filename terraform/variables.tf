variable "aws_region" {
  type        = string
  description = "Target AWS Region"
  default     = "ap-south-1" # Mumbai region (best for Indian citizen-scale applications like SafeVixAI)
}

variable "environment" {
  type        = string
  description = "Deployment Environment"
  default     = "production"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
  default     = "10.0.0.0/16"
}

variable "db_instance_class" {
  type        = string
  description = "Instance class for RDS PostgreSQL database"
  default     = "db.r6g.large" # Memory-optimized instance (Graviton3) for PostGIS spatial calculations
}

variable "db_allocated_storage" {
  type        = number
  description = "Allocated storage size in GB"
  default     = 100
}

variable "redis_node_type" {
  type        = string
  description = "Node type for ElastiCache Redis replication group"
  default     = "cache.m6g.large" # Graviton3 balanced node class
}
