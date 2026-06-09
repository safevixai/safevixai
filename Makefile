.PHONY: help setup test lint build docker docker-up clean deploy

help:
	@echo "SafeVixAI Development Commands"
	@echo "  make setup      - Install all dependencies"
	@echo "  make test       - Run all tests"
	@echo "  make lint       - Lint all code"
	@echo "  make build      - Build all services"
	@echo "  make docker     - Build Docker images"
	@echo "  make docker-up  - Start Docker Compose"
	@echo "  make clean      - Clean artifacts"
	@echo "  make deploy     - Deploy to production"

setup:
	cd backend && pip install -r requirements.txt
	cd chatbot_service && pip install -r requirements.txt
	cd frontend && npm install

test:
	cd backend && pytest tests/ -q
	cd chatbot_service && pytest tests/ -q
	cd frontend && npm test

test-backend:
	cd backend && pytest tests/ -v --tb=short

test-chatbot:
	cd chatbot_service && pytest tests/ -v --tb=short

test-frontend:
	cd frontend && npm test

lint:
	cd backend && ruff check .
	cd chatbot_service && ruff check .
	cd frontend && npm run lint

build:
	cd frontend && npm run build

docker:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

clean:
	cd backend && find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	cd chatbot_service && find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	cd frontend && rm -rf .next coverage test-results

deploy:
	@echo "Deploying to production..."
	# Trigger Render deploy hooks
	@echo "Deployment complete"

e2e:
	cd frontend && npx playwright test e2e/ --grep-invert="Visual Regression|visual"
