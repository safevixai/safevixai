# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team
#!/bin/bash
# SafeVixAI devcontainer post-create setup
set -e

echo "=== SafeVixAI Dev Environment Setup ==="

# Backend
echo "→ Setting up backend..."
cd /workspace/backend
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install -r requirements-dev.txt 2>/dev/null || true
deactivate

# Chatbot
echo "→ Setting up chatbot..."
cd /workspace/chatbot_service
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate

# Frontend
echo "→ Setting up frontend..."
cd /workspace/frontend
npm ci

# Pre-commit
echo "→ Installing pre-commit hooks..."
pip install pre-commit
cd /workspace
pre-commit install

# Copy env templates if .env doesn't exist
cd /workspace
for dir in backend chatbot_service frontend; do
  if [ -f "$dir/.env.example" ] && [ ! -f "$dir/.env" ]; then
    cp "$dir/.env.example" "$dir/.env"
    echo "→ Created $dir/.env from .env.example"
  fi
done

echo ""
echo "✓ Dev environment ready!"
echo "  Start backend:  cd backend   && uvicorn main:app --reload --port 8000"
echo "  Start chatbot:  cd chatbot_service && uvicorn main:app --reload --port 8010"
echo "  Start frontend: cd frontend  && npm run dev"
