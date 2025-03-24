-- Create LLM models table
CREATE TABLE IF NOT EXISTS llm_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  api_key VARCHAR(255),
  base_url VARCHAR(255),
  temperature DECIMAL(3, 2) NOT NULL DEFAULT 0.2,
  max_tokens INTEGER NOT NULL DEFAULT 2000,
  cost_per_token DECIMAL(10, 8),
  cost_per_thousand_tokens DECIMAL(10, 4),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create LLM usage metrics table
CREATE TABLE IF NOT EXISTS llm_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  total_tokens INTEGER NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  estimated_cost DECIMAL(10, 4) NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  request_id VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB
);

-- Create index on created_at for faster date range queries
CREATE INDEX IF NOT EXISTS idx_llm_usage_created_at ON llm_usage(created_at);

-- Create index on user_id for filtering by user
CREATE INDEX IF NOT EXISTS idx_llm_usage_user_id ON llm_usage(user_id);

-- Create index on model_name for filtering by model
CREATE INDEX IF NOT EXISTS idx_llm_usage_model_name ON llm_usage(model_name);

-- Create a view for daily usage statistics
CREATE OR REPLACE VIEW daily_llm_usage AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  SUM(total_tokens) as total_tokens,
  SUM(estimated_cost) as total_cost,
  COUNT(*) as request_count,
  model_name,
  provider,
  user_id,
  project_id
FROM 
  llm_usage
GROUP BY 
  DATE_TRUNC('day', created_at),
  model_name,
  provider,
  user_id,
  project_id;

-- Create a function to get usage statistics for a date range
CREATE OR REPLACE FUNCTION get_llm_usage_stats(
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  user_id_param UUID DEFAULT NULL,
  model_name_param VARCHAR DEFAULT NULL,
  provider_param VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  total_tokens BIGINT,
  total_cost DECIMAL(10, 4),
  request_count BIGINT,
  model_name VARCHAR,
  provider VARCHAR,
  date DATE
)
LANGUAGE SQL
AS $$
  SELECT 
    SUM(total_tokens) as total_tokens,
    SUM(estimated_cost) as total_cost,
    COUNT(*) as request_count,
    model_name,
    provider,
    DATE(created_at) as date
  FROM 
    llm_usage
  WHERE 
    created_at BETWEEN start_date AND end_date
    AND (user_id_param IS NULL OR user_id = user_id_param)
    AND (model_name_param IS NULL OR model_name = model_name_param)
    AND (provider_param IS NULL OR provider = provider_param)
  GROUP BY 
    model_name, provider, DATE(created_at)
  ORDER BY 
    DATE(created_at);
$$; 