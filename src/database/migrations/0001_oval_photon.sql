CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "comments" DROP CONSTRAINT "comments_created_by_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "stories" DROP CONSTRAINT "stories_created_by_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "stories" ALTER COLUMN "tags" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."tag_type";--> statement-breakpoint
CREATE TYPE "public"."tag_type" AS ENUM('red_flag', 'good_vibes', 'unsure');--> statement-breakpoint
ALTER TABLE "stories" ALTER COLUMN "tags" SET DATA TYPE "public"."tag_type"[] USING "tags"::"public"."tag_type"[];--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "text" text;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "anonymous" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "nickname" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "text" text;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "text" text;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "tags" "tag_type"[];--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "anonymous" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "nickname" text;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" DROP COLUMN "content";--> statement-breakpoint
ALTER TABLE "comments" DROP COLUMN "created_by_user_id";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "content";--> statement-breakpoint
ALTER TABLE "stories" DROP COLUMN "content";--> statement-breakpoint
ALTER TABLE "stories" DROP COLUMN "tag_type";--> statement-breakpoint
ALTER TABLE "stories" DROP COLUMN "created_by_user_id";