// SERP Analysis Types
export interface SerpFeature {
  type: string;
  position: number;
  content?: string;
}

export interface SerpAnalysis {
  features: SerpFeature[];
  topResults: {
    url: string;
    title: string;
    description: string;
    position: number;
  }[];
  searchVolume?: number;
  competitionLevel?: number;
  cpc?: number;
}

// Content Analysis Types
export interface ReadabilityAnalysis {
  score: number;
  fleschKincaidScore?: number;
  averageSentenceLength: number;
  averageWordLength: number;
  passiveVoiceCount: number;
  complexWordCount: number;
  readingTime: number;
  suggestions: string[];
}

export interface KeywordAnalysisResult {
  primaryKeyword: {
    keyword: string;
    density: number;
    count: number;
    positions: number[];
  };
  secondaryKeywords: {
    keyword: string;
    density: number;
    count: number;
  }[];
  missingKeywords: string[];
  suggestions: string[];
}

export interface StructureAnalysis {
  headingStructure: {
    h1Count: number;
    h2Count: number;
    h3Count: number;
    h4Count: number;
    h5Count: number;
    h6Count: number;
  };
  paragraphCount: number;
  listCount: number;
  imageCount: number;
  linkCount: {
    internal: number;
    external: number;
  };
  suggestions: string[];
}

// Content Brief Types
export interface ContentBriefSection {
  title: string;
  subSections?: ContentBriefSection[];
  keyPoints?: string[];
  targetWordCount?: number;
  keywords?: string[];
}

export interface ContentBriefOutline {
  introduction: ContentBriefSection;
  mainSections: ContentBriefSection[];
  conclusion: ContentBriefSection;
  targetTotalWordCount: number;
  suggestedTitle: string;
  metaDescription: string;
}

export interface CompetitorInsight {
  url: string;
  title: string;
  wordCount: number;
  headings: string[];
  keyPoints: string[];
  uniqueAngles: string[];
  strengthWeakness: {
    strengths: string[];
    weaknesses: string[];
  };
  contentGaps: string[];
}

// Database Views Interface
export interface DatabaseViews {
  project_performance: {
    Row: {
      project_id: string;
      total_keywords: number;
      average_position: number;
      content_score: number;
      technical_score: number;
      last_updated: string;
    };
  };
  content_metrics: {
    Row: {
      content_id: string;
      project_id: string;
      url: string;
      performance_score: number;
      engagement_rate: number;
      conversion_rate: number;
      last_updated: string;
    };
  };
  keyword_trends: {
    Row: {
      keyword_id: string;
      project_id: string;
      keyword: string;
      position_history: number[];
      trend_direction: 'up' | 'down' | 'stable';
      last_updated: string;
    };
  };
}

// Database Functions Interface
export interface DatabaseFunctions {
  calculate_project_metrics: {
    Args: {
      p_project_id: string;
    };
    Returns: {
      total_keywords: number;
      average_position: number;
      content_score: number;
      technical_score: number;
    };
  };
  analyze_keyword_trends: {
    Args: {
      p_keyword_id: string;
      p_date_range: number;
    };
    Returns: {
      trend_direction: 'up' | 'down' | 'stable';
      position_change: number;
      volatility_score: number;
    };
  };
  generate_seo_report: {
    Args: {
      p_project_id: string;
      p_start_date: string;
      p_end_date: string;
    };
    Returns: Record<string, number | string>[];
  };
}

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
          serp_analysis: SerpAnalysis | null;
          competing_domains: string[] | null;
          content_recommendations: string[] | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          keyword_id: string;
          search_intent?: string | null;
          serp_analysis?: SerpAnalysis | null;
          competing_domains?: string[] | null;
          content_recommendations?: string[] | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          keyword_id?: string;
          search_intent?: string | null;
          serp_analysis?: SerpAnalysis | null;
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
          readability_analysis: ReadabilityAnalysis | null;
          keyword_analysis: KeywordAnalysisResult | null;
          structure_analysis: StructureAnalysis | null;
          overall_score: number;
        };
        Insert: {
          id?: string;
          created_at?: string;
          content_page_id: string;
          readability_analysis?: ReadabilityAnalysis | null;
          keyword_analysis?: KeywordAnalysisResult | null;
          structure_analysis?: StructureAnalysis | null;
          overall_score: number;
        };
        Update: {
          id?: string;
          created_at?: string;
          content_page_id?: string;
          readability_analysis?: ReadabilityAnalysis | null;
          keyword_analysis?: KeywordAnalysisResult | null;
          structure_analysis?: StructureAnalysis | null;
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
          outline: ContentBriefOutline | null;
          research_notes: string | null;
          competitor_insights: CompetitorInsight[] | null;
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
          outline?: ContentBriefOutline | null;
          research_notes?: string | null;
          competitor_insights?: CompetitorInsight[] | null;
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
          outline?: ContentBriefOutline | null;
          research_notes?: string | null;
          competitor_insights?: CompetitorInsight[] | null;
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

    Views: DatabaseViews;

    Functions: DatabaseFunctions;
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