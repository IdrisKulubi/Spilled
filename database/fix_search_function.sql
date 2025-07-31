-- Improved search function that searches across guys and stories
CREATE OR REPLACE FUNCTION search_guys_and_stories(
    search_term TEXT DEFAULT NULL
)
RETURNS TABLE (
    guy_id UUID,
    guy_name TEXT,
    guy_phone TEXT,
    guy_socials TEXT,
    guy_location TEXT,
    guy_age INTEGER,
    story_count BIGINT,
    latest_story_date TIMESTAMP WITH TIME ZONE,
    match_source TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH guy_matches AS (
        -- Direct matches in guys table
        SELECT 
            g.id as guy_id,
            g.name as guy_name,
            g.phone as guy_phone,
            g.socials as guy_socials,
            g.location as guy_location,
            g.age as guy_age,
            COUNT(s.id) as story_count,
            MAX(s.created_at) as latest_story_date,
            'direct' as match_source
        FROM guys g
        LEFT JOIN stories s ON g.id = s.guy_id
        WHERE 
            search_term IS NULL OR
            g.name ILIKE '%' || search_term || '%' OR
            g.phone ILIKE '%' || search_term || '%' OR
            g.socials ILIKE '%' || search_term || '%' OR
            g.location ILIKE '%' || search_term || '%'
        GROUP BY g.id, g.name, g.phone, g.socials, g.location, g.age
        HAVING COUNT(s.id) > 0
    ),
    story_matches AS (
        -- Matches found in story content
        SELECT DISTINCT
            g.id as guy_id,
            g.name as guy_name,
            g.phone as guy_phone,
            g.socials as guy_socials,
            g.location as guy_location,
            g.age as guy_age,
            COUNT(s.id) as story_count,
            MAX(s.created_at) as latest_story_date,
            'story_content' as match_source
        FROM guys g
        INNER JOIN stories s ON g.id = s.guy_id
        WHERE 
            search_term IS NOT NULL AND
            s.text ILIKE '%' || search_term || '%'
        GROUP BY g.id, g.name, g.phone, g.socials, g.location, g.age
    )
    SELECT * FROM guy_matches
    UNION
    SELECT * FROM story_matches
    ORDER BY story_count DESC, latest_story_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Also update the original function to include location and age
CREATE OR REPLACE FUNCTION search_guys(
    search_name TEXT DEFAULT NULL,
    search_phone TEXT DEFAULT NULL,
    search_socials TEXT DEFAULT NULL,
    search_location TEXT DEFAULT NULL,
    min_age INTEGER DEFAULT NULL,
    max_age INTEGER DEFAULT NULL
)
RETURNS TABLE (
    guy_id UUID,
    guy_name TEXT,
    guy_phone TEXT,
    guy_socials TEXT,
    guy_location TEXT,
    guy_age INTEGER,
    story_count BIGINT,
    latest_story_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        g.id as guy_id,
        g.name as guy_name,
        g.phone as guy_phone,
        g.socials as guy_socials,
        g.location as guy_location,
        g.age as guy_age,
        COUNT(s.id) as story_count,
        MAX(s.created_at) as latest_story_date
    FROM guys g
    LEFT JOIN stories s ON g.id = s.guy_id
    WHERE 
        (search_name IS NULL OR g.name ILIKE '%' || search_name || '%')
        AND (search_phone IS NULL OR g.phone ILIKE '%' || search_phone || '%')
        AND (search_socials IS NULL OR g.socials ILIKE '%' || search_socials || '%')
        AND (search_location IS NULL OR g.location ILIKE '%' || search_location || '%')
        AND (min_age IS NULL OR g.age >= min_age)
        AND (max_age IS NULL OR g.age <= max_age)
    GROUP BY g.id, g.name, g.phone, g.socials, g.location, g.age
    HAVING COUNT(s.id) > 0
    ORDER BY story_count DESC, latest_story_date DESC;
END;
$$ LANGUAGE plpgsql;