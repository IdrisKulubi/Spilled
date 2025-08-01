-- TeaKE Input Validation Functions
-- Server-side validation for all user inputs

-- Function to validate story content
CREATE OR REPLACE FUNCTION validate_story_content()
RETURNS TRIGGER AS $$
BEGIN
    -- Content length validation
    IF LENGTH(TRIM(NEW.text)) < 10 THEN
        RAISE EXCEPTION 'Story content must be at least 10 characters long';
    END IF;
    
    IF LENGTH(NEW.text) > 5000 THEN
        RAISE EXCEPTION 'Story content cannot exceed 5000 characters';
    END IF;
    
    -- Sanitize content (remove potential XSS)
    NEW.text := regexp_replace(NEW.text, '<[^>]*>', '', 'g');
    NEW.text := regexp_replace(NEW.text, 'javascript:', '', 'gi');
    NEW.text := regexp_replace(NEW.text, 'data:', '', 'gi');
    
    -- Validate tags array
    IF array_length(NEW.tags, 1) IS NULL OR array_length(NEW.tags, 1) = 0 THEN
        RAISE EXCEPTION 'At least one tag must be selected';
    END IF;
    
    -- Validate tags are valid enum values
    IF NOT (NEW.tags <@ ARRAY['red_flag', 'good_vibes', 'unsure']::tag_type[]) THEN
        RAISE EXCEPTION 'Invalid tag values provided';
    END IF;
    
    -- Validate nickname if not anonymous
    IF NOT NEW.anonymous AND (NEW.nickname IS NULL OR LENGTH(TRIM(NEW.nickname)) < 2) THEN
        RAISE EXCEPTION 'Nickname must be at least 2 characters when not posting anonymously';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate guy information
CREATE OR REPLACE FUNCTION validate_guy_info()
RETURNS TRIGGER AS $$
BEGIN
    -- At least one identifier must be provided
    IF (NEW.name IS NULL OR LENGTH(TRIM(NEW.name)) = 0) AND 
       (NEW.phone IS NULL OR LENGTH(TRIM(NEW.phone)) = 0) AND 
       (NEW.socials IS NULL OR LENGTH(TRIM(NEW.socials)) = 0) THEN
        RAISE EXCEPTION 'At least one identifier (name, phone, or social) must be provided';
    END IF;
    
    -- Sanitize inputs
    IF NEW.name IS NOT NULL THEN
        NEW.name := TRIM(regexp_replace(NEW.name, '<[^>]*>', '', 'g'));
        IF LENGTH(NEW.name) > 100 THEN
            RAISE EXCEPTION 'Name cannot exceed 100 characters';
        END IF;
    END IF;
    
    -- Validate phone format if provided
    IF NEW.phone IS NOT NULL AND LENGTH(TRIM(NEW.phone)) > 0 THEN
        NEW.phone := TRIM(NEW.phone);
        -- Kenyan phone number validation
        IF NOT NEW.phone ~ '^(\+254|254|0)([71][0-9]{8}|[10][0-9]{8})$' THEN
            RAISE EXCEPTION 'Invalid Kenyan phone number format';
        END IF;
        -- Normalize to international format
        IF NEW.phone ~ '^0[0-9]{9}$' THEN
            NEW.phone := '+254' || substring(NEW.phone from 2);
        ELSIF NEW.phone ~ '^254[0-9]{9}$' THEN
            NEW.phone := '+' || NEW.phone;
        END IF;
    END IF;
    
    -- Validate age if provided
    IF NEW.age IS NOT NULL THEN
        IF NEW.age < 18 OR NEW.age > 100 THEN
            RAISE EXCEPTION 'Age must be between 18 and 100';
        END IF;
    END IF;
    
    -- Sanitize location
    IF NEW.location IS NOT NULL THEN
        NEW.location := TRIM(regexp_replace(NEW.location, '<[^>]*>', '', 'g'));
        IF LENGTH(NEW.location) > 200 THEN
            RAISE EXCEPTION 'Location cannot exceed 200 characters';
        END IF;
    END IF;
    
    -- Sanitize socials
    IF NEW.socials IS NOT NULL THEN
        NEW.socials := TRIM(regexp_replace(NEW.socials, '<[^>]*>', '', 'g'));
        IF LENGTH(NEW.socials) > 500 THEN
            RAISE EXCEPTION 'Social media info cannot exceed 500 characters';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate comment content
CREATE OR REPLACE FUNCTION validate_comment_content()
RETURNS TRIGGER AS $$
BEGIN
    -- Content validation
    IF LENGTH(TRIM(NEW.text)) < 1 THEN
        RAISE EXCEPTION 'Comment cannot be empty';
    END IF;
    
    IF LENGTH(NEW.text) > 1000 THEN
        RAISE EXCEPTION 'Comment cannot exceed 1000 characters';
    END IF;
    
    -- Sanitize content
    NEW.text := regexp_replace(NEW.text, '<[^>]*>', '', 'g');
    NEW.text := regexp_replace(NEW.text, 'javascript:', '', 'gi');
    NEW.text := regexp_replace(NEW.text, 'data:', '', 'gi');
    
    -- Validate nickname if not anonymous
    IF NOT NEW.anonymous AND (NEW.nickname IS NULL OR LENGTH(TRIM(NEW.nickname)) < 2) THEN
        RAISE EXCEPTION 'Nickname must be at least 2 characters when not commenting anonymously';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to validate user profile updates
CREATE OR REPLACE FUNCTION validate_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate email format
    IF NEW.email IS NOT NULL AND NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format';
    END IF;
    
    -- Validate phone format
    IF NEW.phone IS NOT NULL AND LENGTH(TRIM(NEW.phone)) > 0 THEN
        IF NOT NEW.phone ~ '^(\+254|254)[0-9]{9}$' THEN
            RAISE EXCEPTION 'Invalid phone number format';
        END IF;
    END IF;
    
    -- Validate nickname
    IF NEW.nickname IS NOT NULL THEN
        NEW.nickname := TRIM(regexp_replace(NEW.nickname, '<[^>]*>', '', 'g'));
        IF LENGTH(NEW.nickname) < 2 OR LENGTH(NEW.nickname) > 50 THEN
            RAISE EXCEPTION 'Nickname must be between 2 and 50 characters';
        END IF;
    END IF;
    
    -- Validate verification status transitions
    IF OLD.verification_status IS NOT NULL AND NEW.verification_status != OLD.verification_status THEN
        -- Only allow specific transitions
        IF NOT (
            (OLD.verification_status = 'pending' AND NEW.verification_status IN ('approved', 'rejected')) OR
            (OLD.verification_status = 'rejected' AND NEW.verification_status = 'pending')
        ) THEN
            RAISE EXCEPTION 'Invalid verification status transition from % to %', OLD.verification_status, NEW.verification_status;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for validation
DROP TRIGGER IF EXISTS validate_story_trigger ON stories;
CREATE TRIGGER validate_story_trigger
    BEFORE INSERT OR UPDATE ON stories
    FOR EACH ROW EXECUTE FUNCTION validate_story_content();

DROP TRIGGER IF EXISTS validate_guy_trigger ON guys;
CREATE TRIGGER validate_guy_trigger
    BEFORE INSERT OR UPDATE ON guys
    FOR EACH ROW EXECUTE FUNCTION validate_guy_info();

DROP TRIGGER IF EXISTS validate_comment_trigger ON comments;
CREATE TRIGGER validate_comment_trigger
    BEFORE INSERT OR UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION validate_comment_content();

DROP TRIGGER IF EXISTS validate_user_trigger ON users;
CREATE TRIGGER validate_user_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION validate_user_profile();

-- Function to validate message content
CREATE OR REPLACE FUNCTION validate_message_content()
RETURNS TRIGGER AS $$
BEGIN
    -- Content validation
    IF LENGTH(TRIM(NEW.text)) < 1 THEN
        RAISE EXCEPTION 'Message cannot be empty';
    END IF;
    
    IF LENGTH(NEW.text) > 2000 THEN
        RAISE EXCEPTION 'Message cannot exceed 2000 characters';
    END IF;
    
    -- Sanitize content
    NEW.text := regexp_replace(NEW.text, '<[^>]*>', '', 'g');
    NEW.text := regexp_replace(NEW.text, 'javascript:', '', 'gi');
    NEW.text := regexp_replace(NEW.text, 'data:', '', 'gi');
    
    -- Validate sender and receiver are different
    IF NEW.sender_id = NEW.receiver_id THEN
        RAISE EXCEPTION 'Cannot send message to yourself';
    END IF;
    
    -- Validate both users exist and are verified
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = NEW.sender_id AND verification_status = 'approved'
    ) THEN
        RAISE EXCEPTION 'Sender must be verified to send messages';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM users 
        WHERE id = NEW.receiver_id AND verification_status = 'approved'
    ) THEN
        RAISE EXCEPTION 'Receiver must be verified to receive messages';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_message_trigger ON messages;
CREATE TRIGGER validate_message_trigger
    BEFORE INSERT OR UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION validate_message_content();