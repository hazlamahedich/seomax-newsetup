-- Create business_locations table
CREATE TABLE IF NOT EXISTS business_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  location_name VARCHAR(255) NOT NULL,
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(255),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster querying
CREATE INDEX IF NOT EXISTS idx_business_locations_project_id ON business_locations(project_id);

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to business_locations table
DROP TRIGGER IF EXISTS set_timestamp_business_locations ON business_locations;
CREATE TRIGGER set_timestamp_business_locations
BEFORE UPDATE ON business_locations
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Create location_seo_analysis table
CREATE TABLE IF NOT EXISTS location_seo_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  location_id UUID NOT NULL REFERENCES business_locations(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES site_crawls(id) ON DELETE CASCADE,
  local_seo_score INTEGER NOT NULL,
  citation_consistency_score INTEGER NOT NULL,
  local_ranking_positions JSONB,
  local_backlink_quality INTEGER NOT NULL,
  review_sentiment_score INTEGER NOT NULL,
  gbp_optimization_score INTEGER NOT NULL,
  local_recommendations TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add composite index for location_id and site_id
CREATE INDEX IF NOT EXISTS idx_location_seo_analysis_location_site ON location_seo_analysis(location_id, site_id);

-- Apply trigger to location_seo_analysis table
DROP TRIGGER IF EXISTS set_timestamp_location_seo_analysis ON location_seo_analysis;
CREATE TRIGGER set_timestamp_location_seo_analysis
BEFORE UPDATE ON location_seo_analysis
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Create RLS policies for business_locations
ALTER TABLE business_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own project locations"
  ON business_locations FOR SELECT
  USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own project locations"
  ON business_locations FOR INSERT
  WITH CHECK (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own project locations"
  ON business_locations FOR UPDATE
  USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own project locations"
  ON business_locations FOR DELETE
  USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

-- Create RLS policies for location_seo_analysis
ALTER TABLE location_seo_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own location analyses"
  ON location_seo_analysis FOR SELECT
  USING (location_id IN (
    SELECT id FROM business_locations WHERE project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert their own location analyses"
  ON location_seo_analysis FOR INSERT
  WITH CHECK (location_id IN (
    SELECT id FROM business_locations WHERE project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update their own location analyses"
  ON location_seo_analysis FOR UPDATE
  USING (location_id IN (
    SELECT id FROM business_locations WHERE project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete their own location analyses"
  ON location_seo_analysis FOR DELETE
  USING (location_id IN (
    SELECT id FROM business_locations WHERE project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )); 