-- Create the llm_models table
CREATE TABLE IF NOT EXISTS llm_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    api_key TEXT,
    base_url TEXT,
    temperature FLOAT DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2000,
    cost_per_token FLOAT DEFAULT 0,
    cost_per_thousand_tokens FLOAT DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an index on is_default to speed up queries for the default model
CREATE INDEX IF NOT EXISTS idx_llm_models_is_default ON llm_models(is_default);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_llm_models_updated_at
    BEFORE UPDATE ON llm_models
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create a trigger to ensure only one default model
CREATE OR REPLACE FUNCTION ensure_single_default_model()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default THEN
        UPDATE llm_models
        SET is_default = false
        WHERE id != NEW.id AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER ensure_single_default_model_trigger
    BEFORE INSERT OR UPDATE ON llm_models
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_model();

-- Create RPC function to fetch model by ID (for resilient querying)
CREATE OR REPLACE FUNCTION fetch_model_by_id(model_id UUID)
RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    provider VARCHAR(50),
    model_name VARCHAR(255),
    api_key TEXT,
    base_url TEXT,
    temperature FLOAT,
    max_tokens INTEGER,
    cost_per_token FLOAT,
    cost_per_thousand_tokens FLOAT,
    is_default BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM llm_models
    WHERE llm_models.id = model_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 