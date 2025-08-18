-- Create story_reactions table
CREATE TABLE IF NOT EXISTS "story_reactions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" text,
	"user_id" text,
	"reaction_type" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE "story_reactions" ADD CONSTRAINT "story_reactions_story_id_stories_id_fk" 
FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE CASCADE ON UPDATE no action;

ALTER TABLE "story_reactions" ADD CONSTRAINT "story_reactions_user_id_users_id_fk" 
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE no action;

-- Add unique constraint to prevent duplicate reactions from same user on same story
ALTER TABLE "story_reactions" ADD CONSTRAINT "story_reactions_unique_user_story" 
UNIQUE("story_id", "user_id");

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS "story_reactions_story_id_idx" ON "story_reactions" ("story_id");
CREATE INDEX IF NOT EXISTS "story_reactions_user_id_idx" ON "story_reactions" ("user_id");
