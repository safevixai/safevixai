resource "aws_ecs_cluster" "main" {
  name = "safevixai-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  configuration {
    execute_command_configuration {
      logging = "OVERRIDE"
      log_configuration {
        cloud_watch_log_group_name = aws_cloudwatch_log_group.ecs_exec.name
      }
    }
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "ecs_exec" {
  name              = "/ecs/safevixai-exec"
  retention_in_days = 7
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/safevixai-backend"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "chatbot" {
  name              = "/ecs/safevixai-chatbot"
  retention_in_days = var.log_retention_days
}

resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/safevixai-frontend"
  retention_in_days = var.log_retention_days
}

resource "aws_security_group" "ecs_tasks" {
  name        = "safevixai-ecs-tasks-sg"
  description = "Security group for ECS Fargate tasks"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Environment = var.environment
  }
}

resource "aws_security_group_rule" "ecs_to_rds" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.db.id
  source_security_group_id = aws_security_group.ecs_tasks.id
  description              = "ECS tasks to RDS PostgreSQL"
}

resource "aws_security_group_rule" "ecs_to_redis" {
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  security_group_id        = aws_security_group.cache.id
  source_security_group_id = aws_security_group.ecs_tasks.id
  description              = "ECS tasks to ElastiCache Redis"
}

data "aws_iam_role" "ecs_task_execution" {
  name = "ecsTaskExecutionRole"
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "safevixai-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "backend"
      image     = "${aws_ecr_repository.backend.repository_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = 8000
          protocol      = "tcp"
          appProtocol   = "http"
        }
      ]

      environment = [
        { name = "ENVIRONMENT", value = var.environment }
      ]

      secrets = [
        { name = "DATABASE_URL", valueFrom = "${aws_secretsmanager_secret.backend_env.arn}:DATABASE_URL::" },
        { name = "REDIS_URL", valueFrom = "${aws_secretsmanager_secret.backend_env.arn}:REDIS_URL::" },
        { name = "CHATBOT_SERVICE_URL", valueFrom = "${aws_secretsmanager_secret.backend_env.arn}:CHATBOT_SERVICE_URL::" },
        { name = "ADMIN_SECRET", valueFrom = "${aws_secretsmanager_secret.backend_env.arn}:ADMIN_SECRET::" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.backend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "backend"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Environment = var.environment
  }
}

resource "aws_ecs_task_definition" "chatbot" {
  family                   = "safevixai-chatbot"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.chatbot_cpu
  memory                   = var.chatbot_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "chatbot"
      image     = "${aws_ecr_repository.chatbot.repository_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = 8010
          protocol      = "tcp"
          appProtocol   = "http"
        }
      ]

      environment = [
        { name = "ENVIRONMENT", value = var.environment },
        { name = "DEFAULT_LLM_PROVIDER", value = var.default_llm_provider },
        { name = "DEFAULT_LLM_MODEL", value = var.default_llm_model }
      ]

      secrets = [
        { name = "REDIS_URL", valueFrom = "${aws_secretsmanager_secret.chatbot_env.arn}:REDIS_URL::" },
        { name = "MAIN_BACKEND_BASE_URL", valueFrom = "${aws_secretsmanager_secret.chatbot_env.arn}:MAIN_BACKEND_BASE_URL::" },
        { name = "GROQ_API_KEY", valueFrom = "${aws_secretsmanager_secret.chatbot_env.arn}:GROQ_API_KEY::" },
        { name = "GEMINI_API_KEY", valueFrom = "${aws_secretsmanager_secret.chatbot_env.arn}:GEMINI_API_KEY::" },
        { name = "CEREBRAS_API_KEY", valueFrom = "${aws_secretsmanager_secret.chatbot_env.arn}:CEREBRAS_API_KEY::" },
        { name = "HF_TOKEN", valueFrom = "${aws_secretsmanager_secret.chatbot_env.arn}:HF_TOKEN::" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.chatbot.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "chatbot"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8010/health || exit 1"]
        interval    = 30
        timeout     = 10
        retries     = 3
        startPeriod = 120
      }
    }
  ])

  tags = {
    Environment = var.environment
  }
}

resource "aws_ecs_task_definition" "frontend" {
  family                   = "safevixai-frontend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.frontend_cpu
  memory                   = var.frontend_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "frontend"
      image     = "${aws_ecr_repository.frontend.repository_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = 3000
          protocol      = "tcp"
          appProtocol   = "http"
        }
      ]

      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "ENVIRONMENT", value = var.environment }
      ]

      secrets = [
        { name = "NEXT_PUBLIC_BACKEND_URL", valueFrom = "${aws_secretsmanager_secret.frontend_env.arn}:NEXT_PUBLIC_BACKEND_URL::" },
        { name = "NEXT_PUBLIC_CHATBOT_URL", valueFrom = "${aws_secretsmanager_secret.frontend_env.arn}:NEXT_PUBLIC_CHATBOT_URL::" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.frontend.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "frontend"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])

  tags = {
    Environment = var.environment
  }
}

resource "aws_ecs_service" "backend" {
  name                   = "safevixai-backend"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.backend.arn
  desired_count          = var.backend_desired_count
  launch_type            = "FARGATE"
  enable_execute_command = true

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  depends_on = [aws_lb_listener.https]
}

resource "aws_ecs_service" "chatbot" {
  name                   = "safevixai-chatbot"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.chatbot.arn
  desired_count          = var.chatbot_desired_count
  launch_type            = "FARGATE"
  enable_execute_command = true

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.chatbot.arn
    container_name   = "chatbot"
    container_port   = 8010
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  depends_on = [aws_lb_listener.https]
}

resource "aws_ecs_service" "frontend" {
  name                   = "safevixai-frontend"
  cluster                = aws_ecs_cluster.main.id
  task_definition        = aws_ecs_task_definition.frontend.arn
  desired_count          = var.frontend_desired_count
  launch_type            = "FARGATE"
  enable_execute_command = true

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs_tasks.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  depends_on = [aws_lb_listener.https]
}
