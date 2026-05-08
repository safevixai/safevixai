# SafeVixAI Repository Wiki

> **Auto-synced** from `.qoder/repowiki/en/` via GitHub Actions

This folder contains the complete repository wiki â€” 104 documentation files organized by module, covering every aspect of the SafeVixAI platform.

## Structure

```
docs/wiki/
â”œâ”€â”€ content/                          # 104 markdown documentation files
â”‚   â”œâ”€â”€ AI Chatbot Service/           # Agentic RAG chatbot (9 files)
â”‚   â”œâ”€â”€ API Reference/                # REST API endpoints (8 files)
â”‚   â”œâ”€â”€ Data Management/              # Vector store, data pipelines (6 files)
â”‚   â”œâ”€â”€ Database Schema/              # PostgreSQL + PostGIS models (8 files)
â”‚   â”œâ”€â”€ Emergency Locator Module/     # GPS, SOS, emergency services (7 files)
â”‚   â”œâ”€â”€ Frontend Application/         # Next.js PWA + components (13 files)
â”‚   â”œâ”€â”€ Performance Optimization/     # Caching, AI inference (6 files)
â”‚   â”œâ”€â”€ Project Overview/             # Architecture, tech stack (29 files)
â”‚   â”œâ”€â”€ Road Reporter (RoadWatch)/    # Community road reporting (6 files)
â”‚   â”œâ”€â”€ System Architecture/          # Microservices, data flow (5 files)
â”‚   â”œâ”€â”€ Contributing Guidelines.md
â”‚   â”œâ”€â”€ Deployment and CI_CD.md
â”‚   â”œâ”€â”€ Getting Started.md
â”‚   â”œâ”€â”€ Offline Architecture.md
â”‚   â”œâ”€â”€ Performance Optimization.md
â”‚   â”œâ”€â”€ Security and Authentication.md
â”‚   â””â”€â”€ Testing Strategy.md
â”œâ”€â”€ meta/
â”‚   â””â”€â”€ repowiki-metadata.json        # Catalog with prompts + dependencies
â””â”€â”€ README.md                         # This file
```

## How It Works

1. **Source of truth**: `.qoder/repowiki/en/` (generated + manually refined)
2. **Sync**: GitHub Actions workflow runs on push â†’ copies to `docs/wiki/`
3. **Staleness detection**: Workflow compares codebase against wiki, flags undocumented files

## Key Facts (Ground Truth)

| Metric | Value |
|---|---|
| LLM Providers | 9 (Groq, Gemini, Cerebras, Mistral, NVIDIA NIM, Sarvam AI, Together AI, GitHub Models, OpenRouter) |
| Chatbot Tools | 13 |
| Intent Classes | 9 |
| Embedding Model | LocalHashEmbeddingFunction (zero-dependency) |
| Frontend Components | 45 |
| Frontend Pages | 16 |
| API Endpoints | 28 |
| Rate Limiting | slowapi (5/10/8 req/min) |
| Auth | Supabase Auth (HS256 JWT) |
| GH Actions Workflows | 7 |
| HuggingFace Dataset Hub | [SafeVixAI/SafeVixAI-Dataset-Hub](https://huggingface.co/datasets/SafeVixAI/SafeVixAI-Dataset-Hub) |

