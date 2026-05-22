# SafeVixAI — Architecture Review

> Generated: 2026-05-22 | Enterprise-grade system audit

---

## 1. Strengths

### Architecture
- **Clean separation**: 3 services (frontend/backend/chatbot) with well-defined boundaries
- **Factory pattern**: `create_app()` in both FastAPI services — testable, mockable
- **Lifespan management**: Proper async startup/shutdown with `@asynccontextmanager`
- **Service injection via `app.state`**: Consistent DI pattern for all services

### Resilience
- **9-provider LLM fallback**: Chain ensures chatbot never fully fails
- **3-tier data sources**: Database → CSV → Overpass for emergency services
- **3-tier offline**: DuckDB-Wasm → CSV parser → Dictionary for challans
- **Circuit breakers**: Per-provider, graduated durations (60s-24h), auto-recovery
- **In-memory fallback**: Redis → in-memory for cache, rate limiting, sessions

### Security
- **HttpOnly auth cookie**: XSS-protected token storage
- **CSRF protection**: Double-submit cookie pattern
- **Rate limiting on critical endpoints**: Login (5/min), SOS (10/min), Report (8/min)
- **Tenant isolation**: `org_id` on all tables, middleware extraction
- **EXIF stripping**: Photo uploads have GPS metadata removed
- **Defense-in-depth**: 7-layer prompt injection protection

### Performance
- **Granular Zustand selectors**: Prevent unnecessary re-renders
- **GPU-composited animations**: GSAP only animates transform/opacity
- **Dynamic imports**: MapLibre, DuckDB-Wasm, WebLLM loaded lazily
- **DuckDB-Wasm for offline**: Client-side SQL avoids server round-trips

### DevOps
- **16 CI/CD workflows**: Coverage from lint → test → security → deploy → docs
- **Health check dependency chain**: Frontend waits for backend+chatbot
- **3 isolated Docker networks**: Prevents lateral movement
- **Non-root containers**: All Dockerfiles use appuser
- **Structured logging**: JSON format in production for log aggregation

---

## 2. Weaknesses

### Architecture
- **Single JWT secret key**: Symmetric HS256, no key rotation, 24h expiry no refresh
- **No role-based enforcement**: JWT has `role` claim but no endpoint checks it
- **No data deletion/export**: GDPR non-compliance, SOS incidents persist forever
- **Chatbot API unauthenticated**: `/api/v1/chat/*` requires no auth on chatbot side
- **Backend login limited**: Single hardcoded operator, no user registration flow

### Monitoring
- **No `/metrics` endpoint**: Full Prometheus module defined but not wired
- **No monitoring dashboards**: Grafana, Datadog, etc. not set up
- **No distributed tracing UI**: OTLP configured but no Jaeger/Tempo URL
- **No uptime monitoring**: No Pingdom/UptimeRobot configured
- **No SLA/SLO definitions**: No availability/latency targets documented

### Testing
- **No cross-service integration tests**: Frontend ↔ Backend ↔ Chatbot not tested
- **Load test scripts missing**: k6 files referenced in CI but absent
- **Chaos test script missing**: `test_chaos.py` referenced but absent
- **Frontend test exclusions**: `useSOS.test.ts` excluded from Jest (Playwright covers)
- **ESLint/TypeScript errors ignored**: `|| true` in frontend CI — silent degradation

### Infra
- **Render free tier oversubscribed**: 2 services × 24h × 30.5d = 1464h needed vs 750h available
- **No IaC**: No Terraform/Pulumi — Docker Compose + render.yaml only
- **No automated DB rollback**: Alembic downgrade exists but unused
- **Docker images tagged `:latest` only**: No versioned tags for rollback
- **No backup verification**: Supabase retention relied upon without testing

### Data
- **Redis session memory bottleneck**: If Redis dies, all conversations lost
- **SOS incidents permanent**: No retention/cleanup policy
- **Location privacy**: SOS + tracking data stored indefinitely
- **CSP too restrictive**: `default-src 'self'` breaks maps, CDN, admin dashboard
- **Error messages may leak**: Provider response bodies included in errors

---

## 3. Technical Debt

| Item | Impact | Effort to Fix | Priority |
|------|--------|---------------|----------|
| `.env` files in git history | CRITICAL security exposure | High (git filter-branch) | IMMEDIATE |
| No RBAC enforcement | HIGH auth bypass | Medium | HIGH |
| No `/metrics` endpoint | HIGH observability gap | Low (5 lines) | HIGH |
| Missing k6/chaos test files | HIGH CI failure | Medium | HIGH |
| Chatbot API unauthenticated | HIGH data exposure | Medium | HIGH |
| CSP too restrictive | MEDIUM broken features | Low (config change) | MEDIUM |
| No data deletion | MEDIUM regulatory risk | Medium | MEDIUM |
| No Grafana dashboard | MEDIUM blind ops | Medium | MEDIUM |
| Error message leak risk | MEDIUM security | Low | MEDIUM |
| Single operator login | MEDIUM scaling limit | High | LOW |
| AI model in chatbot deps | LOW build time | Low | LOW |

---

## 4. Risk Register

| # | Risk | Probability | Impact | Score | Mitigation |
|---|------|------------|--------|-------|-----------|
| R1 | API keys stolen from git | HIGH | CRITICAL | 16 | Rotate all keys, purge git history |
| R2 | Auth bypass via missing RBAC | HIGH | HIGH | 9 | Implement role-check decorator |
| R3 | Render free tier exceeded | HIGH | MEDIUM | 6 | Monitor usage, upgrade if needed |
| R4 | Upstash Redis rate limited | MEDIUM | HIGH | 6 | In-memory fallback active |
| R5 | Groq API rate limited | HIGH | MEDIUM | 6 | 8 more providers in chain |
| R6 | Supabase auto-paused | MEDIUM | CRITICAL | 8 | Manual resume, health check alert |
| R7 | Chatbot DDoS via no auth | MEDIUM | HIGH | 6 | Rate limiting (20/min) |
| R8 | LLM provider API deprecation | LOW | MEDIUM | 3 | Abstract provider interface |
| R9 | Database migration failure | MEDIUM | HIGH | 6 | Alembic rollback exists |
| R10 | SOS data leak via IndexedDB | MEDIUM | MEDIUM | 4 | Encrypt sensitive fields |

---

## 5. Scalability Assessment

### Current Capacity
- **PostgreSQL**: Up to 500MB (Supabase free tier) — sufficient for 50k+ facilities
- **Redis**: 256MB, 10K commands/day — **low** for production traffic
- **Workers**: 1 per service (Render free) — no request parallelism
- **CDN**: Vercel global edge — excellent for static assets
- **Rate limits**: 5-30 req/min per endpoint — prevents overload

### Bottlenecks
1. **Single-threaded FastAPI** on Render — I/O bound, but CPU-bound tasks block
2. **No connection pooling** in production — Render free sets pool=1
3. **Synced LLM calls** — `asyncio.wait_for` blocks on external API
4. **No message queue** — Chatbot calls backend synchronously
5. **ChromaDB persistence** — File-system based, no replication

### Scaling Recommendations
1. **Move to Render Starter ($7/mo × 2)** for persistent services
2. **Add connection pooling** `pool_size=10, overflow=20` (already configured in code, Render overrides to 1)
3. **Make LLM calls truly async** with streaming responses from providers
4. **Add Redis Streams/SQS** for async job processing (report submission, OSM contribution)
5. **Pre-warm ChromaDB** on startup (already done)
