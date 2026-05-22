# SafeVixAI — Complete Project Analysis

> Generated: 2026-05-22 | Scope: Full-stack AI Road Safety PWA

---

## 1. Project Identity

**SafeVixAI** is a full-stack AI-powered road safety PWA built for the IIT Madras Road Safety Hackathon 2026. It solves 4 problem statements:

| Problem | Solution |
|---------|----------|
| Emergency Locator | PostGIS-powered nearest service finder (hospitals, police, fire, ambulances) with radius expansion up to 50km |
| AI Chatbot | 9-provider LLM fallback, RAG over Motor Vehicles Act + first-aid + accident data, 13 agent tools |
| Challan Calculator | Dual-path (DuckDB-Wasm client-side + Python server-side) fine calculation with state overrides |
| Road Reporter | Community hazard reporting with photo upload, authority routing, OSM contribution, Waze feed |

**Cost:** ₹0 (all free/open-source tiers)

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  FRONTEND  (Next.js 15 + React 19 + TypeScript + Tailwind CSS)  │
│  Port 3000  |  PWA + Offline-first + MapLibre GL + GSAP Anim    │
│  Vercel (production)                                             │
└──────────┬──────────────────────────────────────────┬────────────┘
           │ REST + SSE Streaming                      │ REST
           │ JWT Bearer                                 │ Public
┌──────────▼──────────────┐     ┌──────────────────────▼──────────┐
│  BACKEND  (FastAPI)     │     │  CHATBOT SERVICE (FastAPI)     │
│  Port 8000              │     │  Port 8010                      │
│  Render (production)    │     │  Render (production)            │
│                         │     │                                  │
│  ┌─────────────────┐    │     │  ┌──────────────────────────┐   │
│  │ 14 Services      │    │     │  │ ChatEngine (Graph)       │   │
│  │ EmergencyLocator │    │     │  │ ├─ SafetyChecker         │   │
│  │ ChallanService   │◄───┼─────┼──┤ ├─ IntentDetector        │   │
│  │ RoutingService   │    │     │  │ ├─ ContextAssembler      │   │
│  │ GeocodingService │    │     │  │ ├─ ProviderRouter        │   │
│  │ RoadWatchService │    │     │  │ └─ ConversationMemory    │   │
│  │ LLMService (proxy)│   │     │  │                          │   │
│  │ OverpassService   │   │     │  │ ┌──────────────────┐     │   │
│  │ AuthorityRouter   │   │     │  │ │ 9 LLM Providers   │     │   │
│  │ RoutingService    │   │     │  │ │ Groq→Cerebras→    │     │   │
│  │ SafeSpacesService │   │     │  │ │ Gemini→GitHub→    │     │   │
│  │ SafeRoutingService│   │     │  │ │ NVIDIA→OpenRouter→│     │   │
│  │ OSMContributor    │   │     │  │ │ Mistral→Together→ │     │   │
│  │ ReportClassifier  │   │     │  │ │ Template(determ.) │     │   │
│  └─────────────────┘    │     │  │ └──────────────────┘     │   │
│                         │     │  │ ┌──────────────────┐     │   │
│  ┌─────────────────┐    │     │  │ │ 13 Agent Tools   │     │   │
│  │ PostgreSQL+PostGIS│   │     │  │ │ SOS, Emergency,  │     │   │
│  │ Redis Cache      │   │     │  │ │ Challan, Legal,  │     │   │
│  │ Supabase Storage │   │     │  │ │ FirstAid,Weather,│     │   │
│  │ Overpass API     │   │     │  │ │ OpenMeteo,Road   │     │   │
│  │ OpenRouteService │   │     │  │ │ Issues, Report,  │     │   │
│  │ Nominatim/Photon │   │     │  │ │ Geocoding,Drug,  │     │   │
│  └─────────────────┘    │     │  │ │ What3Words       │     │   │
│                         │     │  │ └──────────────────┘     │   │
└──────────────────────────┘     │ ┌──────────────────┐     │   │
                                 │ │ ChromaDB RAG     │     │   │
                                 │ │ Motor Vehicles   │     │   │
                                 │ │ Act + Medical +  │     │   │
                                 │ │ Accident data    │     │   │
                                 │ └──────────────────┘     │   │
                                 └──────────────────────────────┘
```

---

## 3. Key Metrics

| Dimension | Value |
|-----------|-------|
| Total Components | 44+ React components |
| API Routes | 35+ REST endpoints + 1 WebSocket + SSE |
| Database Tables | 7 tables with PostGIS |
| Alembic Migrations | 10 versions (001 to 10008) |
| LLM Providers | 9 real + 1 deterministic fallback |
| Agent Tools | 13 tools |
| Test Count | 244/244 chatbot, 32+ backend test files, 12 frontend component tests |
| CI/CD Workflows | 16 workflows |
| PWA Icons | 8 sizes |
| Supported Languages | 11 Indian languages |
| Offline Tiers | 3-tier per subsystem (AI, Challan, SOS) |

---

## 4. Critical Production Systems

### SOS/Emergency Flow
Multi-layered: GlobalSOS button → double-tap verification → WhatsApp/SMS share → backend SOS POST → nearby service fetch → family tracking start. Offline: IndexedDB queue → auto-flush on reconnect. Crash detection: accelerometer threshold (15G) → 20s countdown → auto-dispatch.

### Chatbot Safety System
7 layers of defense: SafetyChecker (60+ harm patterns, jailbreak detection, l33t, space obfuscation) → prompt injection check → RAG trust boundary → token budget → provider-level check → Groq guard → HTML sanitization.

### LLM Provider Fallback
9 providers in deterministic chain: Groq → Cerebras → Gemini → GitHub → NVIDIA → OpenRouter → Mistral → Together → Template. Auto-routing: Indian languages → Sarvam, high-stakes legal → Sarvam-105B. Circuit breakers with graduated durations (60s to 24h) per error type.

### Emergency Service Locator
3-tier data source: PostGIS DB (~50k facilities) → Local CSV catalog → Overpass API. Radius stepping: 500m → 1km → 5km → 10km → 25km → 50km. Intent-based expansion until minimum results (3) found.

---

## 5. Major Scaling Risks

| Risk | Impact | Current Mitigation |
|------|--------|-------------------|
| Free tier API rate limits (Groq 30 RPM) | Chatbot degraded under load | 9-provider fallback chain |
| Render free tier 750h/month vs 1488h needed | Services spin down after 15min idle | Cold start recovery |
| Upstash Redis 10K commands/day | Rate limiting failure under load | In-memory fallback |
| Supabase auto-pause after 7 days | Full database outage | Manual resume |
| Single-threaded workers (Render) | No request parallelism | Keep-alive tuning |
| No connection pooling in production | DB connection exhaustion | Pool=1, overflow=1 on Render |

---

## 6. Security-Sensitive Systems

| System | Risk Level | Notes |
|--------|-----------|-------|
| JWT Authentication | CRITICAL | HS256 symmetric, 24h expiry, no revocation |
| LLM Provider Keys | CRITICAL | 11+ API keys in committed .env files |
| Supabase Service Role | CRITICAL | Full DB admin key in git history |
| Auth Token in Offline Queue | HIGH | JWT stored in IndexedDB with GPS PII |
| Role-Based Access Control | HIGH | Role in JWT but never enforced |
| CSRF Protection | MEDIUM | Double-submit cookie, JS-accessible token |
| CSP Configuration | MEDIUM | `default-src 'self'` breaks maps and CDN |
| Data Deletion API | HIGH | No GDPR-style delete/export endpoints |

---

## 7. Operationally Critical Workflows

1. **Emergency SOS Dispatch** — Must work with <500ms latency, offline-capable, redundant
2. **Chatbot LLM Generation** — Must never fail (9-provider chain + Template final fallback)
3. **Health Check Monitoring** — Dependency chain: DB → Redis → Backend → Chatbot → Frontend
4. **Database Migration** — Alembic must run before deployment; no auto-rollback
5. **Offline Data Sync** — SOS queue flush on reconnect, must be atomic per-item

---

## 8. Testing Priorities

1. **Safety Checker** — Highest risk: prompt injection, jailbreak, harm detection
2. **SOS Flow** — End-to-end: button → API → tracking → offline queue → flush
3. **LLM Fallback Chain** — Provider failure → circuit breaker → fallback → Template
4. **Emergency Locator** — 3-tier data source fallback, radius stepping, dedup
5. **Offline Systems** — IndexedDB queue, service worker cache, DuckDB-Wasm

---

## 9. Highest-Risk Areas

1. **Committed Secrets** — `.env` files in git: 25+ API keys, DB passwords, JWT secret
2. **No Role-Based Authorization** — JWT role claim unused, any auth user = full access
3. **Missing Load Test Scripts** — k6 + chaos test files referenced in CI but absent
4. **Prometheus `/metrics` Not Exposed** — Full metrics module defined but no endpoint
5. **Chatbot API Has No Auth** — `/api/v1/chat/` endpoints publicly accessible
6. **No Data Deletion/Export** — GDPR non-compliance, SOS incidents persist forever
7. **Render Free Tier Capacity** — 2 services exceed 750h/month limit

---

## 10. Production-Readiness Gaps

| Domain | Gap | Severity | Fix |
|--------|-----|----------|-----|
| Security | Secrets in git history | CRITICAL | Rotate all keys, purge git history |
| Auth | No RBAC enforcement | HIGH | Implement role-check decorator |
| Auth | No token revocation | MEDIUM | Add refresh token + blacklist |
| Infra | Load test scripts missing | HIGH | Create k6 + chaos test files |
| Observability | No /metrics endpoint | HIGH | Wire up Prometheus module |
| Observability | No monitoring dashboard | MEDIUM | Set up Grafana |
| API | Chatbot endpoints unauthenticated | HIGH | Add Bearer token validation |
| Data | No delete/export APIs | HIGH | Add GDPR endpoints |
| Data | SOS incidents persist forever | MEDIUM | Add retention policy |
| Testing | No cross-service integration tests | HIGH | Add backend→chatbot E2E |
| CSP | `default-src 'self'` too restrictive | MEDIUM | Relax for maps/CDN |
| Deploy | Rollback automation | MEDIUM | Add migration rollback workflow |
