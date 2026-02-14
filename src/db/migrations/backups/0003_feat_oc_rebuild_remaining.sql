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
-- Safety gate:
-- 1) Run: SELECT set_config('app.oc_rebuild_drop_legacy','true', false);
-- 2) Then run the DO block below.

DO $$
BEGIN
  IF current_setting('app.oc_rebuild_drop_legacy', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Refusing to run destructive cleanup. Set app.oc_rebuild_drop_legacy=true to proceed.';
  END IF;
END $$;

-- Drop theme-related indexes first (if any)
DROP INDEX IF EXISTS "idx_characters_theme_id";
DROP INDEX IF EXISTS "idx_characters_theme_popular";

-- Drop legacy columns (uncomment what you really want to drop)
-- IMPORTANT: Dropping these columns may break existing code paths. Do it only after confirming production usage.
--
-- ALTER TABLE "characters" DROP COLUMN IF EXISTS "theme_id";
-- ALTER TABLE "characters" DROP COLUMN IF EXISTS "theme_specific_data";
--
-- Legacy flat columns that are now stored in modules (optional)
-- ALTER TABLE "characters" DROP COLUMN IF EXISTS "body_type";
-- ALTER TABLE "characters" DROP COLUMN IF EXISTS "hair_color";
-- ALTER TABLE "characters" DROP COLUMN IF EXISTS "hair_style";
-- ALTER TABLE "characters" DROP COLUMN IF EXISTS "eye_color";
-- ALTER TABLE "characters" DROP COLUMN IF EXISTS "art_style";
-- ALTER TABLE "characters" DROP COLUMN IF EXISTS "outfit_style";
-- ALTER TABLE "characters" DROP COLUMN IF EXISTS "accessories";
-- ALTER TABLE "characters" DROP COLUMN IF EXISTS "appearance_features";
-- ALTER TABLE "characters" DROP COLUMN IF EXISTS "background_story";
-- ALTER TABLE "characters" DROP COLUMN IF EXISTS "background_segments";
-- ALTER TABLE "characters" DROP COLUMN IF EXISTS "extended_attributes";

