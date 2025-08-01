-- TeaKE Data Encryption System
-- Encrypt sensitive data at rest

-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create encryption key management table
CREATE TABLE IF NOT EXISTS encryption_keys (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key_name TEXT UNIQUE NOT NULL,
    key_value TEXT NOT NULL, -- This should be managed by a proper key management system
    algorithm TEXT NOT NULL DEFAULT 'aes',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Insert default encryption key (In production, use proper key management)
INSERT INTO encryption_keys (key_name, key_value, algorithm) 
VALUES ('default_key', encode(gen_random_bytes(32), 'base64'), 'aes')
ON CONFLICT (key_name) DO NOTHING;

-- Function to get active encryption key
CREATE OR REPLACE FUNCTION get_encryption_key(key_name TEXT DEFAULT 'default_key')
RETURNS TEXT AS $$
DECLARE
    key_value TEXT;
BEGIN
    SELECT ek.key_value INTO key_value
    FROM encryption_keys ek
    WHERE ek.key_name = get_encryption_key.key_name
    AND ek.is_active = TRUE
    AND (ek.expires_at IS NULL OR ek.expires_at > NOW());
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Encryption key not found or expired: %', key_name;
    END IF;
    
    RETURN key_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add encrypted columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_encrypted BYTEA;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_image_url_encrypted BYTEA;
ALTER TABLE users ADD COLUMN IF NOT EXISTS personal_info_encrypted BYTEA; -- For additional PII

-- Add encrypted columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS text_encrypted BYTEA;

-- Function to encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_data(
    plain_text TEXT,
    key_name TEXT DEFAULT 'default_key'
) RETURNS BYTEA AS $$
DECLARE
    encryption_key TEXT;
BEGIN
    IF plain_text IS NULL OR plain_text = '' THEN
        RETURN NULL;
    END IF;
    
    encryption_key := get_encryption_key(key_name);
    RETURN pgp_sym_encrypt(plain_text, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrypt sensitive data
CREATE OR REPLACE FUNCTION decrypt_data(
    encrypted_data BYTEA,
    key_name TEXT DEFAULT 'default_key'
) RETURNS TEXT AS $$
DECLARE
    encryption_key TEXT;
BEGIN
    IF encrypted_data IS NULL THEN
        RETURN NULL;
    END IF;
    
    encryption_key := get_encryption_key(key_name);
    RETURN pgp_sym_decrypt(encrypted_data, encryption_key);
EXCEPTION
    WHEN OTHERS THEN
        -- Log decryption failure but don't expose details
        RAISE WARNING 'Decryption failed for data';
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to migrate existing data to encrypted format
CREATE OR REPLACE FUNCTION migrate_to_encrypted_storage()
RETURNS void AS $$
DECLARE
    user_record RECORD;
    message_record RECORD;
BEGIN
    -- Migrate user phone numbers
    FOR user_record IN 
        SELECT id, phone FROM users 
        WHERE phone IS NOT NULL AND phone_encrypted IS NULL
    LOOP
        UPDATE users 
        SET phone_encrypted = encrypt_data(user_record.phone)
        WHERE id = user_record.id;
    END LOOP;
    
    -- Migrate user ID image URLs
    FOR user_record IN 
        SELECT id, id_image_url FROM users 
        WHERE id_image_url IS NOT NULL AND id_image_url_encrypted IS NULL
    LOOP
        UPDATE users 
        SET id_image_url_encrypted = encrypt_data(user_record.id_image_url)
        WHERE id = user_record.id;
    END LOOP;
    
    -- Migrate message content
    FOR message_record IN 
        SELECT id, text FROM messages 
        WHERE text IS NOT NULL AND text_encrypted IS NULL
    LOOP
        UPDATE messages 
        SET text_encrypted = encrypt_data(message_record.text)
        WHERE id = message_record.id;
    END LOOP;
    
    RAISE NOTICE 'Data migration to encrypted storage completed';
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically encrypt user data on insert/update
CREATE OR REPLACE FUNCTION encrypt_user_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Encrypt phone number
    IF NEW.phone IS NOT NULL AND NEW.phone != OLD.phone THEN
        NEW.phone_encrypted := encrypt_data(NEW.phone);
    END IF;
    
    -- Encrypt ID image URL
    IF NEW.id_image_url IS NOT NULL AND NEW.id_image_url != OLD.id_image_url THEN
        NEW.id_image_url_encrypted := encrypt_data(NEW.id_image_url);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically encrypt message content
CREATE OR REPLACE FUNCTION encrypt_message_data()
RETURNS TRIGGER AS $$
BEGIN
    -- Encrypt message text
    IF NEW.text IS NOT NULL THEN
        NEW.text_encrypted := encrypt_data(NEW.text);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create encryption triggers
DROP TRIGGER IF EXISTS encrypt_user_data_trigger ON users;
CREATE TRIGGER encrypt_user_data_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION encrypt_user_data();

DROP TRIGGER IF EXISTS encrypt_message_data_trigger ON messages;
CREATE TRIGGER encrypt_message_data_trigger
    BEFORE INSERT OR UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION encrypt_message_data();

-- Secure view for users with decrypted data (only for authorized access)
CREATE OR REPLACE VIEW users_decrypted AS
SELECT 
    id,
    email,
    nickname,
    CASE 
        WHEN check_user_permission(auth.uid(), 'admin_access') THEN 
            decrypt_data(phone_encrypted)
        ELSE 
            NULL 
    END as phone,
    verified,
    verification_status,
    CASE 
        WHEN check_user_permission(auth.uid(), 'admin_access') THEN 
            decrypt_data(id_image_url_encrypted)
        ELSE 
            NULL 
    END as id_image_url,
    id_type,
    rejection_reason,
    verified_at,
    created_at,
    role
FROM users;

-- Secure view for messages with decrypted content
CREATE OR REPLACE VIEW messages_decrypted AS
SELECT 
    id,
    sender_id,
    receiver_id,
    CASE 
        WHEN auth.uid() = sender_id OR auth.uid() = receiver_id OR 
             check_user_permission(auth.uid(), 'admin_access') THEN 
            decrypt_data(text_encrypted)
        ELSE 
            '[ENCRYPTED]'
    END as text,
    created_at,
    expires_at
FROM messages;

-- Function to securely delete user data (GDPR compliance)
CREATE OR REPLACE FUNCTION secure_delete_user_data(p_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Only allow self-deletion or admin deletion
    IF auth.uid() != p_user_id AND NOT check_user_permission(auth.uid(), 'admin_access') THEN
        RAISE EXCEPTION 'Insufficient permissions to delete user data';
    END IF;
    
    -- Log the deletion
    PERFORM log_audit_event(
        auth.uid(),
        'SECURE_DELETE_USER',
        'users',
        p_user_id,
        NULL,
        jsonb_build_object('deleted_user_id', p_user_id)
    );
    
    -- Anonymize stories instead of deleting (preserve community data)
    UPDATE stories 
    SET 
        anonymous = TRUE,
        nickname = NULL,
        user_id = '00000000-0000-0000-0000-000000000000'::UUID -- Anonymous user ID
    WHERE user_id = p_user_id;
    
    -- Anonymize comments
    UPDATE comments 
    SET 
        anonymous = TRUE,
        nickname = NULL,
        user_id = '00000000-0000-0000-0000-000000000000'::UUID
    WHERE user_id = p_user_id;
    
    -- Delete messages (they're temporary anyway)
    DELETE FROM messages 
    WHERE sender_id = p_user_id OR receiver_id = p_user_id;
    
    -- Delete user sessions
    DELETE FROM user_sessions WHERE user_id = p_user_id;
    
    -- Anonymize audit logs
    UPDATE audit_logs 
    SET user_id = NULL 
    WHERE user_id = p_user_id;
    
    -- Finally delete the user record
    DELETE FROM users WHERE id = p_user_id;
    
    RAISE NOTICE 'User data securely deleted and anonymized for user: %', p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to export user data (GDPR compliance)
CREATE OR REPLACE FUNCTION export_user_data(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    user_data JSONB;
    stories_data JSONB;
    comments_data JSONB;
    messages_data JSONB;
BEGIN
    -- Only allow self-export or admin export
    IF auth.uid() != p_user_id AND NOT check_user_permission(auth.uid(), 'admin_access') THEN
        RAISE EXCEPTION 'Insufficient permissions to export user data';
    END IF;
    
    -- Get user profile data
    SELECT to_jsonb(u) INTO user_data
    FROM (
        SELECT 
            id, email, nickname, 
            decrypt_data(phone_encrypted) as phone,
            verified, verification_status, created_at
        FROM users 
        WHERE id = p_user_id
    ) u;
    
    -- Get user's stories
    SELECT jsonb_agg(to_jsonb(s)) INTO stories_data
    FROM (
        SELECT id, text, tags, anonymous, nickname, created_at
        FROM stories 
        WHERE user_id = p_user_id
    ) s;
    
    -- Get user's comments
    SELECT jsonb_agg(to_jsonb(c)) INTO comments_data
    FROM (
        SELECT id, text, anonymous, nickname, created_at
        FROM comments 
        WHERE user_id = p_user_id
    ) c;
    
    -- Get user's messages
    SELECT jsonb_agg(to_jsonb(m)) INTO messages_data
    FROM (
        SELECT 
            id, 
            CASE WHEN sender_id = p_user_id THEN 'sent' ELSE 'received' END as type,
            decrypt_data(text_encrypted) as text,
            created_at
        FROM messages 
        WHERE sender_id = p_user_id OR receiver_id = p_user_id
    ) m;
    
    -- Log the export
    PERFORM log_audit_event(
        auth.uid(),
        'EXPORT_USER_DATA',
        'users',
        p_user_id,
        NULL,
        jsonb_build_object('exported_user_id', p_user_id)
    );
    
    RETURN jsonb_build_object(
        'user_profile', user_data,
        'stories', COALESCE(stories_data, '[]'::jsonb),
        'comments', COALESCE(comments_data, '[]'::jsonb),
        'messages', COALESCE(messages_data, '[]'::jsonb),
        'export_date', NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to rotate encryption keys
CREATE OR REPLACE FUNCTION rotate_encryption_key(
    old_key_name TEXT,
    new_key_name TEXT DEFAULT NULL
) RETURNS void AS $$
DECLARE
    new_key_name_final TEXT;
BEGIN
    -- Only super admins can rotate keys
    IF NOT check_user_permission(auth.uid(), 'super_admin_access') THEN
        RAISE EXCEPTION 'Insufficient permissions to rotate encryption keys';
    END IF;
    
    -- Generate new key name if not provided
    new_key_name_final := COALESCE(new_key_name, old_key_name || '_' || extract(epoch from now())::text);
    
    -- Create new encryption key
    INSERT INTO encryption_keys (key_name, key_value, algorithm)
    VALUES (new_key_name_final, encode(gen_random_bytes(32), 'base64'), 'aes');
    
    -- TODO: Re-encrypt all data with new key (this would be a complex operation)
    -- For now, just mark the old key as inactive
    UPDATE encryption_keys 
    SET is_active = FALSE 
    WHERE key_name = old_key_name;
    
    -- Log the key rotation
    PERFORM log_audit_event(
        auth.uid(),
        'ROTATE_ENCRYPTION_KEY',
        'encryption_keys',
        NULL,
        jsonb_build_object('old_key', old_key_name),
        jsonb_build_object('new_key', new_key_name_final)
    );
    
    RAISE NOTICE 'Encryption key rotated from % to %', old_key_name, new_key_name_final;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;