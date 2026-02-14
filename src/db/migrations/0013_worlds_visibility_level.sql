DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'oc_worlds'
      AND column_name = 'visibility'
  ) THEN
    ALTER TABLE "oc_worlds" RENAME COLUMN "visibility" TO "visibility_level";
  END IF;
END $$;
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_oc_worlds_visibility";
--> statement-breakpoint
ALTER TABLE "oc_worlds"
  ALTER COLUMN "visibility_level" SET DEFAULT 'public';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oc_worlds_visibility_level"
  ON "oc_worlds" ("visibility_level");
