ALTER TABLE "user_incentives"
ADD COLUMN IF NOT EXISTS "reward_date" date;
--> statement-breakpoint

UPDATE "user_incentives"
SET "reward_date" = (COALESCE("created_at", now()) AT TIME ZONE 'UTC')::date
WHERE "reward_date" IS NULL;
--> statement-breakpoint

ALTER TABLE "user_incentives"
ALTER COLUMN "reward_date" SET NOT NULL;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_incentive_daily"
ON "user_incentives" USING btree ("user_uuid","type","reward_date");
