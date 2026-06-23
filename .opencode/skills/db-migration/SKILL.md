---
name: db-migration
description: Alembic database migration management for the backend service. Create, review, and plan rollback for schema migrations. Use ONLY when working with database schema changes or Alembic.
---

# Database Migration

## Commands

```bash
cd backend
alembic revision --autogenerate -m "description_of_change"   # Create migration
alembic upgrade head                                           # Apply migrations
alembic downgrade -1                                           # Rollback one step
alembic history                                                # View history
```

## Critical Rules

- **PostGIS extension** must exist before migrations: `CREATE EXTENSION IF NOT EXISTS postgis;`
- **ST_MakePoint(lon, lat)** — longitude FIRST, latitude second
- Use `::geography` (meters) not `::geometry` (degrees) in `ST_DWithin`
- All new tables that need PostGIS must use geoalchemy2 types

## Migration Checklist

1. Run `alembic revision --autogenerate` from backend/
2. Review generated migration for correctness
3. Test: `alembic upgrade head && alembic downgrade -1 && alembic upgrade head`
4. Verify no data loss on downgrade

## Rollback Plan (from Runbook)

```bash
alembic downgrade -1                          # Quick rollback
alembic downgrade <revision_id>               # Rollback to specific revision
```

Lock tables during rollback in production. Verify data integrity after.
