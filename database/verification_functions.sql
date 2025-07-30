-- TeaKE ID Verification Functions
-- Additional functions for managing user verification

-- Function to approve user verification
CREATE OR REPLACE FUNCTION approve_user_verification(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users 
    SET 
        verification_status = 'approved',
        verified = TRUE,
        verified_at = NOW(),
        rejection_reason = NULL
    WHERE id = user_id AND verification_status = 'pending';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject user verification
CREATE OR REPLACE FUNCTION reject_user_verification(user_id UUID, reason TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE users 
    SET 
        verification_status = 'rejected',
        verified = FALSE,
        rejection_reason = reason,
        verified_at = NULL
    WHERE id = user_id AND verification_status = 'pending';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending verifications (for admin use)
CREATE OR REPLACE FUNCTION get_pending_verifications()
RETURNS TABLE (
    user_id UUID,
    nickname TEXT,
    id_image_url TEXT,
    id_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.nickname,
        u.id_image_url,
        u.id_type,
        u.created_at
    FROM users u
    WHERE u.verification_status = 'pending'
    ORDER BY u.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is verified and can post
CREATE OR REPLACE FUNCTION user_can_post(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_status TEXT;
BEGIN
    SELECT verification_status INTO user_status
    FROM users
    WHERE id = user_id;
    
    RETURN user_status = 'approved';
END;
$$ LANGUAGE plpgsql;

-- View for verification statistics (admin dashboard)
CREATE OR REPLACE VIEW verification_stats AS
SELECT 
    COUNT(*) FILTER (WHERE verification_status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE verification_status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE verification_status = 'rejected') as rejected_count,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as new_signups_week,
    COUNT(*) FILTER (WHERE verified_at >= CURRENT_DATE - INTERVAL '7 days') as verified_this_week
FROM users;