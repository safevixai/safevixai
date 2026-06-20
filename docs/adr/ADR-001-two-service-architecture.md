# ADR-001: Two-Service Architecture

**Date:** 2026-05-19  
**Status:** ✅ Accepted  
**Author:** SafeVixAI Engineering  

## Context

The application requires two distinct workloads:
1. A lightweight REST API for CRUD operations, geospatial queries, and real-time tracking
2. An AI-powered chatbot with heavy ML dependencies (torch, transformers, ~2GB)

Deploying them as a single service would create unnecessary coupling and bloat the production image.

## Options Considered

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Single monolith** | One FastAPI app serving both workloads | Simple deployment, shared DB sessions | 2GB+ image size, coupled deploys |
| **Two services (chosen)** | Separate FastAPI apps with different dependencies | Independent scaling, focused images, separate test suites | Extra network hop, shared secrets management |
| **Microservices** | Many small services | Maximum isolation | Over-engineered for current scope |

## Decision

Deploy as two separate FastAPI services:
- **Backend** (`:8000`): FastAPI + SQLAlchemy + PostGIS
- **Chatbot** (`:8010`): FastAPI + ChromaDB + LLM providers

Service-to-service auth via `X-Internal-Api-Key` header.

## Consequences

- Backend image stays ~200MB, chatbot image ~4GB
- Each service can scale independently (2-6 backend, 1-3 chatbot instances)
- Developers must run two `uvicorn` processes locally
- Docker Compose orchestrates both services in development

---

# ADR-002: 9-Provider LLM Fallback Chain

**Date:** 2026-05-20  
**Status:** ✅ Accepted  
**Author:** SafeVixAI AI Team  

## Context

LLM APIs are unreliable — rate limits, outages, and latency spikes are common. The chatbot must remain operational during upstream failures.

## Options Considered

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **Single provider** | One LLM (e.g., Groq) | Simple | Complete outage if provider down |
| **Fallback chain (chosen)** | Try providers sequentially until one succeeds | Near-zero downtime | Increased complexity |
| **Parallel fan-out** | Call all providers, return fastest | Lowest latency | Wasted API calls, cost |

## Decision

Implement a 9-provider fallback chain:  
Groq → Cerebras → Gemini → GitHub Models → NVIDIA NIM → OpenRouter → Mistral → Together → Template

With a separate Indian language routing path:
- Hindi/Tamil/etc. → Sarvam-30B
- Legal queries in Indian languages → Sarvam-105B

## Consequences

- ~100ms overhead per failed provider (non-blocking timeout)
- Email alert on complete chain failure (all 9 down)
- `< 0.01% chance of all 9 providers being simultaneously unavailable`
- Each provider needs its own API key in Secrets Manager

---

# ADR-003: PostGIS for Geospatial Queries

**Date:** 2026-05-21  
**Status:** ✅ Accepted  
**Author:** SafeVixAI Backend Team  

## Context

The app needs radius-based geospatial queries for:
- Emergency services near a location
- Road issue reporting by area
- Officer assignment by ward boundary

## Options Considered

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **PostGIS (chosen)** | PostgreSQL extension for spatial data | < 50ms `ST_DWithin` queries, ACID compliance, free | Requires PostGIS extension |
| **MongoDB** | Native geospatial indexing | Easy to start with | $, no JOINs, separate stack to maintain |
| **Elasticsearch** | Geo-distance queries | Great for full-text + geo | Overhead, cost, complexity |

## Decision

Use PostgreSQL 15 + PostGIS 3.4 with `ST_MakePoint( lon, lat )::geography` pattern.  
All spatial queries use `geography` type for meter-based distances.

## Consequences

- `ST_MakePoint(lon, lat)` — longitude first, NOT latitude
- `::geography` cast for meter distances (not `::geometry` which uses degrees)
- GiST index on geography columns for fast radius searches
- All DB instances must have PostGIS extension
