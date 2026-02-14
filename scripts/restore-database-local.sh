#!/bin/bash

set -euo pipefail

# Local restore script
# - Default backup dir: .backup
# - Default backup file: latest *.backup in backup dir

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
INPUT_FILE="${1:-}"

if [ -n "$INPUT_FILE" ]; then
  BACKUP_FILE="$INPUT_FILE"
else
  if [ ! -d "$BACKUP_DIR" ]; then
    echo "Error: Backup directory not found: $BACKUP_DIR"
    exit 1
  fi

  LATEST_FILE="$(ls -t "$BACKUP_DIR"/*.backup 2>/dev/null | head -n 1 || true)"

  if [ -z "$LATEST_FILE" ]; then
    echo "Error: No .backup files found in $BACKUP_DIR"
    exit 1
  fi

  BACKUP_FILE="$LATEST_FILE"
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

if [ -n "${PG_RESTORE_BIN:-}" ] && [ -x "${PG_RESTORE_BIN}" ]; then
  RESTORE_BIN="$PG_RESTORE_BIN"
elif [ -x "/opt/homebrew/opt/postgresql@15/bin/pg_restore" ]; then
  RESTORE_BIN="/opt/homebrew/opt/postgresql@15/bin/pg_restore"
elif command -v pg_restore >/dev/null 2>&1; then
  RESTORE_BIN="$(command -v pg_restore)"
else
  echo "Error: pg_restore not found. Install PostgreSQL client or set PG_RESTORE_BIN."
  exit 1
fi

echo "=== AnividAI Database Restore (Local) ==="
echo "pg_restore: $RESTORE_BIN"
echo "Input: $BACKUP_FILE"
echo ""

"$RESTORE_BIN" \
  --verbose \
  --clean \
  --if-exists \
  --create \
  --dbname="$DATABASE_URL" \
  "$BACKUP_FILE"

echo ""
echo "Restore completed successfully."

