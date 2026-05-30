resource "aws_elasticache_subnet_group" "cache" {
  name       = "safevixai-cache-subnet-group"
  subnet_ids = [aws_subnet.database[0].id, aws_subnet.database[1].id]
}

resource "aws_elasticache_parameter_group" "redis" {
  name   = "safevixai-redis-params"
  family = "redis7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru" # Enforce LRU eviction to prevent cache OOM (resolving memory leak audit concerns)
  }
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id        = "safevixai-redis-cluster"
  description                 = "SafeVixAI Clustered Redis Replication Group"
  node_type                   = var.redis_node_type
  port                        = 6379
  parameter_group_name        = aws_elasticache_parameter_group.redis.name
  subnet_group_name           = aws_elasticache_subnet_group.cache.name
  security_group_ids          = [aws_security_group.cache.id]
  automatic_failover_enabled  = true
  multi_az_enabled            = true
  num_cache_clusters          = 2 # Primary + Read Replica for high availability load balancing

  # Data Security in Transit and at Rest
  transit_encryption_enabled = true
  at_rest_encryption_enabled = true

  tags = {
    Name        = "safevixai-elasticache-redis"
    Environment = var.environment
  }
}
