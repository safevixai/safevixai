# Changelog

All notable changes to SafeVixAI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 25/25 features completed (Emergency Locator, Family Live Tracking, Challan Calculator, RoadWatch Reporter, AI Chatbot RAG, 9-provider LLM Fallback Chain, Offline SOS Queue, WebLLM Offline AI, What3Words, Voice/ASR, Indian Language Detection, PWA Share Target, QR Emergency Card, MCP Server, Waze CIFS Feed, Circuit Breakers, Streaming Chat, Conversation Summarization, Multi-Turn Intent Refinement, Safety Checker, GSAP Animations, Speech Language Mapping, Assistant Voice Output, Crash Detection with Accelerometer + CrashCountdown UI, Authentication with JWT + guest auth + service-to-service auth)
- 2,829 unit tests passing (Backend 1,365 + Chatbot 892 + Frontend 572)
- 45/55 E2E tests passing with E2E hardening
- Speech/ASR integration with IndicSeamlessService (Indian language ASR/TTS)
- Crash detection module with accelerometer-based detection
- Family live tracking via WebSocket at `/api/v1/tracking/{group_id}`
- Auth system: JWT Bearer tokens, guest auth (anonymous UUID), service-to-service `X-Internal-Api-Key` header
- MCP server endpoint at `backend/api/v1/mcp_server.py` (24KB, external agent integration)
- Waze CIFS feed for community traffic/hazard data
- Circuit breakers with email alerts when provider failure threshold exceeded
- ALLOWED_HOSTS middleware for Host header validation
- Progressive guest auth (`frontend/lib/guest-auth.ts`)
- SWR data fetching layer with 7 cached hooks
- dvh CSS variables (`--map-h`, `--chat-h`, `--card-min-h`) for iOS Safari viewport
- CSP tightening (no `'unsafe-eval'` in production)
- `__E2E_SKIP_AUTH__` localStorage flag for AuthGuard bypass in E2E tests
- `copy-public.js` script for automated asset copying in standalone build
- 32 new tests across 5 suites (SOS, auth security, guest auth, SWR, crash detection)

### Changed
- ContextAssembler now runs independent tools in parallel (emergency + weather + infra)
- `copy-public.js` now always removes stale dirs and re-copies assets (fixes skip-if-exists bug)
- E2E tests use `<main>` element locator instead of `#main`, `{ exact: true }` for text matching, `[aria-busy="true"]` hydration waits
- SystemStatusBar auto-dismisses when `__E2E_SKIP_AUTH__` is set
- Frontend build: `npm run build` = `next build && node scripts/copy-public.js`
- Stable Mock Token rejection enforced in security middleware

### Fixed
- GSAP opacity timeout in `waitForMount` — removed `window.getComputedStyle(el).opacity` check, added try-catch in `usePageEntry.ts` to prevent GSAP errors from blocking hydration
- CI nested dir `cp` bug — removed manual `cp -r` commands from `e2e.yml` and `frontend.yml` that created nested directories (e.g., `public/public/theme-init.js`)
- Service Worker SOS flush now includes Authorization headers
- Frontend API client now retries on 5xx errors with exponential backoff
- In-memory session store now uses LRU eviction (500 session cap)
- CI no longer skips when tests directory exists

## [1.0.0] - 2026-05-18

### Added
- Initial production-ready release for IIT Madras Road Safety Hackathon 2026
- Multi-stage Docker builds for all services
- Trivy container security scanning in CI
- k6 load tests for backend and chatbot services
- axe-core accessibility tests (WCAG 2a/2aa)
- API contract tests for frontend/backend integration
- Blue-green deployment workflow
- Post-deploy smoke tests
- 5 operational runbooks (DB migration, service restart, API key rotation, ChromaDB rebuild, Redis recovery)
- SLO documentation with error budget tracking
- Incident response plan
- Capacity planning guide
- Cost monitoring guide
- Environment validation checklist
- Tamper-proof audit logging module
- Sentry error tracking across all services
- Content Security Policy headers
- Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- CSRF protection with frontend interceptor
- JWT audience/issuer validation
- EXIF metadata stripping on uploads
- Redis-backed rate limiting
- Admin endpoint HMAC constant-time comparison
- CORS production restriction
- LLM output sanitization
- Structured logging with request ID correlation
- Disaster recovery plan
- CODEOWNERS and PR templates
- gitleaks secret scanning in CI
- Concurrency control in CI workflows
- Isolated Docker networks
- Redis authentication
- PostgreSQL and Redis service containers in CI
- Frontend build step in CI
- Docker build workflow with SARIF upload
- Docker Dependabot ecosystem

### Security
- SafetyChecker with 60+ patterns (jailbreak, NFKC, zero-width, l33t, output safety)
- RAG snippet sanitization and prompt injection detection
- MCP server authentication with rate limiting
- Gemini API key moved to header
- 9-provider LLM fallback chain with auto-routing
- Sarvam AI for Indian language queries

### Changed
- Migrated all frontend animations from Framer Motion to GSAP
- Zustand store uses 28 granular selectors instead of full-store subscriptions
- SOS queue migrated from sessionStorage to IndexedDB with per-item transactions
- Speech synthesis uses selected language code instead of hardcoded en-IN
- Overpass service uses exponential backoff retry

### Fixed
- Voice language mapping for 11 Indian languages
- prefers-reduced-motion support for animations
- IndexedDB SOS queue with per-item transactions
- Speech synthesis language from selected language
- Admin endpoint rate limiting (5/min)
- LRU eviction for session store (500 cap)
- SW SOS auth headers
- Speech model preload on startup
- Frontend API retry with exponential backoff

[Unreleased]: https://github.com/SafeVixAI/SafeVixAI/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/SafeVixAI/SafeVixAI/releases/tag/v1.0.0
