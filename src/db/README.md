# Database Configuration

This directory contains the database schema and migration files for the AnividAI project.

## Directory Structure

```
src/db/
├── config.ts                     # Drizzle-kit configuration
├── index.ts                      # Database connection (supports Cloudflare Workers and Node.js)
├── standalone.ts                 # Standalone database connection for scripts
├── schema.ts                     # Database table structure definition (CORE FILE)
├── README.md                     # This file
└── migrations/
    ├── 0000_initial_schema.sql   # Initial migration for production deployment
    ├── meta/                     # Drizzle migration journal
    │   └── _journal.json
    └── archive/                  # Historical migrations (reference only)
        ├── README.md
        └── old-migrations/
```

## Database Schema

The project uses **Drizzle ORM** with **PostgreSQL** database.

### Tables Overview (23 tables)

#### Core Business Tables
1. **users** - User management
2. **credits** - User credits/tokens system with expiration and refund support
3. **orders** - Payment orders
4. **apikeys** - API key management

#### AI Generation Tables
5. **generations** - AI generation task master table
6. **generation_images** - Generated image records with social stats
7. **generation_videos** - Generated video records with social stats

#### Character System (OC Maker)
8. **characters** - Original character creations (32 columns)
9. **character_generations** - Character generation history
10. **character_chats** - Chat records with characters
11. **chat_sessions** - Chat session management
12. **character_remixs** - Character derivative relationships

#### Social & Interaction
13. **user_interactions** - User interactions (likes, favorites, views)

#### Marketing & Growth
14. **affiliates** - Invitation/referral system

#### Content Management
15. **categories** - Content categories
16. **posts** - Blog/article posts
17. **feedbacks** - User feedback

#### Email System
18. **email_templates** - Email templates
19. **email_subscriptions** - User email subscription preferences
20. **email_logs** - Email sending logs
21. **email_campaigns** - Email campaign management
22. **email_campaign_recipients** - Campaign recipient tracking

#### Operations
23. **operation_costs** - Operational cost tracking

## Production Environment Deployment

### Prerequisites

1. PostgreSQL database instance
2. Database connection URL
3. Node.js environment with pnpm

### Step-by-Step Deployment

#### 1. Configure Environment Variables

Create `.env` file with:

```bash
DATABASE_URL="postgresql://user:password@host:port/database"
```

#### 2. Install Dependencies

```bash
pnpm install
```

#### 3. Run Database Migration

```bash
pnpm db:migrate
```

This will apply the `0000_initial_schema.sql` migration, creating all 23 tables.

#### 4. Verify Database Structure

```bash
pnpm db:studio
```

This opens Drizzle Studio in your browser to inspect the database structure.

#### 5. (Optional) Check Database Columns

```bash
tsx scripts/check-db-columns.ts
```

This verifies that the actual database matches the schema definition.

## Development Workflow

### Modify Database Schema

1. Edit `src/db/schema.ts` to add/modify tables or columns
2. Generate a new migration:

```bash
pnpm db:generate
```

3. Review the generated SQL in `migrations/`
4. Apply the migration:

```bash
pnpm db:migrate
```

### Database Management Scripts

Available npm scripts:

- `pnpm db:generate` - Generate migration from schema.ts changes
- `pnpm db:migrate` - Apply pending migrations
- `pnpm db:studio` - Open Drizzle Studio (database GUI)
- `pnpm db:push` - Push schema changes directly (development only)

### Database Backup & Recovery

Backup scripts are available in the `scripts/` directory:

- `scripts/backup-database.sh` - Full database backup
- `scripts/rebuild-database.sh` - Rebuild database from scratch
- `scripts/verify-database.sh` - Verify database structure

## Migration History

### Current Production Migration

- **0000_initial_schema.sql** (27KB, 495 lines)
  - Created: 2025-11-12
  - Contains: All 23 tables with complete schema
  - Use for: New environment deployments

### Historical Migrations (Archived)

Old development migrations (14 files) are preserved in `migrations/archive/old-migrations/` for reference only. These are **NOT** used in production deployments.

See `migrations/archive/README.md` for details.

## Important Notes

### For Production Deployment

- ✅ Use `0000_initial_schema.sql` for fresh deployments
- ✅ Ensure `DATABASE_URL` is correctly configured
- ✅ Run `pnpm db:migrate` to apply migrations
- ✅ Verify with `pnpm db:studio` after deployment

### For Development

- ✅ Modify `schema.ts` first, then generate migrations
- ✅ Never edit migration SQL files manually
- ✅ Always test migrations in development before production
- ✅ Keep `schema.ts` as the single source of truth

### Migration Best Practices

1. **Never delete migration files** from the `migrations/` directory
2. **Always generate migrations** when schema changes
3. **Test migrations** in a non-production environment first
4. **Backup data** before applying migrations in production
5. **Use transactions** for complex migrations (Drizzle handles this automatically)

## Troubleshooting

### Migration Already Applied

If you see "Migration already applied" error, check `__drizzle_migrations` table in your database. This table tracks which migrations have been executed.

### Schema Mismatch

If the database structure doesn't match `schema.ts`, run:

```bash
tsx scripts/check-db-columns.ts
```

This will identify any discrepancies.

### Connection Issues

Verify your `DATABASE_URL` is correct and the database is accessible:

```bash
tsx -e "import {getDb} from './src/db'; getDb().select().from((await import('./src/db/schema')).users).limit(1);"
```

## Related Documentation

- **Data Models**: `docs/1-specs/data-models.md` - Detailed table structure and relationships
- **Schema Definition**: `src/db/schema.ts` - Source code for all table definitions
- **API Documentation**: `docs/2-implementation/api/` - API endpoints using these tables

## Support

For database-related issues:

1. Check this README
2. Review `docs/1-specs/data-models.md`
3. Inspect `schema.ts` for table definitions
4. Check Drizzle ORM documentation: https://orm.drizzle.team/

---

**Last Updated**: 2025-11-12
**Schema Version**: 0000_initial_schema
**Total Tables**: 23
