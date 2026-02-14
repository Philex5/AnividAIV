#!/bin/bash

# AnividAI Database Rebuild Script
# This script rebuilds the entire database according to data-models.md

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== AnividAI Database Rebuild ===${NC}"
echo ""

# Load environment variables (do not `source` .env files because values may contain shell-sensitive characters)
if [ -z "$DATABASE_URL" ]; then
  if command -v node >/dev/null 2>&1; then
    DATABASE_URL="$(
      node -e "const fs=require('fs');const dotenv=require('dotenv');['.env','.env.development','.env.local'].forEach((p)=>{if(fs.existsSync(p)) dotenv.config({path:p,override:true});});process.stdout.write(process.env.DATABASE_URL||'');"
    )"
    export DATABASE_URL
  else
    echo -e "${RED}Error: DATABASE_URL environment variable is not set and Node.js is not available to load .env files${NC}"
    exit 1
  fi
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set${NC}"
    echo "Please check your .env files"
    exit 1
fi

# Extract database connection info from DATABASE_URL
if [[ $DATABASE_URL =~ postgresql://([^:]+):([^@]+)@([^:]+):([^/]+)/(.+) ]]; then
    DB_USER="${BASH_REMATCH[1]}"
    DB_PASSWORD="${BASH_REMATCH[2]}"
    DB_HOST="${BASH_REMATCH[3]}"
    DB_PORT="${BASH_REMATCH[4]}"
    DB_NAME="${BASH_REMATCH[5]}"
else
    echo -e "${RED}Error: Invalid DATABASE_URL format${NC}"
    echo "Expected format: postgresql://user:password@host:port/database"
    exit 1
fi

echo -e "${BLUE}Database:${NC} $DB_NAME"
echo -e "${BLUE}Host:${NC} $DB_HOST:$DB_PORT"
echo -e "${BLUE}User:${NC} $DB_USER"
echo ""

# Confirm before proceeding
echo -e "${YELLOW}⚠️  WARNING: This will COMPLETELY REBUILD the database!${NC}"
echo -e "${YELLOW}   All existing data will be LOST unless you have a backup.${NC}"
echo ""
echo -e "${BLUE}Would you like to create a backup first? (recommended)${NC}"
read -p "Create backup? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Creating backup...${NC}"
    if ! ./scripts/backup-database.sh; then
        echo -e "${RED}Backup failed! Aborting rebuild.${NC}"
        exit 1
    fi
    echo ""
fi

echo -e "${RED}Final confirmation: Are you sure you want to rebuild the database?${NC}"
echo -e "${RED}This action cannot be undone!${NC}"
read -p "Type 'YES' to confirm: " confirm

if [ "$confirm" != "YES" ]; then
    echo -e "${YELLOW}Rebuild cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Starting database rebuild...${NC}"

# Set PGPASSWORD environment variable for psql
export PGPASSWORD="$DB_PASSWORD"

# Check database connection
echo "Testing database connection..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to database!${NC}"
    echo "Please check your DATABASE_URL and ensure the database is running."
    exit 1
fi

echo -e "${GREEN}✅ Database connection successful${NC}"
echo ""

# Execute rebuild SQL script
echo "Executing rebuild SQL script..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/rebuild-database.sql; then
    echo ""
    echo -e "${GREEN}✅ Database rebuild completed successfully!${NC}"
else
    echo ""
    echo -e "${RED}❌ Database rebuild failed!${NC}"
    echo "Check the error messages above for details."
    exit 1
fi

# Clear Drizzle migrations tracking
echo ""
echo "Clearing Drizzle migration tracking..."

# Remove existing migration files (they're no longer valid)
if [ -d "src/db/migrations" ]; then
    echo "Backing up old migrations..."
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    mv "src/db/migrations" "src/db/migrations_backup_$TIMESTAMP"
    mkdir -p "src/db/migrations"
    mkdir -p "src/db/migrations/meta"
fi

# Create initial migration tracking
echo "Creating fresh migration tracking..."
cat > "src/db/migrations/meta/_journal.json" << EOF
{
  "version": "7",
  "dialect": "postgresql",
  "entries": [
    {
      "idx": 0,
      "version": "7",
      "when": $(date +%s)000,
      "tag": "0000_rebuild_database",
      "breakpoints": true
    }
  ]
}
EOF

# Create initial migration file
cat > "src/db/migrations/0000_rebuild_database.sql" << EOF
-- Database rebuilt from scratch according to data-models.md
-- This is a placeholder migration file to track the rebuild
-- Actual table creation was done by scripts/rebuild-database.sql

SELECT 'Database rebuild migration placeholder' as message;
EOF

# Unset password variable for security
unset PGPASSWORD

echo ""
echo -e "${GREEN}=== Rebuild Summary ===${NC}"
echo -e "${GREEN}✅ All tables recreated according to data-models.md${NC}"
echo -e "${GREEN}✅ All indexes and foreign keys applied${NC}"
echo -e "${GREEN}✅ Drizzle migration tracking reset${NC}"
echo -e "${GREEN}✅ Old migrations backed up${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Run: ${YELLOW}pnpm db:generate${NC} to create new migrations if needed"
echo "2. Update your application code to use the new schema"
echo "3. Test your application thoroughly"
echo ""
echo -e "${BLUE}Note:${NC} The database now matches docs/1-specs/data-models.md exactly"
