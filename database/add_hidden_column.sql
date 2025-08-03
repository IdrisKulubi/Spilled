-- Add hidden column to stories table for soft delete functionality
-- Run this in your Supabase SQL Editor

ALTER TABLE stories 
ADD COLUMN hidden BOOLEAN DEFAULT FALSE;

-- Add index for better performance when filtering hidden stories
CREATE INDEX idx_stories_hidden ON stories(hidden);

-- Update the stories view policy to exclude hidden stories from public view
DROP POLICY IF EXISTS "Anyone can view stories" ON stories;

CREATE POLICY "Anyone can view non-hidden stories" ON stories
    FOR SELECT USING (hidden = FALSE OR auth.uid() = user_id);

-- Allow users to update their own stories (for soft delete)
CREATE POLICY "Users can update own stories" ON stories
    FOR UPDATE USING (auth.uid() = user_id);