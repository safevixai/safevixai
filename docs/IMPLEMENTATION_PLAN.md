# SafeVixAI — Master Implementation Plan

> Generated: 2026-05-22 | Based on comprehensive analysis of all 3 services
> Sources: `docs/analysis/*.md` (10 documents)

---

## System Summary

### Architecture
**3 services** — Frontend (Next.js 15 + React 19 PWA, Vercel), Backend (FastAPI + PostGIS, Render), Chatbot (FastAPI + 9 LLM providers, Render). Cost: ₹0 (all free tiers).

### Critical Production Systems
1. **SOS/Emergency** — Multi-layered: button → double-tap → API → nearby services → family tracking → offline queue
2. **Chatbot Safety** — 7-layer defense: SafetyChecker → prompt injection → RAG trust boundary → token budget → provider check → Groq guard → HTML sanitization
3. **LLM Fallback** — 9 providers: Groq→Cerebras→Gemini→GitHub→NVIDIA→OpenRouter→Mistral→Together→Template
4. **Emergency Locator** — 3-tier: PostGIS DB → CSV catalog → Overpass API, radius stepping 500m→50km

### Top Risks
| # | Risk | Severity | Target Phase |
|---|------|----------|-------------|
| 1 | No RBAC enforcement (JWT role ignored) | CRITICAL | Phase 1 |
| 2 | Chatbot API has no auth | HIGH | Phase 1 |
| 3 | Offline SOS queue stores JWT + PII | HIGH | Phase 1 |
| 4 | No `/metrics` endpoint (code exists) | HIGH | Phase 2 |
| 5 | Load/chaos test scripts missing | HIGH | Phase 3 |
| 6 | No cross-service integration tests | HIGH | Phase 3 |
| 7 | SOS incidents persist forever | HIGH | Phase 4 |
| 8 | Render free tier hours exceeded | MEDIUM | Phase 4 |
| 9 | CSP blocks maps/CDN | MEDIUM | Phase 5 |
| 10 | No data deletion/export APIs | HIGH | Phase 6 |

---

## Phase 1 — Security & Auth Hardening (Week 1)
**Goal:** Close all critical/high auth and data security gaps.

### 1.1 Implement RBAC Enforcement
- **Files:** `backend/core/security.py`, `backend/core/rbac.py`, all `api/v1/*.py`
- **What:**
  - Create `require_role(Role)` dependency that checks JWT `role` claim
  - Apply to: `PATCH /roads/report/{id}/verify`, `POST /chat/`, `POST /chat/stream`
  - Apply to: user profile CRUD, live-tracking admin, MCP endpoints
- **Verify:** Test 403 on wrong-role token for each secured endpoint

### 1.2 Add Chatbot API Authentication
- **Files:** `chatbot_service/api/chat.py`, `chatbot_service/api/admin.py`
- **What:**
  - Shared JWT verification (same `JWT_SECRET_KEY`) between backend and chatbot
  - `get_current_user()` dependency in chatbot matching backend pattern
  - Rate limiting as second layer (already 20/min)
- **Verify:** curl without token → 401, with valid token → 200

### 1.3 Secure Offline SOS Queue
- **Files:** `frontend/lib/offline-sos-queue.ts`
- **What:**
  - Remove `authToken` from queue (use short-lived refresh token if needed)
  - Remove `bloodGroup`, `emergencyContacts` from queue (these should stay client-only)
  - Store only: `{ lat, lon, timestamp, userId? }`
- **Verify:** Check IndexedDB contents → no PII

### 1.4 Add JWT Refresh & Revocation
- **Files:** `backend/core/security.py`, `backend/api/v1/auth.py`
- **What:**
  - Short-lived access token (15 min) + long-lived refresh token (7 days)
  - Refresh endpoint: `POST /api/v1/auth/refresh`
  - Token blacklist in Redis for revocation
  - Rotate refresh tokens on use (rotation)
- **Verify:** Refresh → new tokens, old refresh invalid; logout → token blacklisted

### 1.5 Add Rate Limiting to All Endpoints
- **Files:** `backend/api/v1/*.py`
- **What:**
  - Add rate limits to currently unrate-limited endpoints:
    - Geocode: 30/min (already limited)
    - Routing: 20/min
    - User CRUD: 10/min
    - Live-tracking CRUD: 10/min
    - Waze feed: 60/min
    - Offline bundle: 10/min (already limited)
    - Authority/Infra: 20/min

### 1.6 Fix CSP to Allow Maps/CDN
- **Files:** `backend/main.py`, `chatbot_service/main.py`
- **What:**
  ```python
  Content-Security-Policy: >
    default-src 'self';
    script-src 'self' 'unsafe-inline' 'unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https://*.tile.openstreetmap.org https://*.googleapis.com;
    connect-src 'self' https://*.tile.openstreetmap.org wss://*.upstash.io https://*.googleapis.com;
    font-src 'self' data:;
  ```

---

## Phase 2 — Observability & Monitoring (Week 1-2)
**Goal:** No blind spots. All metrics exposed, dashboards ready, alerts wired.

### 2.1 Expose Prometheus `/metrics` Endpoint
- **Files:** `backend/main.py`, `backend/core/metrics.py`
- **What:**
  ```python
  @app.get("/metrics", include_in_schema=False)
  async def metrics():
      return Response(
          content=metrics_response(),
          media_type=metrics_content_type()
      )
  ```
- **Verify:** `curl localhost:8000/metrics` → valid Prometheus format with all 18+ metrics

### 2.2 Add Prometheus Metrics to Chatbot Service
- **Files:** New file `chatbot_service/core/metrics.py`
- **What:**
  - Mirror backend metrics pattern
  - Key counters: `chatbot_request_total` (intent, provider, status), `chatbot_response_time` (histogram), `chatbot_fallback_total` (from_provider, to_provider), `chatbot_safety_block_total`
  - Expose at `/metrics`

### 2.3 Set Up Grafana Dashboard
- **Files:** New directory `monitoring/grafana/`
- **What:**
  - Dashboard JSON with panels for:
    - SOS dispatch rate & latency (p50/p95/p99)
    - Emergency lookup rate & sources
    - Chatbot request rate by intent & provider
    - LLM fallback frequency
    - Provider health & circuit breaker status
    - API error rates (5xx, 4xx)

### 2.4 Add Structured Logging to All Shims
- **Files:** `chatbot_service/main.py` (already has JSON logging enabled)
- **What:**
  - Verify all print/console statements replaced with proper logger calls
  - Add correlation ID to all outbound HTTP requests (backend→chatbot, chatbot→LLM)
  - Add `request_id` propagation in chatbot SSE responses

---

## Phase 3 — Testing & CI/CD Fixes (Week 2)
**Goal:** All CI workflows passing, critical tests exist, no silent failures.

### 3.1 Create Missing Load Test Scripts
- **Files:** `tests/load/backend_api_load.js`, `tests/load/chatbot_api_load.js`, `tests/load/frontend_load.js`
- **What:**
  - k6 scripts that simulate realistic traffic patterns
  - Backend: SOS, emergency nearby, challan calc, chat proxy
  - Chatbot: chat messages, streaming, Indian language queries
  - Frontend: page load, map interaction, SOS trigger

### 3.2 Create Chaos Test Script
- **Files:** `tests/test_chaos.py` (backend) / `chatbot_service/tests/test_chaos.py`
- **What:**
  - Test circuit breaker transitions under failure
  - Test Redis failover to in-memory
  - Test LLM fallback chain with all providers failing
  - Test database connection loss → recovery

### 3.3 Add Cross-Service Integration Tests
- **Files:** `backend/tests/test_integration.py`
- **What:**
  - Chat message → Backend proxy → Chatbot → LLM → response
  - SOS trigger → Backend → EmergencyLocator → DB/CSV/Overpass → response
  - Challan calc → Backend → DB → response
  - Road report → Backend → Geocode → DB → Waze feed

### 3.4 Fix Frontend CI Silent Failures
- **Files:** `.github/workflows/frontend.yml`
- **What:**
  - Remove `|| true` from ESLint and TypeScript checks
  - Fix all existing ESLint/TS errors
  - Make lint and typecheck blocking steps

### 3.5 Add SOS E2E Test
- **Files:** `frontend/e2e/sos-flow.spec.ts` (extend existing)
- **What:**
  - Full flow: SOS button → double-tap → API call → offline queue → sync
  - Crash detection: DeviceMotion → countdown → auto-dispatch
  - Offline queue flush on reconnect

### 3.6 Add Security Integration Tests
- **Files:** `backend/tests/test_security.py` (extend existing)
- **What:**
  - CSRF protection blocks forged requests
  - Rate limiting triggers correctly (429 on excess)
  - JWT wrong audience/issuer → 401
  - CORS blocks disallowed origins
  - Admin endpoints reject wrong secret

---

## Phase 4 — Infrastructure Hardening (Week 2-3)
**Goal:** Production-ready infra with proper rollback, backup, and capacity.

### 4.1 Add SOS Data Retention Policy
- **Files:** New migration `backend/migrations/versions/10009_sos_retention.py`
- **What:**
  - Auto-delete SOS incidents older than 90 days
  - Background job (periodic via AP scheduler or cron)
  - Configurable via env var `SOS_RETENTION_DAYS`

### 4.2 Versioned Docker Images
- **Files:** `.github/workflows/docker-build.yml`
- **What:**
  - Tag images with `:latest`, `:{sha7}`, `:{date}-{sha7}`
  - Keep last 10 versions in GHCR
  - Document rollback procedure in runbooks

### 4.3 Add Database Migration Tests
- **Files:** `backend/tests/test_migrations.py`
- **What:**
  - Apply all Alembic migrations to fresh test DB
  - Verify table counts, column types, indexes, geometries
  - Test upgrade + downgrade roundtrip

### 4.4 Add Referrer-Policy & Permissions-Policy Headers
- **Files:** `backend/main.py`, `chatbot_service/main.py`
- **What:**
  ```python
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(self), camera=(self), microphone=(self)
  ```

### 4.5 Implement Data Deletion API
- **Files:** `backend/api/v1/user.py`, `backend/services/profile_service.py` (new)
- **What:**
  - `DELETE /api/v1/users/{id}` — cascade delete: profile, SOS incidents, tracking sessions
  - `GET /api/v1/users/{id}/export` — JSON export of all user data
  - Ownership scoping (only own data)

---

## Phase 5 — Performance Optimization (Week 3)
**Goal:** Optimize critical paths: SOS <500ms, chatbot first token <2s.

### 5.1 True SSE Streaming from LLM Providers
- **Files:** `chatbot_service/providers/*.py`
- **What:**
  - For providers that support streaming (Groq, Gemini, together, etc.): stream tokens directly
  - Replace current word-split simulation with actual token-by-token SSE
  - Backend proxies SSE chunks transparently

### 5.2 Increase DB Connection Pool
- **Files:** `render.yaml` (override `DB_POOL_SIZE` and `DB_MAX_OVERFLOW`)
- **What:**
  - Change from `pool=1, overflow=1` to `pool=5, overflow=10`
  - Monitor connection usage on Render dashboard

### 5.3 Preconnect to Map Tile CDNs
- **Files:** `frontend/app/layout.tsx`
- **What:**
  ```html
  <link rel="preconnect" href="https://*.tile.openstreetmap.org">
  <link rel="preconnect" href="https://api.maptiler.com">
  <link rel="dns-prefetch" href="https://*.tile.openstreetmap.org">
  ```

### 5.4 Purge Unused CSS
- **Files:** `frontend/tailwind.config.js`
- **What:**
  - Enable `purge` paths (should already work with Tailwind 3 JIT)
  - Audit `globals.css` — remove unused custom properties and utility classes

---

## Phase 6 — Production-Readiness Polish (Week 3-4)
**Goal:** Enterprise quality: docs, runbooks, accessibility, edge cases.

### 6.1 Create Incident Response Runbooks
- **Files:** `docs/runbooks/` directory
- **What:**
  - `docs/runbooks/backend-down.md`
  - `docs/runbooks/chatbot-down.md`
  - `docs/runbooks/database-down.md`
  - `docs/runbooks/redis-down.md`

### 6.2 Add PWA-Specific E2E Tests
- **What:**
  - Manifest validation (icons exist at correct sizes)
  - Service Worker install/activate lifecycle
  - Cache strategy verification (cache-first vs network-first)
  - Background Sync execution

### 6.3 Add Accessibility Thresholds
- **Files:** `frontend/tests/a11y/accessibility.spec.ts`
- **What:**
  - axe-core scans on all 17 routes
  - Maximum violation thresholds (0 critical, 0 serious, <5 moderate)

### 6.4 Add Lighthouse Performance Budget
- **Files:** `frontend/lighthouserc.js` (new)
- **What:**
  - LCP < 2.5s
  - TBT < 200ms
  - CLS < 0.1
  - Performance score > 85

---

## Execution Order & Dependencies

```
Phase 1 (Security) ──────────────────────────────────────────────┐
  ├── 1.1 RBAC ── depends on: nothing                            │
  ├── 1.2 Chatbot auth ── depends on: nothing                    │
  ├── 1.3 Secure offline queue ── depends on: nothing            │
  ├── 1.4 JWT refresh ── depends on: nothing                     │
  ├── 1.5 Rate limits ── depends on: nothing                     │
  └── 1.6 CSP fix ── depends on: nothing                         │
                                                                │
Phase 2 (Observability) ────────────────────────────────────────┤
  ├── 2.1 /metrics endpoint ── depends on: nothing               │
  ├── 2.2 Chatbot metrics ── depends on: nothing                 │
  ├── 2.3 Grafana dashboard ── depends on: 2.1, 2.2              │
  └── 2.4 Structured logging ── depends on: nothing              │
                                                                │
Phase 3 (Testing) ──────────────────────────────────────────────┤
  ├── 3.1 Load test scripts ── depends on: nothing               │
  ├── 3.2 Chaos tests ── depends on: nothing                     │
  ├── 3.3 Cross-service tests ── depends on: nothing             │
  ├── 3.4 Fix frontend CI ── depends on: nothing                 │
  ├── 3.5 SOS E2E ── depends on: nothing                         │
  └── 3.6 Security tests ── depends on: 1.1, 1.2                 │
                                                                │
Phase 4 (Infra) ────────────────────────────────────────────────┤
  ├── 4.1 SOS retention ── depends on: nothing                   │
  ├── 4.2 Versioned Docker ── depends on: nothing                │
  ├── 4.3 Migration tests ── depends on: 3.1? optional           │
  ├── 4.4 Security headers ── depends on: nothing                │
  └── 4.5 Data deletion API ── depends on: 1.1                   │
                                                                │
Phase 5 (Performance) ──────────────────────────────────────────┤
  ├── 5.1 True streaming ── depends on: nothing                  │
  ├── 5.2 DB pool size ── depends on: nothing                    │
  ├── 5.3 Preconnect ── depends on: nothing                      │
  └── 5.4 CSS purge ── depends on: nothing                       │
                                                                │
Phase 6 (Polish) ───────────────────────────────────────────────┤
  ├── 6.1 Runbooks ── depends on: 4.2, 4.5                      │
  ├── 6.2 PWA tests ── depends on: nothing                      │
  ├── 6.3 A11y thresholds ── depends on: nothing                 │
  └── 6.4 Lighthouse budget ── depends on: nothing              │
```

---

## Effort Estimates

| Phase | Tasks | Lines of Code | Estimated Time |
|-------|-------|---------------|---------------|
| Phase 1: Security | 6 tasks | ~400 | 2-3 days |
| Phase 2: Observability | 4 tasks | ~250 | 1-2 days |
| Phase 3: Testing | 6 tasks | ~800 | 3-4 days |
| Phase 4: Infra | 5 tasks | ~300 | 2-3 days |
| Phase 5: Performance | 4 tasks | ~200 | 1-2 days |
| Phase 6: Polish | 4 tasks | ~300 | 2-3 days |
| **Total** | **29 tasks** | **~2,250** | **11-17 days** |

---

## Risk-Adjusted Recommendations

### Do First (Highest ROI)
1. **1.1 RBAC** — Prevents auth bypass, ~2 hours
2. **1.2 Chatbot Auth** — Secures public endpoints, ~1 hour
3. **2.1 `/metrics`** — Unlocks observability, ~30 min
4. **3.1 Load Tests** — Unblocks CI, ~3 hours
5. **1.3 Secure Offline Queue** — Protects user PII, ~1 hour

### Defer
- **5.1 True Streaming** — Complex provider integration, low user impact
- **6.4 Lighthouse Budget** — Nice-to-have, won't block deployment
- **4.2 Versioned Docker** — Needed only for multi-instance rollback
