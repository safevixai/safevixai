# AGENTS.md — SafeVixAI

> Compact instruction file for AI coding agents (OpenCode, Copilot, Cursor, etc.).
> Every section answers: "Would an agent likely get this wrong without help?"

---

## Current Agent Brief - 2026-05-23 (8.5/10 Score Achieved)

Treat this section as the operational truth before changing code.

- Frontend build passes with `npm run build` from `frontend/` (63 tests, 0 failures).
- **Backend tests**: `pytest tests/ -q` from `backend/` — 135/135 passing across 17 test classes for `test_emergency_locator.py`. Covers module-level data, init, parsing, radius steps, find nearby (cached/uncached), SOS payload/dispatch, city bundle, DB queries, local catalog, entry-to-item conversion, distance, merge, discover city, healthsites API, and schema validation. Key mocking patterns: `mock.__aenter__ = AsyncMock(return_value=mock)` for `async with httpx.AsyncClient`; `object.__setattr__` for injecting `healthsites_api_key` into Pydantic `Settings`; `AsyncMock(spec=...)` + explicit `db.execute = AsyncMock()` for SQLAlchemy sessions.
- **Audit score 8.5/10 achieved** (up from initial 6.9). See `docs/audit/SCORE_8.5_PLAN.md` for verified item list.
- **22 of 25 planned items already implemented** before the 8.5 sprint. Only 8 small gaps were fixed in ~8h.
- **Security 8.5**: RBAC (`backend/core/rbac.py`), JWT HttpOnly (`security.py:73`), API key rotation (`jwks.py`), CSP report-uri, rate limiting — all done.
- **Scalability 7.5** (sole remaining low score): WebSocket Redis Pub/Sub, org_id on all tables, connection pool (10/20), cache layer — all code done. Read replicas + auto-scaling are infra.
- **Accessibility 8.5**: Keyboard map nav (`tabIndex` + aria-label), ARIA on all markers, skip-to-content link in `AppFrame.tsx:54`, `aria-live` regions in ChatInterface/CrashCountdown/OfflineBanner, `KeyboardShortcutsHelp` overlay (`?` key), focus traps in crash dialog.
- **Tech Debt 8.5**: `ErrorResponse` model + standardized error handler, TS strict mode on, Zustand persist, Alembic rollback on all 15 migrations.
- **Frontend tests pass**: `npm test` → 63/63 passing. Store test fixed to match IndexedDB privacy strategy (userProfile excluded from localStorage intentionally).
- **Verdict**: GO for demo. Production-ready for pilot deployment.
- **Chatbot tests**: 244/244 passing (was 27 failing). Fixes: FakeContextAssembler kwargs, FakeIntentDetector.refine_intent, Sarvam105BProvider.name override, Settings instantiation, HIGH_STAKES_INTENTS alignment, prompt injection patterns, moved misplaced test_alerts.py.
- Chatbot smoke tests currently pass with `python -m pytest tests/ -q` from `chatbot_service/`.
- The app is fully enterprise-polished: legacy Tailwind color tokens, raw images, and unoptimized styles have been purged.
- **Audit completed 2026-05-18**: Frontend 58/100, Backend 54/100, Chatbot 50/100. See `docs/audit/` for full reports.
- Voice input is fully wired: `MediaRecorder` → `POST /speech/translate` (correct endpoint, not `/api/v1/speech/translate`).
- Language mapping complete: `frontend/lib/languages.ts` maps UI codes (`hi`) → backend codes (`hin`) → synthesis codes (`hi-IN`).
- Speech endpoint truth: `POST /speech/translate`, `GET /speech/status`.
- Backend speech is speech-to-text / speech translation only. No backend TTS endpoint.
- Assistant voice output uses browser `speechSynthesis` with `utterance.lang` from `getLanguageByCode(selectedLanguage).synthesisCode`.
- **Phase 3 complete**: circuit breakers, enhanced health checks, streaming chat, conversation summarization, multi-turn intent refinement, smart fallback routing with confidence scores.
- **Security vulns**: 6 moderate npm transitive deps (brace-expansion, postcss in next, ws in socket.io). No critical vulns. Fixing requires breaking version bumps — accepted risk. `.github/dependabot.yml` configured for weekly automated PRs.
- **Gitignore fix**: Root `.gitignore` had `tests/` (matches all levels) which excluded chatbot_service/tests/ and backend/tests/ — changed to `/tests/` (root only). All test files now tracked.
- Keep all safety-critical flows intact: 112, 102, 100, 1033, floating SOS, crash countdown, offline SOS queue, profile QR emergency card, map clustering, and hazard heatmap.

Speech endpoint truth:

```text
POST /speech/translate
GET  /speech/status
POST /api/v1/chat/
POST /api/v1/chat/stream
```

Do not document or call `/api/v1/speech/*` unless the backend router is explicitly changed.

---

## Identity

**SafeVixAI** is a full-stack, AI-powered road safety PWA for the IIT Madras Road Safety Hackathon 2026.
Solves 3 problem statements: Emergency Locator, AI Chatbot (traffic law + first aid), Challan Calculator, and Road Reporter.
Total infra cost: ₹0. All free/open-source.

---

## Architecture (3 Services)

```
┌─────────────────────────────────────────────────────────────┐
│  frontend/         Next.js 15 + React 19 + TypeScript PWA   │
│  Port 3000         MapLibre GL, WebLLM, DuckDB-Wasm         │
│                    Zustand state, Tailwind CSS 3             │
└──────────────┬──────────────────────────┬───────────────────┘
               │ REST/WS (JWT Bearer)      │ REST (JWT Bearer)
┌──────────────▼─────────┐  ┌─────────────▼──────────────────┐
│  backend/              │  │  chatbot_service/              │
│  FastAPI :8000         │  │  FastAPI :8010                  │
│  PostgreSQL + PostGIS  │◄─┤  9-provider LLM fallback      │
│  Redis cache           │  │  ChromaDB RAG vectorstore       │
│  DuckDB (challan SQL)  │  │  13 agent tools                 │
│  Overpass/Nominatim    │  │  Redis conversation memory      │
│  WebSocket /tracking   │  │  Prompt injection defense       │
└────────────────────────┘  └────────────────────────────────┘
```

**Critical:** The backend and chatbot_service are **separate FastAPI apps** with separate `.venv`, `.env`, `requirements.txt`, and `Dockerfile`. Never mix their dependencies.

---

## Quick Start

```bash
# Terminal 1: Backend
cd backend && .venv\Scripts\activate       # Windows
uvicorn main:app --reload --port 8000

# Terminal 2: Chatbot Service
cd chatbot_service && .venv\Scripts\activate
uvicorn main:app --reload --port 8010

# Terminal 3: Frontend
cd frontend && npm run dev                  # → http://localhost:3000
```

Verify: `GET http://localhost:8000/health` and `GET http://localhost:8010/health`

---

## Repository Map

```
SafeVixAI/
├── alert_service.py         📧 Production email alerting (LLM/API/Supabase failures → 3 solutions)
├── backend/                 FastAPI :8000
│   ├── main.py              App factory (create_app → lifespan → services)
│   ├── api/v1/              13 route modules (auth, challan, chat, emergency, geocode, live_tracking, mcp_server, offline, roadwatch, routing, tracking, user, waze_feed)
│   ├── core/                config.py (pydantic-settings), database.py (async SQLAlchemy), redis_client.py, security.py (JWT), limiter.py (slowapi rate limiting)
│   ├── services/            14 service modules (authority_router, challan_service, emergency_locator, exceptions, geocoding_service, llm_service, local_emergency_catalog, osm_contributor, overpass_service, roadwatch_service, routing_service, safe_routing, safe_spaces)
│   ├── models/              SQLAlchemy ORM + Pydantic schemas (schemas.py has ALL request/response types)
│   ├── migrations/          Alembic (001_initial_schema.py — creates 6 tables with PostGIS)
│   ├── scripts/app/         DB seeders (need live Postgres)
│   ├── scripts/data/        Pure Python transforms (no DB)
│   └── data/                violations_seed.csv, state_overrides.csv, chroma_db/, uploads/
│
├── chatbot_service/         FastAPI :8010 — Agentic RAG Chatbot
│   ├── main.py              App factory (create_app → lifespan → ChatEngine)
│   ├── agent/               ChatEngine graph, IntentDetector (9 intent classes), SafetyChecker, ContextAssembler
│   ├── providers/           9 LLM providers + TemplateProvider + ProviderRouter (auto-fallback chain + email alerts)
│   ├── rag/                 LocalVectorStore (ChromaDB), Retriever, document_loader, embeddings
│   ├── tools/               13 agent tools: SOS, Challan, LegalSearch, FirstAid, Weather, OpenMeteo, RoadInfra, RoadIssues, SubmitReport, Geocoding, DrugInfo, What3Words, Emergency
│   ├── memory/              Redis conversation memory with session TTL
│   ├── services/            speech_translation.py (IndicSeamlessService — Indian language ASR/TTS)
│   └── data/                chroma_db/ (pre-built vectorstore — COMMITTED, never delete)
│
├── frontend/                Next.js 15 PWA
│   ├── app/                 17 routes + error.tsx (global error boundary)
│   │                        /, /assistant, /bystander, /challan, /emergency, /emergency-card/[userId], /first-aid, /locator, /login, /profile, /report, /settings, /share-receive, /sos, /track, /tracking
│   ├── components/          44 components across 6 subdirs: AppSidebar, ChatInterface, ClientAppHooks, GlobalSOS, SOSButton, PotholeDetector, EnterpriseClientAppHooks, + chat/, dashboard/, maps/, profile/, report/, ui/
│   ├── lib/                 28+ modules: api.ts, store.ts, public-env.ts, safety-constants.ts, offline-ai.ts, duckdb-challan.ts, geolocation.ts, offline-sos-queue.ts, crash-detection.ts, live-tracking.ts, client-logger.ts, etc.
│   └── public/              manifest.json, theme-init.js, icons/ (8 PWA sizes), offline-data/ (GeoJSON, CSV for DuckDB-Wasm)
│
├── scripts/                 Root-level data pipeline + wiki automation
│   ├── app/                 3 DB seeders (seed_emergency, seed_nhp_hospitals, seed_healthsites)
│   ├── data/                16 standalone fetchers/extractors (Overpass, Kaggle, PDF extraction, restore_data)
│   └── wiki_manager.py      LLM-powered wiki generator (OpenRouter → Mistral → Gemini)
│
├── docs/                    18+ markdown docs + wiki/ (231 auto-generated API docs)
├── docker-compose.yml       5 services: postgres (PostGIS 16), redis 7, backend, chatbot, frontend
└── SETUP.md                 Complete install guide with exact commands
```

---

## Critical Gotchas

### PostGIS
- `ST_MakePoint` takes **longitude FIRST**, latitude second — opposite of `[lat, lon]`
- Always use `::geography` (meters), never `::geometry` (degrees) in `ST_DWithin`
- PostGIS extension must exist before Alembic migrations: `CREATE EXTENSION IF NOT EXISTS postgis;`

### Map Components (Frontend)
- MapLibre GL components using `window` APIs must be loaded with `dynamic(() => import(...), { ssr: false })`
- `maplibre-gl/dist/maplibre-gl.css` is imported globally in `layout.tsx` (line 1)
- Marker icon paths break on Next.js webpack — copy icons to `public/leaflet/` and reference from there

### ChromaDB Vectorstore
- `chatbot_service/data/chroma_db/` is **committed** (Render needs it). Never `.gitignore` it
- `backend/data/chroma_db/` is `.gitignored` (built locally). Rebuild takes ~10 minutes
- Run `python data/build_vectorstore.py` once after downloading PDFs before starting backend

### Offline / PWA
- Service Worker only activates in production: `npm run build && npm start` — not `npm run dev`
- WebLLM Phi-3 model (2.2GB) downloads on-demand only when user clicks "Use Offline AI"
- DuckDB-Wasm is used client-side (`lib/duckdb-challan.ts`) for offline challan calculation

### Safety Rule (Never Remove)
- Any AI response about injuries **must** start with "Call 112 immediately" — check `agent/safety_checker.py`

### Package Manager Conflict
- **Locally:** Uses **npm** — `package-lock.json` is the lockfile
- **CI (`frontend.yml`):** Uses **pnpm 9** with `pnpm-lock.yaml` — if CI breaks, check lockfile sync
- The `pnpm-lock.yaml` is `.gitignored` locally. CI generates its own. This may cause drift.

---

## Environment Variables

### backend/.env
| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | `postgresql+asyncpg://...` — auto-normalized from `postgres://` |
| `REDIS_URL` | No | Falls back to in-memory cache if missing |
| `CHATBOT_SERVICE_URL` | Yes | Default: `http://localhost:8010/api/v1` |
| `OVERPASS_URLS` | No | Comma-separated; falls back to `https://overpass-api.de/api/interpreter` |
| `OPENROUTESERVICE_API_KEY` | No | For routing; free tier available |
| `DATA_GOV_API_KEY` | No | For government data endpoints |
| `ADMIN_SECRET` | Yes | Protects admin-only endpoints; set in Render env vars |

### chatbot_service/.env
| Variable | Required | Notes |
|----------|----------|-------|
| `DEFAULT_LLM_PROVIDER` | Yes | `groq`, `gemini`, `cerebras`, `sarvam`, `template`, etc. |
| `DEFAULT_LLM_MODEL` | Yes | Model ID for the chosen provider |
| `HF_TOKEN` | No | HuggingFace token — used as Sarvam fallback + Shuka/BharatGen/Whisper via HF Inference API. Not needed for core chatbot flow |
| `CHROMA_PERSIST_DIR` | No | Default: `./data/chroma_db` |
| `EMBEDDING_MODEL` | No | Config hint: `LocalHashEmbeddingFunction (zero-dependency)` — runtime uses `LocalHashEmbeddingFunction` |
| `REDIS_URL` | No | Falls back to in-memory store |
| `MAIN_BACKEND_BASE_URL` | Yes | Default: `http://localhost:8000` |
| `OPENWEATHER_API_KEY` | No | For weather tool in agent |
| Provider keys (`GROQ_API_KEY`, `GEMINI_API_KEY`, `CEREBRAS_API_KEY`, etc.) | Varies | Only needed for providers you enable |

### frontend/.env
| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_BACKEND_URL` | Yes | Default: `http://localhost:8000` |
| `NEXT_PUBLIC_CHATBOT_URL` | Yes | Default: `http://localhost:8010` |
| `NEXT_PUBLIC_POSTHOG_KEY` | No | PostHog analytics API key (Phase 5) |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | Default: `https://app.posthog.com` |

---

## Chatbot Agent Architecture

The chatbot is an **agentic RAG system** with this execution flow:

```
User message
  → SafetyChecker.evaluate()          # Block harmful queries
  → IntentDetector.detect()            # Classify into 9 intents: emergency, first_aid, challan, legal, road_weather, safe_route, road_infrastructure, road_issue, general
  → ContextAssembler.assemble()        # Call relevant tools + retrieve RAG chunks
  │   ├── SosTool (sos_tool.py)                # Nearby emergency services via backend API
  │   ├── EmergencyTool (emergency_tool.py)     # Emergency service lookup
  │   ├── ChallanTool (challan_tool.py)         # Fine calculation via backend API
  │   ├── LegalSearchTool (legal_search_tool.py)# ChromaDB vector search (Motor Vehicles Act, MoRTH)
  │   ├── FirstAidTool (first_aid_tool.py)      # Static JSON first-aid protocols
  │   ├── WeatherTool (weather_tool.py)         # OpenWeather API
  │   ├── OpenMeteoTool (open_meteo.py)         # Open-Meteo weather (visibility, precipitation)
  │   ├── RoadInfrastructureTool (road_infra_tool.py) # Road contractor/budget data
  │   ├── RoadIssuesTool (road_issues_tool.py)  # Community-reported road issues
  │   ├── SubmitReportTool (submit_report_tool.py) # Submit road damage reports
  │   ├── GeocodingTool (geocoding.py)          # Photon/BigDataCloud geocoding
  │   ├── DrugInfoTool (drug_info.py)           # Open FDA drug/medical information
  │   └── What3WordsTool (what3words.py)        # What3Words location resolution
  → ProviderRouter.generate()          # LLM call with asyncio.wait_for() timeout + auto-fallback chain
  → ConversationMemoryStore.append()   # Redis session persistence
  → ChatResponse
```

### LLM Provider Routing

**Fallback chain** (9 real providers tried in order when one fails):
```
Groq → Cerebras → Gemini → GitHub Models → NVIDIA NIM → OpenRouter → Mistral → Together → Template (deterministic fallback)
```

**Indian language auto-routing** (separate path, not in the chain):
- Sarvam-30B for general Indian language queries
- Sarvam-105B for legal/challan queries in Indian languages
- If `SARVAM_API_KEY` is set → uses direct Sarvam API; otherwise falls back to `HF_TOKEN` via HuggingFace Inference API

**Auto-routing rules:**
1. Indian language input (Hindi, Tamil, Telugu, etc.) → **Sarvam-30B** (Indic specialist)
2. Legal/challan + Indian language → **Sarvam-105B** (higher accuracy for law)
3. English → Default provider (usually Groq, 300+ tok/s)
4. Rate-limited → Cascade through fallback chain
5. All providers fail → `TemplateProvider` (deterministic, always works)

Language detection is regex-based (Unicode script ranges) — no NLTK needed.

---

## Testing

### Backend
```bash
cd backend && .venv\Scripts\activate
pytest tests/ -v                                          # All tests
pytest tests/test_challan.py -v                           # Single file
pytest tests/test_challan.py::test_drunk_driving_fine -v  # Single test
```
**pytest config:** `asyncio_mode = auto` — async tests run automatically without `@pytest.mark.asyncio`

### Chatbot Service
```bash
cd chatbot_service && .venv\Scripts\activate
pytest tests/ -v
```
**pytest config:** `asyncio_mode = strict` — async tests **require** `@pytest.mark.asyncio` decorator

### Frontend
```bash
cd frontend
npm test              # Jest
npm run lint          # ESLint
npm run build         # TypeScript type-check + production build
```

### Manual API Verification
```bash
curl "http://localhost:8000/health"
curl "http://localhost:8000/api/v1/emergency/nearby?lat=13.0827&lon=80.2707"
curl "http://localhost:8000/api/v1/challan/calculate?violation_code=MVA_185"
curl "http://localhost:8010/health"
```

---

## Data Pipeline (scripts/ split)

All script folders follow the same `app/` vs `data/` convention:

| Location | `app/` (needs DB) | `data/` (standalone) |
|----------|-------------------|---------------------|
| `scripts/` | 3 seeders | 16 fetchers/extractors |
| `backend/scripts/` | 11 DB/Redis loaders | 5 data transforms |
| `chatbot_service/scripts/` | 1 DB wrapper | 6 Pro Overpass fetchers |

**Rule:** `data/` scripts always run without a database. `app/` scripts require a live backend stack.

---

## Deployment

| Service | Platform | Notes |
|---------|----------|-------|
| Frontend | Vercel | Auto-deploys from `main`; `next.config.js` handles WASM |
| Backend | Render.com | `render.yaml` at root; needs `DATABASE_URL` env var |
| Chatbot | Render.com | Separate service; `chatbot_service/render.yaml` |
| Database | Supabase | PostgreSQL 16 + PostGIS. Enable extension manually |
| Redis | Upstash | Serverless Redis; set `REDIS_URL` in both services |

---

## Docker (Local Full Stack)

```bash
docker compose up --build    # Starts all 5 services
# postgres:5432  redis:6379  backend:8000  chatbot:8010  frontend:3000
```

DB in docker-compose uses `postgis/postgis:16-3.4`. Redis is `redis:7-alpine`.
Backend connects to chatbot at `http://chatbot:8010` (Docker network name).

---

## Frontend Specifics

- **Framework:** Next.js 15, React 19, TypeScript 5, App Router
- **Styling:** Tailwind CSS 3 with dark navy theme — see `tailwind.config.js`
- **State:** Zustand (`lib/store.ts`) — GPS, services, AI mode
- **Maps:** MapLibre GL (`components/maps/`) — NOT Leaflet (legacy references exist in docs)
- **Icons:** `lucide-react`
- **Animations:** `gsap` + `@gsap/react` (Framer Motion source removed, orphaned dep in package-lock.json)
- **Offline AI:** `@mlc-ai/web-llm` (Phi-3 Mini) + `@huggingface/transformers` (YOLO)
- **Offline SQL:** `@duckdb/duckdb-wasm` for challan calculations
- **shadcn/ui:** Configured via `components.json` — components in `components/ui/`
- **Fonts:** Inter + Space Grotesk + JetBrains Mono (loaded in `layout.tsx` via Google Fonts)

### Webpack Quirk
`next.config.js` enables `asyncWebAssembly` and `layers` experiments for WASM modules (Transformers.js, DuckDB-Wasm). The `worker-loader` rule handles `@xenova/transformers` web workers.

### Package Manager
Uses **npm** locally (`package-lock.json` is the lockfile). CI uses **pnpm 9** — see "Package Manager Conflict" gotcha above.

---

## Backend Specifics

- **Framework:** FastAPI with `create_app()` factory + async lifespan
- **ORM:** SQLAlchemy (async) + GeoAlchemy2 for PostGIS
- **Config:** `pydantic-settings` reads from `.env` (case-insensitive)
- **Migrations:** Alembic — `alembic upgrade head` from `backend/`
- **Cache:** Redis with `hiredis` adapter; graceful fallback if Redis unavailable
- **Services** are injected via `app.state` in the lifespan — not dependency injection
- **All Pydantic schemas** live in `models/schemas.py` — a single file, not scattered

### DuckDB is Used Twice
- **Server-side:** `duckdb` Python in `services/challan_service.py` (online calculator)
- **Browser-side:** `@duckdb/duckdb-wasm` npm in `lib/duckdb-challan.ts` (offline calculator)

Both use the same `violations_seed.csv` and `state_overrides.csv` source data.

---

## Chatbot Service Specifics

- **Separate Python app** — its own `.venv`, `.env`, `requirements.txt`
- **Heavy dependencies:** `torch`, `torchaudio`, `transformers`, `datasets` (for speech)
- **Config:** Vanilla `dataclass` + `os.getenv()` in `config.py` — NOT pydantic-settings (despite `pydantic-settings` being in requirements.txt, it's unused here)
- **Embedding model:** Hash-based 384-dim vectors (LocalHashEmbeddingFunction) with ChromaDB cosine similarity; config references `LocalHashEmbeddingFunction` for future upgrade
- **ChromaDB path:** `chatbot_service/data/chroma_db/` — this is committed (Render needs it)
- **Port:** 8010 (not 8001 as some docs may say — trust `config.py`)
- **Email Alerts:** When all 9 LLM providers fail, `alert_service.py` (project root) sends email with 3 diagnostic solutions. Configured via `ALERT_EMAIL` + `ALERT_EMAIL_PASSWORD` env vars. 5-min cooldown prevents inbox flooding.

---

## CI Workflows (`.github/workflows/`)

| Workflow | Trigger | Runner | Key Steps |
|----------|---------|--------|-----------|
| `backend.yml` | `backend/**` changes | ubuntu-latest, Python 3.11 | `pip install` → `pytest tests/ -v` |
| `chatbot.yml` | `chatbot_service/**` changes | ubuntu-latest, Python 3.11 | `pip install` → `pytest tests/ -v` |
| `frontend.yml` | `frontend/**` changes | ubuntu-latest, Node 20 | **pnpm 9** → `pnpm run lint` → `npx tsc --noEmit` |
| `e2e.yml` | Full stack E2E | ubuntu-latest | Integration tests |
| `security.yml` | Security scanning | ubuntu-latest | Dependency audits |
| `system.yml` | System-level checks | ubuntu-latest | Cross-service validation |
| `sync-wiki.yml` | `backend/**`, `chatbot_service/**` etc. | ubuntu-latest, Python 3.11 | LLM wiki generation (OpenRouter → Mistral → Gemini) |
| `update-master-doc.yml` | `docs/**`, root `.md` changes (on push) | ubuntu-latest, Python 3.11 | Auto-generate DOCX master document |

---

## Key Design Decisions

| Decision | Why |
|----------|-----|
| Two separate FastAPI services | Chatbot has heavy ML deps (torch ~2GB); backend stays lightweight |
| 9-provider LLM fallback | Zero downtime — if one API rate-limits, next takes over |
| Sarvam AI for Indian languages | Trained on 4 trillion Indic tokens; best Hindi/Tamil legal accuracy |
| DuckDB for challans (not LLM) | Deterministic SQL; LLMs hallucinate fine amounts |
| ChromaDB committed to git | Render cold-starts need pre-built vectorstore; rebuild takes 10 min |
| PostGIS over MongoDB | `ST_DWithin` with GIST index < 50ms; Mongo much slower for radius |
| MapLibre GL over Google Maps | Google Maps costs ₹; MapLibre is free and open source |
| Zustand over Redux | 90% less boilerplate; sufficient for this app's state |
| IndexedDB for user profile | Blood group never leaves device — privacy by architecture |

---

## Documentation Reading Order

1. **`AGENTS.md`** — You are here (agent quick-reference)
2. **`docs/Agent.md`** — Full app overview for humans
3. **`docs/Architecture.md`** — System diagrams and data flows
4. **`docs/API.md`** — All endpoints with request/response examples
5. **`docs/Database.md`** — All 7 tables with PostGIS column definitions
6. **`docs/AI_Instructions.md`** — How each AI layer works
7. **`SETUP.md`** — Step-by-step local setup with exact commands
8. **`docs/Deployment.md`** — Deploy to Vercel/Render/Supabase

---

## Common Mistakes

| Wrong | Right |
|-------|-------|
| `ST_MakePoint(lat, lon)` | `ST_MakePoint(lon, lat)` — longitude first |
| `::geometry` in `ST_DWithin` | `::geography` — gives meters not degrees |
| Import MapLibre with SSR enabled | Use `dynamic({ssr:false})` for map components |
| Delete `chatbot_service/data/chroma_db/` | Never delete — committed for Render deployment |
| Test PWA offline with `npm run dev` | Use `npm run build && npm start` for Service Worker |
| Mix backend and chatbot `.venv` | They are separate apps with separate virtual environments |
| Call Nominatim without User-Agent | Always set `User-Agent: SafeVixAI/1.0` header |
| Hardcode API keys | All secrets go in `.env` files (gitignored) |
| Skip 112 prompt for injury queries | Safety rule: always prepend "Call 112 immediately" |
| Assume chatbot port is 8001 | Actual port is **8010** (check `config.py`) |
| Write async test in chatbot_service without `@pytest.mark.asyncio` | Chatbot uses `asyncio_mode = strict` (backend uses `auto`) |
| Assume `HF_TOKEN` is needed for core chatbot | Only needed for Sarvam HF fallback, Shuka, BharatGen, Whisper — core flow uses Groq/Gemini/etc. |
| Call `/api/v1/roads/report` without Authorization header | Uses `get_current_user_optional` — JWT optional, anonymous reports accepted |
| Expect family tracking at a REST endpoint | Family tracking is a **WebSocket** at `ws://<host>/api/v1/tracking/{group_id}` |
| Add images to user profile in localStorage | Blood group, emergency contacts never leave device — stored in **IndexedDB** only |
| Assume offline SOS fires immediately | SOS is queued in IndexedDB if offline, auto-flushed on `online` event via `offline-sos-queue.ts` |
| Ignore `/bystander` route | Bystander Mode is a V2 feature — witness reports, GPS capture, first-aid guidance for passersby |
| Miss the MCP server endpoint | `backend/api/v1/mcp_server.py` (24KB) exposes MCP tools for external agent integration |
| Forget Waze feed | `backend/api/v1/waze_feed.py` provides community traffic/hazard data feed |
