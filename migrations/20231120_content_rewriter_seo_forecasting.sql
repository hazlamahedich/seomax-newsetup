-- Content Rewrites Table
CREATE TABLE IF NOT EXISTS content_rewrites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES content_pages(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  original_content TEXT NOT NULL,
  rewritten_content TEXT NOT NULL,
  keyword_usage JSONB NOT NULL,
  eeat_signals JSONB NOT NULL,
  readability_score INTEGER NOT NULL,
  content_length INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on project_id for content_rewrites
CREATE INDEX IF NOT EXISTS idx_content_rewrites_project_id ON content_rewrites(project_id);

-- Create an index on content_id for content_rewrites
CREATE INDEX IF NOT EXISTS idx_content_rewrites_content_id ON content_rewrites(content_id);

-- SEO Forecasts Table
CREATE TABLE IF NOT EXISTS seo_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES site_crawls(id) ON DELETE CASCADE,
  recommendations JSONB NOT NULL,
  forecast JSONB NOT NULL,
  roi JSONB NOT NULL,
  assumptions TEXT[] NOT NULL,
  implementation_plan JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on project_id for seo_forecasts
CREATE INDEX IF NOT EXISTS idx_seo_forecasts_project_id ON seo_forecasts(project_id);

-- Create an index on site_id for seo_forecasts
CREATE INDEX IF NOT EXISTS idx_seo_forecasts_site_id ON seo_forecasts(site_id);

-- Site Metrics Table for tracking historical data and comparing with forecasts
CREATE TABLE IF NOT EXISTS site_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID NOT NULL REFERENCES site_crawls(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- YYYY-MM format
  traffic INTEGER NOT NULL,
  conversions INTEGER NOT NULL,
  revenue DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(site_id, month)
);

-- Create an index on site_id and month for site_metrics
CREATE INDEX IF NOT EXISTS idx_site_metrics_site_month ON site_metrics(site_id, month);

-- Create updated_at triggers for all tables
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_content_rewrites ON content_rewrites;
CREATE TRIGGER set_timestamp_content_rewrites
BEFORE UPDATE ON content_rewrites
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_seo_forecasts ON seo_forecasts;
CREATE TRIGGER set_timestamp_seo_forecasts
BEFORE UPDATE ON seo_forecasts
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_timestamp_site_metrics ON site_metrics;
CREATE TRIGGER set_timestamp_site_metrics
BEFORE UPDATE ON site_metrics
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Create RLS policies for content_rewrites
ALTER TABLE content_rewrites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own content_rewrites"
  ON content_rewrites FOR SELECT
  USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own content_rewrites"
  ON content_rewrites FOR INSERT
  WITH CHECK (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own content_rewrites"
  ON content_rewrites FOR UPDATE
  USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own content_rewrites"
  ON content_rewrites FOR DELETE
  USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

-- Create RLS policies for seo_forecasts
ALTER TABLE seo_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own seo_forecasts"
  ON seo_forecasts FOR SELECT
  USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert their own seo_forecasts"
  ON seo_forecasts FOR INSERT
  WITH CHECK (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own seo_forecasts"
  ON seo_forecasts FOR UPDATE
  USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own seo_forecasts"
  ON seo_forecasts FOR DELETE
  USING (project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  ));

-- Create RLS policies for site_metrics
ALTER TABLE site_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own site_metrics"
  ON site_metrics FOR SELECT
  USING (site_id IN (
    SELECT id FROM site_crawls WHERE project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert their own site_metrics"
  ON site_metrics FOR INSERT
  WITH CHECK (site_id IN (
    SELECT id FROM site_crawls WHERE project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update their own site_metrics"
  ON site_metrics FOR UPDATE
  USING (site_id IN (
    SELECT id FROM site_crawls WHERE project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete their own site_metrics"
  ON site_metrics FOR DELETE
  USING (site_id IN (
    SELECT id FROM site_crawls WHERE project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )); 