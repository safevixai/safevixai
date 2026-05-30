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

  # Optimize connection parameters for spatial/PostGIS queries
  parameter {
    name  = "shared_buffers"
    value = "{DBInstanceClassMemory/32768}" # ~25% of memory allocated
  }

  parameter {
    name  = "work_mem"
    value = "65536" # 64MB for sorting/joins
  }

  parameter {
    name  = "max_connections"
    value = "500"
  }
}

resource "aws_db_instance" "postgres" {
  identifier             = "safevixai-postgres-db"
  allocated_storage      = var.db_allocated_storage
  max_allocated_storage  = 1000 # Auto-scaling storage up to 1TB
  engine                 = "postgres"
  engine_version         = "15.7"
  instance_class         = var.db_instance_class
  db_name                = "safevixai"
  username               = "safevix_admin"
  password               = "vault_secured_admin_pwd" # In production, pull this dynamically from AWS Secrets Manager
  parameter_group_name   = aws_db_parameter_group.postgres.name
  db_subnet_group_name   = aws_db_subnet_group.db.name
  vpc_security_group_ids = [aws_security_group.db.id]
  multi_az               = true # High availability for zero-downtime citizen SOS and emergency tracking
  skip_final_snapshot    = false
  final_snapshot_identifier = "safevixai-postgres-db-final-snapshot"
  storage_type           = "gp3"
  iops                   = 3000 # Standard fast provisioned IOPS
  throughput             = 125  # 125 MB/s throughput

  # Storage Encryption
  storage_encrypted = true

  # Backup policy
  backup_retention_period = 30
  backup_window           = "03:00-04:00"
  maintenance_window      = "Sun:04:30-Sun:05:30"

  tags = {
    Name        = "safevixai-rds-postgres"
    Environment = var.environment
  }
}
