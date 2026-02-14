-- Add moderation_status field to generation_images table
ALTER TABLE "generation_images" ADD COLUMN IF NOT EXISTS "moderation_status" varchar(20) DEFAULT 'normal';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_generation_images_moderation_status" ON "generation_images" ("moderation_status");
--> statement-breakpoint
-- Add moderation_status field to generation_videos table
ALTER TABLE "generation_videos" ADD COLUMN IF NOT EXISTS "moderation_status" varchar(20) DEFAULT 'normal';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_generation_videos_moderation_status" ON "generation_videos" ("moderation_status");
--> statement-breakpoint
-- Add moderation_status field to characters table
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "moderation_status" varchar(20) DEFAULT 'normal';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_characters_moderation_status" ON "characters" ("moderation_status");

-- generation_images: for EXISTS + gen_type filter
  CREATE INDEX IF NOT EXISTS idx_generation_images_generation_uuid_gen_type
  ON public.generation_images (generation_uuid, gen_type);

  -- generation_images: for EXISTS + moderation_status filter
  CREATE INDEX IF NOT EXISTS idx_generation_images_generation_uuid_moderation_status
  ON public.generation_images (generation_uuid, moderation_status);

  -- generation_videos: for EXISTS + gen_type filter
  CREATE INDEX IF NOT EXISTS idx_generation_videos_generation_uuid_gen_type
  ON public.generation_videos (generation_uuid, gen_type);

  -- generation_videos: for EXISTS + moderation_status filter
  CREATE INDEX IF NOT EXISTS idx_generation_videos_generation_uuid_moderation_status
  ON public.generation_videos (generation_uuid, moderation_status);