-- Combined migration: 0002 -> 0011 (from individual SQL files)

-- 0002_busy_beast.sql
-- OC Rebuild: worlds + character modules (JSONB)
-- This migration is intentionally additive for backward compatibility.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "oc_worlds" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "uuid" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" varchar(100) NOT NULL,
  "slug" varchar(80) NOT NULL,
  "description" text,
  "visibility" varchar(20) NOT NULL DEFAULT 'public',
  "cover_url" text,

  -- Core setting fields (table-level)
  "species" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "climate" varchar(100),
  "regions" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "tech_magic_system" varchar(100),
  "theme_colors" jsonb,

  -- Complex structure fields (JSONB)
  "factions" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "history_timeline" jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Extension field
  "extra" jsonb,

  -- Preset config support (optional)
  "config_file_path" varchar(255),
  "config" jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- System fields
  "is_active" boolean NOT NULL DEFAULT true,
  "is_preset" boolean NOT NULL DEFAULT false,
  "creator_uuid" varchar(255),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_oc_worlds_slug" ON "oc_worlds" ("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_oc_worlds_uuid" ON "oc_worlds" ("uuid");
CREATE INDEX IF NOT EXISTS "idx_oc_worlds_creator_uuid" ON "oc_worlds" ("creator_uuid");
CREATE INDEX IF NOT EXISTS "idx_oc_worlds_is_preset" ON "oc_worlds" ("is_preset");
CREATE INDEX IF NOT EXISTS "idx_oc_worlds_visibility" ON "oc_worlds" ("visibility");
CREATE INDEX IF NOT EXISTS "idx_worlds_species" ON "oc_worlds" USING GIN ("species");
CREATE INDEX IF NOT EXISTS "idx_worlds_climate" ON "oc_worlds" ("climate");
CREATE INDEX IF NOT EXISTS "idx_worlds_regions" ON "oc_worlds" USING GIN ("regions");
CREATE INDEX IF NOT EXISTS "idx_worlds_tech_magic" ON "oc_worlds" ("tech_magic_system");
CREATE INDEX IF NOT EXISTS "idx_worlds_factions" ON "oc_worlds" USING GIN ("factions");
CREATE INDEX IF NOT EXISTS "idx_worlds_history" ON "oc_worlds" USING GIN ("history_timeline");

ALTER TABLE "characters"
  ADD COLUMN IF NOT EXISTS "modules" jsonb,
  ADD COLUMN IF NOT EXISTS "world_uuid" uuid,
  ADD COLUMN IF NOT EXISTS "tags" jsonb,
  ADD COLUMN IF NOT EXISTS "background_url" text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_characters_world_uuid'
      AND table_name = 'characters'
  ) THEN
    ALTER TABLE "characters"
      ADD CONSTRAINT "fk_characters_world_uuid"
      FOREIGN KEY ("world_uuid") REFERENCES "oc_worlds" ("uuid")
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_characters_modules_gin" ON "characters" USING GIN ("modules");
CREATE INDEX IF NOT EXISTS "idx_characters_tags_gin" ON "characters" USING GIN ("tags");

-- Expression indexes for common module fields (keeps performance stable after migration to JSONB)
CREATE INDEX IF NOT EXISTS "idx_characters_modules_hair_color" ON "characters" ((modules->'appearance'->>'hair_color'));
CREATE INDEX IF NOT EXISTS "idx_characters_modules_eye_color" ON "characters" ((modules->'appearance'->>'eye_color'));
CREATE INDEX IF NOT EXISTS "idx_characters_modules_outfit_style" ON "characters" ((modules->'appearance'->>'outfit_style'));
CREATE INDEX IF NOT EXISTS "idx_characters_modules_art_style" ON "characters" ((modules->'art'->>'fullbody_style'));
CREATE INDEX IF NOT EXISTS "idx_characters_modules_personality_tags" ON "characters" ((modules->'personality'->'personality_tags'));

-- Preset worlds (3+ required)
INSERT INTO "oc_worlds" (
  "name",
  "slug",
  "description",
  "visibility",
  "cover_url",
  "species",
  "climate",
  "regions",
  "tech_magic_system",
  "theme_colors",
  "config",
  "is_preset",
  "is_active"
)
VALUES
  (
    'Generic',
    'generic',
    'A neutral modern setting suitable for most characters.',
    'public',
    NULL,
    '["human","elf","demon","angel"]'::jsonb,
    'temperate_four_seasons',
    '["city","countryside","forest","mountains"]'::jsonb,
    'low_fantasy',
    '{"primary":"#6366f1","secondary":"#111827","accent":"#f9fafb"}'::jsonb,
    '{"theme_color":"#6366f1","color_palette":["#6366f1","#111827","#f9fafb"],"decoration_style":"modern"}'::jsonb,
    true,
    true
  ),
  (
    'Cyberpunk',
    'cyberpunk',
    'Neon-lit dystopia with high-tech and street culture.',
    'public',
    NULL,
    '["human","cyborg","android","mutant"]'::jsonb,
    'urban_tropical',
    '["megacity","badlands","underground","corporate_zone"]'::jsonb,
    'cyberpunk',
    '{"primary":"#22d3ee","secondary":"#0b1020","accent":"#f472b6"}'::jsonb,
    '{"theme_color":"#22d3ee","color_palette":["#22d3ee","#0b1020","#f472b6"],"decoration_style":"neon"}'::jsonb,
    true,
    true
  ),
  (
    'Fantasy',
    'fantasy',
    'Magic, kingdoms, and mythical creatures.',
    'public',
    NULL,
    '["human","elf","drawf","orc","dragon_kin"]'::jsonb,
    'temperate_four_seasons',
    '["forest","mountains","lake","plains"]'::jsonb,
    'high_fantasy',
    '{"primary":"#a78bfa","secondary":"#0f172a","accent":"#fbbf24"}'::jsonb,
    '{"theme_color":"#a78bfa","color_palette":["#a78bfa","#0f172a","#fbbf24"],"decoration_style":"ornate"}'::jsonb,
    true,
    true
  )
ON CONFLICT ("slug") DO NOTHING;

-- 0002_chat_quota_tables.sql
-- Create chat quotas table
CREATE TABLE IF NOT EXISTS "chat_quotas" (
	"user_uuid" varchar(255) PRIMARY KEY NOT NULL,
	"membership_level" varchar(50) NOT NULL,
	"monthly_quota" integer NOT NULL,
	"monthly_used" integer DEFAULT 0 NOT NULL,
	"quota_reset_at" timestamp with time zone NOT NULL,
	"total_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_quotas_membership" ON "chat_quotas" USING btree ("membership_level");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_quotas_reset_at" ON "chat_quotas" USING btree ("quota_reset_at");
--> statement-breakpoint

-- Create chat usage logs table
CREATE TABLE IF NOT EXISTS "chat_usage_logs" (
	"uuid" varchar(255) PRIMARY KEY NOT NULL,
	"user_uuid" varchar(255) NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"membership_level" varchar(50) NOT NULL,
	"tokens_used" integer DEFAULT 0,
	"ap_used" integer DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_usage_logs_user_date" ON "chat_usage_logs" USING btree ("user_uuid","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_usage_logs_membership" ON "chat_usage_logs" USING btree ("membership_level");

-- 0003_feat_oc_rebuild_remaining.sql
-- FEAT-OC-REBUILD: Remaining migrations (manual SQL bundle)
--
-- Purpose:
-- - Backfill `characters.modules` (JSONB) from legacy flat columns
-- - Normalize `characters.tags` to JSON array
-- - Backfill `characters.world_uuid` using best-effort mapping from `theme_id`
-- - Ensure supporting indexes exist
--
-- Notes:
-- - This file is intentionally idempotent and safe to re-run.
-- - Designed for execution in Supabase Dashboard -> SQL Editor.
-- - Keep legacy columns for rollback window (no DROP COLUMN here).

-- =========================
-- 0) Indexes (idempotent)
-- =========================

-- worlds JSONB array indexes
CREATE INDEX IF NOT EXISTS "idx_oc_worlds_species" ON "oc_worlds" USING GIN ("species");
CREATE INDEX IF NOT EXISTS "idx_oc_worlds_regions" ON "oc_worlds" USING GIN ("regions");
CREATE INDEX IF NOT EXISTS "idx_oc_worlds_factions" ON "oc_worlds" USING GIN ("factions");
CREATE INDEX IF NOT EXISTS "idx_oc_worlds_history" ON "oc_worlds" USING GIN ("history_timeline");

-- Characters indexes
CREATE INDEX IF NOT EXISTS "idx_characters_world_uuid" ON "characters" ("world_uuid");
CREATE INDEX IF NOT EXISTS "idx_characters_modules_gin" ON "characters" USING GIN ("modules");
CREATE INDEX IF NOT EXISTS "idx_characters_tags_gin" ON "characters" USING GIN ("tags");

-- Expression indexes for common module fields
CREATE INDEX IF NOT EXISTS "idx_characters_modules_hair_color" ON "characters" ((modules->'appearance'->>'hair_color'));
CREATE INDEX IF NOT EXISTS "idx_characters_modules_eye_color" ON "characters" ((modules->'appearance'->>'eye_color'));
CREATE INDEX IF NOT EXISTS "idx_characters_modules_outfit_style" ON "characters" ((modules->'appearance'->>'outfit_style'));
CREATE INDEX IF NOT EXISTS "idx_characters_modules_art_style" ON "characters" ((modules->'art'->>'fullbody_style'));
CREATE INDEX IF NOT EXISTS "idx_characters_modules_personality_tags" ON "characters" ((modules->'personality'->'personality_tags'));

-- =========================
-- 1) Normalize tags (ensure JSON array)
-- =========================

UPDATE "characters"
SET "tags" = '[]'::jsonb
WHERE "tags" IS NULL
   OR jsonb_typeof("tags") IS DISTINCT FROM 'array';

-- Optional: add a check constraint (NOT VALID to avoid full table scan at creation time).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'characters_tags_is_array_chk'
  ) THEN
    ALTER TABLE "characters"
      ADD CONSTRAINT "characters_tags_is_array_chk"
      CHECK (jsonb_typeof("tags") = 'array') NOT VALID;
  END IF;
END $$;



-- =========================
-- 2) Backfill modules from legacy columns (only when modules is NULL)
-- =========================

UPDATE "characters" c
SET "modules" =
  jsonb_strip_nulls(
    jsonb_build_object(
      'appearance', jsonb_strip_nulls(
        jsonb_build_object(
          'name', c."name",
          'gender', c."gender",
          'age', c."age",
          'species', c."species",
          'role', c."role",
          'body_type', c."body_type",
          'hair_color', c."hair_color",
          'hair_style', c."hair_style",
          'eye_color', c."eye_color",
          'outfit_style', c."outfit_style",
          'accessories', CASE
            WHEN c."accessories" IS NULL THEN NULL
            ELSE to_jsonb(c."accessories")
          END,
          'appearance_features', c."appearance_features"
        )
      ),
      'personality', jsonb_strip_nulls(
        jsonb_build_object(
          'personality_tags', CASE
            WHEN c."personality_tags" IS NULL THEN '[]'::jsonb
            ELSE to_jsonb(c."personality_tags")
          END
        )
      ),
      'background', jsonb_strip_nulls(
        jsonb_build_object(
          'brief_introduction', c."brief_introduction",
          'background_story', c."background_story",
          'background_segments', CASE
            WHEN c."background_segments" IS NULL THEN NULL
            ELSE to_jsonb(c."background_segments")
          END
        )
      ),
      'art', jsonb_strip_nulls(
        jsonb_build_object(
          'fullbody_style', c."art_style"
        )
      )
    )
  ),
  "updated_at" = now()
WHERE c."modules" IS NULL;

-- =========================
-- 4) Validate constraints (optional)
-- =========================

-- Validate tags constraint after normalization (may take time on large tables).
-- ALTER TABLE "characters" VALIDATE CONSTRAINT "characters_tags_is_array_chk";

-- =========================
-- 5) Quick checks (run as standalone queries)
-- =========================
-- SELECT COUNT(*) AS modules_null FROM characters WHERE modules IS NULL;
-- SELECT COUNT(*) AS invalid_world_fk
--   FROM characters c
--  WHERE c.world_uuid IS NOT NULL
--    AND NOT EXISTS (SELECT 1 FROM oc_worlds w WHERE w.id = c.world_uuid);
-- SELECT COUNT(*) AS tags_not_array FROM characters WHERE tags IS NULL OR jsonb_typeof(tags) <> 'array';

-- =========================
-- 6) Destructive cleanup (optional, NOT executed unless explicitly enabled)
-- =========================
--
-- This section drops legacy columns/indexes after you have fully migrated the application code to use:
-- - `characters.modules` for character details
-- - `characters.world_uuid` for grouping (instead of `theme_id`)
--
-- Drop theme-related indexes first (if any)
DROP INDEX IF EXISTS "idx_characters_theme_id";
DROP INDEX IF EXISTS "idx_characters_theme_popular";

-- Drop legacy columns (uncomment what you really want to drop)
-- IMPORTANT: Dropping these columns may break existing code paths. Do it only after confirming production usage.

ALTER TABLE "characters" DROP COLUMN IF EXISTS "theme_id";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "theme_specific_data";

-- Legacy flat columns that are now stored in modules (optional)
ALTER TABLE "characters" DROP COLUMN IF EXISTS "body_type";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "hair_color";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "hair_style";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "eye_color";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "art_style";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "outfit_style";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "accessories";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "appearance_features";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "background_story";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "background_segments";
ALTER TABLE "characters" DROP COLUMN IF EXISTS "extended_attributes";

-- 0004_add_comments_and_stats.sql
CREATE TABLE IF NOT EXISTS "comments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "comments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" varchar(255) NOT NULL,
	"user_uuid" varchar(255) NOT NULL,
	"art_id" varchar(255) NOT NULL,
	"art_type" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"parent_uuid" varchar(255),
	"reply_to_user_uuid" varchar(255),
	"like_count" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "comments_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comments_art" ON "comments" USING btree ("art_id","art_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comments_user" ON "comments" USING btree ("user_uuid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comments_parent" ON "comments" USING btree ("parent_uuid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comments_created_at" ON "comments" USING btree ("created_at");--> statement-breakpoint

ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "comment_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_images" ADD COLUMN IF NOT EXISTS "comment_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_videos" ADD COLUMN IF NOT EXISTS "comment_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_characters_comment_count" ON "characters" ("comment_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_generation_images_comment_count" ON "generation_images" ("comment_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_generation_videos_comment_count" ON "generation_videos" ("comment_count");

-- 0005_add_user_incentives.sql
CREATE TABLE IF NOT EXISTS "user_incentives" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_incentives_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_uuid" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"reward_amount" integer NOT NULL,
	"streak_count" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_incentives_user" ON "user_incentives" USING btree ("user_uuid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_incentives_type_date" ON "user_incentives" USING btree ("type","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_incentives_user_type_date" ON "user_incentives" USING btree ("user_uuid","type","created_at");

-- 0006_add_user_incentives_reward_date.sql
ALTER TABLE "user_incentives"
ADD COLUMN IF NOT EXISTS "reward_date" date;
--> statement-breakpoint

UPDATE "user_incentives"
SET "reward_date" = (COALESCE("created_at", now()) AT TIME ZONE 'UTC')::date
WHERE "reward_date" IS NULL;
--> statement-breakpoint

ALTER TABLE "user_incentives"
ALTER COLUMN "reward_date" SET NOT NULL;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_incentive_daily"
ON "user_incentives" USING btree ("user_uuid","type","reward_date");

-- 0006_unique_generation_image_url.sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uniq_generation_image_url'
  ) THEN
    CREATE UNIQUE INDEX uniq_generation_image_url
      ON generation_images (generation_uuid, image_url);
  END IF;
END $$;

-- 0007_add_user_attribution.sql
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "signup_country" varchar(10);
--> statement-breakpoint

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "signup_ref" varchar(255);
--> statement-breakpoint

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "signup_utm_source" varchar(255);

-- 0008_add_status_fields.sql
ALTER TABLE "characters"
ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'archived';
--> statement-breakpoint

ALTER TABLE "generation_images"
ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'archived';
--> statement-breakpoint

ALTER TABLE "generation_videos"
ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'archived';

-- 0009_worlds_slug_scope.sql
DO $$
BEGIN
  UPDATE "oc_worlds"
  SET "creator_uuid" = 'system'
  WHERE "is_preset" = true
    AND ("creator_uuid" IS NULL OR "creator_uuid" = '');
END $$;

DROP INDEX IF EXISTS "uniq_oc_worlds_slug";

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_oc_worlds_creator_slug"
  ON "oc_worlds" ("creator_uuid", "slug");

-- 0010_add_user_profile_fields.sql
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "display_name" varchar(255),
  ADD COLUMN IF NOT EXISTS "gender" varchar(20),
  ADD COLUMN IF NOT EXISTS "bio" text,
  ADD COLUMN IF NOT EXISTS "background_url" text;

-- 0011_backfill_display_name.sql
UPDATE users
SET display_name = nickname
WHERE (display_name IS NULL OR BTRIM(display_name) = '')
  AND nickname IS NOT NULL
  AND BTRIM(nickname) <> '';


  -- oc_worlds 统计字段（如已存在可跳过）
  ALTER TABLE oc_worlds
    ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS favorite_count integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS comment_count integer NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS share_count integer NOT NULL DEFAULT 0;
