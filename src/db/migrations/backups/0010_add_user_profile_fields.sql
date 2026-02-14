ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "display_name" varchar(255),
  ADD COLUMN IF NOT EXISTS "gender" varchar(20),
  ADD COLUMN IF NOT EXISTS "bio" text,
  ADD COLUMN IF NOT EXISTS "background_url" text;
