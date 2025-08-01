-- TeaKE Rate Limiting System
-- Creates tables and functions for rate limiting user actions

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS check_rate_limit(UUID, TEXT);
DROP FUNCTION IF EXISTS reset_user_rate_limits(UUID);
DROP FUNCTION IF EXISTS cleanup_rate_limit_tracking();

-- Rate limit configuration table
CREATE TABLE IF NOT EXISTS rate_limitconfig (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    action_type TEXT NOT NULL UNIQUE, -- e.g., 'create_story', 'create_comment', 'send_message'
    max_requests INTEGER NOT NULL DEFAULT 10,
    time_window_minutes INTEGER NOT NULL DEFAULT 60,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate limit tracking table
CREATE TABLE IF NOT EXISTS rate_limit_tracking (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, action_type, window_start)
);

-- Insert default rate limit configurations
INSERT INTO rate_limitconfig (action_type, max_requests, time_window_minutes) VALUES
    ('create_story', 5, 60),      -- 5 stories per hour
    ('create_comment', 20, 60),   -- 20 comments per hour
    ('send_message', 50, 60),     -- 50 messages per hour
    ('create_guy', 10, 60)        -- 10 guy profiles per hour
ON CONFLICT (action_type) DO NOTHING;

-- Function to check if user has exceeded rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_action_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    config_record RECORD;
    current_count INTEGER;
    window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get rate limit configuration
    SELECT max_requests, time_window_minutes, enabled
    INTO config_record
    FROM rate_limitconfig
    WHERE action_type = p_action_type;
    
    -- If no config found or disabled, allow the action
    IF NOT FOUND OR NOT config_record.enabled THEN
        RETURN TRUE;
    END IF;
    
    -- Calculate current window start
    window_start := date_trunc('hour', NOW()) - 
                   (EXTRACT(MINUTE FROM NOW())::INTEGER / config_record.time_window_minutes) * 
                   (config_record.time_window_minutes || ' minutes')::INTERVAL;
    
    -- Get current request count for this window
    SELECT COALESCE(request_count, 0)
    INTO current_count
    FROM rate_limit_tracking
    WHERE user_id = p_user_id 
    AND action_type = p_action_type 
    AND window_start = window_start;
    
    -- Check if limit exceeded
    IF current_count >= config_record.max_requests THEN
        RETURN FALSE;
    END IF;
    
    -- Update or insert tracking record
    INSERT INTO rate_limit_tracking (user_id, action_type, request_count, window_start)
    VALUES (p_user_id, p_action_type, 1, window_start)
    ON CONFLICT (user_id, action_type, window_start)
    DO UPDATE SET 
        request_count = rate_limit_tracking.request_count + 1,
        created_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to reset rate limits for a user (admin use)
CREATE OR REPLACE FUNCTION reset_user_rate_limits(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM rate_limit_tracking WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old rate limit tracking records
CREATE OR REPLACE FUNCTION cleanup_rate_limit_tracking()
RETURNS VOID AS $$
BEGIN
    DELETE FROM rate_limit_tracking 
    WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_user_action ON rate_limit_tracking(user_id, action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_window ON rate_limit_tracking(window_start);
CREATE INDEX IF NOT EXISTS idx_rate_limit_tracking_created_at ON rate_limit_tracking(created_at);

-- Enable RLS on rate limiting tables
ALTER TABLE rate_limitconfig ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies for rate_limitconfig (allow read access, restrict write to admins)
CREATE POLICY "Anyone can view rate limit config" ON rate_limitconfig
    FOR SELECT USING (true);

CREATE POLICY "Only service role can modify rate limit config" ON rate_limitconfig
    FOR ALL USING (auth.role() = 'service_role');

-- RLS policies for rate_limit_tracking (users can only see their own)
CREATE POLICY "Users can view own rate limit tracking" ON rate_limit_tracking
    FOR SELECT USING (auth.uid() = user_id);

-- Schedule cleanup of old tracking records (daily)
SELECT cron.schedule('cleanup-rate-limits', '0 2 * * *', 'SELECT cleanup_rate_limit_tracking();');