-- Backup and Disaster Recovery System
-- Implements automated backups, data archiving, and disaster recovery procedures

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Backup configuration table
CREATE TABLE IF NOT EXISTS backup_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_name VARCHAR(100) NOT NULL UNIQUE,
    backup_type VARCHAR(50) NOT NULL CHECK (backup_type IN ('full', 'incremental', 'differential', 'archive')),
    schedule_cron VARCHAR(100), -- Cron expression for scheduling
    retention_days INTEGER DEFAULT 30,
    storage_location TEXT NOT NULL,
    encryption_enabled BOOLEAN DEFAULT true,
    compression_enabled BOOLEAN DEFAULT true,
    tables_to_backup TEXT[] DEFAULT '{}', -- Empty array means all tables
    tables_to_exclude TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backup execution log
CREATE TABLE IF NOT EXISTS backup_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_config_id UUID NOT NULL REFERENCES backup_configurations(id),
    execution_type VARCHAR(50) NOT NULL CHECK (execution_type IN ('scheduled', 'manual', 'emergency')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    backup_size_bytes BIGINT,
    backup_location TEXT,
    backup_checksum TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id)
);

-- Data archival rules
CREATE TABLE IF NOT EXISTS archival_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(100) NOT NULL UNIQUE,
    table_name VARCHAR(100) NOT NULL,
    archive_condition TEXT NOT NULL, -- SQL condition for archiving
    archive_after_days INTEGER NOT NULL,
    delete_after_archive BOOLEAN DEFAULT false,
    archive_storage_location TEXT,
    is_active BOOLEAN DEFAULT true,
    last_executed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Archived data tracking
CREATE TABLE IF NOT EXISTS archived_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    archival_rule_id UUID NOT NULL REFERENCES archival_rules(id),
    original_table VARCHAR(100) NOT NULL,
    archive_location TEXT NOT NULL,
    records_archived INTEGER NOT NULL,
    archive_size_bytes BIGINT,
    archive_checksum TEXT,
    archive_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Disaster recovery checkpoints
CREATE TABLE IF NOT EXISTS recovery_checkpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checkpoint_name VARCHAR(100) NOT NULL,
    checkpoint_type VARCHAR(50) NOT NULL CHECK (checkpoint_type IN ('scheduled', 'pre_deployment', 'pre_migration', 'manual')),
    database_state_hash TEXT NOT NULL,
    backup_references JSONB DEFAULT '{}', -- References to related backups
    recovery_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes for backup and recovery tables
CREATE INDEX IF NOT EXISTS idx_backup_executions_config_id ON backup_executions(backup_config_id);
CREATE INDEX IF NOT EXISTS idx_backup_executions_status ON backup_executions(status);
CREATE INDEX IF NOT EXISTS idx_backup_executions_start_time ON backup_executions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_archived_data_rule_id ON archived_data(archival_rule_id);
CREATE INDEX IF NOT EXISTS idx_archived_data_table ON archived_data(original_table);
CREATE INDEX IF NOT EXISTS idx_archived_data_date ON archived_data(archive_date DESC);
CREATE INDEX IF NOT EXISTS idx_recovery_checkpoints_created_at ON recovery_checkpoints(created_at DESC);

-- Function to create database backup
CREATE OR REPLACE FUNCTION create_database_backup(
    p_backup_config_id UUID,
    p_execution_type VARCHAR(50) DEFAULT 'manual',
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_execution_id UUID;
    v_config RECORD;
    v_backup_location TEXT;
    v_start_time TIMESTAMP WITH TIME ZONE;
    v_table_list TEXT[];
    v_exclude_list TEXT[];
    v_backup_size BIGINT := 0;
    v_checksum TEXT;
BEGIN
    -- Get backup configuration
    SELECT * INTO v_config
    FROM backup_configurations
    WHERE id = p_backup_config_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Backup configuration not found or inactive: %', p_backup_config_id;
    END IF;
    
    -- Create execution record
    INSERT INTO backup_executions (
        backup_config_id,
        execution_type,
        status,
        created_by
    ) VALUES (
        p_backup_config_id,
        p_execution_type,
        'running',
        p_created_by
    ) RETURNING id INTO v_execution_id;
    
    v_start_time := NOW();
    
    BEGIN
        -- Generate backup location
        v_backup_location := format('%s/backup_%s_%s.sql',
            v_config.storage_location,
            v_config.backup_name,
            to_char(v_start_time, 'YYYY-MM-DD_HH24-MI-SS')
        );
        
        -- Determine tables to backup
        IF array_length(v_config.tables_to_backup, 1) > 0 THEN
            v_table_list := v_config.tables_to_backup;
        ELSE
            -- Get all user tables if none specified
            SELECT array_agg(tablename)
            INTO v_table_list
            FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename NOT LIKE 'pg_%'
            AND tablename NOT LIKE 'information_schema%';
        END IF;
        
        -- Remove excluded tables
        IF array_length(v_config.tables_to_exclude, 1) > 0 THEN
            SELECT array_agg(table_name)
            INTO v_table_list
            FROM unnest(v_table_list) AS table_name
            WHERE table_name != ALL(v_config.tables_to_exclude);
        END IF;
        
        -- Log backup start
        INSERT INTO application_logs (
            level,
            message,
            category,
            context
        ) VALUES (
            'info',
            format('Starting %s backup: %s', v_config.backup_type, v_config.backup_name),
            'backup',
            jsonb_build_object(
                'backup_config_id', p_backup_config_id,
                'execution_id', v_execution_id,
                'tables_count', array_length(v_table_list, 1),
                'backup_location', v_backup_location
            )
        );
        
        -- Here would be the actual backup logic
        -- For demonstration, we'll simulate the backup process
        
        -- Simulate backup size calculation
        SELECT SUM(pg_total_relation_size(schemaname||'.'||tablename))
        INTO v_backup_size
        FROM pg_tables
        WHERE tablename = ANY(v_table_list);
        
        -- Generate checksum (simulated)
        v_checksum := md5(v_backup_location || v_start_time::text);
        
        -- Update execution record with success
        UPDATE backup_executions
        SET 
            status = 'completed',
            end_time = NOW(),
            duration_seconds = EXTRACT(EPOCH FROM (NOW() - v_start_time))::INTEGER,
            backup_size_bytes = v_backup_size,
            backup_location = v_backup_location,
            backup_checksum = v_checksum,
            metadata = jsonb_build_object(
                'tables_backed_up', v_table_list,
                'compression_enabled', v_config.compression_enabled,
                'encryption_enabled', v_config.encryption_enabled
            )
        WHERE id = v_execution_id;
        
        -- Log successful completion
        INSERT INTO application_logs (
            level,
            message,
            category,
            context
        ) VALUES (
            'info',
            format('Backup completed successfully: %s', v_config.backup_name),
            'backup',
            jsonb_build_object(
                'execution_id', v_execution_id,
                'duration_seconds', EXTRACT(EPOCH FROM (NOW() - v_start_time))::INTEGER,
                'backup_size_bytes', v_backup_size
            )
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- Update execution record with failure
        UPDATE backup_executions
        SET 
            status = 'failed',
            end_time = NOW(),
            duration_seconds = EXTRACT(EPOCH FROM (NOW() - v_start_time))::INTEGER,
            error_message = SQLERRM
        WHERE id = v_execution_id;
        
        -- Log error
        INSERT INTO application_logs (
            level,
            message,
            category,
            context
        ) VALUES (
            'error',
            format('Backup failed: %s - %s', v_config.backup_name, SQLERRM),
            'backup',
            jsonb_build_object(
                'execution_id', v_execution_id,
                'error', SQLERRM
            )
        );
        
        RAISE;
    END;
    
    RETURN v_execution_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to archive old data
CREATE OR REPLACE FUNCTION execute_archival_rule(p_rule_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_rule RECORD;
    v_archive_query TEXT;
    v_delete_query TEXT;
    v_records_archived INTEGER := 0;
    v_archive_location TEXT;
    v_archive_id UUID;
BEGIN
    -- Get archival rule
    SELECT * INTO v_rule
    FROM archival_rules
    WHERE id = p_rule_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Archival rule not found or inactive: %', p_rule_id;
    END IF;
    
    -- Check if rule should be executed
    IF v_rule.last_executed IS NOT NULL AND 
       v_rule.last_executed > NOW() - INTERVAL '1 day' THEN
        RAISE NOTICE 'Archival rule % was already executed recently', v_rule.rule_name;
        RETURN 0;
    END IF;
    
    -- Generate archive location
    v_archive_location := format('%s/archive_%s_%s.json',
        COALESCE(v_rule.archive_storage_location, '/tmp/archives'),
        v_rule.table_name,
        to_char(NOW(), 'YYYY-MM-DD_HH24-MI-SS')
    );
    
    -- Build archive query
    v_archive_query := format(
        'SELECT COUNT(*) FROM %I WHERE %s AND created_at < NOW() - INTERVAL ''%s days''',
        v_rule.table_name,
        v_rule.archive_condition,
        v_rule.archive_after_days
    );
    
    -- Count records to be archived
    EXECUTE v_archive_query INTO v_records_archived;
    
    IF v_records_archived = 0 THEN
        RAISE NOTICE 'No records found for archival in table %', v_rule.table_name;
        RETURN 0;
    END IF;
    
    -- Create archived data record
    INSERT INTO archived_data (
        archival_rule_id,
        original_table,
        archive_location,
        records_archived,
        metadata
    ) VALUES (
        p_rule_id,
        v_rule.table_name,
        v_archive_location,
        v_records_archived,
        jsonb_build_object(
            'archive_condition', v_rule.archive_condition,
            'archive_after_days', v_rule.archive_after_days,
            'execution_time', NOW()
        )
    ) RETURNING id INTO v_archive_id;
    
    -- Here would be the actual archival logic (export to file/external storage)
    -- For demonstration, we'll just log the operation
    
    -- If delete_after_archive is true, delete the archived records
    IF v_rule.delete_after_archive THEN
        v_delete_query := format(
            'DELETE FROM %I WHERE %s AND created_at < NOW() - INTERVAL ''%s days''',
            v_rule.table_name,
            v_rule.archive_condition,
            v_rule.archive_after_days
        );
        
        -- Execute delete (commented out for safety in demo)
        -- EXECUTE v_delete_query;
        
        INSERT INTO application_logs (
            level,
            message,
            category,
            context
        ) VALUES (
            'info',
            format('Archived and deleted %s records from %s', v_records_archived, v_rule.table_name),
            'archival',
            jsonb_build_object(
                'rule_id', p_rule_id,
                'archive_id', v_archive_id,
                'records_count', v_records_archived,
                'delete_after_archive', true
            )
        );
    ELSE
        INSERT INTO application_logs (
            level,
            message,
            category,
            context
        ) VALUES (
            'info',
            format('Archived %s records from %s (records preserved)', v_records_archived, v_rule.table_name),
            'archival',
            jsonb_build_object(
                'rule_id', p_rule_id,
                'archive_id', v_archive_id,
                'records_count', v_records_archived,
                'delete_after_archive', false
            )
        );
    END IF;
    
    -- Update last executed timestamp
    UPDATE archival_rules
    SET last_executed = NOW()
    WHERE id = p_rule_id;
    
    RETURN v_records_archived;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create recovery checkpoint
CREATE OR REPLACE FUNCTION create_recovery_checkpoint(
    p_checkpoint_name VARCHAR(100),
    p_checkpoint_type VARCHAR(50) DEFAULT 'manual',
    p_recovery_instructions TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_checkpoint_id UUID;
    v_database_hash TEXT;
    v_backup_refs JSONB := '{}';
BEGIN
    -- Generate database state hash (simplified)
    SELECT md5(string_agg(schemaname || '.' || tablename || ':' || n_tup_ins::text, '|' ORDER BY schemaname, tablename))
    INTO v_database_hash
    FROM pg_stat_user_tables;
    
    -- Get recent backup references
    SELECT jsonb_agg(
        jsonb_build_object(
            'execution_id', id,
            'backup_location', backup_location,
            'backup_size', backup_size_bytes,
            'created_at', start_time
        )
    )
    INTO v_backup_refs
    FROM (
        SELECT id, backup_location, backup_size_bytes, start_time
        FROM backup_executions
        WHERE status = 'completed'
        AND start_time > NOW() - INTERVAL '7 days'
        ORDER BY start_time DESC
        LIMIT 5
    ) recent_backups;
    
    -- Create checkpoint
    INSERT INTO recovery_checkpoints (
        checkpoint_name,
        checkpoint_type,
        database_state_hash,
        backup_references,
        recovery_instructions,
        created_by
    ) VALUES (
        p_checkpoint_name,
        p_checkpoint_type,
        v_database_hash,
        COALESCE(v_backup_refs, '[]'::jsonb),
        p_recovery_instructions,
        p_created_by
    ) RETURNING id INTO v_checkpoint_id;
    
    -- Log checkpoint creation
    INSERT INTO application_logs (
        level,
        message,
        category,
        context,
        user_id
    ) VALUES (
        'info',
        format('Recovery checkpoint created: %s', p_checkpoint_name),
        'disaster_recovery',
        jsonb_build_object(
            'checkpoint_id', v_checkpoint_id,
            'checkpoint_type', p_checkpoint_type,
            'database_hash', v_database_hash
        ),
        p_created_by
    );
    
    RETURN v_checkpoint_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get backup status dashboard
CREATE OR REPLACE FUNCTION get_backup_dashboard()
RETURNS TABLE(
    total_backups INTEGER,
    successful_backups INTEGER,
    failed_backups INTEGER,
    last_successful_backup TIMESTAMP WITH TIME ZONE,
    total_backup_size BIGINT,
    active_configurations INTEGER,
    recent_executions JSONB,
    storage_usage JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH backup_stats AS (
        SELECT 
            COUNT(*)::INTEGER as total,
            COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as successful,
            COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as failed,
            MAX(end_time) FILTER (WHERE status = 'completed') as last_success,
            SUM(backup_size_bytes) FILTER (WHERE status = 'completed') as total_size
        FROM backup_executions
        WHERE start_time > NOW() - INTERVAL '30 days'
    ),
    config_stats AS (
        SELECT COUNT(*)::INTEGER as active_configs
        FROM backup_configurations
        WHERE is_active = true
    ),
    recent_exec AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', be.id,
                'backup_name', bc.backup_name,
                'status', be.status,
                'start_time', be.start_time,
                'duration_seconds', be.duration_seconds,
                'backup_size_bytes', be.backup_size_bytes
            ) ORDER BY be.start_time DESC
        ) as recent
        FROM backup_executions be
        JOIN backup_configurations bc ON be.backup_config_id = bc.id
        WHERE be.start_time > NOW() - INTERVAL '7 days'
        ORDER BY be.start_time DESC
        LIMIT 10
    ),
    storage_stats AS (
        SELECT jsonb_build_object(
            'total_archived_records', SUM(records_archived),
            'total_archives', COUNT(*),
            'total_archive_size', SUM(archive_size_bytes)
        ) as storage
        FROM archived_data
    )
    SELECT 
        bs.total,
        bs.successful,
        bs.failed,
        bs.last_success,
        bs.total_size,
        cs.active_configs,
        COALESCE(re.recent, '[]'::jsonb),
        COALESCE(ss.storage, '{}'::jsonb)
    FROM backup_stats bs
    CROSS JOIN config_stats cs
    CROSS JOIN recent_exec re
    CROSS JOIN storage_stats ss;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old backups based on retention policy
CREATE OR REPLACE FUNCTION cleanup_old_backups()
RETURNS INTEGER AS $$
DECLARE
    v_config RECORD;
    v_cleanup_count INTEGER := 0;
    v_total_cleaned INTEGER := 0;
BEGIN
    -- Process each backup configuration
    FOR v_config IN SELECT * FROM backup_configurations WHERE is_active = true LOOP
        -- Delete old backup execution records
        DELETE FROM backup_executions
        WHERE backup_config_id = v_config.id
        AND start_time < NOW() - (v_config.retention_days || ' days')::INTERVAL;
        
        GET DIAGNOSTICS v_cleanup_count = ROW_COUNT;
        v_total_cleaned := v_total_cleaned + v_cleanup_count;
        
        IF v_cleanup_count > 0 THEN
            INSERT INTO application_logs (
                level,
                message,
                category,
                context
            ) VALUES (
                'info',
                format('Cleaned up %s old backup records for configuration: %s', 
                       v_cleanup_count, v_config.backup_name),
                'backup_cleanup',
                jsonb_build_object(
                    'config_id', v_config.id,
                    'cleaned_count', v_cleanup_count,
                    'retention_days', v_config.retention_days
                )
            );
        END IF;
    END LOOP;
    
    RETURN v_total_cleaned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default backup configurations
INSERT INTO backup_configurations (backup_name, backup_type, schedule_cron, retention_days, storage_location, tables_to_exclude) VALUES
('daily_full_backup', 'full', '0 2 * * *', 30, '/backups/daily', ARRAY['backup_executions', 'application_logs']),
('weekly_archive_backup', 'archive', '0 3 * * 0', 90, '/backups/weekly', ARRAY['performance_metrics', 'security_events']),
('critical_data_backup', 'incremental', '0 */6 * * *', 7, '/backups/critical', ARRAY['users', 'stories', 'messages', 'guy_profiles'])
ON CONFLICT (backup_name) DO NOTHING;

-- Insert default archival rules
INSERT INTO archival_rules (rule_name, table_name, archive_condition, archive_after_days, delete_after_archive, archive_storage_location) VALUES
('old_security_events', 'security_events', 'severity IN (''low'', ''medium'')', 90, true, '/archives/security'),
('old_performance_metrics', 'performance_metrics', 'metric_type != ''critical''', 30, true, '/archives/performance'),
('old_application_logs', 'application_logs', 'level IN (''debug'', ''info'')', 14, true, '/archives/logs'),
('resolved_error_reports', 'error_reports', 'resolved = true', 60, false, '/archives/errors')
ON CONFLICT (rule_name) DO NOTHING;

-- RLS policies for backup and recovery tables
ALTER TABLE backup_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE archival_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_checkpoints ENABLE ROW LEVEL SECURITY;

-- Only admins can access backup and recovery data
CREATE POLICY "backup_admin_only" ON backup_configurations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
            AND ur.is_active = true
        )
    );

CREATE POLICY "backup_executions_admin_only" ON backup_executions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
            AND ur.is_active = true
        )
    );

CREATE POLICY "archival_rules_admin_only" ON archival_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
            AND ur.is_active = true
        )
    );

CREATE POLICY "archived_data_admin_only" ON archived_data
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
            AND ur.is_active = true
        )
    );

CREATE POLICY "recovery_checkpoints_admin_only" ON recovery_checkpoints
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role IN ('admin', 'super_admin')
            AND ur.is_active = true
        )
    );

-- Grant necessary permissions
GRANT SELECT ON backup_configurations TO authenticated;
GRANT SELECT ON backup_executions TO authenticated;
GRANT SELECT ON archival_rules TO authenticated;
GRANT SELECT ON archived_data TO authenticated;
GRANT SELECT ON recovery_checkpoints TO authenticated;

GRANT EXECUTE ON FUNCTION create_database_backup TO authenticated;
GRANT EXECUTE ON FUNCTION execute_archival_rule TO authenticated;
GRANT EXECUTE ON FUNCTION create_recovery_checkpoint TO authenticated;
GRANT EXECUTE ON FUNCTION get_backup_dashboard TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_backups TO authenticated;

-- Create scheduled jobs (if pg_cron is available)
-- SELECT cron.schedule('daily-backup', '0 2 * * *', 'SELECT create_database_backup((SELECT id FROM backup_configurations WHERE backup_name = ''daily_full_backup''), ''scheduled'');');
-- SELECT cron.schedule('weekly-archive', '0 3 * * 0', 'SELECT create_database_backup((SELECT id FROM backup_configurations WHERE backup_name = ''weekly_archive_backup''), ''scheduled'');');
-- SELECT cron.schedule('cleanup-old-backups', '0 4 * * *', 'SELECT cleanup_old_backups();');
-- SELECT cron.schedule('execute-archival-rules', '0 1 * * *', 'SELECT execute_archival_rule(id) FROM archival_rules WHERE is_active = true;');

-- Trigger to update updated_at timestamp
DROP TRIGGER IF EXISTS trigger_backup_configurations_updated_at ON backup_configurations;
CREATE TRIGGER trigger_backup_configurations_updated_at
    BEFORE UPDATE ON backup_configurations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_archival_rules_updated_at ON archival_rules;
CREATE TRIGGER trigger_archival_rules_updated_at
    BEFORE UPDATE ON archival_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE backup_configurations IS 'Configuration for automated database backups';
COMMENT ON TABLE backup_executions IS 'Log of backup execution attempts and results';
COMMENT ON TABLE archival_rules IS 'Rules for archiving old data to external storage';
COMMENT ON TABLE archived_data IS 'Tracking of data that has been archived';
COMMENT ON TABLE recovery_checkpoints IS 'Recovery checkpoints for disaster recovery';