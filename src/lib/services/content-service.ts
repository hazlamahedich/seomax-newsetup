import { createClient } from "@/lib/supabase/client";
import {
  ContentPage,
  ContentAnalysis,
  ContentSuggestion,
  TopicCluster,
  ContentBrief,
  CompetitorContent
} from '@/lib/types/database.types';

// Define table types for type safety
export interface ContentPageTable {
  id: string;
  project_id: string;
  url: string;
  title: string | null;
  content: string | null;
  word_count: number | null;
  readability_score: number | null;
  seo_score: number | null;
  status: 'not-analyzed' | 'analyzing' | 'analyzed' | 'optimized';
  last_analyzed_at: string | null;
  content_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface ContentAnalysisTable {
  id: string;
  content_page_id: string;
  readability_analysis: Record<string, any> | null;
  keyword_analysis: Record<string, any> | null;
  structure_analysis: Record<string, any> | null;
  overall_score: number;
  created_at: string;
}

export interface ContentSuggestionTable {
  id: string;
  content_analysis_id: string;
  type: string;
  suggestion: string;
  implemented: boolean;
  created_at: string;
  updated_at: string;
}

export interface TopicClusterTable {
  id: string;
  project_id: string;
  name: string;
  main_keyword: string;
  related_topics: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ContentBriefTable {
  id: string;
  project_id: string;
  topic_cluster_id: string | null;
  title: string;
  target_keyword: string;
  secondary_keywords: string[] | null;
  outline: Record<string, any> | null;
  research_notes: string | null;
  competitor_insights: Record<string, any>[] | null;
  created_at: string;
  updated_at: string;
}

export interface CompetitorContentTable {
  id: string;
  project_id: string;
  url: string;
  title: string | null;
  content_summary: string | null;
  key_points: string[] | null;
  created_at: string;
}

// Content Page Service
export const ContentPageService = {
  async getContentPages(projectId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('content_pages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching content pages:', error);
      throw error;
    }

    return data || [];
  },

  async getContentPage(id: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('content_pages')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching content page:', error);
      throw error;
    }

    return data;
  },

  async createContentPage(data: Omit<ContentPageTable, 'id' | 'created_at' | 'updated_at' | 'analyzed_at'>) {
    const supabase = createClient();
    const { data: newPage, error } = await supabase
      .from('content_pages')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Error creating content page:', error);
      throw error;
    }

    return newPage;
  },

  async updateContentPage(id: string, data: Partial<Omit<ContentPageTable, 'id' | 'created_at' | 'updated_at'>>) {
    const supabase = createClient();
    const { data: updatedPage, error } = await supabase
      .from('content_pages')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating content page:', error);
      throw error;
    }

    return updatedPage;
  },

  async deleteContentPage(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('content_pages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting content page:', error);
      throw error;
    }

    return true;
  },

  async analyzeContentPage(id: string) {
    const supabase = createClient();
    
    // Set status to analyzing
    await supabase
      .from('content_pages')
      .update({ status: 'analyzing' })
      .eq('id', id);

    // In a real implementation, this would trigger a background job
    // to fetch and analyze the content. Here we're just updating the status.
    
    // For demonstration purposes, let's update with a delay
    setTimeout(async () => {
      await supabase
        .from('content_pages')
        .update({ 
          status: 'analyzed',
          analyzed_at: new Date().toISOString(),
          readability_score: Math.floor(Math.random() * 100),
          seo_score: Math.floor(Math.random() * 100)
        })
        .eq('id', id);
    }, 2000);

    return true;
  },

  async updateContentSuggestion(id: string, implemented: boolean) {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('content_suggestions')
        .update({ implemented })
        .eq('id', id);
        
      if (error) {
        console.error('Error updating content suggestion:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in updateContentSuggestion:', error);
      throw error;
    }
  },

  async getContentPageWithAnalysis(id: string) {
    const supabase = createClient();
    
    // Get the content page
    const { data: contentPage, error: contentError } = await supabase
      .from('content_pages')
      .select('*')
      .eq('id', id)
      .single();
    
    if (contentError) {
      console.error('Error fetching content page:', contentError);
      throw contentError;
    }
    
    // Get the latest content analysis
    const { data: contentAnalyses, error: analysisError } = await supabase
      .from('content_analysis')
      .select('*')
      .eq('content_page_id', id)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (analysisError) {
      console.error('Error fetching content analysis:', analysisError);
      throw analysisError;
    }
    
    // Get content suggestions for the latest analysis
    const latestAnalysis = contentAnalyses?.[0];
    let suggestions = [];
    
    if (latestAnalysis) {
      const { data: contentSuggestions, error: suggestionsError } = await supabase
        .from('content_suggestions')
        .select('*')
        .eq('content_analysis_id', latestAnalysis.id)
        .order('created_at', { ascending: false });
        
      if (suggestionsError) {
        console.error('Error fetching content suggestions:', suggestionsError);
        throw suggestionsError;
      }
      
      suggestions = contentSuggestions || [];
    }
    
    return {
      page: contentPage,
      analysis: latestAnalysis || null,
      suggestions
    };
  }
};

// Content Analysis Service
export const ContentAnalysisService = {
  async getContentAnalyses(contentPageId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('content_analysis')
      .select('*')
      .eq('content_page_id', contentPageId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching content analyses:', error);
      throw error;
    }

    return data || [];
  },

  async createContentAnalysis(data: Omit<ContentAnalysisTable, 'id' | 'created_at'>) {
    const supabase = createClient();
    const { data: newAnalysis, error } = await supabase
      .from('content_analysis')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Error creating content analysis:', error);
      throw error;
    }

    return newAnalysis;
  }
};

// Content Suggestion Service
export const ContentSuggestionService = {
  async getContentSuggestions(contentAnalysisId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('content_suggestions')
      .select('*')
      .eq('content_analysis_id', contentAnalysisId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching content suggestions:', error);
      throw error;
    }

    return data || [];
  },

  async createContentSuggestion(data: Omit<ContentSuggestionTable, 'id' | 'created_at' | 'updated_at'>) {
    const supabase = createClient();
    const { data: newSuggestion, error } = await supabase
      .from('content_suggestions')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Error creating content suggestion:', error);
      throw error;
    }

    return newSuggestion;
  },

  async updateContentSuggestion(id: string, implemented: boolean) {
    const supabase = createClient();
    const { data: updatedSuggestion, error } = await supabase
      .from('content_suggestions')
      .update({ implemented })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating content suggestion:', error);
      throw error;
    }

    return updatedSuggestion;
  }
};

// Topic Cluster Service
export const TopicClusterService = {
  async getTopicClusters(projectId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('topic_clusters')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching topic clusters:', error);
      throw error;
    }

    return data || [];
  },

  async getTopicCluster(id: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('topic_clusters')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching topic cluster:', error);
      throw error;
    }

    return data;
  },

  async createTopicCluster(data: Omit<TopicClusterTable, 'id' | 'created_at' | 'updated_at'>) {
    const supabase = createClient();
    const { data: newCluster, error } = await supabase
      .from('topic_clusters')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Error creating topic cluster:', error);
      throw error;
    }

    return newCluster;
  },

  async updateTopicCluster(id: string, data: Partial<Omit<TopicClusterTable, 'id' | 'created_at' | 'updated_at'>>) {
    const supabase = createClient();
    const { data: updatedCluster, error } = await supabase
      .from('topic_clusters')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating topic cluster:', error);
      throw error;
    }

    return updatedCluster;
  },

  async deleteTopicCluster(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('topic_clusters')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting topic cluster:', error);
      throw error;
    }

    return true;
  }
};

// Content Brief Service
export const ContentBriefService = {
  async getContentBriefs(projectId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('content_briefs')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching content briefs:', error);
      throw error;
    }

    return data || [];
  },

  async getContentBrief(id: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('content_briefs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching content brief:', error);
      throw error;
    }

    return data;
  },

  async createContentBrief(data: Omit<ContentBriefTable, 'id' | 'created_at' | 'updated_at'>) {
    const supabase = createClient();
    const { data: newBrief, error } = await supabase
      .from('content_briefs')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Error creating content brief:', error);
      throw error;
    }

    return newBrief;
  },

  async updateContentBrief(id: string, data: Partial<Omit<ContentBriefTable, 'id' | 'created_at' | 'updated_at'>>) {
    const supabase = createClient();
    const { data: updatedBrief, error } = await supabase
      .from('content_briefs')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating content brief:', error);
      throw error;
    }

    return updatedBrief;
  },

  async deleteContentBrief(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('content_briefs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting content brief:', error);
      throw error;
    }

    return true;
  }
};

// Competitor Content Service
export const CompetitorContentService = {
  async getCompetitorContent(projectId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('competitor_content')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching competitor content:', error);
      throw error;
    }

    return data || [];
  },

  async createCompetitorContent(data: Omit<CompetitorContentTable, 'id' | 'created_at'>) {
    const supabase = createClient();
    const { data: newContent, error } = await supabase
      .from('competitor_content')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Error creating competitor content:', error);
      throw error;
    }

    return newContent;
  },

  async deleteCompetitorContent(id: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('competitor_content')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting competitor content:', error);
      throw error;
    }

    return true;
  }
}; 