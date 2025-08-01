-- Real-time Security & Monitoring System
-- Implements real-time threat detection, session management, and security monitoring

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Security events table for real-time monitoring
CREATE TABLE IF NOT EXISTS security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id)
);

-- Index for fast security event queries
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type_severity ON security_events(event_type, severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_unresolved ON security_events(resolved_at) WHERE resolved_at IS NULL;

-- Active sessions table for session management
CREATE TABLE IF NOT EXISTS active_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    device_info JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for session management
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_token ON active_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_active_sessions_expires ON active_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_active_sessions_active ON active_sessions(is_active) WHERE is_active = true;

-- Suspicious activity patterns table
CREATE TABLE IF NOT EXISTS suspicious_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_name VARCHAR(100) NOT NULL UNIQUE,
    pattern_type VARCHAR(50) NOT NULL,
    detection_query TEXT NOT NULL,
    threshold_value INTEGER DEFAULT 1,
    time_window_minutes INTEGER DEFAULT 60,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default suspicious patterns
INSERT INTO suspicious_patterns (pattern_name, pattern_type, detection_query, threshold_value, time_window_minutes, severity) VALUES
('rapid_login_attempts', 'authentication', 'SELECT COUNT(*) FROM auth.audit_log_entries WHERE event_type = ''signed_in_with_password'' AND ip_address = $1 AND created_at > NOW() - INTERVAL ''%s minutes''', 5, 15, 'high'),
('multiple_failed_logins', 'authentication', 'SELECT COUNT(*) FROM security_events WHERE event_type = ''failed_login'' AND ip_address = $1 AND created_at > NOW() - INTERVAL ''%s minutes''', 3, 10, 'medium'),
('unusual_location_login', 'geolocation', 'SELECT COUNT(DISTINCT metadata->>''country'') FROM security_events WHERE user_id = $1 AND event_type = ''login'' AND created_at > NOW() - INTERVAL ''%s minutes''', 2, 60, 'medium'),
('rapid_story_creation', 'content', 'SELECT COUNT(*) FROM stories WHERE user_id = $1 AND created_at > NOW() - INTERVAL ''%s minutes''', 10, 60, 'medium'),
('mass_messaging', 'messaging', 'SELECT COUNT(*) FROM messages WHERE sender_id = $1 AND created_at > NOW() - INTERVAL ''%s minutes''', 50, 60, 'high'),
('account_enumeration', 'reconnaissance', 'SELECT COUNT(*) FROM security_events WHERE event_type = ''user_lookup'' AND ip_address = $1 AND created_at > NOW() - INTERVAL ''%s minutes''', 20, 30, 'medium')
ON CONFLICT (pattern_name) DO NOTHING;

-- Real-time security monitoring function
CREATE OR REPLACE FUNCTION monitor_security_event()
RETURNS TRIGGER AS $$
DECLARE
    pattern RECORD;
    detection_count INTEGER;
    query_text TEXT;
BEGIN
    -- Log the security event
    INSERT INTO security_events (
        user_id,
        event_type,
        severity,
        description,
        ip_address,
        user_agent,
        metadata
    ) VALUES (
        COALESCE(NEW.user_id, OLD.user_id),
        TG_ARGV[0], -- event_type passed as trigger argument
        TG_ARGV[1], -- severity passed as trigger argument
        TG_ARGV[2], -- description passed as trigger argument
        COALESCE(NEW.ip_address, OLD.ip_address),
        COALESCE(NEW.user_agent, OLD.user_agent),
        COALESCE(NEW.metadata, OLD.metadata, '{}')
    );

    -- Check for suspicious patterns
    FOR pattern IN SELECT * FROM suspicious_patterns WHERE is_active = true LOOP
        -- Build the detection query with time window
        query_text := format(pattern.detection_query, pattern.time_window_minutes);
        
        -- Execute the detection query
        EXECUTE query_text INTO detection_count USING 
            COALESCE(NEW.user_id, OLD.user_id, NEW.ip_address, OLD.ip_address);
        
        -- If threshold exceeded, create high-priority security event
        IF detection_count >= pattern.threshold_value THEN
            INSERT INTO security_events (
                user_id,
                event_type,
                severity,
                description,
                ip_address,
                metadata
            ) VALUES (
                COALESCE(NEW.user_id, OLD.user_id),
                'suspicious_pattern_detected',
                pattern.severity,
                format('Suspicious pattern detected: %s (count: %s, threshold: %s)', 
                       pattern.pattern_name, detection_count, pattern.threshold_value),
                COALESCE(NEW.ip_address, OLD.ip_address),
                jsonb_build_object(
                    'pattern_name', pattern.pattern_name,
                    'pattern_type', pattern.pattern_type,
                    'detection_count', detection_count,
                    'threshold', pattern.threshold_value,
                    'time_window_minutes', pattern.time_window_minutes
                )
            );
        END IF;
    END LOOP;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Session management functions
CREATE OR REPLACE FUNCTION create_user_session(
    p_user_id UUID,
    p_device_info JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_expires_hours INTEGER DEFAULT 24
)
RETURNS TABLE(session_token TEXT, expires_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
    v_session_token TEXT;
    v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Generate secure session token
    v_session_token := encode(gen_random_bytes(32), 'base64');
    v_expires_at := NOW() + (p_expires_hours || ' hours')::INTERVAL;
    
    -- Insert new session
    INSERT INTO active_sessions (
        user_id,
        session_token,
        device_info,
        ip_address,
        user_agent,
        expires_at
    ) VALUES (
        p_user_id,
        v_session_token,
        p_device_info,
        p_ip_address,
        p_user_agent,
        v_expires_at
    );
    
    -- Log session creation
    INSERT INTO security_events (
        user_id,
        event_type,
        severity,
        description,
        ip_address,
        user_agent,
        metadata
    ) VALUES (
        p_user_id,
        'session_created',
        'low',
        'New user session created',
        p_ip_address,
        p_user_agent,
        jsonb_build_object(
            'device_info', p_device_info,
            'expires_hours', p_expires_hours
        )
    );
    
    RETURN QUERY SELECT v_session_token, v_expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate session function
CREATE OR REPLACE FUNCTION validate_session(p_session_token TEXT)
RETURNS TABLE(
    user_id UUID,
    is_valid BOOLEAN,
    expires_at TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_session RECORD;
BEGIN
    -- Get session info
    SELECT s.user_id, s.expires_at, s.last_activity, s.is_active
    INTO v_session
    FROM active_sessions s
    WHERE s.session_token = p_session_token;
    
    -- Check if session exists and is valid
    IF v_session.user_id IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, false, NULL::TIMESTAMP WITH TIME ZONE, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Check if session is expired or inactive
    IF v_session.expires_at < NOW() OR NOT v_session.is_active THEN
        -- Deactivate expired session
        UPDATE active_sessions 
        SET is_active = false 
        WHERE session_token = p_session_token;
        
        RETURN QUERY SELECT v_session.user_id, false, v_session.expires_at, v_session.last_activity;
        RETURN;
    END IF;
    
    -- Update last activity
    UPDATE active_sessions 
    SET last_activity = NOW() 
    WHERE session_token = p_session_token;
    
    RETURN QUERY SELECT v_session.user_id, true, v_session.expires_at, NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Terminate session function
CREATE OR REPLACE FUNCTION terminate_session(p_session_token TEXT, p_user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    v_affected_rows INTEGER;
BEGIN
    -- Terminate session
    UPDATE active_sessions 
    SET is_active = false, last_activity = NOW()
    WHERE session_token = p_session_token
    AND (p_user_id IS NULL OR user_id = p_user_id);
    
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    
    -- Log session termination if session was found
    IF v_affected_rows > 0 THEN
        INSERT INTO security_events (
            user_id,
            event_type,
            severity,
            description,
            metadata
        ) VALUES (
            p_user_id,
            'session_terminated',
            'low',
            'User session terminated',
            jsonb_build_object('session_token_hash', md5(p_session_token))
        );
        
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    v_cleaned_count INTEGER;
BEGIN
    -- Delete expired sessions
    DELETE FROM active_sessions 
    WHERE expires_at < NOW() OR (last_activity < NOW() - INTERVAL '7 days');
    
    GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;
    
    -- Log cleanup if sessions were removed
    IF v_cleaned_count > 0 THEN
        INSERT INTO security_events (
            event_type,
            severity,
            description,
            metadata
        ) VALUES (
            'session_cleanup',
            'low',
            format('Cleaned up %s expired sessions', v_cleaned_count),
            jsonb_build_object('cleaned_count', v_cleaned_count)
        );
    END IF;
    
    RETURN v_cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get security dashboard data
CREATE OR REPLACE FUNCTION get_security_dashboard(p_hours INTEGER DEFAULT 24)
RETURNS TABLE(
    total_events INTEGER,
    critical_events INTEGER,
    high_events INTEGER,
    medium_events INTEGER,
    low_events INTEGER,
    active_sessions INTEGER,
    unique_users_active INTEGER,
    top_event_types JSONB,
    recent_critical_events JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH event_stats AS (
        SELECT 
            COUNT(*)::INTEGER as total,
            COUNT(*) FILTER (WHERE severity = 'critical')::INTEGER as critical,
            COUNT(*) FILTER (WHERE severity = 'high')::INTEGER as high,
            COUNT(*) FILTER (WHERE severity = 'medium')::INTEGER as medium,
            COUNT(*) FILTER (WHERE severity = 'low')::INTEGER as low
        FROM security_events 
        WHERE created_at > NOW() - (p_hours || ' hours')::INTERVAL
    ),
    session_stats AS (
        SELECT 
            COUNT(*)::INTEGER as active,
            COUNT(DISTINCT user_id)::INTEGER as unique_users
        FROM active_sessions 
        WHERE is_active = true AND expires_at > NOW()
    ),
    top_events AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'event_type', event_type,
                'count', count
            ) ORDER BY count DESC
        ) as top_types
        FROM (
            SELECT event_type, COUNT(*) as count
            FROM security_events 
            WHERE created_at > NOW() - (p_hours || ' hours')::INTERVAL
            GROUP BY event_type
            ORDER BY count DESC
            LIMIT 10
        ) t
    ),
    recent_critical AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', id,
                'event_type', event_type,
                'description', description,
                'created_at', created_at,
                'user_id', user_id,
                'metadata', metadata
            ) ORDER BY created_at DESC
        ) as recent
        FROM (
            SELECT id, event_type, description, created_at, user_id, metadata
            FROM security_events 
            WHERE severity = 'critical' 
            AND created_at > NOW() - (p_hours || ' hours')::INTERVAL
            ORDER BY created_at DESC
            LIMIT 20
        ) t
    )
    SELECT 
        es.total,
        es.critical,
        es.high,
        es.medium,
        es.low,
        ss.active,
        ss.unique_users,
        COALESCE(te.top_types, '[]'::jsonb),
        COALESCE(rc.recent, '[]'::jsonb)
    FROM event_stats es
    CROSS JOIN session_stats ss
    CROSS JOIN top_events te
    CROSS JOIN recent_critical rc;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Real-time notification function for critical events
CREATE OR REPLACE FUNCTION notify_critical_security_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify for critical and high severity events
    IF NEW.severity IN ('critical', 'high') THEN
        PERFORM pg_notify(
            'security_alert',
            json_build_object(
                'event_id', NEW.id,
                'event_type', NEW.event_type,
                'severity', NEW.severity,
                'description', NEW.description,
                'user_id', NEW.user_id,
                'created_at', NEW.created_at,
                'metadata', NEW.metadata
            )::text
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for real-time notifications
DROP TRIGGER IF EXISTS trigger_notify_critical_security_event ON security_events;
CREATE TRIGGER trigger_notify_critical_security_event
    AFTER INSERT ON security_events
    FOR EACH ROW
    EXECUTE FUNCTION notify_critical_security_event();

-- RLS policies for security events
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Only admins and moderators can view security events
CREATE POLICY "security_events_admin_access" ON security_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin', 'moderator')
            AND ur.is_active = true
        )
    );

-- Users can only see their own security events (limited view)
CREATE POLICY "security_events_user_own" ON security_events
    FOR SELECT USING (
        user_id = auth.uid()
        AND event_type NOT IN ('suspicious_pattern_detected', 'admin_action')
    );

-- RLS policies for active sessions
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "active_sessions_user_own" ON active_sessions
    FOR ALL USING (user_id = auth.uid());

-- Admins can see all sessions
CREATE POLICY "active_sessions_admin_access" ON active_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
            AND ur.is_active = true
        )
    );

-- Create scheduled job to clean up expired sessions (if pg_cron is available)
-- SELECT cron.schedule('cleanup-expired-sessions', '0 */6 * * *', 'SELECT cleanup_expired_sessions();');

-- Grant necessary permissions
GRANT SELECT, INSERT ON security_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON active_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_session TO authenticated;
GRANT EXECUTE ON FUNCTION validate_session TO authenticated;
GRANT EXECUTE ON FUNCTION terminate_session TO authenticated;
GRANT EXECUTE ON FUNCTION get_security_dashboard TO authenticated;

-- Create view for user's own security events (sanitized)
CREATE OR REPLACE VIEW user_security_events AS
SELECT 
    id,
    event_type,
    severity,
    description,
    created_at,
    CASE 
        WHEN event_type IN ('login', 'logout', 'session_created', 'session_terminated') THEN metadata
        ELSE '{}'::jsonb
    END as metadata
FROM security_events
WHERE user_id = auth.uid()
AND event_type NOT IN ('suspicious_pattern_detected', 'admin_action')
ORDER BY created_at DESC;

-- Grant access to the view
GRANT SELECT ON user_security_events TO authenticated;

COMMENT ON TABLE security_events IS 'Real-time security event monitoring and logging';
COMMENT ON TABLE active_sessions IS 'Active user session management with security tracking';
COMMENT ON TABLE suspicious_patterns IS 'Configurable patterns for detecting suspicious activity';
COMMENT ON FUNCTION monitor_security_event() IS 'Trigger function for real-time security monitoring';
COMMENT ON FUNCTION get_security_dashboard(INTEGER) IS 'Get comprehensive security dashboard data';