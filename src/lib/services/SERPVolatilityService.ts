import { createClient } from '@/lib/supabase/client';
import { liteLLMProvider } from '@/lib/ai/litellm-provider';

export interface SERPVolatilityPrediction {
  id?: string;
  predictionDate: Date;
  volatilityScore: number;
  affectedKeywords: string[];
  predictedAlgorithmFactors: string[];
  preemptiveActions: string[];
  confidenceLevel: number;
  impactLevel: 'low' | 'medium' | 'high';
}

export interface SERPVolatilityParams {
  projectId: string;
  keywords?: string[];
  includeTrends?: boolean;
  timeframe?: 'short' | 'medium' | 'long'; // 7 days, 30 days, 90 days
  confidenceThreshold?: number;
}

export class SERPVolatilityService {
  private static supabase = createClient();

  /**
   * Predict SERP volatility for a set of keywords
   */
  static async predictVolatility(params: SERPVolatilityParams): Promise<SERPVolatilityPrediction> {
    try {
      const {
        projectId,
        keywords = [],
        includeTrends = true,
        timeframe = 'medium',
        confidenceThreshold = 70
      } = params;
      
      // Get project keywords if none provided
      let targetKeywords = keywords;
      
      if (targetKeywords.length === 0) {
        const { data: keywordData, error: keywordError } = await this.supabase
          .from('keyword_rankings')
          .select('keyword')
          .eq('project_id', projectId)
          .order('position', { ascending: true })
          .limit(30);
          
        if (keywordError) {
          console.error('Error fetching project keywords:', keywordError);
          throw keywordError;
        }
        
        targetKeywords = keywordData?.map(k => k.keyword) || [];
      }
      
      if (targetKeywords.length === 0) {
        throw new Error('No keywords available for volatility prediction');
      }
      
      // Get industry/niche information
      const { data: projectData, error: projectError } = await this.supabase
        .from('projects')
        .select('industry, description')
        .eq('id', projectId)
        .single();
        
      if (projectError) {
        console.error('Error fetching project data:', projectError);
        throw projectError;
      }
      
      // Get historical ranking data if available
      const { data: rankingHistory, error: rankingError } = await this.supabase
        .from('keyword_rankings')
        .select('keyword, position, date')
        .eq('project_id', projectId)
        .in('keyword', targetKeywords.slice(0, 20)) // Limit to first 20 keywords
        .order('date', { ascending: false })
        .limit(100);
        
      if (rankingError) {
        console.error('Error fetching ranking history:', rankingError);
        throw rankingError;
      }
      
      // Prepare time range based on timeframe
      const timeRanges = {
        short: '7 days',
        medium: '30 days',
        long: '90 days'
      };
      
      // Create the prompt for volatility prediction
      const prompt = `
        You are an expert in SEO and search algorithm predictions. 
        Analyze the following information to predict potential SERP volatility and provide preemptive recommendations.
        
        PROJECT INDUSTRY: ${projectData?.industry || 'Not specified'}
        PROJECT DESCRIPTION: ${projectData?.description || 'Not provided'}
        
        TARGET KEYWORDS:
        ${targetKeywords.join(', ')}
        
        ${rankingHistory && rankingHistory.length > 0 ? `
        HISTORICAL RANKING DATA (most recent first):
        ${rankingHistory.map(r => `${r.keyword}: Position ${r.position} on ${new Date(r.date).toLocaleDateString()}`).join('\n')}
        ` : 'No historical ranking data available.'}
        
        PREDICTION TIMEFRAME: ${timeRanges[timeframe]}
        
        ${includeTrends ? 'Please include latest search trends and algorithm updates in your analysis.' : ''}
        
        Your task is to predict potential SERP volatility for these keywords within the specified timeframe.
        Provide a comprehensive prediction including:
        
        1. Volatility Score (0-100) - How likely are rankings to change significantly?
        2. Affected Keywords - Which keywords are most likely to be affected?
        3. Predicted Algorithm Factors - What algorithm elements might cause these changes?
        4. Preemptive Actions - What specific actions should be taken now to protect or improve rankings?
        5. Confidence Level (0-100) - How confident are you in this prediction?
        6. Impact Level (low, medium, high) - How significant would the ranking changes be?
        
        Return your prediction as a JSON object with these properties:
        {
          "predictionDate": "YYYY-MM-DD",
          "volatilityScore": number,
          "affectedKeywords": string[],
          "predictedAlgorithmFactors": string[],
          "preemptiveActions": string[],
          "confidenceLevel": number,
          "impactLevel": "low" | "medium" | "high"
        }
        
        Only make predictions with a confidence level above ${confidenceThreshold}.
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
      
      const prediction: SERPVolatilityPrediction = JSON.parse(jsonMatch[0]);
      
      // Convert date string to Date object
      prediction.predictionDate = new Date(prediction.predictionDate);
      
      // Store the prediction
      const { data, error } = await this.supabase
        .from('serp_volatility_predictions')
        .insert({
          project_id: projectId,
          prediction_date: prediction.predictionDate.toISOString(),
          volatility_score: prediction.volatilityScore,
          affected_keywords: prediction.affectedKeywords,
          predicted_algorithm_factors: prediction.predictedAlgorithmFactors,
          preemptive_actions: prediction.preemptiveActions,
          confidence_level: prediction.confidenceLevel,
          impact_level: prediction.impactLevel
        })
        .select('id')
        .single();
        
      if (error) {
        console.error('Error storing volatility prediction:', error);
      } else {
        prediction.id = data?.id;
      }
      
      return prediction;
    } catch (error) {
      console.error('Error predicting SERP volatility:', error);
      throw error;
    }
  }

  /**
   * Get volatility predictions for a project
   */
  static async getVolatilityPredictions(
    projectId: string,
    options: {
      limit?: number;
      minConfidence?: number;
      minImpact?: 'low' | 'medium' | 'high';
    } = {}
  ): Promise<SERPVolatilityPrediction[]> {
    try {
      const { limit = 10, minConfidence = 0, minImpact } = options;
      
      let query = this.supabase
        .from('serp_volatility_predictions')
        .select('*')
        .eq('project_id', projectId)
        .gte('confidence_level', minConfidence)
        .order('prediction_date', { ascending: false })
        .limit(limit);
        
      if (minImpact) {
        // Map impact levels to numeric values for comparison
        const impactLevels = { low: 1, medium: 2, high: 3 };
        const minImpactLevel = impactLevels[minImpact];
        
        // Filter based on impact level
        query = query.in('impact_level', 
          Object.keys(impactLevels).filter(
            level => impactLevels[level as keyof typeof impactLevels] >= minImpactLevel
          )
        );
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching volatility predictions:', error);
        throw error;
      }
      
      return data.map(item => ({
        id: item.id,
        predictionDate: new Date(item.prediction_date),
        volatilityScore: item.volatility_score,
        affectedKeywords: item.affected_keywords,
        predictedAlgorithmFactors: item.predicted_algorithm_factors,
        preemptiveActions: item.preemptive_actions,
        confidenceLevel: item.confidence_level,
        impactLevel: item.impact_level as 'low' | 'medium' | 'high'
      }));
    } catch (error) {
      console.error('Error fetching volatility predictions:', error);
      throw error;
    }
  }

  /**
   * Generate detailed action plan for a volatility prediction
   */
  static async generateActionPlan(
    predictionId: string
  ): Promise<{ actions: { priority: string; description: string; effort: string; impact: string }[] }> {
    try {
      // Get the prediction details
      const { data: prediction, error: predictionError } = await this.supabase
        .from('serp_volatility_predictions')
        .select('*, project:project_id(*)')
        .eq('id', predictionId)
        .single();
        
      if (predictionError || !prediction) {
        console.error('Error fetching prediction:', predictionError);
        throw predictionError || new Error('Prediction not found');
      }
      
      // Get current content and technical status
      const { data: seoAnalysis, error: analysisError } = await this.supabase
        .from('seo_analyses')
        .select('technical_score, content_score')
        .eq('site_id', prediction.project.site_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      // Create the prompt for action plan
      const prompt = `
        You are an expert SEO strategist. Create a detailed action plan to prepare for potential 
        SERP volatility based on the following prediction:
        
        VOLATILITY PREDICTION:
        - Volatility Score: ${prediction.volatility_score}/100
        - Impact Level: ${prediction.impact_level.toUpperCase()}
        - Confidence Level: ${prediction.confidence_level}/100
        - Affected Keywords: ${prediction.affected_keywords.join(', ')}
        - Predicted Algorithm Factors: ${prediction.predicted_algorithm_factors.join(', ')}
        
        CURRENT STATUS:
        ${seoAnalysis ? `
        - Technical SEO Score: ${seoAnalysis.technical_score}/100
        - Content Score: ${seoAnalysis.content_score}/100
        ` : 'No current SEO analysis available.'}
        
        PREEMPTIVE ACTIONS ALREADY IDENTIFIED:
        ${prediction.preemptive_actions.map((action, i) => `${i + 1}. ${action}`).join('\n')}
        
        Your task is to create a detailed, prioritized action plan that expands on the preemptive 
        actions identified. For each action item, include:
        
        1. Priority (Critical, High, Medium, Low)
        2. Detailed description with specific implementation steps
        3. Estimated effort required (Low, Medium, High)
        4. Expected impact on mitigating volatility risk (Low, Medium, High)
        
        Return your action plan as a JSON array with this structure:
        [
          {
            "priority": string,
            "description": string,
            "effort": string,
            "impact": string
          }
        ]
        
        Focus on actionable, specific steps that can be implemented within the next 7 days.
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
      
      return { actions: JSON.parse(jsonMatch[0]) };
    } catch (error) {
      console.error('Error generating action plan:', error);
      throw error;
    }
  }

  /**
   * Track the accuracy of past predictions
   */
  static async evaluatePredictionAccuracy(
    projectId: string,
    options: { lookbackDays?: number } = {}
  ): Promise<{ predictionId: string; accuracy: number; actualImpact: string; notes: string[] }[]> {
    try {
      const { lookbackDays = 30 } = options;
      
      // Get past predictions that are now due for evaluation
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
      
      const { data: pastPredictions, error: predictionError } = await this.supabase
        .from('serp_volatility_predictions')
        .select('*')
        .eq('project_id', projectId)
        .lt('prediction_date', cutoffDate.toISOString())
        .order('prediction_date', { ascending: false });
        
      if (predictionError) {
        console.error('Error fetching past predictions:', predictionError);
        throw predictionError;
      }
      
      if (!pastPredictions || pastPredictions.length === 0) {
        return [];
      }
      
      // Get actual ranking changes for affected keywords
      const allAffectedKeywords = [...new Set(
        pastPredictions.flatMap(p => p.affected_keywords)
      )];
      
      const { data: rankingData, error: rankingError } = await this.supabase
        .from('keyword_rankings')
        .select('keyword, position, date')
        .eq('project_id', projectId)
        .in('keyword', allAffectedKeywords)
        .gt('date', cutoffDate.toISOString())
        .order('date', { ascending: true });
        
      if (rankingError) {
        console.error('Error fetching ranking data:', rankingError);
        throw rankingError;
      }
      
      // Create a lookup for ranking changes
      const rankingChanges: Record<string, { oldPosition: number; newPosition: number; change: number }> = {};
      
      if (rankingData) {
        // Group by keyword
        const keywordRankings: Record<string, {date: string; position: number}[]> = {};
        rankingData.forEach(r => {
          if (!keywordRankings[r.keyword]) {
            keywordRankings[r.keyword] = [];
          }
          keywordRankings[r.keyword].push({
            date: r.date,
            position: r.position
          });
        });
        
        // Calculate changes
        Object.keys(keywordRankings).forEach(keyword => {
          const rankings = keywordRankings[keyword];
          if (rankings.length >= 2) {
            const oldPosition = rankings[0].position;
            const newPosition = rankings[rankings.length - 1].position;
            rankingChanges[keyword] = {
              oldPosition,
              newPosition,
              change: oldPosition - newPosition // Positive means improvement
            };
          }
        });
      }
      
      // Evaluate each prediction
      const evaluations = await Promise.all(pastPredictions.map(async prediction => {
        // Check if affected keywords actually changed
        const predictedKeywords = prediction.affected_keywords;
        const keywordChanges = predictedKeywords
          .filter(k => rankingChanges[k])
          .map(k => rankingChanges[k]);
        
        // Calculate accuracy percentage
        let accuracy = 0;
        let actualImpact = 'none';
        const notes: string[] = [];
        
        if (keywordChanges.length > 0) {
          // Count how many keywords actually changed significantly (more than 3 positions)
          const significantChanges = keywordChanges.filter(c => Math.abs(c.change) > 3);
          accuracy = (significantChanges.length / predictedKeywords.length) * 100;
          
          // Determine actual impact
          const avgChange = keywordChanges.reduce((sum, c) => sum + Math.abs(c.change), 0) / keywordChanges.length;
          if (avgChange < 3) actualImpact = 'low';
          else if (avgChange < 10) actualImpact = 'medium';
          else actualImpact = 'high';
          
          // Generate notes
          if (significantChanges.length > 0) {
            notes.push(`${significantChanges.length} of ${predictedKeywords.length} predicted keywords changed significantly.`);
            
            // Check if changes were mostly positive or negative
            const positiveChanges = keywordChanges.filter(c => c.change > 0);
            const negativeChanges = keywordChanges.filter(c => c.change < 0);
            
            if (positiveChanges.length > negativeChanges.length) {
              notes.push(`Most changes were positive (${positiveChanges.length} improved vs ${negativeChanges.length} declined).`);
            } else if (negativeChanges.length > positiveChanges.length) {
              notes.push(`Most changes were negative (${negativeChanges.length} declined vs ${positiveChanges.length} improved).`);
            }
          } else {
            notes.push('No significant changes observed in the predicted keywords.');
          }
        } else {
          notes.push('No ranking data available for the predicted keywords.');
        }
        
        return {
          predictionId: prediction.id,
          accuracy,
          actualImpact,
          notes
        };
      }));
      
      return evaluations;
    } catch (error) {
      console.error('Error evaluating predictions:', error);
      throw error;
    }
  }
} 