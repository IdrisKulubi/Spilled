-- TeaKE Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE tag_type AS ENUM ('red_flag', 'good_vibes', 'unsure');

-- Users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    phone TEXT,
    email TEXT UNIQUE,
    nickname TEXT,
    verified BOOLEAN DEFAULT FALSE,
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
    id_image_url TEXT, -- URL to uploaded school/national ID image
    id_type TEXT CHECK (id_type IN ('school_id', 'national_id')),
    rejection_reason TEXT, -- Reason if verification was rejected
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guys table
CREATE TABLE guys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT,
    phone TEXT,
    socials TEXT,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stories table
CREATE TABLE stories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    guy_id UUID NOT NULL REFERENCES guys(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    tags tag_type[] NOT NULL DEFAULT '{}',
    image_url TEXT,
    anonymous BOOLEAN DEFAULT TRUE,
    nickname TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments table
CREATE TABLE comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    anonymous BOOLEAN DEFAULT TRUE,
    nickname TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table (with auto-delete after 7 days)
CREATE TABLE messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Story reactions table (likes/reactions to stories)
CREATE TABLE story_reactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction_type tag_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(story_id, user_id) -- One reaction per user per story
);

-- Create indexes for better performance
CREATE INDEX idx_guys_phone ON guys(phone);
CREATE INDEX idx_guys_name ON guys(name);
CREATE INDEX idx_stories_guy_id ON stories(guy_id);
CREATE INDEX idx_stories_created_at ON stories(created_at DESC);
CREATE INDEX idx_comments_story_id ON comments(story_id);
CREATE INDEX idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX idx_messages_expires_at ON messages(expires_at);
CREATE INDEX idx_story_reactions_story_id ON story_reactions(story_id);
CREATE INDEX idx_story_reactions_user_id ON story_reactions(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE guys ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_reactions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Only verified users can create posts, comments, and send messages
CREATE POLICY "Only verified users can create guys" ON guys
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND verification_status = 'approved')
    );

CREATE POLICY "Only verified users can create stories" ON stories
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND verification_status = 'approved')
    );

CREATE POLICY "Only verified users can create comments" ON comments
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND verification_status = 'approved')
    );

CREATE POLICY "Only verified users can send messages" ON messages
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        auth.uid() = sender_id AND
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND verification_status = 'approved')
    );

-- Anyone can read guys (public information)
CREATE POLICY "Anyone can view guys" ON guys
    FOR SELECT USING (true);

-- Anyone can read stories (public information)
CREATE POLICY "Anyone can view stories" ON stories
    FOR SELECT USING (true);

-- Anyone can read comments (public information)  
CREATE POLICY "Anyone can view comments" ON comments
    FOR SELECT USING (true);

-- Messages are private - only sender and receiver can see
CREATE POLICY "Users can view own messages" ON messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Authenticated users can send messages" ON messages
    FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = sender_id);

-- Story reactions policies
CREATE POLICY "Anyone can view reactions" ON story_reactions
    FOR SELECT USING (true);

CREATE POLICY "Only verified users can react" ON story_reactions
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        auth.uid() = user_id AND
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND verification_status = 'approved')
    );

CREATE POLICY "Users can update own reactions" ON story_reactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions" ON story_reactions
    FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically delete expired messages
CREATE OR REPLACE FUNCTION delete_expired_messages()
RETURNS void AS $$
BEGIN
    DELETE FROM messages WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to run the cleanup function daily
SELECT cron.schedule('delete-expired-messages', '0 0 * * *', 'SELECT delete_expired_messages();');

-- Function to search guys (fuzzy search)
CREATE OR REPLACE FUNCTION search_guys(
    search_name TEXT DEFAULT NULL,
    search_phone TEXT DEFAULT NULL,
    search_socials TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    phone TEXT,
    socials TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    story_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id,
        g.name,
        g.phone,
        g.socials,
        g.created_at,
        COUNT(s.id) as story_count
    FROM guys g
    LEFT JOIN stories s ON g.id = s.guy_id
    WHERE 
        (search_name IS NULL OR g.name ILIKE '%' || search_name || '%') AND
        (search_phone IS NULL OR g.phone ILIKE '%' || search_phone || '%') AND
        (search_socials IS NULL OR g.socials ILIKE '%' || search_socials || '%')
    GROUP BY g.id, g.name, g.phone, g.socials, g.created_at
    ORDER BY story_count DESC, g.created_at DESC;
END;
$$ LANGUAGE plpgsql;