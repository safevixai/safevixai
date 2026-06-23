---
name: coverage-check
description: Assess test coverage gaps across backend, chatbot_service, and frontend. Run coverage reports, interpret results, and suggest specific files/modules needing test expansion. Trigger by asking about coverage, test gaps, or CI coverage failures.
---

# Coverage Check

## Backend (pytest --cov)

```bash
cd backend
pytest tests/ -q --cov=. --cov-report=term-missing --cov-fail-under=95
```

Focus on `--cov-report=term-missing` to see uncovered lines.
Use `--cov-branch` for branch coverage.

## Chatbot Service

```bash
cd chatbot_service
pytest tests/ -q --cov=. --cov-report=term-missing --cov-fail-under=95
```

## Frontend (Jest)

```bash
cd frontend
npm test -- --watchAll=false --coverage
```

Check `coverage/` directory for HTML report.
Coverage thresholds in `frontend/jest.config.js` (lines 36-43).

## Coverage Targets

| Service    | Current CI | Target |
|------------|-----------|--------|
| Backend    | 85%       | 95%    |
| Chatbot    | 80%       | 95%    |
| Frontend   | 53%       | 60%+   |

## Common Low-Coverage Areas

- Backend: `services/civic_intel/`, admin routes, core utilities
- Chatbot: error paths, provider fallback edge cases
- Frontend: `components/maps/`, `lib/duckdb-challan.ts`, `lib/offline-ai.ts`
