CREATE TABLE IF NOT EXISTS "user_incentives" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_incentives_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_uuid" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"reward_amount" integer NOT NULL,
	"streak_count" integer DEFAULT 0,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_incentives_user" ON "user_incentives" USING btree ("user_uuid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_incentives_type_date" ON "user_incentives" USING btree ("type","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_incentives_user_type_date" ON "user_incentives" USING btree ("user_uuid","type","created_at");
