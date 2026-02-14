ALTER TABLE "characters"
ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'archived';
--> statement-breakpoint

ALTER TABLE "generation_images"
ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'archived';
--> statement-breakpoint

ALTER TABLE "generation_videos"
ADD COLUMN IF NOT EXISTS "status" varchar(20) NOT NULL DEFAULT 'archived';
