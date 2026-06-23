# Contributing to SafeVixAI

## Quick Start

```bash
git clone https://github.com/safevixai/safevixai.git
cd safevixai

# Option A: Dev Container (recommended)
# Open in VS Code → "Reopen in Container"

# Option B: Manual setup
make setup
```

## Three Terminals (Manual)

```bash
# Terminal 1: Backend
cd backend && uvicorn main:app --reload --port 8000

# Terminal 2: Chatbot
cd chatbot_service && uvicorn main:app --reload --port 8010

# Terminal 3: Frontend
cd frontend && npm run dev
```

### Developer Certificate of Origin

All contributions MUST include a `Signed-off-by` trailer in the commit message to certify acceptance of the [Developer Certificate of Origin](DCO):

```
Signed-off-by: Your Name <your.email@example.com>
```

This certifies that you have the right to submit your contribution under the project's MIT license. See the full DCO text in [`DCO`](DCO).

## Code Standards

### Python (Backend / Chatbot)
- **Formatter:** `ruff format` (line length: 100)
- **Linter:** `ruff check` (pre-commit hook runs this)
- **Types:** Use type hints for all function signatures
- **Async:** Backend uses `asyncio_mode = auto`, chatbot uses `strict`
- **Imports:** `ruff` organizes imports automatically

### TypeScript / React (Frontend)
- **Framework:** Next.js 15 App Router, React 19
- **State:** Zustand (`lib/store.ts`) — read-only selectors with `useShallow`
- **Maps:** MapLibre GL (dynamic import, `ssr: false`)
- **Styling:** Tailwind CSS 3 + shadcn/ui (see `tailwind.config.ts`)
- **Animations:** GSAP via `useGSAP` hook (never Framer Motion)
- **Client components:** `'use client'` directive at top

### All Code
- **No `any` types** — use TypeScript strict mode
- **No console.log** in production — use `lib/client-logger.ts`
- **No hardcoded secrets** — all env vars via `lib/public-env.ts`
- **No inline styles** — use Tailwind classes
- **No nested ternaries** — extract to variables

## Testing

See [`TESTING_POLICY.md`](TESTING_POLICY.md) for the formal testing policy. In summary:

```bash
# Run all tests
make test

# Or individually
cd backend && pytest tests/ -q
cd chatbot_service && pytest tests/ -q
cd frontend && npm test

# E2E
cd frontend && npx playwright test e2e/
```

All PRs must pass:
- [ ] `make test` (all 2800+ tests)
- [ ] `make lint` (0 errors)
- [ ] Frontend type-check: `npx tsc --noEmit`
- [ ] Frontend build: `npm run build`
- [ ] CodeQL analysis (SAST)
- [ ] Dependency review (supply chain check)
- [ ] Security scans (Gitleaks + Trivy)
- [ ] SBOM generation (CycloneDX + SPDX)

## Git Workflow

```bash
main        # Production — protected, CI must pass
├── staging # Pre-production testing
├── feat/*  # Feature branches
├── fix/*   # Bug fixes
└── chore/* # Tooling, deps, docs
```

### Commit Messages

Follow conventional commits:
```
feat: add emergency card share
fix: resolve WebSocket reconnection loop
chore(deps): bump groq-sdk to 0.8.0
docs: update API reference for challan endpoint
perf: lazy-load GSAP (50KB savings)
security: add CSP nonce-based script loading
```

### PR Rules

1. PRs need at least one review from the relevant team (see `CODEOWNERS`)
2. At least 50% of all modifications MUST be reviewed by a person other than the author (Gold tier requirement). See [`docs/CODE_REVIEW_GUIDE.md`](docs/CODE_REVIEW_GUIDE.md).
3. All CI checks must pass
4. Branch must be up-to-date with `main`
5. Squash-merge with descriptive message
6. Delete branch after merge

## Architecture

See:
- `AGENTS.md` — Agent quick-reference (start here)
- `docs/Agent.md` — Full app overview
- `docs/Architecture.md` — System diagrams
- `docs/API.md` — All endpoints
- `docs/Database.md` — Tables + PostGIS
- `docs/adr/` — Architecture Decision Records

## Project Structure

```
SafeVixAI/
├── backend/           FastAPI :8000
├── chatbot_service/   FastAPI :8010
├── frontend/          Next.js 15 PWA
├── terraform/         AWS infrastructure
├── k8s/               Kubernetes manifests
├── load-testing/      k6 scripts
├── scripts/           Data pipeline + tooling
├── docs/              Documentation
└── .github/           CI/CD + governance
```

## New Contributors

See [`docs/NEW_CONTRIBUTOR_GUIDE.md`](docs/NEW_CONTRIBUTOR_GUIDE.md) for guidance on finding your first task and making changes.

## Code Review

See [`docs/CODE_REVIEW_GUIDE.md`](docs/CODE_REVIEW_GUIDE.md) for the full code review standards and process.

## Reviewing Checklist

- [ ] No security regressions (check CSP, headers, auth)
- [ ] No performance regressions (check bundle, waterfalls)
- [ ] No accessibility regressions (check aria, focus, contrast)
- [ ] No new `any` types
- [ ] Tests added/updated
- [ ] Coverage maintained or improved
- [ ] E2E tests pass (if UI change)
- [ ] Error boundaries in place (if new route)
- [ ] SPDX license header present in new source files
- [ ] DCO Signed-off-by in commit message
