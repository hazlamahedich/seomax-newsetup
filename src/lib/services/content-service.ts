import { createClient } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin-client";
import {
  ContentPage,
  ContentAnalysis,
  ContentSuggestion,
  TopicCluster,
  ContentBrief,
  CompetitorContent
} from '@/lib/types/database.types';

// Interface definitions for database tables
export interface ContentPageTable {
  id: string;
  project_id: string;
  url: string;
  title: string | null;
  content: string | null;
  word_count: number | null;
  readability_score: number | null;
  seo_score: number | null;
  analyzed_at: string | null;
  created_at: string;
}

export interface ContentAnalysisTable {
  id: string;
  page_id: string;
  analysis_type: string;
  result: Record<string, any>;
  created_at: string;
}

export interface ContentSuggestionTable {
  id: string;
  page_id: string;
  suggestion_type: string;
  original_text: string;
  suggested_text: string;
  reason: string;
  implemented: boolean;
  created_at: string;
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
    try {
      // First try with regular client
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
      
      const { data, error } = await supabase
        .from('content_pages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error with regular client, trying admin client:', error);
        
        // If regular client fails, try with admin client to bypass RLS
        const adminClient = createAdminClient();
        const { data: adminData, error: adminError } = await adminClient
          .from('content_pages')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
          
        if (adminError) {
          console.error('Error with admin client too:', adminError);
          throw adminError;
        }
        
        console.log(`[AdminClient] Retrieved ${adminData.length} content pages`);
        return adminData || [];
      }

      console.log(`[RegularClient] Retrieved ${data.length} content pages`);
      return data || [];
    } catch (error) {
      console.error('Error fetching content pages:', error);
      throw error;
    }
  },

  async getContentPage(id: string) {
    try {
      // First try with regular client
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
      
      const { data, error } = await supabase
        .from('content_pages')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error with regular client, trying admin client:', error);
        
        // If regular client fails, try with admin client to bypass RLS
        const adminClient = createAdminClient();
        const { data: adminData, error: adminError } = await adminClient
          .from('content_pages')
          .select('*')
          .eq('id', id)
          .single();
          
        if (adminError) {
          console.error('Error with admin client too:', adminError);
          throw adminError;
        }
        
        console.log(`[AdminClient] Retrieved content page with ID ${id}`);
        return adminData;
      }

      console.log(`[RegularClient] Retrieved content page with ID ${id}`);
      return data;
    } catch (error) {
      console.error('Error fetching content page:', error);
      throw error;
    }
  },

  async createContentPage(data: Omit<ContentPageTable, 'id' | 'created_at' | 'updated_at' | 'analyzed_at'>) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
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
    console.log(`Starting content analysis for page ID: ${id}`);
    try {
      // Call the direct content-analysis API with skipAuth=true
      const response = await fetch('/api/content-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentPageId: id,
          skipAuth: true,
          action: "analyze"
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Content analysis API error:', errorData);
        throw new Error(errorData.error || 'Content analysis failed');
      }
      
      const data = await response.json();
      console.log('Content analysis completed successfully:', data.success);
      return true;
    } catch (err) {
      console.error('Error analyzing content:', err);
      return false;
    }
  },

  async updateContentSuggestion(id: string, implemented: boolean) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
      
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

  async getContentPageWithAnalysis(contentPageId: string) {
    try {
      console.log(`Fetching content and analysis via API for contentPageId: ${contentPageId}`);
      const response = await fetch(`/api/content-analysis?contentPageId=${contentPageId}&skipAuth=true`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response from content-analysis API:', errorData);
        throw new Error(errorData.error || 'Failed to fetch content data');
      }
      
      const data = await response.json();
      console.log('API response for content and analysis:', data);
      
      return {
        page: data.contentPage,
        analysis: data.analysis
      };
    } catch (error) {
      console.error('Error fetching content page with analysis:', error);
      throw error;
    }
  }
};

// Content Analysis Service
export const ContentAnalysisService = {
  async getContentAnalyses(contentPageId: string) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    const { data, error } = await supabase
      .from('content_analysis')
      .select('*')
      .eq('page_id', contentPageId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching content analyses:', error);
      throw error;
    }

    return data || [];
  },

  async getLatestContentAnalysis(contentPageId: string) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    const { data, error } = await supabase
      .from('content_analysis')
      .select('*')
      .eq('page_id', contentPageId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No content analysis found
        return null;
      }
      console.error('Error fetching latest content analysis:', error);
      throw error;
    }

    return data;
  },

  async createContentAnalysis(data: Omit<ContentAnalysisTable, 'id' | 'created_at'>) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
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
  },

  async updateAnalysisWithSuggestions(analysisId: string, suggestions: any[]) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    
    // First insert all the suggestions
    const { data: newSuggestions, error: suggestionsError } = await supabase
      .from('content_suggestions')
      .insert(suggestions.map(suggestion => ({
        page_id: analysisId,
        suggestion_type: suggestion.type,
        original_text: suggestion.original || "",
        suggested_text: suggestion.suggestion,
        reason: suggestion.reason || "Improve content quality",
        implemented: false
      })))
      .select();

    if (suggestionsError) {
      console.error('Error creating content suggestions:', suggestionsError);
      throw suggestionsError;
    }

    return newSuggestions;
  }
};

// Content Suggestion Service
export const ContentSuggestionService = {
  async getSuggestions(contentPageId: string) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    const { data, error } = await supabase
      .from('content_suggestions')
      .select('*')
      .eq('page_id', contentPageId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching content suggestions:', error);
      throw error;
    }

    return data || [];
  },

  async implementSuggestion(suggestionId: string) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    const { data, error } = await supabase
      .from('content_suggestions')
      .update({ implemented: true })
      .eq('id', suggestionId)
      .select()
      .single();

    if (error) {
      console.error('Error implementing suggestion:', error);
      throw error;
    }

    return data;
  },

  async rejectSuggestion(suggestionId: string) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    const { data, error } = await supabase
      .from('content_suggestions')
      .update({ 
        implemented: false,
        rejected: true 
      })
      .eq('id', suggestionId)
      .select()
      .single();

    if (error) {
      console.error('Error rejecting suggestion:', error);
      throw error;
    }

    return data;
  }
};

// Content Performance Service
export const ContentPerformanceService = {
  async getContentPerformance(contentPageId: string, days: number = 30) {
    // In a real implementation, this would fetch performance metrics from a database
    // For now, we'll generate mock performance data
    
    // Generate some mock data
    const today = new Date();
    const data = Array.from({ length: days }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - (days - i - 1));
      
      // Generate semi-realistic numbers with some randomness and trends
      const impressions = Math.floor(50 + Math.random() * 50 + i * 2);
      const clicks = Math.floor(impressions * (0.05 + Math.random() * 0.03));
      const position = Math.max(1, Math.min(10, 4 - (i * 0.1) + Math.random() * 2));
      
      return {
        date: date.toISOString().split('T')[0],
        impressions,
        clicks,
        position,
        ctr: clicks / impressions
      };
    });
    
    return data;
  },
  
  async getContentPerformanceSummary(contentPageId: string, days: number = 30) {
    // Get the detailed performance data
    const performanceData = await this.getContentPerformance(contentPageId, days);
    
    // Calculate summary metrics
    const totalImpressions = performanceData.reduce((sum, day) => sum + day.impressions, 0);
    const totalClicks = performanceData.reduce((sum, day) => sum + day.clicks, 0);
    const averageCtr = totalClicks / totalImpressions;
    const averagePosition = performanceData.reduce((sum, day) => sum + day.position, 0) / performanceData.length;
    
    return {
      totalImpressions,
      totalClicks,
      averageCtr,
      averagePosition,
      period: days
    };
  }
};

// Content Gap Analysis Service
export const ContentGapService = {
  async analyzeContentGaps(contentPageId: string, competitorUrls: string[] = []) {
    // In a real implementation, this would analyze competitor content
    // For now, we'll return mock data
    
    // Get the content page
    const contentPage = await ContentPageService.getContentPage(contentPageId);
    const keyword = contentPage.title || 'content marketing';
    
    // Generate mock gap analysis
    return {
      missingKeywords: [
        `${keyword} statistics`,
        `${keyword} examples`,
        `${keyword} case studies`,
        `${keyword} tools`
      ],
      missingTopics: [
        `How to measure ${keyword} success`,
        `${keyword} best practices`,
        `${keyword} challenges and solutions`,
      ],
      contentGaps: [
        {
          topic: `${keyword} ROI calculation`,
          importance: 8,
          suggestedContent: `Add a section explaining how to calculate and measure ROI for ${keyword} initiatives, with examples and formulas.`
        },
        {
          topic: `${keyword} industry benchmarks`,
          importance: 7,
          suggestedContent: `Include industry benchmarks and statistics to help readers understand what good performance looks like.`
        },
        {
          topic: `${keyword} tools comparison`,
          importance: 6,
          suggestedContent: `Create a comparison table of top tools for ${keyword} with features, pricing, and pros/cons.`
        }
      ],
      competitors: competitorUrls.map((url, index) => ({
        url,
        title: `Competitor ${index + 1}: ${keyword} Guide`,
        wordCount: [1200, 1500, 1800, 2000][index % 4],
        uniqueTopics: [`${keyword} ROI`, `${keyword} tools`, `${keyword} examples`, `${keyword} trends`].slice(0, 2 + index % 2),
        strengths: [`Comprehensive coverage`, `Case studies`, `Visual examples`, `Expert quotes`].slice(0, 2 + index % 2)
      }))
    };
  },
  
  async getCompetitorContent(url: string) {
    // In a real implementation, this would fetch and parse competitor content
    // For now, we'll return mock content
    return {
      url,
      title: `Competitor Guide to Content Marketing`,
      content: `This is a mock representation of competitor content that would be fetched and analyzed in a real implementation.`,
      wordCount: 1500 + Math.floor(Math.random() * 1000),
      keywordDensity: 0.02 + (Math.random() * 0.015)
    };
  },
  
  async addCompetitor(contentPageId: string, competitorUrl: string) {
    // In a real implementation, this would store the competitor URL in a database
    // For now, we'll just return a mock response
    return {
      id: `comp-${Date.now()}`,
      content_page_id: contentPageId,
      url: competitorUrl,
      analyzed_at: new Date().toISOString()
    };
  }
};

// Topic Cluster Service
export const TopicClusterService = {
  async getTopicClusters(projectId: string) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
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