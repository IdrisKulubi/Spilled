-- Fix the admin functions to handle correct column types
-- The issue is that auth.users.email is VARCHAR(255), not TEXT

-- Updated function to get all pending verifications with user details
-- This version properly casts email to TEXT to avoid type mismatches
CREATE OR REPLACE FUNCTION get_verification_queue_direct()
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
        COALESCE(auth.users.email, 'unknown@example.com')::TEXT as email,
        u.nickname,
        u.phone,
        u.id_image_url,
        u.id_type,
        u.created_at,
        EXTRACT(DAY FROM NOW() - u.created_at)::INTEGER as days_waiting
    FROM users u
    LEFT JOIN auth.users ON auth.users.id = u.id
    WHERE u.verification_status = 'pending'
    AND u.id_image_url IS NOT NULL
    ORDER BY u.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix the original function by properly handling the type
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
        COALESCE(auth.users.email, 'unknown@example.com')::TEXT as email,
        u.nickname,
        u.phone,
        u.id_image_url,
        u.id_type,
        u.created_at,
        EXTRACT(DAY FROM NOW() - u.created_at)::INTEGER as days_waiting
    FROM users u
    LEFT JOIN auth.users ON auth.users.id = u.id
    WHERE u.verification_status = 'pending'
    AND u.id_image_url IS NOT NULL
    ORDER BY u.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;