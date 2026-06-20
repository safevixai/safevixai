output "alb_dns_name" {
  description = "DNS name of the application load balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the ALB for Route53 alias records"
  value       = aws_lb.main.zone_id
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "backend_repository_url" {
  description = "ECR repository URL for backend image"
  value       = aws_ecr_repository.backend.repository_url
}

output "chatbot_repository_url" {
  description = "ECR repository URL for chatbot image"
  value       = aws_ecr_repository.chatbot.repository_url
}

output "frontend_repository_url" {
  description = "ECR repository URL for frontend image"
  value       = aws_ecr_repository.frontend.repository_url
}

output "rds_endpoint" {
  description = "RDS PostgreSQL primary endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "rds_replica_endpoint" {
  description = "RDS PostgreSQL read replica endpoint"
  value       = var.enable_read_replica ? aws_db_instance.replica[0].endpoint : null
}

output "redis_primary_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "sns_topic_arn" {
  description = "ARN of the SNS alerts topic"
  value       = aws_sns_topic.alerts.arn
}

output "cloudwatch_dashboard" {
  description = "Name of the CloudWatch dashboard"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

output "waf_acl_arn" {
  description = "ARN of the WAF web ACL"
  value       = aws_wafv2_web_acl.main.arn
}
