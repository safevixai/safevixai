# Contributing to SafeVixAI

Thank you for your interest in contributing! SafeVixAI is an AI-powered road safety platform for India, built for the IIT Madras Road Safety Hackathon 2026.

## Getting Started

1. Read [SETUP.md](SETUP.md) for local development setup
2. Read [AGENTS.md](AGENTS.md) for the full project overview
3. Read our [Code of Conduct](CODE_OF_CONDUCT.md)

## Development Workflow

### 1. Fork & Clone
```bash
git clone https://github.com/YOUR_USERNAME/SafeVixAI.git
cd SafeVixAI
```

### 2. Set Up Environment
```bash
# Backend
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Chatbot Service
cd ../chatbot_service && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend && npm install
```

### 3. Run Tests
```bash
# Backend
cd backend && pytest tests/ -q

# Chatbot Service (asyncio_mode = strict - requires @pytest.mark.asyncio)
cd chatbot_service && pytest tests/ -q

# Frontend
cd frontend && npm test && npm run lint
```

### 4. Pre-commit
We use pre-commit hooks. Run once after cloning:
```bash
pip install pre-commit && pre-commit install
```

## Code Standards

- **Python**: Follow ruff + black formatting, full type hints, Google-style docstrings
- **TypeScript**: Strict mode, no `any` types, full type annotations
- **Tests**: New features require tests. Coverage threshold: backend 80%, frontend 50%
- **Security**: Never commit secrets, API keys, or `.env` files

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with clear commit messages
3. Run all tests and linting
4. Update documentation if needed
5. Open a PR with a clear description of what and why

## Project Structure

```
SafeVixAI/
├── backend/           FastAPI :8000 (PostgreSQL, Redis, Overpass)
├── chatbot_service/   FastAPI :8010 (9 LLM providers, ChromaDB RAG)
├── frontend/          Next.js 15 :3000 (MapLibre GL, PWA, WebLLM)
├── docs/              Documentation
├── k8s/               Kubernetes manifests
├── monitoring/        Prometheus + Grafana configs
└── scripts/           Data pipeline scripts
```

## Architecture Overview

See [docs/Architecture.md](docs/Architecture.md) for system architecture.

## Questions?

Open a [Discussion](https://github.com/SafeVixAI/SafeVixAI/discussions) or check our [Wiki](https://github.com/SafeVixAI/SafeVixAI/wiki).
