#!/bin/bash

# AnividAI Database Backup Script
# This script backs up the PostgreSQL database before rebuilding

set -e  # Exit on any error

# Load environment variables (do not `source` .env files because values may contain shell-sensitive characters)
if [ -z "$DATABASE_URL" ]; then
  if command -v node >/dev/null 2>&1; then
    DATABASE_URL="$(
      node -e "const fs=require('fs');const dotenv=require('dotenv');['.env','.env.development','.env.local'].forEach((p)=>{if(fs.existsSync(p)) dotenv.config({path:p,override:true});});process.stdout.write(process.env.DATABASE_URL||'');"
    )"
    export DATABASE_URL
  else
    echo "Error: DATABASE_URL environment variable is not set and Node.js is not available to load .env files"
    exit 1
  fi
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    echo "Please check your .env files"
    exit 1
fi

# Create backup directory
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

# Generate timestamp for backup file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/anividai_backup_${TIMESTAMP}.sql"

echo "=== AnividAI Database Backup ==="
echo "Backup file: $BACKUP_FILE"
echo "Database URL: ${DATABASE_URL%/*/*}/***/***"  # Hide sensitive parts
echo ""

# Extract database connection info from DATABASE_URL
# Format: postgresql://user:password@host:port/database
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASSWORD="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo "Error: Invalid DATABASE_URL format"
    echo "Expected format: postgresql://user:password@host:port/database"
    exit 1
fi

echo "Connecting to database: $DB_NAME on $DB_HOST:$DB_PORT"
echo "Starting backup..."

# Set PGPASSWORD environment variable for pg_dump
export PGPASSWORD="$DB_PASSWORD"

# Create backup using pg_dump
pg_dump \
    --host="$DB_HOST" \
    --port="$DB_PORT" \
    --username="$DB_USER" \
    --dbname="$DB_NAME" \
    --verbose \
    --clean \
    --if-exists \
    --create \
    --format=plain \
    --file="$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Backup completed successfully!"
    echo "Backup file: $BACKUP_FILE"
    echo "File size: $(du -h "$BACKUP_FILE" | cut -f1)"
else
    echo ""
    echo "❌ Backup failed!"
    exit 1
fi

# Unset password variable for security
unset PGPASSWORD

echo ""
echo "=== Backup Summary ==="
echo "Backup file: $BACKUP_FILE"
echo "Timestamp: $TIMESTAMP"
echo ""
echo "To restore this backup later, use:"
echo "psql \$DATABASE_URL < $BACKUP_FILE"
