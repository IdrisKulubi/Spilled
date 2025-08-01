-- Add role column to users table
-- This script adds a role column with appropriate constraints and default value

-- Add role column to users table
ALTER TABLE users 
ADD COLUMN role TEXT DEFAULT 'user' 
CHECK (role IN ('user', 'admin', 'super_admin'));

-- Create index for role column for better performance
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Update existing users to have 'user' role if they don't have one
UPDATE users 
SET role = 'user' 
WHERE role IS NULL;

-- Make role column NOT NULL after setting default values
ALTER TABLE users 
ALTER COLUMN role SET NOT NULL;

-- Optional: Create a function to check if user has admin privileges
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE id = user_id 
        AND role IN ('admin', 'super_admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a function to check user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM users
    WHERE id = user_id;
    
    RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;