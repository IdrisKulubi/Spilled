-- TeaKE Rate Limiting System
-- Prevent abuse and spam

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, action, window_start)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action ON rate_limits(user_id, action);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- Rate limiting configuration
CREATE TABLE IF NOT EXISTS rate_limit_config (
    action TEXT PRIMARY KEY,
    max_requests INTEGER NOT NULL,
    window_minutes INTEGER NOT NULL,
    description TEXT
);

-- Insert default rate limits
INSERT INTO rate_limit_config (action, max_requests, window_minutes, description) VALUES
('create_story', 5, 60, 'Maximum 5 stories per hour'),
('create_comment', 20, 60, 'Maximum 20 comments per hour'),
('send_message', 50, 60, 'Maximum 50 messages per hour'),
('search_guys', 100, 60, 'Maximum 100 searches per hour'),
('upload_verification', 3, 1440, 'Maximum 3 verification uploads per day'),
('create_guy', 10, 60, 'Maximum 10 guy profiles per hour')
ON CONFLICT (action) DO NOTHING;

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_user_id UUID,
    p_action TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    config_record RECORD;
    current_count INTEGER;
    window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get rate limit configuration
    SELECT max_requests, window_minutes 
    INTO config_record
    FROM rate_limit_config 
    WHERE action = p_action;
    
    IF NOT FOUND THEN
        -- No rate limit configured for this action
        RETURN TRUE;
    END IF;
    
    -- Calculate window start time
    window_start := date_trunc('hour', NOW()) - 
                   (EXTRACT(minute FROM NOW())::INTEGER % config_record.window_minutes) * INTERVAL '1 minute';
    
    -- Get current count for this window
    SELECT COALESCE(count, 0) 
    INTO current_count
    FROM rate_limits 
    WHERE user_id = p_user_id 
    AND action = p_action 
    AND window_start = window_start;
    
    -- Check if limit exceeded
    IF current_count >= config_record.max_requests THEN
        RETURN FALSE;
    END IF;
    
    -- Increment counter
    INSERT INTO rate_limits (user_id, action, count, window_start)
    VALUES (p_user_id, p_action, 1, window_start)
    ON CONFLICT (user_id, action, window_start)
    DO UPDATE SET count = rate_limits.count + 1;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to enforce rate limiting on stories
CREATE OR REPLACE FUNCTION enforce_story_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT check_rate_limit(NEW.user_id, 'create_story') THEN
        RAISE EXCEPTION 'Rate limit exceeded: Too many stories created recently. Please wait before posting again.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to enforce rate limiting on comments
CREATE OR REPLACE FUNCTION enforce_comment_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT check_rate_limit(NEW.user_id, 'create_comment') THEN
        RAISE EXCEPTION 'Rate limit exceeded: Too many comments created recently. Please wait before commenting again.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to enforce rate limiting on messages
CREATE OR REPLACE FUNCTION enforce_message_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT check_rate_limit(NEW.sender_id, 'send_message') THEN
        RAISE EXCEPTION 'Rate limit exceeded: Too many messages sent recently. Please wait before sending more messages.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to enforce rate limiting on guy creation
CREATE OR REPLACE FUNCTION enforce_guy_rate_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT check_rate_limit(NEW.created_by_user_id, 'create_guy') THEN
        RAISE EXCEPTION 'Rate limit exceeded: Too many profiles created recently. Please wait before creating more profiles.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create rate limiting triggers
DROP TRIGGER IF EXISTS story_rate_limit_trigger ON stories;
CREATE TRIGGER story_rate_limit_trigger
    BEFORE INSERT ON stories
    FOR EACH ROW EXECUTE FUNCTION enforce_story_rate_limit();

DROP TRIGGER IF EXISTS comment_rate_limit_trigger ON comments;
CREATE TRIGGER comment_rate_limit_trigger
    BEFORE INSERT ON comments
    FOR EACH ROW EXECUTE FUNCTION enforce_comment_rate_limit();

DROP TRIGGER IF EXISTS message_rate_limit_trigger ON messages;
CREATE TRIGGER message_rate_limit_trigger
    BEFORE INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION enforce_message_rate_limit();

DROP TRIGGER IF EXISTS guy_rate_limit_trigger ON guys;
CREATE TRIGGER guy_rate_limit_trigger
    BEFORE INSERT ON guys
    FOR EACH ROW EXECUTE FUNCTION enforce_guy_rate_limit();

-- Function to clean up old rate limit records
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM rate_limits 
    WHERE window_start < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run daily
SELECT cron.schedule('cleanup-rate-limits', '0 2 * * *', 'SELECT cleanup_rate_limits();');

-- Function to get user's current rate limit status
CREATE OR REPLACE FUNCTION get_user_rate_limit_status(p_user_id UUID)
RETURNS TABLE (
    action TEXT,
    current_count INTEGER,
    max_requests INTEGER,
    window_minutes INTEGER,
    reset_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rlc.action,
        COALESCE(rl.count, 0) as current_count,
        rlc.max_requests,
        rlc.window_minutes,
        (date_trunc('hour', NOW()) - 
         (EXTRACT(minute FROM NOW())::INTEGER % rlc.window_minutes) * INTERVAL '1 minute' +
         rlc.window_minutes * INTERVAL '1 minute') as reset_time
    FROM rate_limit_config rlc
    LEFT JOIN rate_limits rl ON (
        rl.user_id = p_user_id 
        AND rl.action = rlc.action 
        AND rl.window_start = date_trunc('hour', NOW()) - 
                             (EXTRACT(minute FROM NOW())::INTEGER % rlc.window_minutes) * INTERVAL '1 minute'
    )
    ORDER BY rlc.action;
END;
$$ LANGUAGE plpgsql;