-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create a secure schema for our application tables
CREATE SCHEMA IF NOT EXISTS seomax;

-- Create profiles table
CREATE TABLE IF NOT EXISTS seomax.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create projects table
CREATE TABLE IF NOT EXISTS seomax.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create keywords table
CREATE TABLE IF NOT EXISTS seomax.keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES seomax.projects(id) ON DELETE CASCADE NOT NULL,
  keyword TEXT NOT NULL,
  search_volume INTEGER,
  difficulty DECIMAL(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create keyword analysis table (for storing AI analysis results)
CREATE TABLE IF NOT EXISTS seomax.keyword_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id UUID REFERENCES seomax.keywords(id) ON DELETE CASCADE NOT NULL,
  intent TEXT,
  serp_features JSONB,
  related_topics JSONB,
  suggestions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create technical issues table (for storing site audit results)
CREATE TABLE IF NOT EXISTS seomax.technical_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES seomax.projects(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL, -- 'high', 'medium', 'low'
  is_fixed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create content_pages table for tracking analyzed pages
CREATE TABLE IF NOT EXISTS seomax.content_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES seomax.projects(id) ON DELETE CASCADE NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  content TEXT,
  word_count INTEGER,
  readability_score DECIMAL(5,2),
  seo_score INTEGER,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create content_analysis table for storing AI analysis results
CREATE TABLE IF NOT EXISTS seomax.content_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES seomax.content_pages(id) ON DELETE CASCADE NOT NULL,
  analysis_type TEXT NOT NULL, -- 'keyword_usage', 'readability', 'sentiment', etc.
  result JSONB NOT NULL, -- Store analysis results in JSON format
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create content_suggestions table for AI-generated suggestions
CREATE TABLE IF NOT EXISTS seomax.content_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES seomax.content_pages(id) ON DELETE CASCADE NOT NULL,
  suggestion_type TEXT NOT NULL, -- 'title', 'meta_description', 'content', 'structure', etc.
  original_text TEXT,
  suggested_text TEXT NOT NULL,
  reason TEXT,
  implemented BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create topic_clusters table for content organization
CREATE TABLE IF NOT EXISTS seomax.topic_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES seomax.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  main_keyword TEXT,
  related_keywords TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create content_briefs table for AI-generated content briefs
CREATE TABLE IF NOT EXISTS seomax.content_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES seomax.projects(id) ON DELETE CASCADE NOT NULL,
  topic_cluster_id UUID REFERENCES seomax.topic_clusters(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  target_keywords TEXT[],
  content_structure JSONB,
  suggested_headings TEXT[],
  word_count_target INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create competitor_content table for competitor analysis
CREATE TABLE IF NOT EXISTS seomax.competitor_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES seomax.projects(id) ON DELETE CASCADE NOT NULL,
  competitor_url TEXT NOT NULL,
  page_url TEXT NOT NULL,
  title TEXT,
  content TEXT,
  word_count INTEGER,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_feedback table for collecting user feedback
CREATE TABLE IF NOT EXISTS seomax.user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL, -- 'feature_request', 'bug_report', 'general', 'usability', 'satisfaction'
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  location TEXT, -- Which page/feature the feedback is about
  status TEXT DEFAULT 'new', -- 'new', 'in_review', 'planned', 'implemented', 'declined'
  admin_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable row level security on all tables
ALTER TABLE seomax.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE seomax.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE seomax.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE seomax.keyword_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE seomax.technical_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE seomax.content_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE seomax.content_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE seomax.content_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seomax.topic_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE seomax.content_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE seomax.competitor_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE seomax.user_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" 
  ON seomax.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON seomax.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Create policies for projects
CREATE POLICY "Users can view own projects" 
  ON seomax.projects FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects" 
  ON seomax.projects FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" 
  ON seomax.projects FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" 
  ON seomax.projects FOR DELETE 
  USING (auth.uid() = user_id);

-- Create policies for keywords
CREATE POLICY "Users can view own keywords" 
  ON seomax.keywords FOR SELECT 
  USING (auth.uid() = (SELECT user_id FROM seomax.projects WHERE id = project_id));

CREATE POLICY "Users can create own keywords" 
  ON seomax.keywords FOR INSERT 
  WITH CHECK (auth.uid() = (SELECT user_id FROM seomax.projects WHERE id = project_id));

CREATE POLICY "Users can update own keywords" 
  ON seomax.keywords FOR UPDATE 
  USING (auth.uid() = (SELECT user_id FROM seomax.projects WHERE id = project_id));

CREATE POLICY "Users can delete own keywords" 
  ON seomax.keywords FOR DELETE 
  USING (auth.uid() = (SELECT user_id FROM seomax.projects WHERE id = project_id));

-- Create policies for keyword analysis
CREATE POLICY "Users can view own keyword analysis" 
  ON seomax.keyword_analysis FOR SELECT 
  USING (auth.uid() = (
    SELECT user_id FROM seomax.projects 
    WHERE id = (
      SELECT project_id FROM seomax.keywords 
      WHERE id = keyword_id
    )
  ));

-- Create policies for technical issues
CREATE POLICY "Users can view own technical issues" 
  ON seomax.technical_issues FOR SELECT 
  USING (auth.uid() = (SELECT user_id FROM seomax.projects WHERE id = project_id));

-- Create policies for content pages
CREATE POLICY "Users can view own content pages" 
  ON seomax.content_pages FOR SELECT 
  USING (auth.uid() = (SELECT user_id FROM seomax.projects WHERE id = project_id));

CREATE POLICY "Users can create own content pages" 
  ON seomax.content_pages FOR INSERT 
  WITH CHECK (auth.uid() = (SELECT user_id FROM seomax.projects WHERE id = project_id));

CREATE POLICY "Users can update own content pages" 
  ON seomax.content_pages FOR UPDATE 
  USING (auth.uid() = (SELECT user_id FROM seomax.projects WHERE id = project_id));

CREATE POLICY "Users can delete own content pages" 
  ON seomax.content_pages FOR DELETE 
  USING (auth.uid() = (SELECT user_id FROM seomax.projects WHERE id = project_id));

-- Create policies for content analysis
CREATE POLICY "Users can view own content analysis" 
  ON seomax.content_analysis FOR SELECT 
  USING (auth.uid() = (
    SELECT user_id FROM seomax.projects 
    WHERE id = (
      SELECT project_id FROM seomax.content_pages 
      WHERE id = page_id
    )
  ));

-- Create policies for content suggestions
CREATE POLICY "Users can view own content suggestions" 
  ON seomax.content_suggestions FOR SELECT 
  USING (auth.uid() = (
    SELECT user_id FROM seomax.projects 
    WHERE id = (
      SELECT project_id FROM seomax.content_pages 
      WHERE id = page_id
    )
  ));

CREATE POLICY "Users can update own content suggestions" 
  ON seomax.content_suggestions FOR UPDATE 
  USING (auth.uid() = (
    SELECT user_id FROM seomax.projects 
    WHERE id = (
      SELECT project_id FROM seomax.content_pages 
      WHERE id = page_id
    )
  ));

-- Create policies for topic clusters
CREATE POLICY "Users can view own topic clusters" 
  ON seomax.topic_clusters FOR SELECT 
  USING (auth.uid() = (SELECT user_id FROM seomax.projects WHERE id = project_id));

CREATE POLICY "Users can create own topic clusters" 
  ON seomax.topic_clusters FOR INSERT 
  WITH CHECK (auth.uid() = (SELECT user_id FROM seomax.projects WHERE id = project_id));

CREATE POLICY "Users can update own topic clusters" 
  ON seomax.topic_clusters FOR UPDATE 
  USING (auth.uid() = (SELECT user_id FROM seomax.projects WHERE id = project_id));

CREATE POLICY "Users can delete own topic clusters" 
  ON seomax.topic_clusters FOR DELETE 
  USING (auth.uid() = (SELECT user_id FROM seomax.projects WHERE id = project_id));

-- Create policies for content briefs
CREATE POLICY "Users can view own content briefs" 
  ON seomax.content_briefs FOR SELECT 
  USING (auth.uid() = (SELECT user_id FROM seomax.projects WHERE id = project_id));

CREATE POLICY "Users can create own content briefs" 
  ON seomax.content_briefs FOR INSERT 
  WITH CHECK (auth.uid() = (SELECT user_id FROM seomax.projects WHERE id = project_id));

CREATE POLICY "Users can update own content briefs" 
  ON seomax.content_briefs FOR UPDATE 
  USING (auth.uid() = (SELECT user_id FROM seomax.projects WHERE id = project_id));

CREATE POLICY "Users can delete own content briefs" 
  ON seomax.content_briefs FOR DELETE 
  USING (auth.uid() = (SELECT user_id FROM seomax.projects WHERE id = project_id));

-- Create policies for competitor content
CREATE POLICY "Users can view own competitor content" 
  ON seomax.competitor_content FOR SELECT 
  USING (auth.uid() = (SELECT user_id FROM seomax.projects WHERE id = project_id));

CREATE POLICY "Users can create own competitor content" 
  ON seomax.competitor_content FOR INSERT 
  WITH CHECK (auth.uid() = (SELECT user_id FROM seomax.projects WHERE id = project_id));

-- Create policies for user_feedback
CREATE POLICY "Users can view own feedback" 
  ON seomax.user_feedback FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create feedback" 
  ON seomax.user_feedback FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own feedback" 
  ON seomax.user_feedback FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_projects_user_id ON seomax.projects(user_id);
CREATE INDEX idx_keywords_project_id ON seomax.keywords(project_id);
CREATE INDEX idx_keyword_analysis_keyword_id ON seomax.keyword_analysis(keyword_id);
CREATE INDEX idx_technical_issues_project_id ON seomax.technical_issues(project_id);
CREATE INDEX idx_keywords_keyword ON seomax.keywords(keyword);
CREATE INDEX idx_content_pages_project_id ON seomax.content_pages(project_id);
CREATE INDEX idx_content_pages_url ON seomax.content_pages(url);
CREATE INDEX idx_content_analysis_page_id ON seomax.content_analysis(page_id);
CREATE INDEX idx_content_suggestions_page_id ON seomax.content_suggestions(page_id);
CREATE INDEX idx_topic_clusters_project_id ON seomax.topic_clusters(project_id);
CREATE INDEX idx_content_briefs_project_id ON seomax.content_briefs(project_id);
CREATE INDEX idx_content_briefs_topic_cluster_id ON seomax.content_briefs(topic_cluster_id);
CREATE INDEX idx_competitor_content_project_id ON seomax.competitor_content(project_id);
CREATE INDEX idx_competitor_content_competitor_url ON seomax.competitor_content(competitor_url);
CREATE INDEX idx_user_feedback_user_id ON seomax.user_feedback(user_id);

-- Create functions for profile management
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO seomax.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 