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
    WHERE constraint_name = 'fk_characters_world_id'
      AND table_name = 'characters'
  ) THEN
    ALTER TABLE "characters"
      ADD CONSTRAINT "fk_characters_world_id"
      FOREIGN KEY ("world_id") REFERENCES "oc_worlds" ("uuid")
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
