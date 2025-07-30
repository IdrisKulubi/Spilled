-- TeaKE Admin Functions
-- Functions for managing user verifications (admin use only)

-- Function to get all pending verifications with user details
CREATE OR REPLACE FUNCTION get_verification_queue()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    nickname TEXT,
    phone TEXT,
    id_image_url TEXT,
    id_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    days_waiting INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        auth.users.email,
        u.nickname,
        u.phone,
        u.id_image_url,
        u.id_type,
        u.created_at,
        EXTRACT(DAY FROM NOW() - u.created_at)::INTEGER as days_waiting
    FROM users u
    JOIN auth.users ON auth.users.id = u.id
    WHERE u.verification_status = 'pending'
    AND u.id_image_url IS NOT NULL
    ORDER BY u.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to bulk approve users (for testing)
CREATE OR REPLACE FUNCTION bulk_approve_pending_verifications()
RETURNS INTEGER AS $$
DECLARE
    approved_count INTEGER;
BEGIN
    UPDATE users 
    SET 
        verification_status = 'approved',
        verified = TRUE,
        verified_at = NOW(),
        rejection_reason = NULL
    WHERE verification_status = 'pending'
    AND id_image_url IS NOT NULL;
    
    GET DIAGNOSTICS approved_count = ROW_COUNT;
    RETURN approved_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check verification stats by date
CREATE OR REPLACE FUNCTION get_verification_stats_by_date(start_date DATE, end_date DATE)
RETURNS TABLE (
    date DATE,
    signups INTEGER,
    pending INTEGER,
    approved INTEGER,
    rejected INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(start_date, end_date, '1 day'::interval)::date as date
    )
    SELECT 
        ds.date,
        COALESCE(signups.count, 0)::INTEGER as signups,
        COALESCE(pending.count, 0)::INTEGER as pending,
        COALESCE(approved.count, 0)::INTEGER as approved,
        COALESCE(rejected.count, 0)::INTEGER as rejected
    FROM date_series ds
    LEFT JOIN (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users 
        WHERE DATE(created_at) BETWEEN start_date AND end_date
        GROUP BY DATE(created_at)
    ) signups ON ds.date = signups.date
    LEFT JOIN (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users 
        WHERE verification_status = 'pending'
        AND DATE(created_at) BETWEEN start_date AND end_date
        GROUP BY DATE(created_at)
    ) pending ON ds.date = pending.date
    LEFT JOIN (
        SELECT DATE(verified_at) as date, COUNT(*) as count
        FROM users 
        WHERE verification_status = 'approved'
        AND DATE(verified_at) BETWEEN start_date AND end_date
        GROUP BY DATE(verified_at)
    ) approved ON ds.date = approved.date
    LEFT JOIN (
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users 
        WHERE verification_status = 'rejected'
        AND DATE(created_at) BETWEEN start_date AND end_date
        GROUP BY DATE(created_at)
    ) rejected ON ds.date = rejected.date
    ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for admin dashboard
CREATE OR REPLACE VIEW admin_dashboard AS
SELECT 
    (SELECT COUNT(*) FROM users WHERE verification_status = 'pending' AND id_image_url IS NOT NULL) as pending_verifications,
    (SELECT COUNT(*) FROM users WHERE verification_status = 'approved') as verified_users,
    (SELECT COUNT(*) FROM users WHERE verification_status = 'rejected') as rejected_users,
    (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_signups_week,
    (SELECT COUNT(*) FROM stories WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_stories_week,
    (SELECT COUNT(*) FROM messages WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_messages_week,
    (SELECT AVG(EXTRACT(EPOCH FROM (verified_at - created_at))/3600) FROM users WHERE verification_status = 'approved' AND verified_at IS NOT NULL) as avg_verification_hours;