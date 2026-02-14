#!/bin/bash

# AnividAI Database Verification Script
# This script verifies that the database structure matches data-models.md

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== AnividAI Database Verification ===${NC}"
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

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set${NC}"
    exit 1
fi

echo -e "${BLUE}Checking database tables...${NC}"

# Expected tables according to data-models.md
EXPECTED_TABLES=(
    "users"
    "orders"
    "credits"
    "apikeys"
    "categories"
    "posts"
    "affiliates"
    "feedbacks",
    "generations",
    "generation_images",
    "generation_videos",
    "comments",
    "characters",
    "character_generations",
    "character_chats",
    "chat_sessions",
    "character_remixs",
    "user_interactions",
    "oc_worlds",
    "user_incentives",
    "chat_quotas",
    "chat_usage_logs"
)

# Tables that should NOT exist (deprecated)
DEPRECATED_TABLES=(
    "ai_models"
    "style_presets"
    "parameter_configs"
    "quick_start_presets"
    "gallery_images"
    "character_presets"
    "card_style_templates"
)

export PGPASSWORD=$(echo "$DATABASE_URL" | sed -n 's/.*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Check expected tables exist
echo "✓ Checking for required tables..."
for table in "${EXPECTED_TABLES[@]}"; do
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\d $table" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} $table"
    else
        echo -e "  ${RED}✗${NC} $table (MISSING)"
        exit 1
    fi
done

# Check deprecated tables don't exist
echo ""
echo "✓ Checking deprecated tables are removed..."
for table in "${DEPRECATED_TABLES[@]}"; do
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\d $table" > /dev/null 2>&1; then
        echo -e "  ${RED}✗${NC} $table (SHOULD BE REMOVED)"
        exit 1
    else
        echo -e "  ${GREEN}✓${NC} $table (correctly removed)"
    fi
done

# Check characters table has all required fields
echo ""
echo "✓ Checking characters table structure..."
REQUIRED_CHAR_FIELDS=(
    "modules"
    "tags"
    "world_uuid"
    "comment_count"
)

for field in "${REQUIRED_CHAR_FIELDS[@]}"; do
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\d characters" | grep -q "$field"; then
        echo -e "  ${GREEN}✓${NC} characters.$field"
    else
        echo -e "  ${RED}✗${NC} characters.$field (MISSING)"
        exit 1
    fi
done

unset PGPASSWORD

echo ""
echo -e "${GREEN}=== Database Verification Passed! ===${NC}"
echo -e "${GREEN}✓ All required tables exist${NC}"
echo -e "${GREEN}✓ All deprecated tables removed${NC}"
echo -e "${GREEN}✓ Characters table has all extended fields${NC}"
echo -e "${GREEN}✓ Database structure matches data-models.md${NC}"
echo ""
echo -e "${BLUE}Database is ready for AnividAI!${NC}"
