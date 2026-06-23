# Phase 3: Enterprise Hardening — 95%+ Coverage, Agent Config, OpenCode Maturity

**Target:** Enterprise-grade opencode setup + 95% coverage across all 3 services
**Current:** Minimal `.opencode/` (3 files), backend 85%, chatbot 80%, frontend 53%
**Gap:** 8 enterprise gaps identified in Phase 2 audit
**Est. effort:** 4-6 hours

---

## Part 0: Coverage — 95%+ Across All Services

### 0.1 Backend: 85% → 95%

**Raise `--cov-fail-under` to 95** in both places:

| File | Line | Change |
|------|------|--------|
| `backend/pyproject.toml` | 54 | `fail_under = 85` → `fail_under = 95` |
| `.github/workflows/backend.yml` | 68 | `--cov-fail-under=85` → `--cov-fail-under=95` |

**Gap analysis:** Run coverage locally with PostGIS/Redis to identify uncovered modules.

### 0.2 Chatbot: 80% → 95%

| File | Line | Change |
|------|------|--------|
| `chatbot_service/pyproject.toml` | 51 | `fail_under = 80` → `fail_under = 95` |
| `.github/workflows/chatbot.yml` | 56 | `--cov-fail-under=80` → `--cov-fail-under=95` |

### 0.3 Frontend: 53% → 60% (next step)

| File | Line | Change |
|------|------|--------|
| `frontend/jest.config.js` | 38-41 | Raise thresholds: branches 40→45, functions 50→55, lines 53→60, statements 52→58 |

---

## Part 1: opencode.json — Project Config

**File:** `.opencode/opencode.json`

| Field | Value | Purpose |
|-------|-------|---------|
| `$schema` | `https://opencode.ai/config.json` | Editor validation |
| `instructions` | `["AGENTS.md"]` | Agent reads project conventions |
| `skills.paths` | `[".opencode/skills"]` | Load custom skills |
| `mcp` | Local Playwright MCP | E2E testing inside agent |
| `permission` | Granular bash rules | Safety for infra commands |
| `references` | Docs + wiki paths | Context for agent |

### MCP Servers

| Server | Type | Command |
|--------|------|---------|
| Playwright | local | `npx -y @playwright/mcp` |
| GitHub | local | `gh` CLI via MCP |

### Permissions

| Tool | Rule |
|------|------|
| `bash` | `git *` → allow, `rm *` → deny, `docker *` → ask, `kubectl *` → ask, `*` → ask |
| `edit` | allow |
| `read` | allow |
| `external_directory` | `~/secrets/**` → deny, `*` → allow |

---

## Part 2: .opencode/.gitignore — Enterprise Grade

Add: `.env`, `.env.*`, `__pycache__/`, `*.pyc`, `.DS_Store`, `coverage/`, `.coverage`, `*.log`, `node_modules/`, `.next/`, `.venv/`, `*.egg-info/`, `dist/`, `build/`, `.pytest_cache/`, `*.db`, `*.sqlite3`, `playwright-report/`, `test-results/`

---

## Part 3: Sub-Agents — 3 Specialized Agents

### 3.1 Backend Agent
- Mode: `subagent`
- Focus: FastAPI, PostGIS, Alembic, pytest, SQLAlchemy
- Permission: no edit on frontend/ files

### 3.2 Frontend Agent
- Mode: `subagent`
- Focus: Next.js 15, React 19, TypeScript, Tailwind, MapLibre, Zustand
- Permission: no edit on backend/ files

### 3.3 DevOps Agent
- Mode: `subagent`
- Focus: Docker, K8s, Terraform, CI/CD workflows, Makefile
- Permission: bash allow for infra commands

---

## Part 4: Custom Skills

### 4.1 `coverage-check`
Assess coverage gaps, run pytest --cov, interpret reports, suggest test targets.

### 4.2 `db-migration`
Alembic migration creation, review, rollback planning.

### 4.3 `k8s-debug`
Kubernetes pod logs, describe, port-forward, rollback.

---

## Part 5: Documentation Fixes

| File | Fix |
|------|-----|
| `AGENTS.md` | Coverage claims: backend 85→95%, chatbot 80→95% |
| `CHANGELOG.md` | Line 58-59: fix stale "95%" to actual values |
| `.opencode/plans/phase1-wiki-85.md` | Add `> COMPLETED` banner at top |
| `.opencode/plans/phase2-coverage-97.md` | Add `> COMPLETED` banner at top |

---

## Execution Order

```
Step 1: Create opencode.json (config + MCP + permissions)
Step 2: Create sub-agents (backend, frontend, devops)  
Step 3: Create custom skills (coverage-check, db-migration, k8s-debug)
Step 4: Fix .opencode/.gitignore
Step 5: Raise coverage thresholds (backend 85→95, chatbot 80→95, frontend 53→60)
Step 6: Run tests to verify coverage
Step 7: Fix AGENTS.md + CHANGELOG.md stale claims
Step 8: Archive completed plans with COMPLETED banners
```

---

## Verification Gates

```
Gate 1: All 3 opencode sub-agents load without error
Gate 2: Core config validates against opencode.ai/config.json
Gate 3: Backend tests pass with --cov-fail-under=95
Gate 4: Chatbot tests pass with --cov-fail-under=95
Gate 5: Frontend tests pass with new thresholds
Gate 6: 0 ESLint warnings, 0 type errors
Gate 7: AGENTS.md and CHANGELOG.md accuracy verified
```
