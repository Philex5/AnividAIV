CREATE TABLE "affiliates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "affiliates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_uuid" varchar(255) NOT NULL,
	"created_at" timestamp with time zone,
	"status" varchar(50) DEFAULT '' NOT NULL,
	"invited_by" varchar(255) NOT NULL,
	"paid_order_no" varchar(255) DEFAULT '' NOT NULL,
	"paid_amount" integer DEFAULT 0 NOT NULL,
	"reward_percent" integer DEFAULT 0 NOT NULL,
	"reward_amount" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apikeys" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "apikeys_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"api_key" varchar(255) NOT NULL,
	"title" varchar(100),
	"user_uuid" varchar(255) NOT NULL,
	"created_at" timestamp with time zone,
	"status" varchar(50),
	CONSTRAINT "apikeys_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(50),
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	CONSTRAINT "categories_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "character_chats" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "character_chats_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"character_uuid" varchar(255) NOT NULL,
	"user_uuid" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"message_type" varchar(20) NOT NULL,
	"message_content" text NOT NULL,
	"uuid" varchar(255),
	"session_id" varchar(255),
	"message_index" integer,
	"role" varchar(20),
	"content" text,
	"metadata" json,
	"is_archived" boolean DEFAULT false,
	"archived_at" timestamp with time zone,
	"archived_to_r2" boolean DEFAULT false,
	"archive_metadata" json
);
--> statement-breakpoint
CREATE TABLE "character_generations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "character_generations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"character_uuid" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"generation_type" varchar(50) NOT NULL,
	"generation_uuid" varchar(255),
	"parameters" json,
	"visibility_level" varchar(20) DEFAULT 'private' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "character_remixs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "character_remixs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"original_character_id" integer NOT NULL,
	"remixed_character_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"remix_type" varchar(50) NOT NULL,
	"changes_description" text
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "characters_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" varchar(255) NOT NULL,
	"user_uuid" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"name" varchar(255) NOT NULL,
	"brief_introduction" text,
	"gender" varchar(20) NOT NULL,
	"age" integer,
	"role" varchar(100),
	"personality_tags" json,
	"extended_attributes" json,
	"background_story" text,
	"background_segments" json,
	"species" varchar(100),
	"body_type" varchar(50),
	"hair_color" varchar(50),
	"hair_style" varchar(100),
	"eye_color" varchar(50),
	"art_style" varchar(100),
	"outfit_style" text,
	"accessories" json,
	"appearance_features" text,
	"remixed_from_uuid" varchar(255),
	"theme_id" varchar(100),
	"theme_specific_data" json,
	"visibility_level" varchar(20) DEFAULT 'public' NOT NULL,
	"allow_remix" boolean DEFAULT true,
	"avatar_generation_image_uuid" varchar(255),
	"profile_generation_image_uuid" varchar(255),
	"card_style_template_id" integer,
	"like_count" integer DEFAULT 0 NOT NULL,
	"favorite_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "characters_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "chat_quotas" (
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
CREATE TABLE "chat_sessions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "chat_sessions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"session_id" varchar(255) NOT NULL,
	"user_uuid" varchar(255) NOT NULL,
	"character_uuid" varchar(255) NOT NULL,
	"title" varchar(255),
	"message_count" integer DEFAULT 0 NOT NULL,
	"last_message_at" timestamp with time zone,
	"context_window_size" integer DEFAULT 20 NOT NULL,
	"total_tokens_used" integer DEFAULT 0 NOT NULL,
	"total_credits_used" integer DEFAULT 0 NOT NULL,
	"archived_message_count" integer DEFAULT 0 NOT NULL,
	"last_archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "chat_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "chat_usage_logs" (
	"uuid" varchar(255) PRIMARY KEY NOT NULL,
	"user_uuid" varchar(255) NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"membership_level" varchar(50) NOT NULL,
	"tokens_used" integer DEFAULT 0,
	"ap_used" integer DEFAULT 1,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "credits" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "credits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"trans_no" varchar(255) NOT NULL,
	"created_at" timestamp with time zone,
	"user_uuid" varchar(255) NOT NULL,
	"trans_type" varchar(50) NOT NULL,
	"credits" integer NOT NULL,
	"order_no" varchar(255),
	"expired_at" timestamp with time zone,
	"actived_at" timestamp with time zone NOT NULL,
	"generation_uuid" varchar(255),
	"is_voided" boolean DEFAULT false,
	"voided_at" timestamp with time zone,
	"voided_reason" varchar(255),
	CONSTRAINT "credits_trans_no_unique" UNIQUE("trans_no")
);
--> statement-breakpoint
CREATE TABLE "email_campaign_recipients" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "email_campaign_recipients_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"campaign_uuid" varchar(255) NOT NULL,
	"user_uuid" varchar(255),
	"email" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"email_log_uuid" varchar(255),
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_campaigns" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "email_campaigns_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"template_uuid" varchar(255),
	"subject" varchar(500) NOT NULL,
	"html_content" text,
	"text_content" text,
	"target_audience" varchar(100),
	"target_emails" json,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "email_campaigns_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "email_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "email_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" varchar(255) NOT NULL,
	"user_uuid" varchar(255),
	"email" varchar(255) NOT NULL,
	"template_uuid" varchar(255),
	"campaign_uuid" varchar(255),
	"subject" varchar(500) NOT NULL,
	"html_content" text,
	"text_content" text,
	"resend_message_id" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"metadata" json,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"opened_at" timestamp with time zone,
	"clicked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "email_logs_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "email_subscriptions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "email_subscriptions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_uuid" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"subscription_type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "email_templates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"html_content" text NOT NULL,
	"text_content" text,
	"variables" json,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "email_templates_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "feedbacks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "feedbacks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone,
	"status" varchar(50),
	"user_uuid" varchar(255),
	"content" text,
	"rating" integer,
	"type" varchar(50) DEFAULT 'general' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generation_images" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "generation_images_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" varchar(255) NOT NULL,
	"generation_uuid" varchar(255) NOT NULL,
	"user_uuid" varchar(255) NOT NULL,
	"image_index" integer NOT NULL,
	"gen_type" varchar(50),
	"style" varchar(50),
	"image_url" varchar(500) NOT NULL,
	"thumbnail_mobile" varchar(500),
	"thumbnail_desktop" varchar(500),
	"thumbnail_detail" varchar(500),
	"generation_params" text,
	"final_prompt" text,
	"original_prompt" text,
	"model_id" varchar(100),
	"reference_image_url" varchar(500),
	"generation_time" integer,
	"visibility_level" varchar(20) DEFAULT 'private' NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"favorite_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	CONSTRAINT "generation_images_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "generation_videos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "generation_videos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" varchar(255) NOT NULL,
	"generation_uuid" varchar(255) NOT NULL,
	"user_uuid" varchar(255) NOT NULL,
	"model_id" varchar(100),
	"quality" varchar(50) NOT NULL,
	"video_url" varchar(500) NOT NULL,
	"poster_url" varchar(500),
	"reference_image_url" varchar(1000),
	"generation_params" text,
	"original_prompt" text,
	"style" varchar(50),
	"gen_type" varchar(50) DEFAULT 'video' NOT NULL,
	"codec" varchar(50),
	"duration_seconds" integer,
	"ratio" varchar(20),
	"resolution" varchar(50),
	"visibility_level" varchar(20) DEFAULT 'private' NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"favorite_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	CONSTRAINT "generation_videos_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "generations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "generations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" varchar(255) NOT NULL,
	"user_uuid" varchar(255) NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"type" varchar(50) DEFAULT 'anime' NOT NULL,
	"sub_type" varchar(100),
	"prompt" text NOT NULL,
	"model_id" varchar(100) NOT NULL,
	"style_preset" varchar(100),
	"reference_image_url" varchar(500),
	"counts" integer DEFAULT 1 NOT NULL,
	"success_count" integer DEFAULT 0,
	"remote_task_id" varchar(255),
	"callback_received" boolean DEFAULT false,
	"last_query_time" timestamp with time zone,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"progress" integer DEFAULT 0,
	"credits_cost" integer DEFAULT 1 NOT NULL,
	"generation_time" integer,
	"error_message" text,
	"error_code" varchar(50),
	"metadata" json,
	"character_uuids" varchar(1000),
	"visibility_level" varchar(20) DEFAULT 'private' NOT NULL,
	"file_transfer_status" varchar(20) DEFAULT 'pending',
	"temp_url_expires_at" timestamp with time zone,
	"transfer_retry_count" integer DEFAULT 0,
	CONSTRAINT "generations_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "operation_costs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "operation_costs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"month" varchar(7) NOT NULL,
	"platform" varchar(50) NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_no" varchar(255) NOT NULL,
	"created_at" timestamp with time zone,
	"user_uuid" varchar(255) DEFAULT '' NOT NULL,
	"user_email" varchar(255) DEFAULT '' NOT NULL,
	"amount" integer NOT NULL,
	"interval" varchar(50),
	"expired_at" timestamp with time zone,
	"status" varchar(50) NOT NULL,
	"stripe_session_id" varchar(255),
	"credits" integer NOT NULL,
	"currency" varchar(50),
	"sub_id" varchar(255),
	"sub_interval_count" integer,
	"sub_cycle_anchor" integer,
	"sub_period_end" integer,
	"sub_period_start" integer,
	"sub_times" integer,
	"product_id" varchar(255),
	"product_name" varchar(255),
	"valid_months" integer,
	"order_detail" text,
	"paid_at" timestamp with time zone,
	"paid_email" varchar(255),
	"paid_detail" text,
	CONSTRAINT "orders_order_no_unique" UNIQUE("order_no")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "posts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" varchar(255) NOT NULL,
	"slug" varchar(255),
	"title" varchar(255),
	"description" text,
	"content" text,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"status" varchar(50),
	"cover_url" varchar(255),
	"author_name" varchar(255),
	"author_avatar_url" varchar(255),
	"locale" varchar(50),
	"category_uuid" varchar(255),
	CONSTRAINT "posts_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE "subscription_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subscription_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subscription_id" varchar(255) NOT NULL,
	"user_uuid" varchar(255) NOT NULL,
	"from_status" varchar(50),
	"to_status" varchar(50) NOT NULL,
	"reason" varchar(255),
	"metadata" json,
	"created_at" timestamp with time zone DEFAULT now(),
	"created_by" varchar(255) DEFAULT 'system'
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subscriptions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_uuid" varchar(255) NOT NULL,
	"subscription_id" varchar(255) NOT NULL,
	"plan_type" varchar(50) NOT NULL,
	"interval" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"credits" integer DEFAULT 0 NOT NULL,
	"sub_times" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "subscriptions_subscription_id_unique" UNIQUE("subscription_id")
);
--> statement-breakpoint
CREATE TABLE "user_interactions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_interactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_uuid" varchar(255) NOT NULL,
	"art_id" varchar(255) NOT NULL,
	"art_type" varchar(20) NOT NULL,
	"interaction_type" varchar(20) NOT NULL,
	"metadata" json,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"uuid" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp with time zone,
	"nickname" varchar(255),
	"avatar_url" varchar(255),
	"locale" varchar(50),
	"signin_type" varchar(50),
	"signin_ip" varchar(255),
	"signin_provider" varchar(50),
	"signin_openid" varchar(255),
	"invite_code" varchar(255) DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone,
	"invited_by" varchar(255) DEFAULT '' NOT NULL,
	"is_affiliate" boolean DEFAULT false NOT NULL,
	"is_pro" boolean DEFAULT false NOT NULL,
	"pro_expired_at" timestamp with time zone,
	"pro_plan_type" varchar(50),
	CONSTRAINT "users_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE INDEX "idx_character_chats_character_uuid_user" ON "character_chats" USING btree ("character_uuid","user_uuid");--> statement-breakpoint
CREATE INDEX "idx_character_chats_character_uuid" ON "character_chats" USING btree ("character_uuid");--> statement-breakpoint
CREATE INDEX "idx_character_chats_created_at" ON "character_chats" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_character_chats_session" ON "character_chats" USING btree ("session_id","message_index");--> statement-breakpoint
CREATE INDEX "idx_character_generations_character_uuid" ON "character_generations" USING btree ("character_uuid");--> statement-breakpoint
CREATE INDEX "idx_character_generations_type" ON "character_generations" USING btree ("generation_type");--> statement-breakpoint
CREATE INDEX "idx_character_generations_created_at" ON "character_generations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_character_generations_generation_uuid" ON "character_generations" USING btree ("generation_uuid");--> statement-breakpoint
CREATE INDEX "idx_character_generations_visibility_level" ON "character_generations" USING btree ("visibility_level");--> statement-breakpoint
CREATE INDEX "idx_character_remixs_original" ON "character_remixs" USING btree ("original_character_id");--> statement-breakpoint
CREATE INDEX "idx_character_remixs_remixed" ON "character_remixs" USING btree ("remixed_character_id");--> statement-breakpoint
CREATE INDEX "idx_character_remixs_type" ON "character_remixs" USING btree ("remix_type");--> statement-breakpoint
CREATE INDEX "idx_characters_user_uuid" ON "characters" USING btree ("user_uuid");--> statement-breakpoint
CREATE INDEX "idx_characters_visibility" ON "characters" USING btree ("visibility_level");--> statement-breakpoint
CREATE INDEX "idx_characters_created_at" ON "characters" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_characters_theme_id" ON "characters" USING btree ("theme_id");--> statement-breakpoint
CREATE INDEX "idx_characters_remixed_from" ON "characters" USING btree ("remixed_from_uuid");--> statement-breakpoint
CREATE INDEX "idx_characters_user_visibility" ON "characters" USING btree ("user_uuid","visibility_level");--> statement-breakpoint
CREATE INDEX "idx_characters_public_popular" ON "characters" USING btree ("visibility_level","like_count","created_at");--> statement-breakpoint
CREATE INDEX "idx_characters_theme_popular" ON "characters" USING btree ("theme_id","visibility_level","like_count");--> statement-breakpoint
CREATE INDEX "idx_characters_avatar_image" ON "characters" USING btree ("avatar_generation_image_uuid");--> statement-breakpoint
CREATE INDEX "idx_characters_profile_image" ON "characters" USING btree ("profile_generation_image_uuid");--> statement-breakpoint
CREATE INDEX "idx_chat_quotas_membership" ON "chat_quotas" USING btree ("membership_level");--> statement-breakpoint
CREATE INDEX "idx_chat_quotas_reset_at" ON "chat_quotas" USING btree ("quota_reset_at");--> statement-breakpoint
CREATE INDEX "idx_chat_sessions_user_character" ON "chat_sessions" USING btree ("user_uuid","character_uuid");--> statement-breakpoint
CREATE INDEX "idx_chat_sessions_updated" ON "chat_sessions" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_chat_usage_logs_user_date" ON "chat_usage_logs" USING btree ("user_uuid","created_at");--> statement-breakpoint
CREATE INDEX "idx_chat_usage_logs_membership" ON "chat_usage_logs" USING btree ("membership_level");--> statement-breakpoint
CREATE INDEX "idx_credits_generation_uuid" ON "credits" USING btree ("generation_uuid");--> statement-breakpoint
CREATE INDEX "idx_credits_user_valid" ON "credits" USING btree ("user_uuid","is_voided","expired_at");--> statement-breakpoint
CREATE INDEX "idx_credits_voided_at" ON "credits" USING btree ("voided_at");--> statement-breakpoint
CREATE INDEX "idx_email_campaign_recipients_campaign" ON "email_campaign_recipients" USING btree ("campaign_uuid");--> statement-breakpoint
CREATE INDEX "idx_email_campaign_recipients_email" ON "email_campaign_recipients" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_email_campaign_recipients_status" ON "email_campaign_recipients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_email_campaign_recipients_log" ON "email_campaign_recipients" USING btree ("email_log_uuid");--> statement-breakpoint
CREATE INDEX "idx_email_campaigns_type" ON "email_campaigns" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_email_campaigns_status" ON "email_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_email_campaigns_scheduled" ON "email_campaigns" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_email_logs_user_uuid" ON "email_logs" USING btree ("user_uuid");--> statement-breakpoint
CREATE INDEX "idx_email_logs_email" ON "email_logs" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_email_logs_template_uuid" ON "email_logs" USING btree ("template_uuid");--> statement-breakpoint
CREATE INDEX "idx_email_logs_campaign_uuid" ON "email_logs" USING btree ("campaign_uuid");--> statement-breakpoint
CREATE INDEX "idx_email_logs_status" ON "email_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_email_logs_sent_at" ON "email_logs" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "idx_email_logs_created_at" ON "email_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_email_subscriptions_user_uuid" ON "email_subscriptions" USING btree ("user_uuid");--> statement-breakpoint
CREATE INDEX "idx_email_subscriptions_email" ON "email_subscriptions" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_email_subscriptions_type" ON "email_subscriptions" USING btree ("subscription_type");--> statement-breakpoint
CREATE INDEX "idx_email_subscriptions_status" ON "email_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_email_subscription" ON "email_subscriptions" USING btree ("user_uuid","email","subscription_type");--> statement-breakpoint
CREATE INDEX "idx_email_templates_type" ON "email_templates" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_email_templates_active" ON "email_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_feedbacks_type" ON "feedbacks" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_generation_images_generation_uuid" ON "generation_images" USING btree ("generation_uuid");--> statement-breakpoint
CREATE INDEX "idx_generation_images_user_uuid" ON "generation_images" USING btree ("user_uuid");--> statement-breakpoint
CREATE INDEX "idx_generation_images_gen_type" ON "generation_images" USING btree ("gen_type");--> statement-breakpoint
CREATE INDEX "idx_generation_images_style" ON "generation_images" USING btree ("style");--> statement-breakpoint
CREATE INDEX "idx_generation_images_visibility_level" ON "generation_images" USING btree ("visibility_level");--> statement-breakpoint
CREATE INDEX "idx_generation_images_gen_type_visibility" ON "generation_images" USING btree ("gen_type","visibility_level");--> statement-breakpoint
CREATE INDEX "idx_generation_images_style_visibility" ON "generation_images" USING btree ("style","visibility_level");--> statement-breakpoint
CREATE INDEX "idx_generation_images_user_visibility" ON "generation_images" USING btree ("user_uuid","visibility_level");--> statement-breakpoint
CREATE INDEX "idx_generation_images_model_id" ON "generation_images" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "idx_generation_images_like_count" ON "generation_images" USING btree ("like_count");--> statement-breakpoint
CREATE INDEX "idx_generation_videos_generation_uuid" ON "generation_videos" USING btree ("generation_uuid");--> statement-breakpoint
CREATE INDEX "idx_generation_videos_user_uuid" ON "generation_videos" USING btree ("user_uuid");--> statement-breakpoint
CREATE INDEX "idx_generation_videos_quality" ON "generation_videos" USING btree ("quality");--> statement-breakpoint
CREATE INDEX "idx_generation_videos_model_id" ON "generation_videos" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "idx_generation_videos_like_count" ON "generation_videos" USING btree ("like_count");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_generation_video_quality" ON "generation_videos" USING btree ("generation_uuid","quality");--> statement-breakpoint
CREATE INDEX "idx_generations_user_uuid" ON "generations" USING btree ("user_uuid");--> statement-breakpoint
CREATE INDEX "idx_generations_type" ON "generations" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_generations_sub_type" ON "generations" USING btree ("sub_type");--> statement-breakpoint
CREATE INDEX "idx_generations_status" ON "generations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_generations_visibility_level" ON "generations" USING btree ("visibility_level");--> statement-breakpoint
CREATE INDEX "idx_generations_model_id" ON "generations" USING btree ("model_id");--> statement-breakpoint
CREATE INDEX "idx_generations_created_at" ON "generations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_generations_remote_task_id" ON "generations" USING btree ("remote_task_id");--> statement-breakpoint
CREATE INDEX "idx_generations_character_uuids" ON "generations" USING btree ("character_uuids");--> statement-breakpoint
CREATE INDEX "idx_generations_file_transfer_status" ON "generations" USING btree ("file_transfer_status");--> statement-breakpoint
CREATE INDEX "idx_generations_temp_url_expires" ON "generations" USING btree ("temp_url_expires_at");--> statement-breakpoint
CREATE INDEX "idx_generations_user_created" ON "generations" USING btree ("user_uuid","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_operation_costs_month_platform" ON "operation_costs" USING btree ("month","platform");--> statement-breakpoint
CREATE INDEX "idx_operation_costs_month" ON "operation_costs" USING btree ("month");--> statement-breakpoint
CREATE INDEX "idx_operation_costs_platform" ON "operation_costs" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "idx_subscription_logs_subscription_id" ON "subscription_logs" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "idx_subscription_logs_user_uuid" ON "subscription_logs" USING btree ("user_uuid");--> statement-breakpoint
CREATE INDEX "idx_subscription_logs_created_at" ON "subscription_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_subscription_logs_status" ON "subscription_logs" USING btree ("to_status");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_user_uuid" ON "subscriptions" USING btree ("user_uuid");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_status" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_subscription_id" ON "subscriptions" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "idx_subscriptions_sub_times" ON "subscriptions" USING btree ("sub_times");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_user_interaction" ON "user_interactions" USING btree ("user_uuid","art_id","art_type","interaction_type");--> statement-breakpoint
CREATE INDEX "idx_user_interactions_user" ON "user_interactions" USING btree ("user_uuid");--> statement-breakpoint
CREATE INDEX "idx_user_interactions_art" ON "user_interactions" USING btree ("art_id","art_type");--> statement-breakpoint
CREATE INDEX "idx_user_interactions_type" ON "user_interactions" USING btree ("interaction_type");--> statement-breakpoint
CREATE INDEX "idx_user_interactions_art_type" ON "user_interactions" USING btree ("art_type");--> statement-breakpoint
CREATE INDEX "idx_user_interactions_user_art_type" ON "user_interactions" USING btree ("user_uuid","art_type");--> statement-breakpoint
CREATE UNIQUE INDEX "email_provider_unique_idx" ON "users" USING btree ("email","signin_provider");