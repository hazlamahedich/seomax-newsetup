import { createClient } from '@/lib/supabase/client';
import { liteLLMProvider } from '@/lib/ai/litellm-provider';

export interface EEATSignal {
  type: 'experience' | 'expertise' | 'authoritativeness' | 'trustworthiness';
  name: string;
  description: string;
  score: number; // 0-100
  detected: boolean;
  evidence?: string;
  improvement?: string;
}

export interface EEATAnalysisResult {
  experienceScore: number;
  expertiseScore: number;
  authoritativenessScore: number;
  trustworthinessScore: number;
  combinedScore: number;
  signalsDetected: EEATSignal[];
  improvementActions: {
    priority: 'high' | 'medium' | 'low';
    description: string;
    category: 'experience' | 'expertise' | 'authoritativeness' | 'trustworthiness' | 'general';
    expectedImpact: number;
  }[];
  confidenceLevel: number;
}

export interface EEATAnalysisParams {
  siteId: string;
  pageId?: string;
  url?: string;
  content?: string;
  title?: string;
  industry?: string;
}

export class EEATAnalyzerService {
  private static supabase = createClient();

  /**
   * Analyze content for E-E-A-T signals
   */
  static async analyzeEEAT(params: EEATAnalysisParams): Promise<EEATAnalysisResult> {
    try {
      const { siteId, pageId, url, content, title, industry } = params;
      
      // If content is not provided, fetch it from the database
      let pageContent = content;
      let pageTitle = title;
      let pageUrl = url;
      
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
        pageUrl = pageData?.url;
      }
      
      if (!pageContent) {
        throw new Error('Page content is required for E-E-A-T analysis');
      }
      
      // Check if analysis already exists for this page
      if (pageId) {
        const { data: existingAnalysis, error: analysisError } = await this.supabase
          .from('eeat_analysis')
          .select('*')
          .eq('page_id', pageId)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!analysisError && existingAnalysis && existingAnalysis.length > 0) {
          return this.mapDatabaseResponseToResult(existingAnalysis[0]);
        }
      }
      
      // Get site information for more context
      const { data: siteData, error: siteError } = await this.supabase
        .from('site_crawls')
        .select('domain')
        .eq('id', siteId)
        .single();
      
      if (siteError) {
        console.error('Error fetching site data:', siteError);
        throw siteError;
      }
      
      // Create the prompt for the AI
      const prompt = `
        You are an expert in Google's E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) evaluation. 
        Analyze the following webpage content to identify E-E-A-T signals and provide a comprehensive assessment.
        
        URL: ${pageUrl || 'Not provided'}
        TITLE: ${pageTitle || 'Not provided'}
        DOMAIN: ${siteData?.domain || 'Not provided'}
        INDUSTRY: ${industry || 'Not specified'}
        
        CONTENT:
        ${pageContent.substring(0, 5000)} // Limit content to avoid token limits
        
        Your task is to evaluate this content based on Google's E-E-A-T guidelines, scoring each component
        and identifying specific signals and improvement opportunities.
        
        Provide a detailed analysis with the following components:
        
        1. Experience Score (0-100): Evaluate demonstration of first-hand experience
        2. Expertise Score (0-100): Evaluate depth of knowledge and specialized expertise
        3. Authoritativeness Score (0-100): Evaluate credibility and recognition in the field
        4. Trustworthiness Score (0-100): Evaluate accuracy, transparency, and safe user experience
        5. Combined Score (0-100): Overall E-E-A-T assessment
        6. Signals Detected: List of specific E-E-A-T signals present in the content
        7. Improvement Actions: Prioritized list of actions to improve E-E-A-T signals
        8. Confidence Level (0-100): How confident you are in this assessment
        
        Return your analysis as a JSON object matching this structure:
        {
          "experienceScore": number,
          "expertiseScore": number, 
          "authoritativenessScore": number,
          "trustworthinessScore": number,
          "combinedScore": number,
          "signalsDetected": [
            {
              "type": "experience" | "expertise" | "authoritativeness" | "trustworthiness",
              "name": string,
              "description": string,
              "score": number,
              "detected": boolean,
              "evidence": string,
              "improvement": string
            }
          ],
          "improvementActions": [
            {
              "priority": "high" | "medium" | "low",
              "description": string,
              "category": "experience" | "expertise" | "authoritativeness" | "trustworthiness" | "general",
              "expectedImpact": number
            }
          ],
          "confidenceLevel": number
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
      
      const analysis: EEATAnalysisResult = JSON.parse(jsonMatch[0]);
      
      // Store the analysis in the database
      const { error: insertError } = await this.supabase
        .from('eeat_analysis')
        .insert({
          site_id: siteId,
          page_id: pageId,
          experience_score: analysis.experienceScore,
          expertise_score: analysis.expertiseScore,
          authoritativeness_score: analysis.authoritativenessScore,
          trustworthiness_score: analysis.trustworthinessScore,
          combined_score: analysis.combinedScore,
          signals_detected: analysis.signalsDetected,
          improvement_actions: analysis.improvementActions,
          confidence_level: analysis.confidenceLevel
        });
      
      if (insertError) {
        console.error('Error storing E-E-A-T analysis:', insertError);
      }
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing E-E-A-T signals:', error);
      throw error;
    }
  }

  /**
   * Get E-E-A-T analysis by page ID
   */
  static async getEEATAnalysis(pageId: string): Promise<EEATAnalysisResult | null> {
    try {
      const { data, error } = await this.supabase
        .from('eeat_analysis')
        .select('*')
        .eq('page_id', pageId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Error fetching E-E-A-T analysis:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        return null;
      }
      
      return this.mapDatabaseResponseToResult(data[0]);
    } catch (error) {
      console.error('Error fetching E-E-A-T analysis:', error);
      throw error;
    }
  }

  /**
   * Get E-E-A-T analysis for an entire site
   */
  static async getSiteEEATAnalysis(
    siteId: string,
    options: { limit?: number } = {}
  ): Promise<EEATAnalysisResult[]> {
    try {
      const { limit = 50 } = options;
      
      const { data, error } = await this.supabase
        .from('eeat_analysis')
        .select('*')
        .eq('site_id', siteId)
        .order('combined_score', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Error fetching site E-E-A-T analysis:', error);
        throw error;
      }
      
      return data.map(item => this.mapDatabaseResponseToResult(item));
    } catch (error) {
      console.error('Error fetching site E-E-A-T analysis:', error);
      throw error;
    }
  }

  /**
   * Generate content recommendations to improve E-E-A-T scores
   */
  static async generateEEATImprovements(
    pageId: string,
    options: { focusArea?: 'experience' | 'expertise' | 'authoritativeness' | 'trustworthiness' | 'all' } = {}
  ): Promise<{ recommendations: string[]; suggestedContent: string }> {
    try {
      const { focusArea = 'all' } = options;
      
      // Get the current page content and analysis
      const { data: pageData, error: pageError } = await this.supabase
        .from('crawled_pages')
        .select('title, content, url')
        .eq('id', pageId)
        .single();
      
      if (pageError || !pageData) {
        console.error('Error fetching page data:', pageError);
        throw pageError || new Error('Page not found');
      }
      
      const analysis = await this.getEEATAnalysis(pageId);
      
      if (!analysis) {
        throw new Error('E-E-A-T analysis not found for this page');
      }
      
      // Create the prompt for improvement recommendations
      const prompt = `
        You are an expert in Google's E-E-A-T criteria optimization. You need to provide specific recommendations
        to improve the E-E-A-T signals for the following content.
        
        URL: ${pageData.url}
        TITLE: ${pageData.title}
        
        CURRENT E-E-A-T ANALYSIS:
        - Experience Score: ${analysis.experienceScore}/100
        - Expertise Score: ${analysis.expertiseScore}/100
        - Authoritativeness Score: ${analysis.authoritativenessScore}/100
        - Trustworthiness Score: ${analysis.trustworthinessScore}/100
        - Combined Score: ${analysis.combinedScore}/100
        
        CONTENT EXCERPT:
        ${pageData.content.substring(0, 3000)}
        
        ${focusArea !== 'all' ? `FOCUS AREA: ${focusArea.toUpperCase()}` : 'FOCUS AREA: ALL E-E-A-T ELEMENTS'}
        
        CURRENT IMPROVEMENT ACTIONS NEEDED:
        ${analysis.improvementActions
          .filter(action => focusArea === 'all' || action.category === focusArea)
          .map(action => `- [${action.priority.toUpperCase()}] ${action.description}`)
          .join('\n')}
        
        TASK:
        1. Provide 5-10 specific, actionable recommendations to improve the E-E-A-T signals for this content
        2. Generate a sample paragraph or section of content that would significantly improve the E-E-A-T signals
        
        Return your response as a JSON object with these properties:
        {
          "recommendations": string[],  // Array of specific recommendations
          "suggestedContent": string    // Sample content that would improve E-E-A-T signals
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
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error generating E-E-A-T improvements:', error);
      throw error;
    }
  }
  
  /**
   * Map database response to result interface
   */
  private static mapDatabaseResponseToResult(data: any): EEATAnalysisResult {
    return {
      experienceScore: data.experience_score,
      expertiseScore: data.expertise_score,
      authoritativenessScore: data.authoritativeness_score,
      trustworthinessScore: data.trustworthiness_score,
      combinedScore: data.combined_score,
      signalsDetected: data.signals_detected,
      improvementActions: data.improvement_actions,
      confidenceLevel: data.confidence_level
    };
  }
} 