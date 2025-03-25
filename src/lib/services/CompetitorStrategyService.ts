import { createClient } from '@/lib/supabase/client';
import { liteLLMProvider } from '@/lib/ai/litellm-provider';

export interface CompetitorStrategy {
  id?: string;
  competitorId: string;
  strategyType: 'content' | 'technical' | 'backlink' | 'social' | 'local' | 'other';
  strategyDetails: {
    description: string;
    implementation: string;
    effectiveness: number; // 0-100
    examples: string[];
    signals: string[];
  };
  confidenceScore: number;
  detectedPatterns: string[];
  counterStrategies: string[];
  priorityLevel: 'high' | 'medium' | 'low';
  implementationDifficulty: 'easy' | 'moderate' | 'complex';
}

export interface CompetitorAnalysisParams {
  projectId: string;
  competitorIds?: string[];
  focusAreas?: ('content' | 'technical' | 'backlink' | 'social' | 'local' | 'other')[];
  minimumConfidence?: number;
}

export class CompetitorStrategyService {
  private static supabase = createClient();

  /**
   * Analyze competitor strategies
   */
  static async analyzeCompetitorStrategies(params: CompetitorAnalysisParams): Promise<CompetitorStrategy[]> {
    try {
      const {
        projectId,
        competitorIds,
        focusAreas = ['content', 'technical', 'backlink', 'social', 'local'],
        minimumConfidence = 70
      } = params;
      
      // Get competitors if IDs not provided
      let competitors;
      
      if (competitorIds && competitorIds.length > 0) {
        const { data, error } = await this.supabase
          .from('competitors')
          .select('*')
          .in('id', competitorIds);
          
        if (error) {
          console.error('Error fetching competitors by IDs:', error);
          throw error;
        }
        
        competitors = data;
      } else {
        const { data, error } = await this.supabase
          .from('competitors')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching competitors for project:', error);
          throw error;
        }
        
        competitors = data;
      }
      
      if (!competitors || competitors.length === 0) {
        throw new Error('No competitors found to analyze');
      }
      
      // Get project data for context
      const { data: projectData, error: projectError } = await this.supabase
        .from('projects')
        .select('industry, name')
        .eq('id', projectId)
        .single();
        
      if (projectError) {
        console.error('Error fetching project data:', projectError);
        throw projectError;
      }
      
      // Get own site data
      const { data: ownSiteData, error: siteError } = await this.supabase
        .from('site_crawls')
        .select('domain')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (siteError) {
        console.error('Error fetching own site data:', siteError);
        throw siteError;
      }
      
      // Get additional data sources for each competitor
      const competitorStrategies: CompetitorStrategy[] = [];
      
      // Process each competitor
      for (const competitor of competitors.slice(0, 5)) { // Limit to 5 competitors to reduce processing time
        // Get competitor backlinks
        const { data: backlinks, error: backlinksError } = await this.supabase
          .from('competitor_backlinks')
          .select('*')
          .eq('competitor_id', competitor.id)
          .limit(50);
          
        if (backlinksError) {
          console.error('Error fetching competitor backlinks:', backlinksError);
        }
        
        // Get competitor crawl data if available
        const { data: competitiveCrawl, error: crawlError } = await this.supabase
          .from('competitive_analysis')
          .select('*')
          .eq('competitor_id', competitor.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (crawlError && crawlError.code !== 'PGRST116') { // Ignore "no rows returned" error
          console.error('Error fetching competitive crawl:', crawlError);
        }
        
        // For each focus area, create a strategy analysis
        for (const strategyType of focusAreas) {
          // Create the prompt for strategy analysis
          const prompt = `
            You are an expert SEO strategy analyst. Analyze the following competitor data to 
            reverse-engineer their ${strategyType} SEO strategy and provide counter-strategies.
            
            PROJECT INDUSTRY: ${projectData?.industry || 'Not specified'}
            PROJECT NAME: ${projectData?.name || 'Not specified'}
            OWN DOMAIN: ${ownSiteData?.domain || 'Not specified'}
            
            COMPETITOR DATA:
            Name: ${competitor.name}
            Domain: ${competitor.domain}
            Top Keywords: ${competitor.top_keywords?.join(', ') || 'Not available'}
            
            ${competitiveCrawl ? `
            COMPETITIVE ANALYSIS DATA:
            Content Score: ${competitiveCrawl.content_score || 'N/A'}
            Technical Score: ${competitiveCrawl.technical_score || 'N/A'}
            Backlink Score: ${competitiveCrawl.backlink_score || 'N/A'}
            ` : ''}
            
            ${backlinks && backlinks.length > 0 ? `
            BACKLINK DATA (Sample):
            ${backlinks.slice(0, 10).map(b => `${b.source_url} (DA: ${b.domain_authority || 'N/A'})`).join('\n')}
            ` : ''}
            
            STRATEGY FOCUS AREA: ${strategyType.toUpperCase()}
            
            Your task is to:
            1. Identify and reverse-engineer the competitor's ${strategyType} SEO strategy
            2. Assess the strategy's effectiveness based on available data
            3. Provide counter-strategies that would help outperform this competitor
            4. Estimate confidence in your analysis and prioritize actions
            
            Return your analysis as a JSON object with these properties:
            {
              "strategyType": "${strategyType}",
              "strategyDetails": {
                "description": string,  // Description of the detected strategy
                "implementation": string,  // How they seem to be implementing it
                "effectiveness": number,  // 0-100 score
                "examples": string[],  // 2-3 specific examples seen in the data
                "signals": string[]  // Signals that led to this conclusion
              },
              "confidenceScore": number,  // 0-100 confidence in this analysis
              "detectedPatterns": string[], // 3-5 patterns detected
              "counterStrategies": string[], // 3-5 specific counter-strategies
              "priorityLevel": "high" | "medium" | "low",
              "implementationDifficulty": "easy" | "moderate" | "complex"
            }
            
            Only provide analysis with a confidence score of ${minimumConfidence} or higher.
          `;
          
          // Call the LLM
          const model = liteLLMProvider.getLangChainModel();
          try {
            const response = await model.invoke(prompt);
            
            // Parse the JSON response
            const responseText = response.content.toString();
            const jsonMatch = responseText.match(/{[\s\S]*}/);
            if (!jsonMatch) {
              console.warn(`Invalid response format for ${competitor.name} ${strategyType} strategy`);
              continue;
            }
            
            const strategy: Omit<CompetitorStrategy, 'competitorId'> = JSON.parse(jsonMatch[0]);
            
            // Skip strategies with low confidence
            if (strategy.confidenceScore < minimumConfidence) {
              console.log(`Skipping low confidence strategy for ${competitor.name}: ${strategy.confidenceScore}`);
              continue;
            }
            
            // Store the strategy
            const completeStrategy: CompetitorStrategy = {
              ...strategy,
              competitorId: competitor.id
            };
            
            const { data, error } = await this.supabase
              .from('competitor_strategies')
              .insert({
                competitor_id: completeStrategy.competitorId,
                strategy_type: completeStrategy.strategyType,
                strategy_details: completeStrategy.strategyDetails,
                confidence_score: completeStrategy.confidenceScore,
                detected_patterns: completeStrategy.detectedPatterns,
                counter_strategies: completeStrategy.counterStrategies,
                priority_level: completeStrategy.priorityLevel,
                implementation_difficulty: completeStrategy.implementationDifficulty
              })
              .select('id')
              .single();
              
            if (error) {
              console.error('Error storing competitor strategy:', error);
            } else {
              completeStrategy.id = data?.id;
              competitorStrategies.push(completeStrategy);
            }
          } catch (error) {
            console.error(`Error analyzing ${strategyType} strategy for ${competitor.name}:`, error);
          }
        }
      }
      
      return competitorStrategies;
    } catch (error) {
      console.error('Error analyzing competitor strategies:', error);
      throw error;
    }
  }

  /**
   * Get strategies for a competitor
   */
  static async getCompetitorStrategies(
    competitorId: string,
    options: {
      strategyTypes?: ('content' | 'technical' | 'backlink' | 'social' | 'local' | 'other')[];
      minConfidence?: number;
    } = {}
  ): Promise<CompetitorStrategy[]> {
    try {
      const { strategyTypes, minConfidence = 0 } = options;
      
      let query = this.supabase
        .from('competitor_strategies')
        .select('*')
        .eq('competitor_id', competitorId)
        .gte('confidence_score', minConfidence);
        
      if (strategyTypes && strategyTypes.length > 0) {
        query = query.in('strategy_type', strategyTypes);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching competitor strategies:', error);
        throw error;
      }
      
      return data.map(item => ({
        id: item.id,
        competitorId: item.competitor_id,
        strategyType: item.strategy_type,
        strategyDetails: item.strategy_details,
        confidenceScore: item.confidence_score,
        detectedPatterns: item.detected_patterns,
        counterStrategies: item.counter_strategies,
        priorityLevel: item.priority_level,
        implementationDifficulty: item.implementation_difficulty
      }));
    } catch (error) {
      console.error('Error fetching competitor strategies:', error);
      throw error;
    }
  }

  /**
   * Get all strategies for a project
   */
  static async getProjectStrategies(
    projectId: string,
    options: {
      strategyTypes?: ('content' | 'technical' | 'backlink' | 'social' | 'local' | 'other')[];
      minConfidence?: number;
      priorityLevel?: 'high' | 'medium' | 'low';
    } = {}
  ): Promise<(CompetitorStrategy & { competitorName: string; competitorDomain: string })[]> {
    try {
      const { strategyTypes, minConfidence = 0, priorityLevel } = options;
      
      // Get competitors for the project
      const { data: competitors, error: competitorError } = await this.supabase
        .from('competitors')
        .select('id, name, domain')
        .eq('project_id', projectId);
        
      if (competitorError) {
        console.error('Error fetching project competitors:', competitorError);
        throw competitorError;
      }
      
      if (!competitors || competitors.length === 0) {
        return [];
      }
      
      // Get strategies for all competitors
      const competitorIds = competitors.map(c => c.id);
      
      let query = this.supabase
        .from('competitor_strategies')
        .select('*')
        .in('competitor_id', competitorIds)
        .gte('confidence_score', minConfidence);
        
      if (strategyTypes && strategyTypes.length > 0) {
        query = query.in('strategy_type', strategyTypes);
      }
      
      if (priorityLevel) {
        query = query.eq('priority_level', priorityLevel);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching project strategies:', error);
        throw error;
      }
      
      // Create a lookup for competitor names
      const competitorLookup: Record<string, { name: string; domain: string }> = {};
      competitors.forEach(c => {
        competitorLookup[c.id] = { name: c.name, domain: c.domain };
      });
      
      return data.map(item => ({
        id: item.id,
        competitorId: item.competitor_id,
        competitorName: competitorLookup[item.competitor_id]?.name || 'Unknown',
        competitorDomain: competitorLookup[item.competitor_id]?.domain || 'Unknown',
        strategyType: item.strategy_type,
        strategyDetails: item.strategy_details,
        confidenceScore: item.confidence_score,
        detectedPatterns: item.detected_patterns,
        counterStrategies: item.counter_strategies,
        priorityLevel: item.priority_level,
        implementationDifficulty: item.implementation_difficulty
      }));
    } catch (error) {
      console.error('Error fetching project strategies:', error);
      throw error;
    }
  }

  /**
   * Generate an integrated counter-strategy plan
   */
  static async generateCounterStrategyPlan(
    projectId: string,
    options: {
      timeframe?: 'short' | 'medium' | 'long'; // 30, 90, 180 days
      focusAreas?: ('content' | 'technical' | 'backlink' | 'social' | 'local' | 'other')[];
      topCompetitors?: number;
    } = {}
  ): Promise<{
    overview: string;
    strategiesByType: Record<string, { strategy: string; tasks: { description: string; deadline: string; difficulty: string }[] }>;
    prioritizedActions: { action: string; impact: 'high' | 'medium' | 'low'; timeframe: string }[];
    expectedOutcomes: string[];
    metrics: { name: string; target: string; timeline: string }[];
  }> {
    try {
      const {
        timeframe = 'medium',
        focusAreas = ['content', 'technical', 'backlink'],
        topCompetitors = 3
      } = options;
      
      // Get top competitors for the project
      const { data: competitors, error: competitorError } = await this.supabase
        .from('competitors')
        .select('id, name, domain')
        .eq('project_id', projectId)
        .order('ranking', { ascending: true })
        .limit(topCompetitors);
        
      if (competitorError) {
        console.error('Error fetching top competitors:', competitorError);
        throw competitorError;
      }
      
      // Get strategies for these competitors
      const strategies = await this.getProjectStrategies(projectId, {
        strategyTypes: focusAreas,
        minConfidence: 60
      });
      
      // Get project and site information
      const { data: project, error: projectError } = await this.supabase
        .from('projects')
        .select('name, industry, description')
        .eq('id', projectId)
        .single();
        
      if (projectError) {
        console.error('Error fetching project data:', projectError);
        throw projectError;
      }
      
      // Get site SEO data
      const { data: seoAnalysis, error: seoError } = await this.supabase
        .from('seo_analyses')
        .select('technical_score, content_score, backlink_score')
        .eq('site_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      // Create the prompt for counter-strategy plan
      const prompt = `
        You are an expert SEO strategist. Create an integrated counter-strategy plan to compete against 
        the following competitors in the ${project?.industry || 'unknown'} industry.
        
        PROJECT: ${project?.name || 'Unknown'}
        DESCRIPTION: ${project?.description || 'Not provided'}
        TIMEFRAME: ${timeframe === 'short' ? '30 days' : timeframe === 'medium' ? '90 days' : '180 days'}
        FOCUS AREAS: ${focusAreas.join(', ')}
        
        ${seoAnalysis ? `
        CURRENT SEO STATUS:
        Technical Score: ${seoAnalysis.technical_score || 'N/A'}/100
        Content Score: ${seoAnalysis.content_score || 'N/A'}/100
        Backlink Score: ${seoAnalysis.backlink_score || 'N/A'}/100
        ` : ''}
        
        COMPETITOR STRATEGIES:
        ${strategies.map(s => `
        ${s.competitorName} (${s.competitorDomain}) - ${s.strategyType.toUpperCase()} Strategy:
        - Description: ${s.strategyDetails.description}
        - Implementation: ${s.strategyDetails.implementation}
        - Effectiveness: ${s.strategyDetails.effectiveness}/100
        - Priority: ${s.priorityLevel.toUpperCase()}
        - Counter-Strategies:
          ${s.counterStrategies.map(cs => `• ${cs}`).join('\n          ')}
        `).join('\n')}
        
        Your task is to create a comprehensive, integrated counter-strategy plan that addresses 
        all competitor strategies while focusing on the specified areas. The plan should be 
        realistic for the given timeframe and prioritize actions by impact.
        
        Return your plan as a JSON object with these properties:
        {
          "overview": string,  // Brief overview of the integrated strategy
          "strategiesByType": {  // Strategies organized by type
            "[type]": {
              "strategy": string,  // Overall strategy for this type
              "tasks": [  // Specific tasks to implement
                {
                  "description": string,
                  "deadline": string,  // e.g., "Week 1", "Month 2"
                  "difficulty": string  // Easy, Medium, Hard
                }
              ]
            }
          },
          "prioritizedActions": [  // Top 10 most important actions across all strategies
            {
              "action": string,
              "impact": "high" | "medium" | "low",
              "timeframe": string  // When to implement
            }
          ],
          "expectedOutcomes": string[],  // 5-7 expected outcomes
          "metrics": [  // Metrics to track success
            {
              "name": string,
              "target": string,  // Target value
              "timeline": string  // When to achieve
            }
          ]
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
      console.error('Error generating counter-strategy plan:', error);
      throw error;
    }
  }
} 