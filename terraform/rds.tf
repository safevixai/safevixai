resource "aws_db_subnet_group" "db" {
  name       = "safevixai-db-subnet-group"
  subnet_ids = [aws_subnet.database[0].id, aws_subnet.database[1].id]

  tags = {
    Name        = "SafeVixAI DB Subnet Group"
    Environment = var.environment
  }
}

resource "aws_db_parameter_group" "postgres" {
  name   = "safevixai-pg-params"
  family = "postgres15"

  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/32768}"
  }

  parameter {
    name  = "work_mem"
    value = "65536"
  }

  parameter {
    name  = "max_connections"
    value = "500"
  }

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
}

resource "aws_db_instance" "postgres" {
  identifier             = "safevixai-postgres-db"
  allocated_storage      = var.db_allocated_storage
  max_allocated_storage  = 1000
  engine                 = "postgres"
  engine_version         = "15.7"
  instance_class         = var.db_instance_class
  db_name                = "safevixai"
  username               = "safevix_admin"
  password               = data.aws_secretsmanager_secret_version.rds_master.secret_string
  parameter_group_name   = aws_db_parameter_group.postgres.name
  db_subnet_group_name   = aws_db_subnet_group.db.name
  vpc_security_group_ids = [aws_security_group.db.id]
  multi_az               = true
  skip_final_snapshot    = false
  final_snapshot_identifier = "safevixai-postgres-db-final-snapshot"
  storage_type           = "gp3"
  iops                   = 3000
  throughput             = 125
  storage_encrypted      = true
  backup_retention_period = 30
  backup_window           = "03:00-04:00"
  maintenance_window      = "Sun:04:30-Sun:05:30"
  deletion_protection     = true
  copy_tags_to_snapshot   = true
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  enabled_cloudwatch_logs_exports       = ["postgresql", "upgrade"]

  tags = {
    Name        = "safevixai-rds-postgres"
    Environment = var.environment
  }
}

resource "aws_db_instance" "replica" {
  count                  = var.enable_read_replica ? 1 : 0
  identifier             = "safevixai-postgres-replica"
  engine                 = "postgres"
  engine_version         = "15.7"
  instance_class         = var.db_replica_instance_class
  replicate_source_db    = aws_db_instance.postgres.identifier
  vpc_security_group_ids = [aws_security_group.db.id]
  storage_type           = "gp3"
  storage_encrypted      = true
  backup_retention_period = 7
  copy_tags_to_snapshot   = true
  performance_insights_enabled          = true
  performance_insights_retention_period = 7
  enabled_cloudwatch_logs_exports       = ["postgresql"]
  deletion_protection     = true
  skip_final_snapshot    = true
  monitoring_interval    = 15
  monitoring_role_arn    = aws_iam_role.rds_enhanced_monitoring[0].arn

  tags = {
    Name        = "safevixai-rds-postgres-replica"
    Environment = var.environment
  }
}

resource "aws_db_parameter_group" "postgres_replica" {
  count  = var.enable_read_replica ? 1 : 0
  name   = "safevixai-pg-replica-params"
  family = "postgres15"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }
}

resource "aws_iam_role" "rds_enhanced_monitoring" {
  count = var.enable_read_replica ? 1 : 0
  name  = "safevixai-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  count      = var.enable_read_replica ? 1 : 0
  role       = aws_iam_role.rds_enhanced_monitoring[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

resource "aws_db_instance_automated_backups_replication" "replica" {
  count                   = var.enable_cross_region_backup ? 1 : 0
  source_db_instance_arn  = aws_db_instance.postgres.arn
  source_region           = var.aws_region
  kms_key_id              = var.cross_region_backup_kms_key
}
