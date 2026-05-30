resource "aws_apigatewayv2_api" "http" {
  name          = "safevixai-api-gateway"
  protocol_type = "HTTP"
  description   = "SafeVixAI Edge Gateway (Kong/AWS APIGW equivalent for ingress routing)"

  tags = {
    Environment = var.environment
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    detailed_metrics_enabled = true
    throttling_burst_limit   = 5000 # Edge burst protection
    throttling_rate_limit    = 2000 # Edge steady-state request limits
  }

  tags = {
    Environment = var.environment
  }
}

# VPC Links for private microservice integrations (prevents routing container traffic over public net)
resource "aws_apigatewayv2_vpc_link" "link" {
  name               = "safevixai-vpc-link"
  security_group_ids = [aws_security_group.cache.id] # Shares secure subnet access bounds
  subnet_ids         = [aws_subnet.private[0].id, aws_subnet.private[1].id]

  tags = {
    Environment = var.environment
  }
}

# Integration with Core Backend API Service (port 8000)
resource "aws_apigatewayv2_integration" "backend" {
  api_id           = aws_apigatewayv2_api.http.id
  integration_type = "HTTP_PROXY"
  integration_uri  = "http://safevixai-backend-service.safevixai.svc.cluster.local:8000"
  integration_method = "ANY"
  connection_type  = "VPC_LINK"
  connection_id    = aws_apigatewayv2_vpc_link.link.id
}

# Integration with Chatbot RAG Service (port 8010)
resource "aws_apigatewayv2_integration" "chatbot" {
  api_id           = aws_apigatewayv2_api.http.id
  integration_type = "HTTP_PROXY"
  integration_uri  = "http://safevixai-chatbot-service.safevixai.svc.cluster.local:8010"
  integration_method = "ANY"
  connection_type  = "VPC_LINK"
  connection_id    = aws_apigatewayv2_vpc_link.link.id
}

# API Gateway Routes mapping traffic path strings
resource "aws_apigatewayv2_route" "backend_api" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "ANY /api/v1/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.backend.id}"
}

resource "aws_apigatewayv2_route" "chatbot_api" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "ANY /api/v1/chat/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.chatbot.id}"
}

resource "aws_apigatewayv2_route" "chatbot_direct" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "ANY /speech/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.chatbot.id}"
}
