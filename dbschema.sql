-- Create extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table (created by Supabase Auth already)
-- This is just a reference, not to be executed 
-- CREATE TABLE auth.users (
--   id uuid REFERENCES auth.users NOT NULL,
--   email text,
--   PRIMARY KEY (id)
-- );

-- Create projects table
CREATE TABLE public.projects (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  website_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  competitors TEXT[] DEFAULT '{}',
  seo_score INTEGER DEFAULT 0,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create keyword_rankings table
CREATE TABLE public.keyword_rankings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  position INTEGER,
  previous_position INTEGER,
  change INTEGER,
  date_checked TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create seo_recommendations table
CREATE TABLE public.seo_recommendations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL, -- 'high', 'medium', 'low'
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create content_pages table for tracking analyzed pages
CREATE TABLE public.content_pages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  content TEXT,
  word_count INTEGER,
  readability_score DECIMAL(5,2),
  seo_score INTEGER,
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create content_analysis table for storing AI analysis results
CREATE TABLE public.content_analysis (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  page_id uuid REFERENCES public.content_pages(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL, -- 'keyword_usage', 'readability', 'sentiment', etc.
  result JSONB NOT NULL, -- Store analysis results in JSON format
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create content_suggestions table for AI-generated suggestions
CREATE TABLE public.content_suggestions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  page_id uuid REFERENCES public.content_pages(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL, -- 'title', 'meta_description', 'content', 'structure', etc.
  original_text TEXT,
  suggested_text TEXT NOT NULL,
  reason TEXT,
  implemented BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create topic_clusters table for content organization
CREATE TABLE public.topic_clusters (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  main_keyword TEXT,
  related_keywords TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create content_briefs table for AI-generated content briefs
CREATE TABLE public.content_briefs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  topic_cluster_id uuid REFERENCES public.topic_clusters(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  target_keywords TEXT[],
  content_structure JSONB,
  suggested_headings TEXT[],
  word_count_target INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create backlinks table for tracking discovered backlinks
CREATE TABLE public.backlinks (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  target_url TEXT NOT NULL,
  anchor_text TEXT,
  link_type TEXT NOT NULL DEFAULT 'external', -- 'external', 'internal', 'nofollow'
  page_authority DECIMAL(5,2),
  domain_authority DECIMAL(5,2),
  first_discovered TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'active' -- 'active', 'broken', 'removed'
);

-- Create backlink_analysis table for storing backlink metrics
CREATE TABLE public.backlink_analysis (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  total_backlinks INTEGER DEFAULT 0,
  unique_domains INTEGER DEFAULT 0,
  average_domain_authority DECIMAL(5,2),
  backlinks_by_type JSONB, -- Distribution of backlink types
  top_anchor_texts JSONB, -- Most common anchor texts
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create backlink_reports table for scheduled and on-demand reports
CREATE TABLE public.backlink_reports (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  report_name TEXT NOT NULL,
  report_data JSONB NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  schedule TEXT, -- 'daily', 'weekly', 'monthly', 'once'
  next_run TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create competitor_backlinks table for tracking competitor backlinks
CREATE TABLE public.competitor_backlinks (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  competitor_url TEXT NOT NULL,
  source_url TEXT NOT NULL,
  anchor_text TEXT,
  page_authority DECIMAL(5,2),
  domain_authority DECIMAL(5,2),
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Set up RLS (Row Level Security)
-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own projects
CREATE POLICY projects_user_policy 
  ON public.projects 
  FOR ALL
  USING (auth.uid() = user_id);

-- Enable RLS on keyword_rankings
ALTER TABLE public.keyword_rankings ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own keyword rankings
CREATE POLICY keyword_rankings_user_policy 
  ON public.keyword_rankings 
  FOR ALL
  USING (project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  ));

-- Enable RLS on seo_recommendations
ALTER TABLE public.seo_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own SEO recommendations
CREATE POLICY seo_recommendations_user_policy 
  ON public.seo_recommendations 
  FOR ALL
  USING (project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )); 

-- Enable RLS on content_pages
ALTER TABLE public.content_pages ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own content pages
CREATE POLICY content_pages_user_policy 
  ON public.content_pages 
  FOR ALL
  USING (project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  ));

-- Enable RLS on content_analysis
ALTER TABLE public.content_analysis ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own content analysis
CREATE POLICY content_analysis_user_policy 
  ON public.content_analysis 
  FOR ALL
  USING (page_id IN (
    SELECT id FROM public.content_pages WHERE project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  ));

-- Enable RLS on content_suggestions
ALTER TABLE public.content_suggestions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own content suggestions
CREATE POLICY content_suggestions_user_policy 
  ON public.content_suggestions 
  FOR ALL
  USING (page_id IN (
    SELECT id FROM public.content_pages WHERE project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
    )
  ));

-- Enable RLS on topic_clusters
ALTER TABLE public.topic_clusters ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own topic clusters
CREATE POLICY topic_clusters_user_policy 
  ON public.topic_clusters 
  FOR ALL
  USING (project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  ));

-- Enable RLS on content_briefs
ALTER TABLE public.content_briefs ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own content briefs
CREATE POLICY content_briefs_user_policy 
  ON public.content_briefs 
  FOR ALL
  USING (project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  ));

-- Enable RLS on backlinks
ALTER TABLE public.backlinks ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own backlinks
CREATE POLICY backlinks_user_policy 
  ON public.backlinks 
  FOR ALL
  USING (project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  ));

-- Enable RLS on backlink_analysis
ALTER TABLE public.backlink_analysis ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own backlink analysis
CREATE POLICY backlink_analysis_user_policy 
  ON public.backlink_analysis 
  FOR ALL
  USING (project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  ));

-- Enable RLS on backlink_reports
ALTER TABLE public.backlink_reports ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own backlink reports
CREATE POLICY backlink_reports_user_policy 
  ON public.backlink_reports 
  FOR ALL
  USING (project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  ));

-- Enable RLS on competitor_backlinks
ALTER TABLE public.competitor_backlinks ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own competitor backlinks
CREATE POLICY competitor_backlinks_user_policy 
  ON public.competitor_backlinks 
  FOR ALL
  USING (project_id IN (
    SELECT id FROM public.projects WHERE user_id = auth.uid()
  )); 