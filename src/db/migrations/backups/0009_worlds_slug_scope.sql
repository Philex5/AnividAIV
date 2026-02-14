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
