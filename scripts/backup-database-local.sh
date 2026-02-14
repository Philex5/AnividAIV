#!/bin/bash

set -euo pipefail

# Local full backup script
# - Default output dir: .backup
# - Default format: custom (.backup)

if [ -z "${DATABASE_URL:-}" ]; then
  if command -v node >/dev/null 2>&1; then
    DATABASE_URL="$({
      node -e "const fs=require('fs');const dotenv=require('dotenv');['.env','.env.development','.env.local'].forEach((p)=>{if(fs.existsSync(p)) dotenv.config({path:p,override:true});});process.stdout.write(process.env.DATABASE_URL||'');"
    })"
    export DATABASE_URL
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL is not set"
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-.backup}"
mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
BACKUP_FILE="${BACKUP_DIR}/anividai_backup_${TIMESTAMP}.backup"

if [ -n "${PG_DUMP_BIN:-}" ] && [ -x "${PG_DUMP_BIN}" ]; then
  DUMP_BIN="$PG_DUMP_BIN"
elif [ -x "/opt/homebrew/opt/postgresql@15/bin/pg_dump" ]; then
  DUMP_BIN="/opt/homebrew/opt/postgresql@15/bin/pg_dump"
elif command -v pg_dump >/dev/null 2>&1; then
  DUMP_BIN="$(command -v pg_dump)"
else
  echo "Error: pg_dump not found. Install PostgreSQL client or set PG_DUMP_BIN."
  exit 1
fi

echo "=== AnividAI Database Backup (Local) ==="
echo "pg_dump: $DUMP_BIN"
echo "Output: $BACKUP_FILE"
echo ""

"$DUMP_BIN" \
  --dbname="$DATABASE_URL" \
  --verbose \
  --clean \
  --if-exists \
  --create \
  --format=custom \
  --file="$BACKUP_FILE"

echo ""
echo "Backup completed successfully."
echo "Backup file: $BACKUP_FILE"
echo "File size: $(du -h "$BACKUP_FILE" | cut -f1)"
echo ""
echo "Restore example:"
echo "pg_restore --clean --if-exists --create --dbname \"\$DATABASE_URL\" \"$BACKUP_FILE\""

