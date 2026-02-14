ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "signup_country" varchar(10);
--> statement-breakpoint

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "signup_ref" varchar(255);
--> statement-breakpoint

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "signup_utm_source" varchar(255);
