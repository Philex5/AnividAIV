-- Migration: Add genre and tags to oc_worlds
-- Created at: 2026-01-26

ALTER TABLE "oc_worlds" ADD COLUMN IF NOT EXISTS "genre" varchar(50);
ALTER TABLE "oc_worlds" ADD COLUMN IF NOT EXISTS "tags" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "oc_worlds" ADD COLUMN IF NOT EXISTS "allow_join" boolean NOT NULL DEFAULT true;

-- Indices for performance
CREATE INDEX IF NOT EXISTS "idx_oc_worlds_genre" ON "oc_worlds" ("genre");
CREATE INDEX IF NOT EXISTS "idx_oc_worlds_tags" ON "oc_worlds" USING GIN ("tags");
