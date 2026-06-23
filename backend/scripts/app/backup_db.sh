# SPDX-License-Identifier: MIT
# Copyright (c) 2026 SafeVixAI Team

#!/usr/bin/env bash
set -euo pipefail

# SafeVixAI Database Backup Script
# Usage: ./backend/scripts/app/backup_db.sh
# Requires: pg_dump, BACKUP_DIR env (default: ./backups/)

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/safevixai_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

mkdir -p "${BACKUP_DIR}"

echo "Backing up database to ${BACKUP_FILE}..."

# Read DATABASE_URL from backend/.env if available
if [ -f backend/.env ]; then
    export $(grep -v '^#' backend/.env | xargs)
fi

pg_dump "${DATABASE_URL}" \
    --no-owner \
    --no-acl \
    --compress=9 \
    --file="${BACKUP_FILE}" \
    --format=custom \
    --verbose 2>&1 | tail -5

echo "Backup complete: ${BACKUP_FILE}"
echo "Size: $(du -h "${BACKUP_FILE}" | cut -f1)"

# Prune backups older than RETENTION_DAYS
find "${BACKUP_DIR}" -name "safevixai_*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete
echo "Pruned backups older than ${RETENTION_DAYS} days."
