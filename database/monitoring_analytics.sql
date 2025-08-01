-- Monitoring and Analytics Tables
-- Privacy-compliant analytics and system monitoring

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- ANALYTICS EVENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('user_action', 'system_event', 'performance', 'error')),
    properties JSONB DEFAULT '{}',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Nullable for privacy
    session_id VARCHAR(255) NOT NULL,
    app_version VARCHAR(50),
    platform VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Index for common queries
    CONSTRAINT valid_event_name CHECK (LENGTH(event_name) > 0)
);

-- Indexes for analytics events
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created ON analytics_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- GIN index for properties JSONB queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_properties ON analytics_events USING GIN (properties);

-- =============================================
-- PERFORMANCE METRICS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(255) NOT NULL,
    value NUMERIC NOT NULL,
    unit VARCHAR(20) DEFAULT 'ms',
    context JSONB DEFAULT '{}',
    session_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_metric_name CHECK (LENGTH(metric_name) > 0),
    CONSTRAINT positive_value CHECK (value >= 0)
);

-- Indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_session ON performance_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created ON performance_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_created ON performance_metrics(metric_name, created_at DESC);

-- =============================================
-- ERROR EVENTS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS error_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_type VARCHAR(255) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB DEFAULT '{}',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255) NOT NULL,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_error_type CHECK (LENGTH(error_type) > 0)
);

-- Indexes for error events
CREATE INDEX IF NOT EXISTS idx_error_events_type ON error_events(error_type);
CREATE INDEX IF NOT EXISTS idx_error_events_resolved ON error_events(resolved);
CREATE INDEX IF NOT EXISTS idx_error_events_created ON error_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_events_user_created ON error_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_error_events_unresolved ON error_events(created_at DESC) WHERE resolved = false;

-- =============================================
-- SYSTEM HEALTH METRICS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS system_health_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(100) NOT NULL CHECK (metric_type IN ('cpu_usage', 'memory_usage', 'disk_usage', 'response_time', 'error_rate', 'active_users')),
    value NUMERIC NOT NULL,
    unit VARCHAR(20) DEFAULT '%',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT positive_value CHECK (value >= 0)
);

-- Indexes for system health
CREATE INDEX IF NOT EXISTS idx_system_health_type ON system_health_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_health_created ON system_health_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_type_created ON system_health_metrics(metric_type, created_at DESC);

-- =============================================
-- USER SESSIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    app_version VARCHAR(50),
    platform VARCHAR(50),
    device_info JSONB DEFAULT '{}',
    ip_address INET, -- For security monitoring, can be hashed for privacy
    user_agent TEXT,
    
    CONSTRAINT valid_session_id CHECK (LENGTH(session_id) > 0)
);

-- Indexes for user sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_started ON user_sessions(user_id, started_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_sessions_started ON user_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(started_at DESC) WHERE ended_at IS NULL;

-- =============================================
-- ANALYTICS FUNCTIONS
-- =============================================

-- Function to log analytics batch
CREATE OR REPLACE FUNCTION log_analytics_batch(batch_data JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    event_record JSONB;
    perf_record JSONB;
    error_record JSONB;
    session_record RECORD;
BEGIN
    -- Validate batch data
    IF batch_data IS NULL OR NOT (batch_data ? 'session_id') THEN
        RAISE EXCEPTION 'Invalid batch data: missing session_id';
    END IF;

    -- Update or create session record
    INSERT INTO user_sessions (session_id, started_at, app_version, platform)
    VALUES (
        batch_data->>'session_id',
        (batch_data->>'timestamp')::TIMESTAMP WITH TIME ZONE,
        batch_data->>'app_version',
        batch_data->>'platform'
    )
    ON CONFLICT (session_id) DO UPDATE SET
        ended_at = (batch_data->>'timestamp')::TIMESTAMP WITH TIME ZONE,
        duration_seconds = EXTRACT(EPOCH FROM ((batch_data->>'timestamp')::TIMESTAMP WITH TIME ZONE - started_at));

    -- Process events
    IF batch_data ? 'events' THEN
        FOR event_record IN SELECT * FROM jsonb_array_elements(batch_data->'events')
        LOOP
            INSERT INTO analytics_events (
                event_name,
                event_type,
                properties,
                user_id,
                session_id,
                app_version,
                platform,
                created_at
            ) VALUES (
                event_record->>'eventName',
                event_record->>'eventType',
                COALESCE(event_record->'properties', '{}'),
                CASE WHEN event_record->>'userId' != '' THEN (event_record->>'userId')::UUID ELSE NULL END,
                event_record->>'sessionId',
                event_record->>'appVersion',
                event_record->>'platform',
                (event_record->>'timestamp')::TIMESTAMP WITH TIME ZONE
            );
        END LOOP;
    END IF;

    -- Process performance metrics
    IF batch_data ? 'performance' THEN
        FOR perf_record IN SELECT * FROM jsonb_array_elements(batch_data->'performance')
        LOOP
            INSERT INTO performance_metrics (
                metric_name,
                value,
                unit,
                context,
                session_id,
                created_at
            ) VALUES (
                perf_record->>'metricName',
                (perf_record->>'value')::NUMERIC,
                COALESCE(perf_record->>'unit', 'ms'),
                COALESCE(perf_record->'context', '{}'),
                perf_record->>'sessionId',
                (perf_record->>'timestamp')::TIMESTAMP WITH TIME ZONE
            );
        END LOOP;
    END IF;

    -- Process error events
    IF batch_data ? 'errors' THEN
        FOR error_record IN SELECT * FROM jsonb_array_elements(batch_data->'errors')
        LOOP
            INSERT INTO error_events (
                error_type,
                error_message,
                stack_trace,
                context,
                user_id,
                session_id,
                created_at
            ) VALUES (
                error_record->>'errorType',
                error_record->>'errorMessage',
                error_record->>'stackTrace',
                COALESCE(error_record->'context', '{}'),
                CASE WHEN error_record->>'userId' != '' THEN (error_record->>'userId')::UUID ELSE NULL END,
                error_record->>'sessionId',
                (error_record->>'timestamp')::TIMESTAMP WITH TIME ZONE
            );
        END LOOP;
    END IF;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get analytics summary
CREATE OR REPLACE FUNCTION get_analytics_summary(
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '7 days',
    end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
    total_events BIGINT,
    unique_sessions BIGINT,
    unique_users BIGINT,
    avg_session_duration NUMERIC,
    top_events JSONB,
    error_count BIGINT,
    performance_avg JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH event_stats AS (
        SELECT 
            COUNT(*) as total_events,
            COUNT(DISTINCT session_id) as unique_sessions,
            COUNT(DISTINCT user_id) as unique_users
        FROM analytics_events
        WHERE created_at BETWEEN start_date AND end_date
    ),
    session_stats AS (
        SELECT AVG(duration_seconds) as avg_duration
        FROM user_sessions
        WHERE started_at BETWEEN start_date AND end_date
        AND duration_seconds IS NOT NULL
    ),
    top_events AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'event_name', event_name,
                'count', event_count
            ) ORDER BY event_count DESC
        ) as top_events
        FROM (
            SELECT event_name, COUNT(*) as event_count
            FROM analytics_events
            WHERE created_at BETWEEN start_date AND end_date
            GROUP BY event_name
            ORDER BY COUNT(*) DESC
            LIMIT 10
        ) t
    ),
    error_stats AS (
        SELECT COUNT(*) as error_count
        FROM error_events
        WHERE created_at BETWEEN start_date AND end_date
    ),
    perf_stats AS (
        SELECT jsonb_object_agg(metric_name, avg_value) as performance_avg
        FROM (
            SELECT metric_name, AVG(value) as avg_value
            FROM performance_metrics
            WHERE created_at BETWEEN start_date AND end_date
            GROUP BY metric_name
        ) p
    )
    SELECT 
        e.total_events,
        e.unique_sessions,
        e.unique_users,
        s.avg_duration,
        t.top_events,
        er.error_count,
        p.performance_avg
    FROM event_stats e
    CROSS JOIN session_stats s
    CROSS JOIN top_events t
    CROSS JOIN error_stats er
    CROSS JOIN perf_stats p;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get performance metrics summary
CREATE OR REPLACE FUNCTION get_performance_summary(
    metric_name_filter VARCHAR DEFAULT NULL,
    hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    metric_name VARCHAR,
    avg_value NUMERIC,
    min_value NUMERIC,
    max_value NUMERIC,
    p95_value NUMERIC,
    sample_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.metric_name,
        AVG(pm.value) as avg_value,
        MIN(pm.value) as min_value,
        MAX(pm.value) as max_value,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY pm.value) as p95_value,
        COUNT(*) as sample_count
    FROM performance_metrics pm
    WHERE pm.created_at > NOW() - (hours_back || ' hours')::INTERVAL
    AND (metric_name_filter IS NULL OR pm.metric_name = metric_name_filter)
    GROUP BY pm.metric_name
    ORDER BY pm.metric_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get error summary
CREATE OR REPLACE FUNCTION get_error_summary(hours_back INTEGER DEFAULT 24)
RETURNS TABLE (
    error_type VARCHAR,
    error_count BIGINT,
    unique_users BIGINT,
    first_seen TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE,
    resolved_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ee.error_type,
        COUNT(*) as error_count,
        COUNT(DISTINCT ee.user_id) as unique_users,
        MIN(ee.created_at) as first_seen,
        MAX(ee.created_at) as last_seen,
        COUNT(*) FILTER (WHERE ee.resolved = true) as resolved_count
    FROM error_events ee
    WHERE ee.created_at > NOW() - (hours_back || ' hours')::INTERVAL
    GROUP BY ee.error_type
    ORDER BY error_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SYSTEM HEALTH MONITORING
-- =============================================

-- Function to log system health metric
CREATE OR REPLACE FUNCTION log_system_health(
    p_metric_type VARCHAR,
    p_value NUMERIC,
    p_unit VARCHAR DEFAULT '%',
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    metric_id UUID;
BEGIN
    INSERT INTO system_health_metrics (metric_type, value, unit, metadata)
    VALUES (p_metric_type, p_value, p_unit, p_metadata)
    RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current system health
CREATE OR REPLACE FUNCTION get_system_health()
RETURNS TABLE (
    metric_type VARCHAR,
    current_value NUMERIC,
    avg_1h NUMERIC,
    avg_24h NUMERIC,
    unit VARCHAR,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH latest_metrics AS (
        SELECT DISTINCT ON (shm.metric_type)
            shm.metric_type,
            shm.value as current_value,
            shm.unit
        FROM system_health_metrics shm
        ORDER BY shm.metric_type, shm.created_at DESC
    ),
    avg_1h AS (
        SELECT 
            metric_type,
            AVG(value) as avg_value
        FROM system_health_metrics
        WHERE created_at > NOW() - INTERVAL '1 hour'
        GROUP BY metric_type
    ),
    avg_24h AS (
        SELECT 
            metric_type,
            AVG(value) as avg_value
        FROM system_health_metrics
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY metric_type
    )
    SELECT 
        lm.metric_type,
        lm.current_value,
        a1.avg_value as avg_1h,
        a24.avg_value as avg_24h,
        lm.unit,
        CASE 
            WHEN lm.metric_type IN ('cpu_usage', 'memory_usage', 'disk_usage') AND lm.current_value > 90 THEN 'critical'
            WHEN lm.metric_type IN ('cpu_usage', 'memory_usage', 'disk_usage') AND lm.current_value > 75 THEN 'warning'
            WHEN lm.metric_type = 'error_rate' AND lm.current_value > 5 THEN 'critical'
            WHEN lm.metric_type = 'error_rate' AND lm.current_value > 1 THEN 'warning'
            WHEN lm.metric_type = 'response_time' AND lm.current_value > 2000 THEN 'critical'
            WHEN lm.metric_type = 'response_time' AND lm.current_value > 1000 THEN 'warning'
            ELSE 'healthy'
        END as status
    FROM latest_metrics lm
    LEFT JOIN avg_1h a1 ON lm.metric_type = a1.metric_type
    LEFT JOIN avg_24h a24 ON lm.metric_type = a24.metric_type
    ORDER BY lm.metric_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- DATA RETENTION AND CLEANUP
-- =============================================

-- Function to cleanup old analytics data
CREATE OR REPLACE FUNCTION cleanup_analytics_data(days_to_keep INTEGER DEFAULT 90)
RETURNS TABLE (
    table_name TEXT,
    deleted_count BIGINT
) AS $$
DECLARE
    cutoff_date TIMESTAMP WITH TIME ZONE;
    deleted_events BIGINT;
    deleted_performance BIGINT;
    deleted_errors BIGINT;
    deleted_sessions BIGINT;
    deleted_health BIGINT;
BEGIN
    cutoff_date := NOW() - (days_to_keep || ' days')::INTERVAL;
    
    -- Delete old analytics events
    DELETE FROM analytics_events WHERE created_at < cutoff_date;
    GET DIAGNOSTICS deleted_events = ROW_COUNT;
    
    -- Delete old performance metrics
    DELETE FROM performance_metrics WHERE created_at < cutoff_date;
    GET DIAGNOSTICS deleted_performance = ROW_COUNT;
    
    -- Delete old resolved errors (keep unresolved ones)
    DELETE FROM error_events WHERE created_at < cutoff_date AND resolved = true;
    GET DIAGNOSTICS deleted_errors = ROW_COUNT;
    
    -- Delete old sessions
    DELETE FROM user_sessions WHERE started_at < cutoff_date;
    GET DIAGNOSTICS deleted_sessions = ROW_COUNT;
    
    -- Delete old system health metrics (keep more recent data)
    DELETE FROM system_health_metrics WHERE created_at < (NOW() - INTERVAL '30 days');
    GET DIAGNOSTICS deleted_health = ROW_COUNT;
    
    -- Return results
    RETURN QUERY VALUES 
        ('analytics_events', deleted_events),
        ('performance_metrics', deleted_performance),
        ('error_events', deleted_errors),
        ('user_sessions', deleted_sessions),
        ('system_health_metrics', deleted_health);
    
    -- Log the cleanup
    INSERT INTO audit_log (
        action,
        resource_type,
        old_values,
        new_values,
        created_at
    ) VALUES (
        'CLEANUP_ANALYTICS_DATA',
        'analytics',
        jsonb_build_object('days_to_keep', days_to_keep, 'cutoff_date', cutoff_date),
        jsonb_build_object(
            'deleted_events', deleted_events,
            'deleted_performance', deleted_performance,
            'deleted_errors', deleted_errors,
            'deleted_sessions', deleted_sessions,
            'deleted_health', deleted_health
        ),
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on analytics tables
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Analytics events policies (admin only for reading, system for writing)
CREATE POLICY "Admins can view all analytics events" ON analytics_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "System can insert analytics events" ON analytics_events
    FOR INSERT WITH CHECK (true); -- Allow system inserts

-- Performance metrics policies
CREATE POLICY "Admins can view performance metrics" ON performance_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "System can insert performance metrics" ON performance_metrics
    FOR INSERT WITH CHECK (true);

-- Error events policies
CREATE POLICY "Admins can view error events" ON error_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin', 'moderator')
        )
    );

CREATE POLICY "Admins can update error events" ON error_events
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin', 'moderator')
        )
    );

CREATE POLICY "System can insert error events" ON error_events
    FOR INSERT WITH CHECK (true);

-- System health policies (admin only)
CREATE POLICY "Admins can view system health" ON system_health_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "System can insert health metrics" ON system_health_metrics
    FOR INSERT WITH CHECK (true);

-- User sessions policies
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "System can manage sessions" ON user_sessions
    FOR ALL WITH CHECK (true);

-- =============================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- =============================================

-- Daily analytics summary
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_analytics_summary AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_events,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) FILTER (WHERE event_type = 'error') as error_events,
    AVG(CASE WHEN event_name = 'session_duration' THEN (properties->>'duration')::NUMERIC ELSE NULL END) as avg_session_duration
FROM analytics_events
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_daily_analytics_summary_date ON daily_analytics_summary(date DESC);

-- Refresh function for materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS TEXT AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY daily_analytics_summary;
    RETURN 'Analytics views refreshed successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant select on materialized views
GRANT SELECT ON daily_analytics_summary TO authenticated;

COMMIT;