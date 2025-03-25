import { createClient } from '@/lib/supabase/client';
import { liteLLMProvider } from '@/lib/ai/litellm-provider';

export interface VoiceSearchAnalysisResult {
  voiceReadabilityScore: number;
  questionDetectionScore: number;
  naturalLanguageScore: number;
  featuredSnippetCompatibility: number;
  structuredDataScore: number;
  voiceSearchKeywords: string[];
  suggestedVoiceQueries: string[];
  improvementSuggestions: string[];
  overallScore: number;
}

export interface VoiceSearchAnalysisParams {
  siteId: string;
  pageId?: string;
  url?: string;
  content?: string;
  title?: string;
}

export class VoiceSearchService {
  private static supabase = createClient();

  /**
   * Analyze content for voice search optimization
   */
  static async analyzeVoiceSearch(params: VoiceSearchAnalysisParams): Promise<VoiceSearchAnalysisResult> {
    try {
      const { siteId, pageId, url, content, title } = params;
      
      // If content is not provided, fetch it from the database
      let pageContent = content;
      let pageTitle = title;
      
      if (!pageContent && pageId) {
        const { data: pageData, error: pageError } = await this.supabase
          .from('crawled_pages')
          .select('title, content, url')
          .eq('id', pageId)
          .single();
        
        if (pageError) {
          console.error('Error fetching page data:', pageError);
          throw pageError;
        }
        
        pageContent = pageData?.content;
        pageTitle = pageData?.title;
      }
      
      if (!pageContent) {
        throw new Error('Page content is required for voice search analysis');
      }
      
      // Check if analysis already exists
      if (pageId) {
        const { data: existingAnalysis, error: analysisError } = await this.supabase
          .from('voice_search_analysis')
          .select('*')
          .eq('page_id', pageId)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!analysisError && existingAnalysis && existingAnalysis.length > 0) {
          return this.mapDatabaseResponseToResult(existingAnalysis[0]);
        }
      }
      
      // Create the prompt for the AI
      const prompt = `
        You are an expert in voice search optimization for SEO. Analyze the following content for voice search friendliness.
        
        TITLE: ${pageTitle || 'Not provided'}
        
        CONTENT:
        ${pageContent.substring(0, 5000)} // Limit content to avoid token limits
        
        Analyze this content for voice search optimization and provide a detailed report with the following components:
        
        1. Voice Readability Score (0-100): How easy is this content to understand when read aloud?
        2. Question Detection Score (0-100): Does the content include natural questions that voice searchers might ask?
        3. Natural Language Score (0-100): How natural and conversational is the content?
        4. Featured Snippet Compatibility (0-100): How well is the content structured to be used as a featured snippet?
        5. Structured Data Score (0-100): Evaluation of existing structured data for voice search
        6. Voice Search Keywords: List of 5-10 keywords/phrases that would work well for voice search
        7. Suggested Voice Queries: List of 5-10 complete questions that users might ask that this content could answer
        8. Improvement Suggestions: List of 5-10 specific suggestions to improve voice search optimization
        9. Overall Score (0-100): Combined voice search optimization score
        
        Return the analysis as a JSON object with these properties:
        {
          "voiceReadabilityScore": number,
          "questionDetectionScore": number,
          "naturalLanguageScore": number,
          "featuredSnippetCompatibility": number,
          "structuredDataScore": number,
          "voiceSearchKeywords": string[],
          "suggestedVoiceQueries": string[],
          "improvementSuggestions": string[],
          "overallScore": number
        }
      `;
      
      // Call the LLM
      const model = liteLLMProvider.getLangChainModel();
      const response = await model.invoke(prompt);
      
      // Parse the JSON response
      const responseText = response.content.toString();
      const jsonMatch = responseText.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }
      
      const analysis: VoiceSearchAnalysisResult = JSON.parse(jsonMatch[0]);
      
      // Store the analysis in the database
      const { error: insertError } = await this.supabase
        .from('voice_search_analysis')
        .insert({
          site_id: siteId,
          page_id: pageId,
          url: url,
          voice_readability_score: analysis.voiceReadabilityScore,
          question_detection_score: analysis.questionDetectionScore,
          natural_language_score: analysis.naturalLanguageScore,
          featured_snippet_compatibility: analysis.featuredSnippetCompatibility,
          structured_data_score: analysis.structuredDataScore,
          voice_search_keywords: analysis.voiceSearchKeywords,
          suggested_voice_queries: analysis.suggestedVoiceQueries,
          improvement_suggestions: analysis.improvementSuggestions,
          overall_score: analysis.overallScore
        });
      
      if (insertError) {
        console.error('Error storing voice search analysis:', insertError);
      }
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing voice search optimization:', error);
      throw error;
    }
  }

  /**
   * Get voice search analysis by page ID
   */
  static async getVoiceSearchAnalysis(pageId: string): Promise<VoiceSearchAnalysisResult | null> {
    try {
      const { data, error } = await this.supabase
        .from('voice_search_analysis')
        .select('*')
        .eq('page_id', pageId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Error fetching voice search analysis:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        return null;
      }
      
      return this.mapDatabaseResponseToResult(data[0]);
    } catch (error) {
      console.error('Error fetching voice search analysis:', error);
      throw error;
    }
  }

  /**
   * Get voice search analysis for a site
   */
  static async getSiteVoiceSearchAnalysis(
    siteId: string,
    options: { limit?: number } = {}
  ): Promise<VoiceSearchAnalysisResult[]> {
    try {
      const { limit = 50 } = options;
      
      const { data, error } = await this.supabase
        .from('voice_search_analysis')
        .select('*')
        .eq('site_id', siteId)
        .order('overall_score', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching site voice search analysis:', error);
        throw error;
      }
      
      return data.map(item => this.mapDatabaseResponseToResult(item));
    } catch (error) {
      console.error('Error fetching site voice search analysis:', error);
      throw error;
    }
  }

  /**
   * Generate voice search optimized content suggestions
   */
  static async generateVoiceOptimizedContent(
    pageId: string,
    options: { targetScoreIncrease?: number } = {}
  ): Promise<{ originalContent: string; optimizedContent: string; improvements: string[] }> {
    try {
      const { targetScoreIncrease = 20 } = options;
      
      // Get the current page content and analysis
      const { data: pageData, error: pageError } = await this.supabase
        .from('crawled_pages')
        .select('title, content')
        .eq('id', pageId)
        .single();
      
      if (pageError || !pageData) {
        console.error('Error fetching page data:', pageError);
        throw pageError || new Error('Page not found');
      }
      
      const analysis = await this.getVoiceSearchAnalysis(pageId);
      
      if (!analysis) {
        throw new Error('Voice search analysis not found for this page');
      }
      
      // Create the prompt for content optimization
      const prompt = `
        You are an expert in voice search optimization for SEO. Optimize the following content to be more voice search friendly.
        
        TITLE: ${pageData.title}
        
        ORIGINAL CONTENT:
        ${pageData.content.substring(0, 5000)}
        
        CURRENT VOICE SEARCH ANALYSIS:
        - Voice Readability Score: ${analysis.voiceReadabilityScore}/100
        - Question Detection Score: ${analysis.questionDetectionScore}/100
        - Natural Language Score: ${analysis.naturalLanguageScore}/100
        - Featured Snippet Compatibility: ${analysis.featuredSnippetCompatibility}/100
        - Overall Score: ${analysis.overallScore}/100
        
        IMPROVEMENT SUGGESTIONS:
        ${analysis.improvementSuggestions.join('\n')}
        
        TASK:
        Rewrite the content to be more voice search optimized. Focus on:
        1. Using more natural, conversational language
        2. Incorporating common voice search questions
        3. Structuring content to be featured snippet friendly
        4. Maintaining the same core information and SEO value
        5. Improving all voice search metrics by at least ${targetScoreIncrease}%
        
        Return your response as a JSON object with these properties:
        {
          "optimizedContent": string,
          "improvements": string[]  // List of specific improvements made
        }
      `;
      
      // Call the LLM
      const model = liteLLMProvider.getLangChainModel();
      const response = await model.invoke(prompt);
      
      // Parse the JSON response
      const responseText = response.content.toString();
      const jsonMatch = responseText.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }
      
      const result = JSON.parse(jsonMatch[0]);
      
      return {
        originalContent: pageData.content,
        optimizedContent: result.optimizedContent,
        improvements: result.improvements
      };
    } catch (error) {
      console.error('Error generating voice optimized content:', error);
      throw error;
    }
  }
  
  /**
   * Map database response to result interface
   */
  private static mapDatabaseResponseToResult(data: any): VoiceSearchAnalysisResult {
    return {
      voiceReadabilityScore: data.voice_readability_score,
      questionDetectionScore: data.question_detection_score,
      naturalLanguageScore: data.natural_language_score,
      featuredSnippetCompatibility: data.featured_snippet_compatibility,
      structuredDataScore: data.structured_data_score,
      voiceSearchKeywords: data.voice_search_keywords,
      suggestedVoiceQueries: data.suggested_voice_queries,
      improvementSuggestions: data.improvement_suggestions,
      overallScore: data.overall_score
    };
  }
} 