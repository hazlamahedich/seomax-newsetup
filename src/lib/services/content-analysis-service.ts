import { createClient } from '@/lib/supabase/client';
import jsPDF from 'jspdf';
import { ContentPageService } from './content-service';

export interface ContentAnalysisReport {
  id: string;
  page_id: string;
  title: string;
  url: string;
  content_score: number;
  readability_analysis: any;
  keyword_analysis: any;
  structure_analysis: any;
  recommendations: string[];
  created_at: string;
}

export class ContentAnalysisService {
  /**
   * Get content analysis by ID
   */
  static async getContentAnalysisById(analysisId: string): Promise<any> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('content_analysis')
        .select('*')
        .eq('id', analysisId)
        .single();

      if (error) {
        console.error('Error fetching content analysis:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getContentAnalysisById:', error);
      throw error;
    }
  }

  /**
   * Get latest content analysis for a page
   */
  static async getLatestContentAnalysis(pageId: string): Promise<any> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('content_analysis')
        .select('*')
        .eq('page_id', pageId)
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
    } catch (error) {
      console.error('Error in getLatestContentAnalysis:', error);
      throw error;
    }
  }

  /**
   * Get content analysis with page data
   */
  static async getContentAnalysisWithPage(pageId: string): Promise<{page: any, analysis: any}> {
    try {
      // Get content page
      const page = await ContentPageService.getContentPage(pageId);
      
      // Get latest analysis
      const analysis = await this.getLatestContentAnalysis(pageId);
      
      return { page, analysis };
    } catch (error) {
      console.error('Error in getContentAnalysisWithPage:', error);
      throw error;
    }
  }

  /**
   * Prepare content analysis data for PDF export
   */
  static prepareAnalysisForPDF(pageData: any, analysisData: any): ContentAnalysisReport {
    if (!analysisData || !analysisData.result) {
      throw new Error('Invalid analysis data');
    }

    const result = analysisData.result;
    
    return {
      id: analysisData.id,
      page_id: analysisData.page_id,
      title: pageData.title || 'Untitled',
      url: pageData.url || '',
      content_score: result.content_score || 0,
      readability_analysis: result.readability_analysis || null,
      keyword_analysis: result.keyword_analysis || null,
      structure_analysis: result.structure_analysis || null,
      recommendations: result.recommendations || [],
      created_at: analysisData.created_at
    };
  }
} 