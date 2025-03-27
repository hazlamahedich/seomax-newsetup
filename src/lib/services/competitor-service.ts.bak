import { createServerClient } from '../supabase/server';

export class CompetitorService {
  // Get all competitor content for a project
  static async getCompetitorContent(projectId: string) {
    const supabase = createServerClient();
    
    try {
      const { data, error } = await supabase
        .from('competitor_content')
        .select('*, competitor_analysis(*)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching competitor content:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in getCompetitorContent:', error);
      return null;
    }
  }
  
  // Get a single competitor content with its latest analysis
  static async getCompetitorContentWithAnalysis(competitorId: string) {
    const supabase = createServerClient();
    
    try {
      // Get the competitor content
      const { data: competitorContent, error: contentError } = await supabase
        .from('competitor_content')
        .select('*')
        .eq('id', competitorId)
        .single();
      
      if (contentError) {
        console.error('Error fetching competitor content:', contentError);
        return null;
      }
      
      // Get the latest analysis
      const { data: latestAnalysis, error: analysisError } = await supabase
        .from('competitor_analysis')
        .select('*')
        .eq('competitor_content_id', competitorId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (analysisError && analysisError.code !== 'PGRST116') { // PGRST116 is "No rows returned" which is okay
        console.error('Error fetching competitor analysis:', analysisError);
      }
      
      return {
        competitorContent,
        latestAnalysis: latestAnalysis || null
      };
    } catch (error) {
      console.error('Error in getCompetitorContentWithAnalysis:', error);
      return null;
    }
  }
  
  // Create a new competitor content entry
  static async createCompetitorContent(projectId: string, url: string, userId: string) {
    const supabase = createServerClient();
    
    try {
      const { data, error } = await supabase
        .from('competitor_content')
        .insert([
          {
            project_id: projectId,
            url,
            created_by: userId
          }
        ])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating competitor content:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in createCompetitorContent:', error);
      return null;
    }
  }
  
  // Delete a competitor content entry
  static async deleteCompetitorContent(competitorId: string, projectId: string) {
    const supabase = createServerClient();
    
    try {
      // Delete any associated analyses first
      const { error: analysisError } = await supabase
        .from('competitor_analysis')
        .delete()
        .eq('competitor_content_id', competitorId);
      
      if (analysisError) {
        console.error('Error deleting competitor analyses:', analysisError);
        return false;
      }
      
      // Then delete the competitor content
      const { error: contentError } = await supabase
        .from('competitor_content')
        .delete()
        .eq('id', competitorId)
        .eq('project_id', projectId);
      
      if (contentError) {
        console.error('Error deleting competitor content:', contentError);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteCompetitorContent:', error);
      return false;
    }
  }
  
  // Analyze competitor content
  static async analyzeCompetitorContent(competitorId: string, userId: string) {
    const supabase = createServerClient();
    
    try {
      // Here you would trigger your actual analysis process
      // This is a placeholder for the analysis logic
      const { data, error } = await supabase
        .from('competitor_analysis')
        .insert([
          {
            competitor_content_id: competitorId,
            word_count: Math.floor(Math.random() * 2000) + 500,
            reading_level: ['Elementary', 'Intermediate', 'Advanced'][Math.floor(Math.random() * 3)],
            keyword_density: Math.random() * 5,
            content_structure: JSON.stringify({
              headings: Math.floor(Math.random() * 10) + 3,
              paragraphs: Math.floor(Math.random() * 20) + 10,
              lists: Math.floor(Math.random() * 5) + 1
            }),
            readability_score: Math.floor(Math.random() * 100),
            analyzed_by: userId
          }
        ])
        .select();
      
      if (error) {
        console.error('Error analyzing competitor content:', error);
        return null;
      }
      
      return data[0];
    } catch (error) {
      console.error('Error in analyzeCompetitorContent:', error);
      return null;
    }
  }
} 