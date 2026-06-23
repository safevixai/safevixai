# Changelog

All notable changes to SafeVixAI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Enterprise open source hardening: VERSION file, pyproject.toml for both Python services, git tag v1.0.0
- Community health: GOVERNANCE.md, SUPPORT.md, issue templates (bug, feature, config), FUNDING.yml
- Tooling configs: ruff.toml, .prettierrc, .editorconfig (root), .gitleaks.toml
- SBOM generation pipeline (CycloneDX for all 3 services + Docker Syft)
- Release automation workflow (tag-triggered: test, build, SBOM, GitHub Release)
- Auto version tagging on PR merge (semantic bump based on labels)
- security.txt at `frontend/public/.well-known/security.txt`
- MAINTAINERS.md and ADOPTERS.md
- Version sync script (`scripts/sync-version.mjs`) to keep VERSION, package.json, pyproject.toml in sync

### OpenSSF Best Practices Hardening (2026-06-17)

#### Documentation
- RELEASE.md — Full release process document (versioning, branching, rollback, hotfix flow)
- FUNDING.yml — GitHub Sponsors configuration
- ADR-002-llm-fallback-chain.md — Standalone architecture decision record
- ADR-003-postgis-over-mongo.md — Standalone architecture decision record
- .reuse/dep5 — REUSE compliance license mapping for all file types
- Root pyproject.toml — Centralized project metadata and tooling config

#### Workflows
- codeql.yml — CodeQL SAST analysis (Python + JavaScript/TypeScript) on every push/PR
- dependency-review.yml — Dependency review on all PRs with license + vulnerability checks
- stale.yml — Automated stale issue/PR management (60d stale, 14d close)
- cleanup.yml — Weekly artifact cleanup (removes artifacts older than 7 days)
- scorecard.yml — OpenSSF Scorecard analysis (weekly + on push to main)

#### Bug Fixes
- Fixed release.yml calling backend.yml, frontend.yml, and security.yml as reusable workflows without `on: workflow_call` triggers — added `workflow_call:` to all three called workflows

#### Supply Chain Security
- SBOM generation job added to security.yml (CycloneDX JSON + SPDX JSON via anchore/sbom-action)
- Docker image signing with cosign (keyless signing via GitHub OIDC) added to release.yml
- Signatures verified in CI as part of the release pipeline

#### Governance & Security
- GOVERNANCE.md updated with Security Team role, 2FA requirement for maintainers, Security Advisory process
- MAINTAINERS.md updated with 2FA requirement notice
- SECURITY.md expanded with detailed response SLA, disclosure policy, dependency security, supply chain security, and vulnerability management process

#### Workflow Security
- Added explicit least-privilege permissions to 7 workflows that previously had none set:
  bundle-analysis.yml, e2e.yml, lighthouse.yml, load-test.yml, secrets-rotation.yml, security.yml, zap-scan.yml

#### Testing & Quality
- Fuzz tests integrated into backend CI pipeline (tests/fuzz/ runs as non-blocking step)
- New fuzz test suite: tests/fuzz/test_fuzz_api.py (9 hypothesis-based test cases)
- Backend coverage threshold raised to 95% (--cov-fail-under=95 in backend.yml + pyproject.toml fail_under=95)
- Chatbot coverage threshold raised to 95% (--cov-fail-under=95 in chatbot.yml + pyproject.toml fail_under=95)
- Frontend coverage thresholds raised: lines 53→60, branches 40→45, functions 50→55, statements 52→58
- Frontend Jest coverage threshold added: 60% lines, 55% branches/functions

#### Deployment Gating
- Vercel deployment now gated behind Frontend CI pass via `vercel-deploy.yml`
- Uses `workflow_run` on Frontend CI — deploy only triggers if tests pass
- Auto-deployment disabled in `vercel.json` for all branches (workflow-controlled)
- Production deploy to main + preview deploys on PRs both respect the gate

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
