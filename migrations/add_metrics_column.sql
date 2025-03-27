-- Check if the metrics column exists in the competitors table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'competitors' 
    AND column_name = 'metrics'
  ) THEN
    -- Add the metrics column as JSONB
    EXECUTE 'ALTER TABLE competitors ADD COLUMN metrics JSONB';
    
    -- Add comment explaining the purpose of the column
    EXECUTE 'COMMENT ON COLUMN competitors.metrics IS ''Stores content metrics such as wordCount, readabilityScore, etc.''';
    
    RAISE NOTICE 'Added metrics column to competitors table';
  ELSE
    RAISE NOTICE 'metrics column already exists in competitors table';
  END IF;
END
$$;

-- Create a trigger to ensure metrics is always a JSONB object
CREATE OR REPLACE FUNCTION ensure_metrics_jsonb()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure metrics is not null
  IF NEW.metrics IS NULL THEN
    NEW.metrics := '{}'::jsonb;
  END IF;
  
  -- If it's not a valid JSONB, convert to empty object
  IF jsonb_typeof(NEW.metrics) IS NULL THEN
    NEW.metrics := '{}'::jsonb;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'ensure_metrics_jsonb_trigger'
  ) THEN
    CREATE TRIGGER ensure_metrics_jsonb_trigger
    BEFORE INSERT OR UPDATE ON competitors
    FOR EACH ROW
    EXECUTE FUNCTION ensure_metrics_jsonb();
    
    RAISE NOTICE 'Created ensure_metrics_jsonb_trigger';
  ELSE
    RAISE NOTICE 'ensure_metrics_jsonb_trigger already exists';
  END IF;
END
$$;

-- Print current database schema version or setup version tracking if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'schema_version'
  ) THEN
    CREATE TABLE schema_version (
      id SERIAL PRIMARY KEY,
      version VARCHAR(50) NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      description TEXT
    );
    
    INSERT INTO schema_version (version, description)
    VALUES ('1.0.0', 'Initial schema version');
    
    RAISE NOTICE 'Created schema_version tracking table';
  END IF;
  
  -- Record this migration
  INSERT INTO schema_version (version, description)
  VALUES ('1.0.1', 'Added metrics column to competitors table');
  
  RAISE NOTICE 'Recorded migration in schema_version table';
END
$$; 