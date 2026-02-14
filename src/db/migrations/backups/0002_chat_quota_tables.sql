-- Create chat quotas table
CREATE TABLE IF NOT EXISTS "chat_quotas" (
	"user_uuid" varchar(255) PRIMARY KEY NOT NULL,
	"membership_level" varchar(50) NOT NULL,
	"monthly_quota" integer NOT NULL,
	"monthly_used" integer DEFAULT 0 NOT NULL,
	"quota_reset_at" timestamp with time zone NOT NULL,
	"total_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_quotas_membership" ON "chat_quotas" USING btree ("membership_level");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_quotas_reset_at" ON "chat_quotas" USING btree ("quota_reset_at");
--> statement-breakpoint

-- Create chat usage logs table
CREATE TABLE IF NOT EXISTS "chat_usage_logs" (
	"uuid" varchar(255) PRIMARY KEY NOT NULL,
	"user_uuid" varchar(255) NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"membership_level" varchar(50) NOT NULL,
	"tokens_used" integer DEFAULT 0,
	"ap_used" integer DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_usage_logs_user_date" ON "chat_usage_logs" USING btree ("user_uuid","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chat_usage_logs_membership" ON "chat_usage_logs" USING btree ("membership_level");
