# Release Process

## Versioning

This project adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

Given a version number `MAJOR.MINOR.PATCH`:

- **MAJOR** — Breaking API or behavior changes
- **MINOR** — New features, backward-compatible
- **PATCH** — Bug fixes, security patches, backward-compatible

Pre-release versions use suffix: `1.0.0-alpha.1`, `2.0.0-rc.3`

Version source of truth: `VERSION` file at repository root.

## Branching Model

```
main       ── Production-ready releases
  ├── staging   Pre-release validation
  ├── feat/*    Feature branches
  ├── fix/*     Bug-fix branches
  └── chore/*   Tooling, deps, docs
```

## Release Types

| Type | Frequency | Approvers | Artifacts |
|------|-----------|-----------|-----------|
| Patch | As needed | 1 Core Contributor | Docker + GitHub Release |
| Minor | Monthly | 2 Core Contributors | Docker + GitHub Release + SBOM |
| Major | Quarterly | Project Lead + 2 Core Contributors | Docker + GitHub Release + SBOM + Changelog |
| Hotfix | Emergency | 1 Core Contributor | Docker + GitHub Release |

## Release Workflow

1. **Freeze** — All changes for the release are merged to `main`
2. **Changelog** — `CHANGELOG.md` is updated and frozen
3. **Version bump** — `VERSION` file updated, committed, tagged (`vX.Y.Z`)
4. **CI validation** — Release workflow triggered by tag push:
   - Tag matches `VERSION` file
   - All tests pass (unit, E2E, security, load, chaos)
   - Lint + type-check pass
   - SBOM generated (CycloneDX + SPDX)
   - Docker images built, signed, pushed to GHCR
   - SLSA provenance attestation generated
5. **GitHub Release** — Created with auto-generated notes from `CHANGELOG.md`
6. **Post-release** — Release artifacts attached (SBOM, provenance, signed checksums)

## Hotfix Process

1. Branch from `main`: `git checkout -b hotfix/HF-xxx`
2. Fix and test
3. Merge directly to `main` (bypass staging)
4. Tag and release immediately
5. Cherry-pick fix to `staging` if needed

## Rollback Process

### Container Rollback
```bash
# Rollback to previous Docker tag
docker pull ghcr.io/safevixai/backend:vX.Y.Z-1
docker service update --image ghcr.io/safevixai/backend:vX.Y.Z-1 safevixai_backend
```

### Database Rollback
1. Restore from backup: `pg_restore -d safevixai backup/safevixai_YYYYMMDD.sql`
2. Run Alembic downgrade: `alembic downgrade -1`
3. Verify data integrity before re-deploying

## Release Approval

| Role | Responsibility |
|------|---------------|
| Release Manager | Shepherds the release, owns the timeline |
| Core Contributors | Review changelog, approve artifacts |
| Project Lead | Final sign-off on Major releases |
| Security Team | Sign-off on releases with security fixes |

## Verification

Every release MUST verify:

- [ ] `make test` — all tests pass
- [ ] `make lint` — zero errors
- [ ] `make build` — all containers build
- [ ] `make security-scan` — trivy + gitleaks pass
- [ ] SBOM generated and attached
- [ ] Docker images signed with cosign
- [ ] SLSA provenance generated
- [ ] GitHub Release created with notes
- [ ] Smoke tests pass against deployed release
