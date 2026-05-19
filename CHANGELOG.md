# Changelog

All notable changes to SafeVixAI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Parallel tool execution in ContextAssembler using `asyncio.gather`
- Focus trap in crash countdown dialog for WCAG 2.1 AA compliance
- Token counting across all LLM providers with usage tracking
- LLM response caching with Redis backend (TTL 1 hour)
- Circuit breaker alerts via email when provider failure threshold exceeded
- Provider health dashboard UI at `/admin/providers/health`
- Staging environment configuration for Render deployment
- Centralized logging configuration for Grafana Loki
- Public status page template at `/status`

### Changed
- ContextAssembler now runs independent tools in parallel (emergency + weather + infra)
- Crash dialog now traps focus and restores it on dismissal

### Fixed
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
