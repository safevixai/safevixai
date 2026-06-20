resource "aws_secretsmanager_secret" "rds_master" {
  name        = "safevixai-rds-master-password"
  description = "Master password for SafeVixAI RDS PostgreSQL"
  rotation_rules {
    automatically_after_days = 30
  }
  tags = {
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "rds_master" {
  secret_id     = aws_secretsmanager_secret.rds_master.id
  secret_string = var.db_master_password
}

resource "aws_secretsmanager_secret" "backend_env" {
  name        = "safevixai-backend-env"
  description = "Environment variables for SafeVixAI backend service"
  tags = {
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret" "chatbot_env" {
  name        = "safevixai-chatbot-env"
  description = "Environment variables for SafeVixAI chatbot service"
  tags = {
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret" "frontend_env" {
  name        = "safevixai-frontend-env"
  description = "Environment variables for SafeVixAI frontend"
  tags = {
    Environment = var.environment
  }
}

data "aws_secretsmanager_secret_version" "rds_master" {
  secret_id = aws_secretsmanager_secret.rds_master.id
}
