-- Add location and age fields to guys table
ALTER TABLE guys 
ADD COLUMN location TEXT,
ADD COLUMN age INTEGER;

-- Add index for location searches
CREATE INDEX idx_guys_location ON guys(location);

-- Add index for age searches  
CREATE INDEX idx_guys_age ON guys(age);

-- Update the search_guys function to include location and age
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