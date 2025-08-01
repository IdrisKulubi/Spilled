-- Monitoring and Logging Tables
-- Creates tables for error reporting, performance monitoring, and application logging

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Error reports table
CREATE TABLE IF NOT EXISTS error_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    error_type VARCHAR(50) NOT NULL CHECK (error_type IN ('javascript', 'network', 'database', 'authentication', 'performance', 'crash')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    stack_trace TEXT,
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    context JSONB DEFAULT '{}',
    device_info JSONB DEFAULT '{}',
    app_version VARCHAR(20) NOT NULL,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for error reports
CREATE INDEX IF NOT EXISTS idx_error_reports_user_id ON error_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_error_reports_error_type ON error_reports(error_type);
CREATE INDEX IF NOT EXISTS idx_error_reports_severity ON error_reports(severity);
CREATE INDEX IF NOT EXISTS idx_error_reports_created_at ON error_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_reports_unresolved ON error_reports(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_error_reports_tags ON error_reports USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_error_reports_context ON error_reports USING GIN(context);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN ('app_start', 'screen_load', 'api_call', 'image_load', 'database_query', 'performance')),
    metric_name VARCHAR(100) NOT NULL,
    value NUMERIC NOT NULL,
    unit VARCHAR(20) NOT NULL CHECK (unit IN ('ms', 'seconds', 'bytes', 'count')),
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type_name ON performance_metrics(metric_type, metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_value ON performance_metrics(value);

-- Application logs table
CREATE TABLE IF NOT EXISTS application_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(10) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
    message TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    context JSONB DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for application logs
CREATE INDEX IF NOT EXISTS idx_application_logs_user_id ON application_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_application_logs_level ON application_logs(level);
CREATE INDEX IF NOT EXISTS idx_application_logs_category ON application_logs(category);
CREATE INDEX IF NOT EXISTS idx_application_logs_created_at ON application_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_logs_context ON application_logs USING GIN(context);

-- System health metrics table
CREATE TABLE IF NOT EXISTS system_health_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(20) NOT NULL,
    instance_id VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for system health metrics
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_name ON system_health_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_created_at ON system_health_metrics(created_at DESC);

-- Alert rules table for automated monitoring
CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('error_rate', 'performance_threshold', 'system_health', 'security_event')),
    condition_query TEXT NOT NULL,
    threshold_value NUMERIC NOT NULL,
    time_window_minutes INTEGER DEFAULT 60,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    notification_channels TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggered alerts table
CREATE TABLE IF NOT EXISTS triggered_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_rule_id UUID NOT NULL REFERENCES alert_rules(id),
    trigger_value NUMERIC NOT NULL,
    threshold_value NUMERIC NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for alerts
CREATE INDEX IF NOT EXISTS idx_triggered_alerts_rule_id ON triggered_alerts(alert_rule_id);
CREATE INDEX IF NOT EXISTS idx_triggered_alerts_created_at ON triggered_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_triggered_alerts_unresolved ON triggered_alerts(resolved) WHERE resolved = false;

-- Function to get error dashboard data
CREATE OR REPLACE FUNCTION get_error_dashboard(p_hours INTEGER DEFAULT 24)
RETURNS TABLE(
    total_errors INTEGER,
    critical_errors INTEGER,
    high_errors INTEGER,
    medium_errors INTEGER,
    low_errors INTEGER,
    error_rate_per_hour NUMERIC,
    top_error_types JSONB,
    recent_critical_errors JSONB,
    performance_summary JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH error_stats AS (
        SELECT 
            COUNT(*)::INTEGER as total,
            COUNT(*) FILTER (WHERE severity = 'critical')::INTEGER as critical,
            COUNT(*) FILTER (WHERE severity = 'high')::INTEGER as high,
            COUNT(*) FILTER (WHERE severity = 'medium')::INTEGER as medium,
            COUNT(*) FILTER (WHERE severity = 'low')::INTEGER as low,
            (COUNT(*)::NUMERIC / GREATEST(p_hours, 1)) as rate_per_hour
        FROM error_reports 
        WHERE created_at > NOW() - (p_hours || ' hours')::INTERVAL
    ),
    top_errors AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'error_type', error_type,
                'count', count,
                'severity', severity
            ) ORDER BY count DESC
        ) as top_types
        FROM (
            SELECT error_type, severity, COUNT(*) as count
            FROM error_reports 
            WHERE created_at > NOW() - (p_hours || ' hours')::INTERVAL
            GROUP BY error_type, severity
            ORDER BY count DESC
            LIMIT 10
        ) t
    ),
    recent_critical AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', id,
                'error_type', error_type,
                'message', message,
                'created_at', created_at,
                'user_id', user_id,
                'app_version', app_version,
                'tags', tags
            ) ORDER BY created_at DESC
        ) as recent
        FROM (
            SELECT id, error_type, message, created_at, user_id, app_version, tags
            FROM error_reports 
            WHERE severity = 'critical' 
            AND created_at > NOW() - (p_hours || ' hours')::INTERVAL
            ORDER BY created_at DESC
            LIMIT 20
        ) t
    ),
    perf_summary AS (
        SELECT jsonb_build_object(
            'avg_api_response_time', COALESCE(AVG(value) FILTER (WHERE metric_type = 'api_call'), 0),
            'avg_screen_load_time', COALESCE(AVG(value) FILTER (WHERE metric_type = 'screen_load'), 0),
            'total_performance_metrics', COUNT(*),
            'slow_operations', COUNT(*) FILTER (WHERE value > 5000 AND unit = 'ms')
        ) as summary
        FROM performance_metrics
        WHERE created_at > NOW() - (p_hours || ' hours')::INTERVAL
    )
    SELECT 
        es.total,
        es.critical,
        es.high,
        es.medium,
        es.low,
        es.rate_per_hour,
        COALESCE(te.top_types, '[]'::jsonb),
        COALESCE(rc.recent, '[]'::jsonb),
        ps.summary
    FROM error_stats es
    CROSS JOIN top_errors te
    CROSS JOIN recent_critical rc
    CROSS JOIN perf_summary ps;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get performance insights
CREATE OR REPLACE FUNCTION get_performance_insights(p_hours INTEGER DEFAULT 24)
RETURNS TABLE(
    metric_type VARCHAR(50),
    metric_name VARCHAR(100),
    avg_value NUMERIC,
    min_value NUMERIC,
    max_value NUMERIC,
    p95_value NUMERIC,
    sample_count INTEGER,
    unit VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pm.metric_type,
        pm.metric_name,
        AVG(pm.value) as avg_value,
        MIN(pm.value) as min_value,
        MAX(pm.value) as max_value,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY pm.value) as p95_value,
        COUNT(*)::INTEGER as sample_count,
        pm.unit
    FROM performance_metrics pm
    WHERE pm.created_at > NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY pm.metric_type, pm.metric_name, pm.unit
    ORDER BY avg_value DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to resolve error
CREATE OR REPLACE FUNCTION resolve_error(
    p_error_id UUID,
    p_resolved_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_affected_rows INTEGER;
BEGIN
    UPDATE error_reports 
    SET 
        resolved = true,
        resolved_at = NOW(),
        resolved_by = p_resolved_by,
        updated_at = NOW()
    WHERE id = p_error_id
    AND resolved = false;
    
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    
    -- Log the resolution
    IF v_affected_rows > 0 THEN
        INSERT INTO application_logs (
            level,
            message,
            category,
            context,
            user_id
        ) VALUES (
            'info',
            'Error resolved',
            'error_management',
            jsonb_build_object(
                'error_id', p_error_id,
                'resolved_by', p_resolved_by
            ),
            p_resolved_by
        );
        
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check alert rules
CREATE OR REPLACE FUNCTION check_alert_rules()
RETURNS INTEGER AS $$
DECLARE
    rule RECORD;
    trigger_value NUMERIC;
    alerts_triggered INTEGER := 0;
BEGIN
    -- Check each active alert rule
    FOR rule IN SELECT * FROM alert_rules WHERE is_active = true LOOP
        -- Execute the condition query
        EXECUTE rule.condition_query INTO trigger_value USING rule.time_window_minutes;
        
        -- Check if threshold is exceeded
        IF trigger_value >= rule.threshold_value THEN
            -- Check if we haven't already triggered this alert recently
            IF NOT EXISTS (
                SELECT 1 FROM triggered_alerts 
                WHERE alert_rule_id = rule.id 
                AND resolved = false
                AND created_at > NOW() - (rule.time_window_minutes || ' minutes')::INTERVAL
            ) THEN
                -- Trigger new alert
                INSERT INTO triggered_alerts (
                    alert_rule_id,
                    trigger_value,
                    threshold_value,
                    message,
                    metadata
                ) VALUES (
                    rule.id,
                    trigger_value,
                    rule.threshold_value,
                    format('Alert: %s exceeded threshold (%.2f >= %.2f)', 
                           rule.rule_name, trigger_value, rule.threshold_value),
                    jsonb_build_object(
                        'rule_name', rule.rule_name,
                        'rule_type', rule.rule_type,
                        'time_window_minutes', rule.time_window_minutes
                    )
                );
                
                alerts_triggered := alerts_triggered + 1;
                
                -- Send notification (placeholder for actual notification system)
                PERFORM pg_notify(
                    'alert_triggered',
                    json_build_object(
                        'rule_name', rule.rule_name,
                        'severity', rule.severity,
                        'trigger_value', trigger_value,
                        'threshold_value', rule.threshold_value,
                        'message', format('Alert: %s exceeded threshold', rule.rule_name)
                    )::text
                );
            END IF;
        END IF;
    END LOOP;
    
    RETURN alerts_triggered;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default alert rules
INSERT INTO alert_rules (rule_name, rule_type, condition_query, threshold_value, time_window_minutes, severity, notification_channels) VALUES
('high_error_rate', 'error_rate', 'SELECT COUNT(*) FROM error_reports WHERE created_at > NOW() - ($1 || '' minutes'')::INTERVAL', 50, 60, 'high', ARRAY['email', 'slack']),
('critical_errors', 'error_rate', 'SELECT COUNT(*) FROM error_reports WHERE severity = ''critical'' AND created_at > NOW() - ($1 || '' minutes'')::INTERVAL', 1, 15, 'critical', ARRAY['email', 'slack', 'sms']),
('slow_api_calls', 'performance_threshold', 'SELECT COUNT(*) FROM performance_metrics WHERE metric_type = ''api_call'' AND value > 10000 AND created_at > NOW() - ($1 || '' minutes'')::INTERVAL', 10, 30, 'medium', ARRAY['email']),
('memory_usage_high', 'system_health', 'SELECT COALESCE(MAX(metric_value), 0) FROM system_health_metrics WHERE metric_name = ''memory_usage_percent'' AND created_at > NOW() - ($1 || '' minutes'')::INTERVAL', 85, 15, 'high', ARRAY['email', 'slack'])
ON CONFLICT (rule_name) DO NOTHING;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to relevant tables
DROP TRIGGER IF EXISTS trigger_error_reports_updated_at ON error_reports;
CREATE TRIGGER trigger_error_reports_updated_at
    BEFORE UPDATE ON error_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_alert_rules_updated_at ON alert_rules;
CREATE TRIGGER trigger_alert_rules_updated_at
    BEFORE UPDATE ON alert_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE error_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_logs ENABLE ROW LEVEL SECURITY;

-- Users can see their own errors and metrics
CREATE POLICY "error_reports_user_own" ON error_reports
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "performance_metrics_user_own" ON performance_metrics
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "application_logs_user_own" ON application_logs
    FOR SELECT USING (user_id = auth.uid());

-- Admins can see all monitoring data
CREATE POLICY "error_reports_admin_access" ON error_reports
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
            AND ur.is_active = true
        )
    );

CREATE POLICY "performance_metrics_admin_access" ON performance_metrics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
            AND ur.is_active = true
        )
    );

CREATE POLICY "application_logs_admin_access" ON application_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
            AND ur.is_active = true
        )
    );

-- Allow authenticated users to insert their own monitoring data
CREATE POLICY "error_reports_insert_own" ON error_reports
    FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "performance_metrics_insert_own" ON performance_metrics
    FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "application_logs_insert_own" ON application_logs
    FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Grant necessary permissions
GRANT SELECT, INSERT ON error_reports TO authenticated;
GRANT SELECT, INSERT ON performance_metrics TO authenticated;
GRANT SELECT, INSERT ON application_logs TO authenticated;
GRANT SELECT ON system_health_metrics TO authenticated;
GRANT SELECT ON alert_rules TO authenticated;
GRANT SELECT ON triggered_alerts TO authenticated;

GRANT EXECUTE ON FUNCTION get_error_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_insights TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_error TO authenticated;

-- Create scheduled job to check alert rules (if pg_cron is available)
-- SELECT cron.schedule('check-alert-rules', '*/5 * * * *', 'SELECT check_alert_rules();');

-- Create materialized view for error trends
CREATE MATERIALIZED VIEW IF NOT EXISTS error_trends AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    error_type,
    severity,
    COUNT(*) as error_count,
    COUNT(DISTINCT user_id) as affected_users
FROM error_reports
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at), error_type, severity
ORDER BY hour DESC;

-- Index for the materialized view
CREATE INDEX IF NOT EXISTS idx_error_trends_hour ON error_trends(hour DESC);

-- Refresh the materialized view periodically
-- SELECT cron.schedule('refresh-error-trends', '0 * * * *', 'REFRESH MATERIALIZED VIEW error_trends;');

COMMENT ON TABLE error_reports IS 'Application error reports and crash logs';
COMMENT ON TABLE performance_metrics IS 'Application performance metrics and timing data';
COMMENT ON TABLE application_logs IS 'Application event logs and debugging information';
COMMENT ON TABLE system_health_metrics IS 'System-level health and resource usage metrics';
COMMENT ON TABLE alert_rules IS 'Configurable alert rules for automated monitoring';
COMMENT ON TABLE triggered_alerts IS 'Alerts that have been triggered by monitoring rules';