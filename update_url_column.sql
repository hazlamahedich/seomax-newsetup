-- Update URL column size for content_pages table
ALTER TABLE content_pages ALTER COLUMN url TYPE VARCHAR(2048);

-- Update URL column size for competitors table
ALTER TABLE competitors ALTER COLUMN url TYPE VARCHAR(2048);

-- Ensure title columns are sized appropriately
ALTER TABLE content_pages ALTER COLUMN title TYPE VARCHAR(512);
ALTER TABLE competitors ALTER COLUMN name TYPE VARCHAR(512);

-- Add comments to explain the purpose of these changes
COMMENT ON COLUMN content_pages.url IS 'URL of the content page, extended to 2048 chars to handle long URLs';
COMMENT ON COLUMN competitors.url IS 'URL of the competitor site, extended to 2048 chars to handle long URLs';

-- Add an index on the URL column to improve query performance
CREATE INDEX IF NOT EXISTS idx_content_pages_url ON content_pages(url);
CREATE INDEX IF NOT EXISTS idx_competitors_url ON competitors(url);

-- Add a note about these changes in a custom changelog table (create if not exists)
CREATE TABLE IF NOT EXISTS schema_changelog (
  id SERIAL PRIMARY KEY,
  change_description TEXT NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  applied_by TEXT
);

-- Record this change
INSERT INTO schema_changelog (change_description, applied_by)
VALUES ('Increased URL column sizes to 2048 chars and added URL indexes for better performance', 'SEOMax Admin');

-- Validation query to check column sizes after updates
-- SELECT table_name, column_name, data_type, character_maximum_length
-- FROM information_schema.columns
-- WHERE table_name IN ('content_pages', 'competitors')
-- AND column_name IN ('url', 'title', 'name')
-- ORDER BY table_name, column_name;

-- Create URL normalization function
CREATE OR REPLACE FUNCTION normalize_url(url TEXT) RETURNS TEXT AS $$
DECLARE
    normalized_url TEXT;
    parsed_host TEXT;
    parsed_path TEXT;
    parsed_protocol TEXT;
BEGIN
    -- If URL is NULL or empty, return as is
    IF url IS NULL OR url = '' THEN
        RETURN url;
    END IF;
    
    -- Trim whitespace
    normalized_url := TRIM(url);
    
    -- Add protocol if missing
    IF NOT normalized_url ~* '^https?://' THEN
        normalized_url := 'https://' || normalized_url;
    END IF;
    
    -- Extract components
    parsed_protocol := substring(normalized_url from '^(https?://)');
    parsed_host := substring(normalized_url from '^https?://([^/]+)');
    parsed_path := substring(normalized_url from '^https?://[^/]+(.*)');
    
    -- Convert host to lowercase
    parsed_host := lower(parsed_host);
    
    -- Ensure root domain has trailing slash
    IF parsed_path = '' OR parsed_path IS NULL THEN
        parsed_path := '/';
    END IF;
    
    -- Build normalized URL
    normalized_url := parsed_protocol || parsed_host || parsed_path;
    
    RETURN normalized_url;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to normalize URLs before insert/update
CREATE OR REPLACE FUNCTION normalize_url_trigger() RETURNS TRIGGER AS $$
BEGIN
    NEW.url := normalize_url(NEW.url);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for both tables
DROP TRIGGER IF EXISTS normalize_content_pages_url_trigger ON content_pages;
CREATE TRIGGER normalize_content_pages_url_trigger
BEFORE INSERT OR UPDATE ON content_pages
FOR EACH ROW EXECUTE FUNCTION normalize_url_trigger();

DROP TRIGGER IF EXISTS normalize_competitors_url_trigger ON competitors;
CREATE TRIGGER normalize_competitors_url_trigger
BEFORE INSERT OR UPDATE ON competitors
FOR EACH ROW EXECUTE FUNCTION normalize_url_trigger();

-- Comment to explain changes
COMMENT ON FUNCTION normalize_url(TEXT) IS 'Normalizes URLs by adding protocol if missing, converting host to lowercase, and ensuring consistent trailing slash format';
COMMENT ON FUNCTION normalize_url_trigger() IS 'Trigger function to automatically normalize URLs before insert/update';
COMMENT ON TRIGGER normalize_content_pages_url_trigger ON content_pages IS 'Automatically normalizes URLs in content_pages table';
COMMENT ON TRIGGER normalize_competitors_url_trigger ON competitors IS 'Automatically normalizes URLs in competitors table';
