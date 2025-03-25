import { createClient } from '@/lib/supabase/client';
import { getLLMService } from '@/lib/ai/litellm-provider';

export interface ForecastRequest {
  projectId: string;
  siteId: string;
  recommendations: SEORecommendation[];
  historicalData?: {
    traffic: MonthlyMetric[];
    conversions: MonthlyMetric[];
    revenue?: MonthlyMetric[];
  };
  forecastMonths?: number;
  confidenceInterval?: number;
  timeframe?: number; // Number of months to forecast, default 12
  budget?: number; // Implementation budget if any
  businessGoals?: string[];
}

export interface SEORecommendation {
  id?: string;
  type: 'technical' | 'content' | 'backlink' | 'on-page' | 'local' | 'schema' | 'other';
  description: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  keywords?: string[];
  timeToImplement?: number; // in days
  completed?: boolean;
  category?: string;
  priority?: number;
}

export interface MonthlyMetric {
  month: string; // YYYY-MM format
  value: number;
  traffic: number;
  conversions: number;
  revenue: number;
}

export interface ForecastResult {
  id?: string;
  projectId: string;
  siteId: string;
  recommendations: SEORecommendation[];
  created_at?: Date;
  forecast: {
    traffic: ProjectedMetric[];
    conversions: ProjectedMetric[];
    revenue?: ProjectedMetric[];
  };
  roi: {
    trafficIncrease: number; // percentage
    conversionIncrease: number; // percentage
    revenueIncrease?: number; // percentage
    roiPercentage?: number;
    timeToPositiveROI?: number; // in months
    costBenefit?: {
      estimatedCost: number;
      estimatedBenefit: number;
      ratio: number;
    };
  };
  assumptions: string[];
  implementationPlan: {
    phases: {
      name: string;
      duration: number; // in days
      recommendations: string[]; // recommendation IDs
      expectedImpact: {
        traffic: number; // percentage
        conversions: number; // percentage
      };
    }[];
    totalDuration: number; // in days
  };
  projectedMetrics: ProjectedMetric[];
}

export interface ProjectedMetric {
  month: string; // YYYY-MM format
  value: number;
  lowerBound: number;
  upperBound: number;
  traffic: number;
  conversions: number;
  revenue: number;
  confidence: {
    low: number;
    high: number;
  };
}

export class SEOForecastingService {
  private static supabase = createClient('supabase', process.env.NEXT_PUBLIC_SUPABASE_URL || '');

  /**
   * Generate an SEO ROI forecast
   */
  static async generateForecast(request: ForecastRequest): Promise<ForecastResult> {
    try {
      const {
        projectId,
        siteId,
        recommendations,
        historicalData,
        forecastMonths = 12,
        confidenceInterval = 80,
        timeframe = 12,
        budget,
        businessGoals
      } = request;

      // Fetch historical data from database if not provided
      let dataToUse = historicalData;
      if (!dataToUse) {
        dataToUse = await this.fetchHistoricalData(projectId, siteId);
      }

      // Fetch project and site details
      const { data: projectData, error: projectError } = await this.supabase
        .from('projects')
        .select('name, industry, conversion_value, goals')
        .eq('id', projectId)
        .single();

      if (projectError) {
        console.error('Error fetching project data:', projectError);
        throw projectError;
      }

      const { data: siteData, error: siteError } = await this.supabase
        .from('site_crawls')
        .select('domain, current_rankings')
        .eq('id', siteId)
        .single();

      if (siteError) {
        console.error('Error fetching site data:', siteError);
        throw siteError;
      }

      // Get keywords for the project
      const { data: keywordsData, error: keywordsError } = await this.supabase
        .from('keywords')
        .select('keyword, search_volume, current_ranking, difficulty')
        .eq('project_id', projectId)
        .order('search_volume', { ascending: false })
        .limit(50);

      if (keywordsError) {
        console.error('Error fetching keywords:', keywordsError);
        throw keywordsError;
      }

      // Calculate the impact score for each recommendation
      const scoredRecommendations = recommendations.map(rec => {
        const impactScore = this.calculateImpactScore(rec);
        const effortScore = this.calculateEffortScore(rec.effort);
        const priorityScore = impactScore / effortScore;
        return { ...rec, impactScore, effortScore, priorityScore };
      }).sort((a, b) => b.priorityScore - a.priorityScore);

      // Prepare the prompt for the LLM
      const prompt = this.prepareForecastPrompt(
        projectData,
        scoredRecommendations,
        dataToUse,
        timeframe,
        budget,
        businessGoals
      );

      // Call the LLM
      const llmService = getLLMService();
      const responseText = await llmService.complete({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 2000
      });
      
      // Parse the JSON response
      const forecastData = this.parseForecastResponse(responseText);
      
      // Prepare the final result
      const result: ForecastResult = {
        projectId,
        siteId,
        recommendations,
        forecast: forecastData.forecast,
        roi: forecastData.roi,
        assumptions: forecastData.assumptions,
        implementationPlan: forecastData.implementationPlan,
        projectedMetrics: forecastData.projectedMetrics
      };

      // Store the forecast in the database
      const { data, error } = await this.supabase
        .from('seo_forecasts')
        .insert({
          project_id: projectId,
          site_id: siteId,
          recommendations,
          forecast: forecastData.forecast,
          roi: forecastData.roi,
          assumptions: forecastData.assumptions,
          implementation_plan: forecastData.implementationPlan
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error storing SEO forecast:', error);
        throw error;
      }

      result.id = data.id;
      return result;
    } catch (error: any) {
      console.error('Error generating SEO forecast:', error);
      throw error;
    }
  }

  /**
   * Get a specific SEO forecast by ID
   */
  static async getForecast(forecastId: string): Promise<ForecastResult> {
    try {
      const { data, error } = await this.supabase
        .from('seo_forecasts')
        .select('*')
        .eq('id', forecastId)
        .single();

      if (error) {
        console.error('Error fetching SEO forecast:', error);
        throw error;
      }

      return this.mapDatabaseToForecastResult(data);
    } catch (error: any) {
      console.error('Error fetching SEO forecast:', error);
      throw error;
    }
  }

  /**
   * Get all forecasts for a project
   */
  static async getProjectForecasts(projectId: string): Promise<ForecastResult[]> {
    try {
      const { data, error } = await this.supabase
        .from('seo_forecasts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching project forecasts:', error);
        throw error;
      }

      return data.map(this.mapDatabaseToForecastResult);
    } catch (error: any) {
      console.error('Error fetching project forecasts:', error);
      throw error;
    }
  }

  /**
   * Get the latest forecast for a site
   */
  static async getLatestSiteForecast(siteId: string): Promise<ForecastResult | null> {
    try {
      const { data, error } = await this.supabase
        .from('seo_forecasts')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching latest site forecast:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return null;
      }

      return this.mapDatabaseToForecastResult(data[0]);
    } catch (error: any) {
      console.error('Error fetching latest site forecast:', error);
      throw error;
    }
  }

  /**
   * Delete a forecast
   */
  static async deleteForecast(forecastId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('seo_forecasts')
        .delete()
        .eq('id', forecastId);

      if (error) {
        console.error('Error deleting forecast:', error);
        throw error;
      }
    } catch (error: any) {
      console.error('Error deleting forecast:', error);
      throw error;
    }
  }
  
  /**
   * Track actual performance against forecast
   */
  static async trackActualVsForecast(forecastId: string): Promise<{
    forecast: ProjectedMetric[];
    actual: MonthlyMetric[];
    variance: {
      month: string;
      percentage: number;
      withinBounds: boolean;
    }[];
    accuracy: number;
  }> {
    try {
      // Get the forecast
      const forecast = await this.getForecast(forecastId);
      
      // Get actual traffic data for the site
      const { data: actualData, error } = await this.supabase
        .from('site_metrics')
        .select('month, traffic, conversions')
        .eq('site_id', forecast.siteId)
        .gte('month', forecast.forecast.traffic[0].month)
        .lte('month', forecast.forecast.traffic[forecast.forecast.traffic.length - 1].month)
        .order('month', { ascending: true });
        
      if (error) {
        console.error('Error fetching actual metrics:', error);
        throw error;
      }
      
      // Map actual data to MonthlyMetric format
      const actualTraffic: MonthlyMetric[] = actualData.map(d => ({
        month: d.month,
        value: d.traffic,
        traffic: d.traffic,
        conversions: d.conversions,
        revenue: 0
      }));
      
      // Calculate variance
      const variance = actualTraffic.map(actual => {
        const forecasted = forecast.forecast.traffic.find(f => f.month === actual.month);
        
        if (!forecasted) {
          return {
            month: actual.month,
            percentage: 0,
            withinBounds: false
          };
        }
        
        const variancePercentage = ((actual.value - forecasted.value) / forecasted.value) * 100;
        const withinBounds = actual.value >= forecasted.lowerBound && actual.value <= forecasted.upperBound;
        
        return {
          month: actual.month,
          percentage: variancePercentage,
          withinBounds
        };
      });
      
      // Calculate overall accuracy
      const withinBoundsCount = variance.filter(v => v.withinBounds).length;
      const accuracy = (withinBoundsCount / variance.length) * 100;
      
      return {
        forecast: forecast.forecast.traffic,
        actual: actualTraffic,
        variance,
        accuracy
      };
    } catch (error: any) {
      console.error('Error tracking actual vs forecast:', error);
      throw error;
    }
  }

  /**
   * Calculate the impact score of a recommendation based on its type and impact level
   */
  private static calculateImpactScore(recommendation: SEORecommendation): number {
    const impactValues = {
      low: 1,
      medium: 2,
      high: 3
    };
    
    const typeMultipliers: Record<string, number> = {
      technical: 0.8,
      content: 0.9,
      backlink: 1.0,
      'on-page': 0.7,
      local: 0.6,
      schema: 0.5,
      other: 0.4
    };
    
    const effortPenalty = {
      low: 0,
      medium: -0.1,
      high: -0.2
    };
    
    const baseScore = impactValues[recommendation.impact] || 1;
    const typeMultiplier = typeMultipliers[recommendation.type] || 0.5;
    const effortAdjustment = effortPenalty[recommendation.effort] || 0;
    
    return parseFloat((baseScore * typeMultiplier + effortAdjustment).toFixed(2));
  }

  /**
   * Calculate the effort score of a recommendation based on its effort level
   */
  private static calculateEffortScore(effort: 'low' | 'medium' | 'high'): number {
    const effortValues = {
      low: 1,
      medium: 2,
      high: 3
    };
    
    return effortValues[effort] || 1;
  }

  /**
   * Fetch historical data from the database
   */
  private static async fetchHistoricalData(projectId: string, siteId: string): Promise<{
    traffic: MonthlyMetric[];
    conversions: MonthlyMetric[];
    revenue?: MonthlyMetric[];
  }> {
    try {
      // Get the last 12 months of metrics
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);
      const startMonth = startDate.toISOString().substring(0, 7); // YYYY-MM format
      
      const { data, error } = await this.supabase
        .from('site_metrics')
        .select('month, traffic, conversions, revenue')
        .eq('site_id', siteId)
        .gte('month', startMonth)
        .order('month', { ascending: true });
        
      if (error) {
        console.error('Error fetching historical metrics:', error);
        throw error;
      }
      
      // If no data, return dummy data
      if (!data || data.length === 0) {
        return this.generateDummyData();
      }
      
      // Map to the expected format
      const traffic: MonthlyMetric[] = data.map(d => ({
        month: d.month,
        value: d.traffic,
        traffic: d.traffic,
        conversions: d.conversions,
        revenue: d.revenue || 0
      }));
      
      const conversions: MonthlyMetric[] = data.map(d => ({
        month: d.month,
        value: d.conversions,
        traffic: 0,
        conversions: d.conversions,
        revenue: 0
      }));
      
      // Revenue is optional
      const hasRevenue = data.some(d => d.revenue !== null);
      
      if (hasRevenue) {
        const revenue: MonthlyMetric[] = data.map(d => ({
          month: d.month,
          value: d.revenue || 0,
          traffic: 0,
          conversions: 0,
          revenue: d.revenue || 0
        }));
        
        return { traffic, conversions, revenue };
      }
      
      return { traffic, conversions };
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return this.generateDummyData();
    }
  }

  /**
   * Generate dummy data when historical data is not available
   */
  private static generateDummyData(): {
    traffic: MonthlyMetric[];
    conversions: MonthlyMetric[];
  } {
    const traffic: MonthlyMetric[] = [];
    const conversions: MonthlyMetric[] = [];
    
    // Generate 12 months of dummy data
    const now = new Date();
    const baseTraffic = 1000 + Math.random() * 1000;
    const conversionRate = 0.02 + Math.random() * 0.03;
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = monthDate.toISOString().substring(0, 7);
      
      // Add some randomness and a slight upward trend
      const trafficValue = Math.round(baseTraffic * (1 + (11 - i) * 0.02) * (0.9 + Math.random() * 0.2));
      const conversionValue = Math.round(trafficValue * conversionRate * (0.9 + Math.random() * 0.2));
      
      traffic.push({ month, value: trafficValue, traffic: trafficValue, conversions: conversionValue, revenue: 0 });
      conversions.push({ month, value: conversionValue, traffic: 0, conversions: conversionValue, revenue: 0 });
    }
    
    return { traffic, conversions };
  }

  /**
   * Map database record to ForecastResult interface
   */
  private static mapDatabaseToForecastResult(data: any): ForecastResult {
    return {
      id: data.id,
      projectId: data.project_id,
      siteId: data.site_id,
      recommendations: data.recommendations,
      forecast: data.forecast,
      roi: data.roi,
      assumptions: data.assumptions,
      implementationPlan: data.implementation_plan,
      projectedMetrics: data.projected_metrics
    };
  }

  /**
   * Prepare the forecast prompt for the LLM
   */
  private static prepareForecastPrompt(
    project: any,
    recommendations: any[],
    historicalMetrics: MonthlyMetric[],
    timeframe: number,
    budget?: number,
    businessGoals?: string[]
  ): string {
    return `
You are an expert SEO forecasting analyst. I need you to create a detailed forecast for the following SEO project.

PROJECT INFORMATION:
- Name: ${project.name}
- Industry: ${project.industry}
- Goals: ${project.goals}
${businessGoals ? `- Business Goals: ${businessGoals.join(', ')}` : ''}
${budget ? `- Implementation Budget: $${budget}` : ''}
- Forecast Timeframe: ${timeframe} months

HISTORICAL METRICS (Last ${historicalMetrics.length} months):
${historicalMetrics.map(m => 
  `- ${m.month}: Traffic: ${m.traffic}, Conversions: ${m.conversions}, Revenue: $${m.revenue}`
).join('\n')}

RECOMMENDED SEO IMPROVEMENTS:
${recommendations.map((r, i) => 
  `${i+1}. ${r.description} (Impact: ${r.impact}, Effort: ${r.effort}${r.category ? `, Category: ${r.category}` : ''})`
).join('\n')}

Based on this information, please provide:

1. Projected metrics for each month of the forecast period including:
   - Organic traffic
   - Conversions
   - Revenue
   - Confidence intervals (high and low ranges)

2. Overall ROI metrics:
   - Expected traffic increase (%)
   - Expected conversion increase (%)
   - Expected revenue increase (%)
   - ROI percentage

3. Implementation plan:
   - Timeline for implementing recommendations
   - Prioritized tasks with estimated impact and timeline

4. Key assumptions made in this forecast

Format your response as a structured JSON object with the following schema:
{
  "projectedMetrics": [
    {
      "month": "YYYY-MM",
      "traffic": number,
      "conversions": number,
      "revenue": number,
      "confidence": {
        "low": number,
        "high": number
      }
    },
    ...
  ],
  "roi": {
    "trafficIncrease": number,
    "conversionIncrease": number,
    "revenueIncrease": number,
    "roiPercentage": number
  },
  "implementationPlan": {
    "timeline": "string",
    "prioritizedTasks": [
      {
        "task": "string",
        "timeline": "string",
        "impact": "string"
      },
      ...
    ]
  },
  "assumptions": ["string", ...]
}`;
  }
  
  /**
   * Parse the LLM response into ForecastResult
   */
  private static parseForecastResponse(responseText: string): ForecastResult {
    try {
      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Could not find valid JSON in the response');
      }
      
      const jsonText = jsonMatch[0];
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('Error parsing forecast response:', error);
      throw new Error('Failed to parse forecast data from LLM response');
    }
  }
} 