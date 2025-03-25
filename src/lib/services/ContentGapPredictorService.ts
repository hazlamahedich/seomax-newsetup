import { createClient } from '@/lib/supabase/client';
import { liteLLMProvider } from '@/lib/ai/litellm-provider';

export interface ContentGapOpportunity {
  keyword: string;
  opportunityScore: number;
  competitionLevel: 'Low' | 'Medium' | 'High';
  predictedTrend: 'Rising' | 'Stable' | 'Declining';
  confidenceScore: number;
  contentRecommendations: string[];
  relatedEntities: string[];
}

export interface ContentGapPredictionParams {
  projectId: string;
  industry?: string;
  currentKeywords?: string[];
  competitorUrls?: string[];
  includeRisingTrends?: boolean;
  contentTypes?: string[];
  confidenceThreshold?: number;
}

export class ContentGapPredictorService {
  private static supabase = createClient();

  /**
   * Predict content gaps and opportunities for a project
   */
  static async predictContentGaps(params: ContentGapPredictionParams): Promise<ContentGapOpportunity[]> {
    try {
      const {
        projectId,
        industry,
        currentKeywords = [],
        competitorUrls = [],
        includeRisingTrends = true,
        contentTypes = ['blog', 'page', 'article'],
        confidenceThreshold = 70
      } = params;

      // Get existing content from database
      const { data: existingContent, error: contentError } = await this.supabase
        .from('content_pages')
        .select('title, keywords, content_type')
        .eq('project_id', projectId);

      if (contentError) {
        console.error('Error fetching existing content:', contentError);
        throw contentError;
      }

      // Get competitor data
      const { data: competitorData, error: competitorError } = await this.supabase
        .from('competitors')
        .select('id, domain, top_keywords')
        .eq('project_id', projectId);

      if (competitorError) {
        console.error('Error fetching competitor data:', competitorError);
        throw competitorError;
      }

      // Format the data for the AI prompt
      const existingKeywords = currentKeywords.length > 0 
        ? currentKeywords 
        : existingContent?.flatMap(content => content.keywords || []) || [];
      
      const competitorKeywords = competitorData?.flatMap(comp => comp.top_keywords || []) || [];
      
      // Create the prompt for the AI
      const prompt = `
        You are an expert SEO content strategist. Analyze the provided data and identify high-opportunity content gaps.
        
        INDUSTRY: ${industry || 'Not specified'}
        
        EXISTING CONTENT KEYWORDS: ${existingKeywords.join(', ')}
        
        COMPETITOR KEYWORDS: ${competitorKeywords.join(', ')}
        
        COMPETITOR URLS: ${competitorUrls.join(', ')}
        
        TARGET CONTENT TYPES: ${contentTypes.join(', ')}
        
        ${includeRisingTrends ? 'Please include rising trends in this industry.' : ''}
        
        For each content gap opportunity you identify, provide:
        1. Keyword or topic
        2. Opportunity score (0-100)
        3. Competition level (Low, Medium, High)
        4. Predicted trend (Rising, Stable, Declining)
        5. Confidence score (0-100)
        6. 3-5 content recommendations
        7. 3-5 related entities (people, places, concepts, products) relevant to this topic
        
        Return the analysis as a JSON array of objects with these properties:
        {
          "keyword": string,
          "opportunityScore": number,
          "competitionLevel": "Low" | "Medium" | "High",
          "predictedTrend": "Rising" | "Stable" | "Declining",
          "confidenceScore": number,
          "contentRecommendations": string[],
          "relatedEntities": string[]
        }
        
        Only include opportunities with a confidence score above ${confidenceThreshold}.
        Limit to the top 10 opportunities.
      `;
      
      // Call the LLM
      const model = liteLLMProvider.getLangChainModel();
      const response = await model.invoke(prompt);
      
      // Parse the JSON response
      const responseText = response.content.toString();
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }
      
      const opportunities: ContentGapOpportunity[] = JSON.parse(jsonMatch[0]);
      
      // Store the predictions in the database
      await Promise.all(opportunities.map(async (opportunity) => {
        const { error } = await this.supabase
          .from('content_gap_predictions')
          .insert({
            project_id: projectId,
            keyword: opportunity.keyword,
            opportunity_score: opportunity.opportunityScore,
            competition_level: opportunity.competitionLevel,
            predicted_trend: opportunity.predictedTrend,
            confidence_score: opportunity.confidenceScore,
            content_recommendations: opportunity.contentRecommendations,
            related_entities: opportunity.relatedEntities
          });
          
        if (error) {
          console.error('Error storing content gap prediction:', error);
        }
      }));
      
      return opportunities;
    } catch (error) {
      console.error('Error predicting content gaps:', error);
      throw error;
    }
  }

  /**
   * Get stored content gap predictions for a project
   */
  static async getContentGapPredictions(
    projectId: string, 
    options: { 
      limit?: number; 
      confidenceThreshold?: number;
      includeRisingOnly?: boolean;
    } = {}
  ): Promise<ContentGapOpportunity[]> {
    try {
      const { 
        limit = 10, 
        confidenceThreshold = 0,
        includeRisingOnly = false
      } = options;
      
      let query = this.supabase
        .from('content_gap_predictions')
        .select('*')
        .eq('project_id', projectId)
        .gte('confidence_score', confidenceThreshold)
        .order('opportunity_score', { ascending: false })
        .limit(limit);
        
      if (includeRisingOnly) {
        query = query.eq('predicted_trend', 'Rising');
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching content gap predictions:', error);
        throw error;
      }
      
      // Map database response to the interface
      return data.map(item => ({
        keyword: item.keyword,
        opportunityScore: item.opportunity_score,
        competitionLevel: item.competition_level as 'Low' | 'Medium' | 'High',
        predictedTrend: item.predicted_trend as 'Rising' | 'Stable' | 'Declining',
        confidenceScore: item.confidence_score,
        contentRecommendations: item.content_recommendations,
        relatedEntities: item.related_entities
      }));
    } catch (error) {
      console.error('Error fetching content gap predictions:', error);
      throw error;
    }
  }
} 