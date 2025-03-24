-- Local SEO analysis tables for SEOMax

-- Table for storing local SEO analysis results
CREATE TABLE IF NOT EXISTS localseo_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES site_crawls (id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  nap_consistency_score INTEGER NOT NULL,
  nap_instances INTEGER NOT NULL,
  nap_is_consistent BOOLEAN NOT NULL,
  gbp_detected BOOLEAN NOT NULL,
  gbp_verified BOOLEAN,
  local_schema_present BOOLEAN NOT NULL,
  local_schema_valid BOOLEAN NOT NULL,
  local_schema_score INTEGER NOT NULL,
  local_keyword_count INTEGER NOT NULL,
  local_keyword_density NUMERIC(5,2) NOT NULL,
  map_detected BOOLEAN NOT NULL,
  map_has_address BOOLEAN NOT NULL,
  overall_score INTEGER NOT NULL,
  grade VARCHAR(1) NOT NULL,
  recommendations TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for Local SEO tables
ALTER TABLE localseo_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for Local SEO tables
CREATE POLICY "Enable read access for all users with access to the project" ON localseo_analyses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM site_crawls sc
      JOIN projects p ON sc.project_id = p.id
      JOIN project_members pm ON p.id = pm.project_id
      WHERE sc.id = localseo_analyses.site_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Enable insert/update access for users with access to the project" ON localseo_analyses
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM site_crawls sc
      JOIN projects p ON sc.project_id = p.id
      JOIN project_members pm ON p.id = pm.project_id
      WHERE sc.id = localseo_analyses.site_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin', 'editor')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_localseo_analyses_site_id ON localseo_analyses (site_id);
CREATE INDEX IF NOT EXISTS idx_localseo_analyses_domain ON localseo_analyses (domain);
CREATE INDEX IF NOT EXISTS idx_localseo_analyses_created_at ON localseo_analyses (created_at);

-- Create seo_analyses table if it doesn't exist
CREATE TABLE IF NOT EXISTS seo_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES site_crawls (id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL,
  technical_score INTEGER,
  content_score INTEGER,
  backlink_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add local SEO field to existing tables
ALTER TABLE seo_analyses ADD COLUMN IF NOT EXISTS local_seo_score INTEGER;

-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_localseo_analyses_timestamp BEFORE UPDATE
ON localseo_analyses FOR EACH ROW EXECUTE PROCEDURE update_timestamp_column(); 