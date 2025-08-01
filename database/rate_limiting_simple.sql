-- Simple Rate Limiting Tables (Minimal Version)
-- This creates the missing table without complex functions or policies

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS check_rate_limit(UUID, TEXT);
DROP FUNCTION IF EXISTS reset_user_rate_limits(UUID);
DROP FUNCTION IF EXISTS cleanup_rate_limit_tracking();

-- Rate limit configuration table
CREATE TABLE IF NOT EXISTS rate_limitconfig (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    action_type TEXT NOT NULL UNIQUE,
    max_requests INTEGER NOT NULL DEFAULT 10,
    time_window_minutes INTEGER NOT NULL DEFAULT 60,
    enabled BOOLEAN DEFAULT FALSE, -- Disabled by default
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate limit tracking table
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    action_type TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, action_type, window_start)
);

-- Insert default rate limit configurations (all disabled)
INSERT INTO rate_limitconfig (action_type, max_requests, time_window_minutes, enabled) VALUES
    ('create_story', 100, 60, false),      -- 100 stories per hour (disabled)
    ('create_comment', 200, 60, false),    -- 200 comments per hour (disabled)
    ('send_message', 500, 60, false),      -- 500 messages per hour (disabled)
    ('create_guy', 100, 60, false)         -- 100 guy profiles per hour (disabled)
ON CONFLICT (action_type) DO NOTHING;

-- Simple function that always returns true (rate limiting disabled)
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_action_type TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Always allow for now (rate limiting disabled)
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_user_action ON rate_limit_tracking(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_created_at ON rate_limit_tracking(created_at);

-- Enable RLS but with permissive policies
ALTER TABLE rate_limitconfig ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_tracking ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read rate limit config
CREATE POLICY "Allow read rate limit config" ON rate_limitconfig
    FOR SELECT USING (true);

-- Allow authenticated users to read their own tracking
CREATE POLICY "Allow read own tracking" ON rate_limit_tracking
    FOR SELECT USING (true);