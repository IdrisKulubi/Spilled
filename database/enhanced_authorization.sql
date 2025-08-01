-- TeaKE Enhanced Authorization System
-- Improved Row Level Security and role-based access control

-- Create user roles enum
CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin', 'super_admin');

-- Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';

-- Create user sessions table for better session management
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id UUID DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
) RETURNS void AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id, action, resource_type, resource_id, 
        old_values, new_values, ip_address, user_agent
    ) VALUES (
        p_user_id, p_action, p_resource_type, p_resource_id,
        p_old_values, p_new_values, 
        inet_client_addr(), 
        current_setting('request.headers', true)::json->>'user-agent'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced RLS policies

-- Users table policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (
        auth.uid() = id OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (
        auth.uid() = id AND 
        -- Prevent users from changing their own role
        (OLD.role = NEW.role OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
    );

-- Only admins can insert users (for manual user creation)
CREATE POLICY "Only admins can create users" ON users
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Enhanced story policies
DROP POLICY IF EXISTS "Only verified users can create stories" ON stories;
DROP POLICY IF EXISTS "Anyone can view stories" ON stories;

CREATE POLICY "Only verified users can create stories" ON stories
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND verification_status = 'approved'
            AND role IN ('user', 'moderator', 'admin', 'super_admin')
        )
    );

CREATE POLICY "Anyone can view stories" ON stories
    FOR SELECT USING (true);

-- Moderators and admins can update/delete stories
CREATE POLICY "Moderators can manage stories" ON stories
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('moderator', 'admin', 'super_admin'))
    );

CREATE POLICY "Moderators can delete stories" ON stories
    FOR DELETE USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('moderator', 'admin', 'super_admin'))
    );

-- Enhanced comment policies
DROP POLICY IF EXISTS "Only verified users can create comments" ON comments;
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;

CREATE POLICY "Only verified users can create comments" ON comments
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND verification_status = 'approved'
            AND role IN ('user', 'moderator', 'admin', 'super_admin')
        )
    );

CREATE POLICY "Anyone can view comments" ON comments
    FOR SELECT USING (true);

-- Moderators can manage comments
CREATE POLICY "Moderators can manage comments" ON comments
    FOR UPDATE USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('moderator', 'admin', 'super_admin'))
    );

CREATE POLICY "Moderators can delete comments" ON comments
    FOR DELETE USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('moderator', 'admin', 'super_admin'))
    );

-- Enhanced message policies
DROP POLICY IF EXISTS "Users can view own messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can send messages" ON messages;

CREATE POLICY "Users can view own messages" ON messages
    FOR SELECT USING (
        auth.uid() = sender_id OR 
        auth.uid() = receiver_id OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Only verified users can send messages" ON messages
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND verification_status = 'approved'
            AND role IN ('user', 'moderator', 'admin', 'super_admin')
        ) AND
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = receiver_id 
            AND verification_status = 'approved'
        )
    );

-- Users can only delete their own sent messages
CREATE POLICY "Users can delete own messages" ON messages
    FOR DELETE USING (
        auth.uid() = sender_id OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Audit log policies
CREATE POLICY "Users can view own audit logs" ON audit_logs
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Only system can insert audit logs
CREATE POLICY "System can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- Session management policies
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

CREATE POLICY "Users can manage own sessions" ON user_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON user_sessions
    FOR DELETE USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Enable RLS on new tables
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Function to check user permissions
CREATE OR REPLACE FUNCTION check_user_permission(
    p_user_id UUID,
    p_permission TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    user_role_val user_role;
BEGIN
    SELECT role INTO user_role_val
    FROM users
    WHERE id = p_user_id AND verification_status = 'approved';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    CASE p_permission
        WHEN 'create_story' THEN
            RETURN user_role_val IN ('user', 'moderator', 'admin', 'super_admin');
        WHEN 'moderate_content' THEN
            RETURN user_role_val IN ('moderator', 'admin', 'super_admin');
        WHEN 'admin_access' THEN
            RETURN user_role_val IN ('admin', 'super_admin');
        WHEN 'super_admin_access' THEN
            RETURN user_role_val = 'super_admin';
        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create audit trigger
CREATE OR REPLACE FUNCTION create_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Log the change
    PERFORM log_audit_event(
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for important tables
DROP TRIGGER IF EXISTS audit_users_trigger ON users;
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION create_audit_trigger();

DROP TRIGGER IF EXISTS audit_stories_trigger ON stories;
CREATE TRIGGER audit_stories_trigger
    AFTER INSERT OR UPDATE OR DELETE ON stories
    FOR EACH ROW EXECUTE FUNCTION create_audit_trigger();

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() OR is_active = FALSE;
END;
$$ LANGUAGE plpgsql;

-- Schedule session cleanup
SELECT cron.schedule('cleanup-expired-sessions', '0 */6 * * *', 'SELECT cleanup_expired_sessions();');

-- Function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (
    permission TEXT,
    granted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        perm.permission,
        check_user_permission(p_user_id, perm.permission) as granted
    FROM (
        VALUES 
        ('create_story'),
        ('moderate_content'),
        ('admin_access'),
        ('super_admin_access')
    ) AS perm(permission);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;