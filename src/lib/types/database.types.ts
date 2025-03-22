// Define our own Database type for Supabase
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string | null;
          email: string | null;
          avatar_url: string | null;
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
        };
      };

      projects: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          description: string | null;
          website_url: string | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          description?: string | null;
          website_url?: string | null;
          user_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          description?: string | null;
          website_url?: string | null;
          user_id?: string;
        };
      };

      keywords: {
        Row: {
          id: string;
          created_at: string;
          project_id: string;
          keyword: string;
          volume: number | null;
          difficulty: number | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          project_id: string;
          keyword: string;
          volume?: number | null;
          difficulty?: number | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          project_id?: string;
          keyword?: string;
          volume?: number | null;
          difficulty?: number | null;
        };
      };

      keyword_rankings: {
        Row: {
          id: string;
          created_at: string;
          keyword_id: string;
          position: number;
          previous_position: number | null;
          url: string | null;
          serp_features: string[] | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          keyword_id: string;
          position: number;
          previous_position?: number | null;
          url?: string | null;
          serp_features?: string[] | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          keyword_id?: string;
          position?: number;
          previous_position?: number | null;
          url?: string | null;
          serp_features?: string[] | null;
        };
      };

      keyword_analysis: {
        Row: {
          id: string;
          created_at: string;
          keyword_id: string;
          search_intent: string | null;
          serp_analysis: Record<string, any> | null;
          competing_domains: string[] | null;
          content_recommendations: string[] | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          keyword_id: string;
          search_intent?: string | null;
          serp_analysis?: Record<string, any> | null;
          competing_domains?: string[] | null;
          content_recommendations?: string[] | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          keyword_id?: string;
          search_intent?: string | null;
          serp_analysis?: Record<string, any> | null;
          competing_domains?: string[] | null;
          content_recommendations?: string[] | null;
        };
      };

      technical_issues: {
        Row: {
          id: string;
          created_at: string;
          project_id: string;
          issue_type: string;
          severity: 'critical' | 'high' | 'medium' | 'low';
          description: string;
          url: string | null;
          status: 'open' | 'in_progress' | 'resolved';
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          project_id: string;
          issue_type: string;
          severity: 'critical' | 'high' | 'medium' | 'low';
          description: string;
          url?: string | null;
          status?: 'open' | 'in_progress' | 'resolved';
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          project_id?: string;
          issue_type?: string;
          severity?: 'critical' | 'high' | 'medium' | 'low';
          description?: string;
          url?: string | null;
          status?: 'open' | 'in_progress' | 'resolved';
          resolved_at?: string | null;
        };
      };

      content_pages: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          project_id: string;
          url: string;
          title: string | null;
          content: string | null;
          word_count: number | null;
          readability_score: number | null;
          seo_score: number | null;
          content_score: number | null;
          status: 'not-analyzed' | 'analyzing' | 'analyzed' | 'optimized';
          last_analyzed_at: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          project_id: string;
          url: string;
          title?: string | null;
          content?: string | null;
          word_count?: number | null;
          readability_score?: number | null;
          seo_score?: number | null;
          content_score?: number | null;
          status?: 'not-analyzed' | 'analyzing' | 'analyzed' | 'optimized';
          last_analyzed_at?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          project_id?: string;
          url?: string;
          title?: string | null;
          content?: string | null;
          word_count?: number | null;
          readability_score?: number | null;
          seo_score?: number | null;
          content_score?: number | null;
          status?: 'not-analyzed' | 'analyzing' | 'analyzed' | 'optimized';
          last_analyzed_at?: string | null;
        };
      };

      content_analysis: {
        Row: {
          id: string;
          created_at: string;
          content_page_id: string;
          readability_analysis: Record<string, any> | null;
          keyword_analysis: Record<string, any> | null;
          structure_analysis: Record<string, any> | null;
          overall_score: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          content_page_id: string;
          readability_analysis?: Record<string, any> | null;
          keyword_analysis?: Record<string, any> | null;
          structure_analysis?: Record<string, any> | null;
          overall_score: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          content_page_id?: string;
          readability_analysis?: Record<string, any> | null;
          keyword_analysis?: Record<string, any> | null;
          structure_analysis?: Record<string, any> | null;
          overall_score?: number;
        };
      };

      content_suggestions: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          content_analysis_id: string;
          type: string;
          suggestion: string;
          implemented: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          content_analysis_id: string;
          type: string;
          suggestion: string;
          implemented?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          content_analysis_id?: string;
          type?: string;
          suggestion?: string;
          implemented?: boolean;
        };
      };

      topic_clusters: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          project_id: string;
          name: string;
          main_keyword: string;
          related_topics: string[] | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          project_id: string;
          name: string;
          main_keyword: string;
          related_topics?: string[] | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          project_id?: string;
          name?: string;
          main_keyword?: string;
          related_topics?: string[] | null;
        };
      };

      content_briefs: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          project_id: string;
          topic_cluster_id: string | null;
          title: string;
          target_keyword: string;
          secondary_keywords: string[] | null;
          outline: Record<string, any> | null;
          research_notes: string | null;
          competitor_insights: Record<string, any>[] | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          project_id: string;
          topic_cluster_id?: string | null;
          title: string;
          target_keyword: string;
          secondary_keywords?: string[] | null;
          outline?: Record<string, any> | null;
          research_notes?: string | null;
          competitor_insights?: Record<string, any>[] | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          project_id?: string;
          topic_cluster_id?: string | null;
          title?: string;
          target_keyword?: string;
          secondary_keywords?: string[] | null;
          outline?: Record<string, any> | null;
          research_notes?: string | null;
          competitor_insights?: Record<string, any>[] | null;
        };
      };

      competitor_content: {
        Row: {
          id: string;
          created_at: string;
          project_id: string;
          url: string;
          title: string | null;
          content_summary: string | null;
          key_points: string[] | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          project_id: string;
          url: string;
          title?: string | null;
          content_summary?: string | null;
          key_points?: string[] | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          project_id?: string;
          url?: string;
          title?: string | null;
          content_summary?: string | null;
          key_points?: string[] | null;
        };
      };
    };

    Views: {};

    Functions: {};
  };
};

// Helper types for database queries
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Helper types to make working with the database easier
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Project = Database['public']['Tables']['projects']['Row'];
export type Keyword = Database['public']['Tables']['keywords']['Row'];
export type KeywordAnalysis = Database['public']['Tables']['keyword_analysis']['Row'];
export type TechnicalIssue = Database['public']['Tables']['technical_issues']['Row'];
export type ContentPage = Database['public']['Tables']['content_pages']['Row'];
export type ContentAnalysis = Database['public']['Tables']['content_analysis']['Row'];
export type ContentSuggestion = Database['public']['Tables']['content_suggestions']['Row'];
export type TopicCluster = Database['public']['Tables']['topic_clusters']['Row'];
export type ContentBrief = Database['public']['Tables']['content_briefs']['Row'];
export type CompetitorContent = Database['public']['Tables']['competitor_content']['Row']; 