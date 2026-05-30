data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "safevixai-vpc"
    Environment = var.environment
  }
}

# 1. Public Subnets (for ALBs and API Gateway VPC Links)
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name        = "safevixai-public-subnet-${count.index + 1}"
    Environment = var.environment
  }
}

# 2. Private Subnets (for EKS / ECS Container Tasks running Backend and Chatbot)
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name        = "safevixai-private-subnet-${count.index + 1}"
    Environment = var.environment
  }
}

# 3. Isolated Database Subnets (for RDS PostgreSQL and ElastiCache Redis)
resource "aws_subnet" "database" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 20)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name        = "safevixai-db-subnet-${count.index + 1}"
    Environment = var.environment
  }
}

# Gateway Infrastructure
resource "aws_internet_gateway" "gw" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name        = "safevixai-igw"
    Environment = var.environment
  }
}

resource "aws_eip" "nat" {
  domain = "vpc"
}

resource "aws_nat_gateway" "nat" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name        = "safevixai-nat"
    Environment = var.environment
  }
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.gw.id
  }

  tags = {
    Name        = "safevixai-public-rt"
    Environment = var.environment
  }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat.id
  }

  tags = {
    Name        = "safevixai-private-rt"
    Environment = var.environment
  }
}

resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# Security Groups
resource "aws_security_group" "db" {
  name        = "safevixai-db-sg"
  description = "Security Group for database backends"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "PostgreSQL traffic from private subnets"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_subnet.private[0].cidr_block, aws_subnet.private[1].cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "safevixai-db-sg"
    Environment = var.environment
  }
}

resource "aws_security_group" "cache" {
  name        = "safevixai-cache-sg"
  description = "Security Group for Redis cache nodes"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Redis access from private subnets"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = [aws_subnet.private[0].cidr_block, aws_subnet.private[1].cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "safevixai-cache-sg"
    Environment = var.environment
  }
}
