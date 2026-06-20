resource "aws_sns_topic" "alerts" {
  name = "safevixai-alerts"
  tags = {
    Environment = var.environment
  }
}

resource "aws_sns_topic_subscription" "alerts_email" {
  count     = length(var.alert_email_recipients)
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email_recipients[count.index]
}

resource "aws_cloudwatch_metric_alarm" "backend_high_cpu" {
  alarm_name          = "safevixai-backend-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Backend CPU > 80% for 2 minutes"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.backend.name
  }

  tags = { Environment = var.environment }
}

resource "aws_cloudwatch_metric_alarm" "backend_high_memory" {
  alarm_name          = "safevixai-backend-high-memory"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Backend memory > 80% for 2 minutes"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.backend.name
  }

  tags = { Environment = var.environment }
}

resource "aws_cloudwatch_metric_alarm" "backend_5xx" {
  alarm_name          = "safevixai-backend-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Backend 5xx errors > 10 in 2 minutes"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    TargetGroup  = aws_lb_target_group.backend.arn_suffix
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = { Environment = var.environment }
}

resource "aws_cloudwatch_metric_alarm" "backend_p99_latency" {
  alarm_name          = "safevixai-backend-p99-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  extended_statistic  = "p99"
  period              = 60
  threshold           = 3
  alarm_description   = "Backend p99 latency > 3s for 3 minutes"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    TargetGroup  = aws_lb_target_group.backend.arn_suffix
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = { Environment = var.environment }
}

resource "aws_cloudwatch_metric_alarm" "chatbot_5xx" {
  alarm_name          = "safevixai-chatbot-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "Chatbot 5xx errors > 10 in 2 minutes"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    TargetGroup  = aws_lb_target_group.chatbot.arn_suffix
    LoadBalancer = aws_lb.main.arn_suffix
  }

  tags = { Environment = var.environment }
}

resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  alarm_name          = "safevixai-rds-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 400
  alarm_description   = "RDS connections approaching max (500)"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.postgres.id
  }

  tags = { Environment = var.environment }
}

resource "aws_cloudwatch_metric_alarm" "rds_replica_lag" {
  count               = var.enable_read_replica ? 1 : 0
  alarm_name          = "safevixai-rds-replica-lag"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ReplicaLag"
  namespace           = "AWS/RDS"
  period              = 60
  statistic           = "Average"
  threshold           = 30
  alarm_description   = "RDS read replica lag > 30 seconds"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.replica[0].id
  }

  tags = { Environment = var.environment }
}

resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "safevixai-redis-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Redis CPU > 80% for 3 minutes"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }

  tags = { Environment = var.environment }
}

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "safevixai-production"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          title   = "ECS CPU Utilization"
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/ECS", "CPUUtilization", { stat = "Average" }],
            ["AWS/ECS", "MemoryUtilization", { stat = "Average" }]
          ]
          period = 300
          region = var.aws_region
        }
      },
      {
        type = "metric"
        properties = {
          title   = "ALB Request Count & Latency"
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", { stat = "Sum" }],
            ["AWS/ApplicationELB", "TargetResponseTime", { stat = "p99" }],
            ["AWS/ApplicationELB", "TargetResponseTime", { stat = "p50" }]
          ]
          period = 300
          region = var.aws_region
        }
      },
      {
        type = "metric"
        properties = {
          title   = "RDS & Redis"
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/RDS", "DatabaseConnections", { stat = "Average" }],
            ["AWS/RDS", "ReadLatency", { stat = "Average" }],
            ["AWS/ElastiCache", "CPUUtilization", { stat = "Average" }]
          ]
          period = 300
          region = var.aws_region
        }
      },
      {
        type = "metric"
        properties = {
          title   = "HTTP Error Rates"
          view    = "timeSeries"
          stacked = false
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_Target_4XX_Count", { stat = "Sum" }],
            ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", { stat = "Sum" }]
          ]
          period = 300
          region = var.aws_region
        }
      }
    ]
  })
}
