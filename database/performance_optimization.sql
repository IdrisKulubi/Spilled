-- TeaKE Database Performance Optimization
-- Indexes, query optimization, and connection pooling

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_verification_status ON users(verification_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_verified_at ON users(verified_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Guys table indexes (for search performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guys_name_trgm ON guys USING gin(name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guys_phone_trgm ON guys USING gin(phone gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guys_socials_trgm ON guys USING gin(socials gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guys_location ON guys(location);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guys_age ON guys(age);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guys_created_by_user_id ON guys(created_by_user_id);

-- Full-text search index for guys
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_guys_search_vector ON guys 
USING gin(to_tsvector('english', 
    COALESCE(name, '') || ' ' || 
    COALESCE(phone, '') || ' ' || 
    COALESCE(socials, '') || ' ' ||
    COALESCE(location, '')
));

-- Stories table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stories_guy_id ON stories(guy_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stories_created_at_desc ON stories(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stories_tags ON stories USING gin(tags);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stories_anonymous ON stories(anonymous);

-- Composite index for story feed queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stories_feed ON stories(created_at DESC, guy_id);

-- Comments table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_story_id ON comments(story_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- Messages table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_receiver_sender ON messages(receiver_id, sender_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_expires_at ON messages(expires_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Composite index for message threads
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_thread ON messages(
    LEAST(sender_id, receiver_id), 
    GREATEST(sender_id, receiver_id), 
    created_at DESC
);

-- Rate limits table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_user_action_window ON rate_limits(user_id, action, window_start);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rate_limits_cleanup ON rate_limits(window_start);

-- Audit logs indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_id_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_action_created ON audit_logs(action, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- User sessions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user_active ON user_sessions(user_id, is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity);

-- ============================================================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- ============================================================================

-- Materialized view for guy statistics (updated periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS guy_stats AS
SELECT 
    g.id,
    g.name,
    g.phone,
    g.socials,
    g.location,
    g.age,
    g.created_at,
    COUNT(s.id) as story_count,
    COUNT(DISTINCT s.user_id) as unique_reporters,
    AVG(CASE 
        WHEN 'red_flag' = ANY(s.tags) THEN 1 
        ELSE 0 
    END) as red_flag_ratio,
    AVG(CASE 
        WHEN 'good_vibes' = ANY(s.tags) THEN 1 
        ELSE 0 
    END) as good_vibes_ratio,
    MAX(s.created_at) as last_story_date
FROM guys g
LEFT JOIN stories s ON g.id = s.guy_id
GROUP BY g.id, g.name, g.phone, g.socials, g.location, g.age, g.created_at;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_guy_stats_id ON guy_stats(id);
CREATE INDEX IF NOT EXISTS idx_guy_stats_story_count ON guy_stats(story_count DESC);
CREATE INDEX IF NOT EXISTS idx_guy_stats_red_flag_ratio ON guy_stats(red_flag_ratio DESC);

-- Materialized view for user activity stats
CREATE MATERIALIZED VIEW IF NOT EXISTS user_activity_stats AS
SELECT 
    u.id,
    u.nickname,
    u.verification_status,
    u.created_at,
    COUNT(DISTINCT s.id) as stories_count,
    COUNT(DISTINCT c.id) as comments_count,
    COUNT(DISTINCT m.id) as messages_sent,
    MAX(GREATEST(s.created_at, c.created_at, m.created_at)) as last_activity
FROM users u
LEFT JOIN stories s ON u.id = s.user_id
LEFT JOIN comments c ON u.id = c.user_id
LEFT JOIN messages m ON u.id = m.sender_id
GROUP BY u.id, u.nickname, u.verification_status, u.created_at;

-- Index on user activity stats
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_activity_stats_id ON user_activity_stats(id);
CREATE INDEX IF NOT EXISTS idx_user_activity_stats_last_activity ON user_activity_stats(last_activity DESC);

-- ============================================================================
-- OPTIMIZED FUNCTIONS
-- ============================================================================

-- Optimized search function with full-text search
CREATE OR REPLACE FUNCTION search_guys_optimized(
    search_query TEXT DEFAULT NULL,
    search_location TEXT DEFAULT NULL,
    min_age INTEGER DEFAULT NULL,
    max_age INTEGER DEFAULT NULL,
    min_stories INTEGER DEFAULT 0,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    phone TEXT,
    socials TEXT,
    location TEXT,
    age INTEGER,
    created_at TIMESTAMP WITH TIME ZONE,
    story_count BIGINT,
    red_flag_ratio NUMERIC,
    good_vibes_ratio NUMERIC,
    last_story_date TIMESTAMP WITH TIME ZONE,
    search_rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gs.id,
        gs.name,
        gs.phone,
        gs.socials,
        gs.location,
        gs.age,
        gs.created_at,
        gs.story_count,
        gs.red_flag_ratio,
        gs.good_vibes_ratio,
        gs.last_story_date,
        CASE 
            WHEN search_query IS NOT NULL THEN
                ts_rank(
                    to_tsvector('english', 
                        COALESCE(gs.name, '') || ' ' || 
                        COALESCE(gs.phone, '') || ' ' || 
                        COALESCE(gs.socials, '') || ' ' ||
                        COALESCE(gs.location, '')
                    ),
                    plainto_tsquery('english', search_query)
                )
            ELSE 0.0
        END as search_rank
    FROM guy_stats gs
    WHERE 
        (search_query IS NULL OR 
         to_tsvector('english', 
            COALESCE(gs.name, '') || ' ' || 
            COALESCE(gs.phone, '') || ' ' || 
            COALESCE(gs.socials, '') || ' ' ||
            COALESCE(gs.location, '')
         ) @@ plainto_tsquery('english', search_query)) AND
        (search_location IS NULL OR gs.location ILIKE '%' || search_location || '%') AND
        (min_age IS NULL OR gs.age >= min_age) AND
        (max_age IS NULL OR gs.age <= max_age) AND
        gs.story_count >= min_stories
    ORDER BY 
        CASE WHEN search_query IS NOT NULL THEN search_rank ELSE 0 END DESC,
        gs.story_count DESC, 
        gs.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Optimized function to get story feed
CREATE OR REPLACE FUNCTION get_story_feed(
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0,
    tag_filter tag_type[] DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    guy_id UUID,
    guy_name TEXT,
    guy_location TEXT,
    text TEXT,
    tags tag_type[],
    image_url TEXT,
    anonymous BOOLEAN,
    nickname TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    comment_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.guy_id,
        g.name as guy_name,
        g.location as guy_location,
        s.text,
        s.tags,
        s.image_url,
        s.anonymous,
        s.nickname,
        s.created_at,
        COUNT(c.id) as comment_count
    FROM stories s
    JOIN guys g ON s.guy_id = g.id
    LEFT JOIN comments c ON s.id = c.story_id
    WHERE 
        tag_filter IS NULL OR s.tags && tag_filter
    GROUP BY s.id, g.name, g.location
    ORDER BY s.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user message threads (optimized)
CREATE OR REPLACE FUNCTION get_user_message_threads(p_user_id UUID)
RETURNS TABLE (
    other_user_id UUID,
    other_user_nickname TEXT,
    last_message_text TEXT,
    last_message_date TIMESTAMP WITH TIME ZONE,
    unread_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH message_threads AS (
        SELECT 
            CASE 
                WHEN sender_id = p_user_id THEN receiver_id 
                ELSE sender_id 
            END as other_user_id,
            MAX(created_at) as last_message_date,
            COUNT(*) FILTER (
                WHERE receiver_id = p_user_id AND created_at > COALESCE(
                    (SELECT last_activity FROM user_sessions 
                     WHERE user_id = p_user_id AND is_active = true 
                     ORDER BY last_activity DESC LIMIT 1), 
                    '1970-01-01'::timestamp
                )
            ) as unread_count
        FROM messages
        WHERE sender_id = p_user_id OR receiver_id = p_user_id
        GROUP BY other_user_id
    ),
    latest_messages AS (
        SELECT DISTINCT ON (
            LEAST(sender_id, receiver_id), 
            GREATEST(sender_id, receiver_id)
        )
            CASE 
                WHEN sender_id = p_user_id THEN receiver_id 
                ELSE sender_id 
            END as other_user_id,
            decrypt_data(text_encrypted) as message_text
        FROM messages
        WHERE sender_id = p_user_id OR receiver_id = p_user_id
        ORDER BY 
            LEAST(sender_id, receiver_id), 
            GREATEST(sender_id, receiver_id),
            created_at DESC
    )
    SELECT 
        mt.other_user_id,
        u.nickname as other_user_nickname,
        lm.message_text as last_message_text,
        mt.last_message_date,
        mt.unread_count
    FROM message_threads mt
    JOIN users u ON mt.other_user_id = u.id
    LEFT JOIN latest_messages lm ON mt.other_user_id = lm.other_user_id
    ORDER BY mt.last_message_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- MAINTENANCE FUNCTIONS
-- ============================================================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY guy_stats;
    REFRESH MATERIALIZED VIEW CONCURRENTLY user_activity_stats;
    
    -- Update statistics
    ANALYZE guy_stats;
    ANALYZE user_activity_stats;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze table statistics
CREATE OR REPLACE FUNCTION update_table_statistics()
RETURNS void AS $$
BEGIN
    ANALYZE users;
    ANALYZE guys;
    ANALYZE stories;
    ANALYZE comments;
    ANALYZE messages;
    ANALYZE rate_limits;
    ANALYZE audit_logs;
    ANALYZE user_sessions;
END;
$$ LANGUAGE plpgsql;

-- Function to get database performance metrics
CREATE OR REPLACE FUNCTION get_performance_metrics()
RETURNS TABLE (
    metric_name TEXT,
    metric_value TEXT,
    description TEXT
) AS $$
BEGIN
    -- Table sizes
    RETURN QUERY
    SELECT 
        'table_size_' || schemaname || '_' || tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        'Total size of table including indexes'
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
    
    -- Index usage
    RETURN QUERY
    SELECT 
        'index_usage_' || indexrelname,
        idx_scan::TEXT,
        'Number of index scans'
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC;
    
    -- Cache hit ratio
    RETURN QUERY
    SELECT 
        'cache_hit_ratio',
        ROUND(
            100.0 * sum(heap_blks_hit) / 
            NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 
            2
        )::TEXT || '%',
        'Percentage of reads served from cache'
    FROM pg_statio_user_tables;
END;
$$ LANGUAGE plpgsql;

-- Schedule materialized view refresh (every hour)
SELECT cron.schedule('refresh-materialized-views', '0 * * * *', 'SELECT refresh_materialized_views();');

-- Schedule statistics update (daily)
SELECT cron.schedule('update-table-statistics', '0 2 * * *', 'SELECT update_table_statistics();');

-- ============================================================================
-- CONNECTION POOLING CONFIGURATION
-- ============================================================================

-- Set optimal connection settings
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

-- Note: These settings require a PostgreSQL restart to take effect
-- In production, these should be set in postgresql.conf or via cloud provider settings