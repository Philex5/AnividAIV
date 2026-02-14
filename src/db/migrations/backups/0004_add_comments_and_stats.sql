CREATE TABLE IF NOT EXISTS "comments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "comments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" varchar(255) NOT NULL,
	"user_uuid" varchar(255) NOT NULL,
	"art_id" varchar(255) NOT NULL,
	"art_type" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"parent_uuid" varchar(255),
	"reply_to_user_uuid" varchar(255),
	"like_count" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "comments_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comments_art" ON "comments" USING btree ("art_id","art_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comments_user" ON "comments" USING btree ("user_uuid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comments_parent" ON "comments" USING btree ("parent_uuid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comments_created_at" ON "comments" USING btree ("created_at");--> statement-breakpoint

ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "comment_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_images" ADD COLUMN IF NOT EXISTS "comment_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "generation_videos" ADD COLUMN IF NOT EXISTS "comment_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "idx_characters_comment_count" ON "characters" ("comment_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_generation_images_comment_count" ON "generation_images" ("comment_count");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_generation_videos_comment_count" ON "generation_videos" ("comment_count");
