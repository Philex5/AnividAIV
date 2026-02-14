-- FEAT-OC-REBUILD: characters data migration (flat columns -> modules JSONB)
-- Execute in Supabase Dashboard -> SQL Editor.
-- Safe to re-run: updates only rows where characters.modules IS NULL, and uses IF NOT EXISTS for indexes.

-- =========================
-- 0) Optional: add missing indexes (idempotent)
-- =========================

-- worlds JSONB array indexes (names aligned with docs)
CREATE INDEX IF NOT EXISTS "idx_oc_worlds_species" ON "oc_worlds" USING GIN ("species");
CREATE INDEX IF NOT EXISTS "idx_oc_worlds_regions" ON "oc_worlds" USING GIN ("regions");
CREATE INDEX IF NOT EXISTS "idx_oc_worlds_factions" ON "oc_worlds" USING GIN ("factions");
CREATE INDEX IF NOT EXISTS "idx_oc_worlds_history" ON "oc_worlds" USING GIN ("history_timeline");

-- Characters indexes (names aligned with schema.ts expectations)
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

-- =========================
-- 2) Ensure world_uuid has a default (best-effort mapping from theme_id)
-- =========================

WITH w AS (
  SELECT
    MAX(CASE WHEN slug = 'generic' THEN uuid END) AS generic_uuid,
    MAX(CASE WHEN slug = 'cyberpunk' THEN uuid END) AS cyberpunk_uuid,
    MAX(CASE WHEN slug = 'fantasy' THEN uuid END) AS fantasy_uuid
  FROM "oc_worlds"
)
UPDATE "characters" c
SET "world_uuid" = COALESCE(
  c."world_uuid",
  CASE
    WHEN c."theme_id" IS NULL OR btrim(c."theme_id") = '' THEN (SELECT generic_uuid FROM w)
    WHEN lower(c."theme_id") LIKE '%cyber%' THEN (SELECT cyberpunk_uuid FROM w)
    WHEN lower(c."theme_id") LIKE '%fantasy%' THEN (SELECT fantasy_uuid FROM w)
    ELSE (SELECT generic_uuid FROM w)
  END
)
WHERE c."world_uuid" IS NULL;

-- =========================
-- 3) Fill modules from legacy flat columns (only when modules is NULL)
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
-- 4) Quick checks (run as standalone queries)
-- =========================
-- SELECT COUNT(*) AS modules_null FROM characters WHERE modules IS NULL;
-- SELECT COUNT(*) AS invalid_world_fk
--   FROM characters c
--  WHERE c.world_uuid IS NOT NULL
--    AND NOT EXISTS (SELECT 1 FROM oc_worlds w WHERE w.uuid = c.world_uuid);
-- SELECT COUNT(*) AS tags_not_array FROM characters WHERE tags IS NULL OR jsonb_typeof(tags) <> 'array';
