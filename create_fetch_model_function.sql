-- Function to fetch a model by ID using plain SQL
CREATE OR REPLACE FUNCTION public.fetch_model_by_id(model_id UUID)
RETURNS SETOF llm_models AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.llm_models
  WHERE id = model_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.fetch_model_by_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fetch_model_by_id(UUID) TO service_role; 