-- TeaKE Privacy and GDPR Compliance Tables

-- User privacy settings table
CREATE TABLE IF NOT EXISTS user_privacy_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    allow_data_collection BOOLEAN DEFAULT TRUE,
    allow_analytics BOOLEAN DEFAULT FALSE,
    allow_marketing BOOLEAN DEFAULT FALSE,
    data_retention_days INTEGER DEFAULT 365,
    consent_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Data processing log table (for GDPR compliance)
CREATE TABLE IF NOT EXISTS data_processing_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    activity TEXT NOT NULL,
    purpose TEXT NOT NULL,
    data_types TEXT[] NOT NULL,
    legal_basis TEXT NOT NULL DEFAULT 'consent',
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    retention_until TIMESTAMP WITH TIME ZONE
);

-- Data deletion requests table
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL CHECK (request_type IN ('full_deletion', 'anonymization', 'specific_data')),
    specific_data_types TEXT[], -- For partial deletion requests
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES users(id),
    notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_privacy_settings_user_id ON user_privacy_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_data_processing_log_user_id ON data_processing_log(user_id);
CREATE INDEX IF NOT EXISTS idx_data_processing_log_processed_at ON data_processing_log(processed_at);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON data_deletion_requests(status);

-- Enable RLS
ALTER TABLE user_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_processing_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for privacy settings
CREATE POLICY "Users can view own privacy settings" ON user_privacy_settings
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Users can update own privacy settings" ON user_privacy_settings
    FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for data processing log
CREATE POLICY "Users can view own processing log" ON data_processing_log
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "System can insert processing log" ON data_processing_log
    FOR INSERT WITH CHECK (true);

-- RLS Policies for deletion requests
CREATE POLICY "Users can view own deletion requests" ON data_deletion_requests
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Users can create deletion requests" ON data_deletion_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update deletion requests" ON data_deletion_requests
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Function to anonymize user data (partial deletion)
CREATE OR REPLACE FUNCTION anonymize_user_data(p_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Only allow self-anonymization or admin anonymization
    IF auth.uid() != p_user_id AND NOT check_user_permission(auth.uid(), 'admin_access') THEN
        RAISE EXCEPTION 'Insufficient permissions to anonymize user data';
    END IF;
    
    -- Log the anonymization
    PERFORM log_audit_event(
        auth.uid(),
        'ANONYMIZE_USER',
        'users',
        p_user_id,
        NULL,
        jsonb_build_object('anonymized_user_id', p_user_id)
    );
    
    -- Anonymize user profile (keep account but remove PII)
    UPDATE users 
    SET 
        email = 'anonymized_' || id || '@teake.local',
        nickname = 'Anonymous User',
        phone_encrypted = NULL,
        id_image_url_encrypted = NULL,
        personal_info_encrypted = NULL
    WHERE id = p_user_id;
    
    -- Anonymize stories
    UPDATE stories 
    SET 
        anonymous = TRUE,
        nickname = NULL
    WHERE user_id = p_user_id;
    
    -- Anonymize comments
    UPDATE comments 
    SET 
        anonymous = TRUE,
        nickname = NULL
    WHERE user_id = p_user_id;
    
    -- Delete messages (they're temporary anyway)
    DELETE FROM messages 
    WHERE sender_id = p_user_id OR receiver_id = p_user_id;
    
    -- Delete sessions
    DELETE FROM user_sessions WHERE user_id = p_user_id;
    
    RAISE NOTICE 'User data anonymized for user: %', p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process data deletion requests
CREATE OR REPLACE FUNCTION process_deletion_request(p_request_id UUID)
RETURNS void AS $$
DECLARE
    request_record RECORD;
BEGIN
    -- Only admins can process deletion requests
    IF NOT check_user_permission(auth.uid(), 'admin_access') THEN
        RAISE EXCEPTION 'Insufficient permissions to process deletion requests';
    END IF;
    
    -- Get the deletion request
    SELECT * INTO request_record
    FROM data_deletion_requests
    WHERE id = p_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Deletion request not found or already processed';
    END IF;
    
    -- Update status to processing
    UPDATE data_deletion_requests
    SET 
        status = 'processing',
        processed_by = auth.uid(),
        processed_at = NOW()
    WHERE id = p_request_id;
    
    BEGIN
        -- Process based on request type
        CASE request_record.request_type
            WHEN 'full_deletion' THEN
                PERFORM secure_delete_user_data(request_record.user_id);
            WHEN 'anonymization' THEN
                PERFORM anonymize_user_data(request_record.user_id);
            WHEN 'specific_data' THEN
                -- Handle specific data deletion (would need more complex logic)
                RAISE NOTICE 'Specific data deletion not yet implemented';
        END CASE;
        
        -- Mark as completed
        UPDATE data_deletion_requests
        SET status = 'completed'
        WHERE id = p_request_id;
        
    EXCEPTION WHEN OTHERS THEN
        -- Mark as failed
        UPDATE data_deletion_requests
        SET 
            status = 'failed',
            notes = SQLERRM
        WHERE id = p_request_id;
        
        RAISE;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log data processing activities
CREATE OR REPLACE FUNCTION log_data_processing(
    p_user_id UUID,
    p_activity TEXT,
    p_purpose TEXT,
    p_data_types TEXT[],
    p_legal_basis TEXT DEFAULT 'consent',
    p_retention_days INTEGER DEFAULT 365
) RETURNS void AS $$
BEGIN
    INSERT INTO data_processing_log (
        user_id,
        activity,
        purpose,
        data_types,
        legal_basis,
        retention_until
    ) VALUES (
        p_user_id,
        p_activity,
        p_purpose,
        p_data_types,
        p_legal_basis,
        NOW() + (p_retention_days || ' days')::INTERVAL
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up expired data processing logs
CREATE OR REPLACE FUNCTION cleanup_expired_processing_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM data_processing_log
    WHERE retention_until < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup
SELECT cron.schedule('cleanup-processing-logs', '0 3 * * *', 'SELECT cleanup_expired_processing_logs();');

-- Function to check GDPR compliance
CREATE OR REPLACE FUNCTION check_gdpr_compliance()
RETURNS TABLE (
    compliance_check TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check for expired messages
    RETURN QUERY
    SELECT 
        'Expired Messages'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'COMPLIANT' ELSE 'VIOLATION' END::TEXT,
        'Found ' || COUNT(*) || ' expired messages that should be deleted'::TEXT
    FROM messages
    WHERE expires_at < NOW();
    
    -- Check for pending deletion requests
    RETURN QUERY
    SELECT 
        'Pending Deletion Requests'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'COMPLIANT' ELSE 'ATTENTION' END::TEXT,
        'Found ' || COUNT(*) || ' pending deletion requests'::TEXT
    FROM data_deletion_requests
    WHERE status = 'pending' AND requested_at < NOW() - INTERVAL '30 days';
    
    -- Check for users without privacy settings
    RETURN QUERY
    SELECT 
        'Privacy Settings Coverage'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'COMPLIANT' ELSE 'ATTENTION' END::TEXT,
        'Found ' || COUNT(*) || ' users without privacy settings'::TEXT
    FROM users u
    LEFT JOIN user_privacy_settings ups ON u.id = ups.user_id
    WHERE ups.user_id IS NULL AND u.verification_status = 'approved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;