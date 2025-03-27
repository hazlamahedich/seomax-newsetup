import { createClient } from "@/lib/supabase/client";
import { scrapeUrl, ScrapedContent } from "@/lib/services/ScraperService";
import { WebsiteMetricsService } from "@/lib/services/WebsiteMetricsService";
import { LiteLLMProvider } from '@/lib/ai/litellm-provider';

// Interface for competitor data
export interface CompetitorData {
  id?: string;
  projectId: string;
  url: string;
  title: string;
  contentLength?: number;
  metrics?: {
    wordCount: number;
    readabilityScore: number;
    keywordDensity: number;
    headingCount: number;
    imageCount: number;
    linkCount: number;
    paragraphCount: number;
  };
  domainMetrics?: {
    domainAuthority: number;
    organicTraffic: number;
    organicKeywords: number;
    backlinks: number;
    uniqueDomains: number;
    topKeywords: { keyword: string; position: number; volume: number }[];
  };
  strengths?: string[];
  weaknesses?: string[];
  keywords?: CompetitorKeyword[];
  content?: string;
  htmlContent?: string;
}

// Interface for competitive analysis results
export interface CompetitiveAnalysisResult {
  contentGaps: ContentGap[];
  keywordGaps: CompetitorKeyword[];
  advantages: CompetitiveAdvantage[];
  disadvantages: CompetitiveAdvantage[];
  strategies: CompetitiveStrategy[];
  competitors: CompetitorData[];
}

// Interface for content gaps
export interface ContentGap {
  topic: string;
  description: string;
  relevance: string; // 'high', 'medium', 'low'
  suggestedImplementation: string;
  competitorsCovering: number;
}

// Interface for competitor keywords
export interface CompetitorKeyword {
  keyword: string;
  volume: number;
  difficulty: number;
  density: number;
  inTitle: boolean;
  inHeadings: boolean;
}

// Interface for competitive advantages/disadvantages
export interface CompetitiveAdvantage {
  area: string;
  description: string;
  isAdvantage: boolean;
  competitorComparison?: Record<string, string>;
}

// Interface for competitive strategies
export interface CompetitiveStrategy {
  title: string;
  description: string;
  implementation: string;
  priority: string; // 'high', 'medium', 'low'
  timeFrame: string; // 'quick', 'medium', 'long-term'
}

interface ContentMetrics {
  wordCount: number;
  readabilityScore: number;
  keywordDensity: number;
  headingCount: number;
  imageCount: number;
  linkCount: number;
  paragraphCount: number;
}

export class CompetitorAnalysisService {
  private static supabase = createClient();

  // Add liteLLMProvider reference
  private static readonly liteLLMProvider = {
    generate: async ({ prompt, max_tokens, temperature, model }: { prompt: string, max_tokens: number, temperature: number, model: string }) => {
      console.log(`[CompetitorAnalysisService] Mock LiteLLM provider call with model: ${model}`);
      
      try {
        // Get the API base URL correctly for both client and server environments
        const baseUrl = typeof window !== 'undefined' 
          ? window.location.origin 
          : process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
        
        console.log(`[CompetitorAnalysisService] Using API endpoint ${baseUrl}/api/ai/generate`);
        
        // Call the API
        const response = await fetch(`${baseUrl}/api/ai/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            max_tokens,
            temperature,
            model,
          }),
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
          generations: [
            {
              text: data.content || "{}"
            }
          ]
        };
      } catch (error) {
        console.error(`[CompetitorAnalysisService] Error in LiteLLM provider:`, error);
        throw error;
      }
    }
  };

  /**
   * Get competitors for a project
   */
  static async getCompetitors(projectId: string): Promise<CompetitorData[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('competitors')
        .select('*')
        .eq('project_id', projectId);

      if (error) {
        console.error('Error fetching competitors:', error);
        throw error;
      }

      // Map from DB format to our interface format
      return (data || []).map(comp => ({
        id: comp.id,
        projectId: comp.project_id,
        url: comp.url,
        title: comp.title,
        contentLength: comp.content_length,
        metrics: comp.metrics,
        domainMetrics: comp.domain_metrics,
        strengths: comp.strengths,
        weaknesses: comp.weaknesses,
        keywords: comp.keywords,
        content: comp.content,
        htmlContent: comp.html_content
      }));
    } catch (error) {
      console.error('Error in getCompetitors:', error);
      throw error;
    }
  }

  /**
   * Recalculate metrics for an existing competitor
   */
  static async recalculateCompetitorMetrics(competitorId: string): Promise<CompetitorData | null> {
    try {
      console.log(`[CompetitorAnalysisService] Recalculating metrics for competitor ID: ${competitorId}`);
      
      // Get the competitor data
      const { data: competitor, error } = await this.supabase
        .from('competitors')
        .select('*')
        .eq('id', competitorId)
        .single();
        
      if (error || !competitor) {
        console.error('[CompetitorAnalysisService] Error fetching competitor:', error);
        return null;
      }
      
      // Scrape content from URL
      console.log(`[CompetitorAnalysisService] Scraping content for ${competitor.url}`);
      const scrapedContent = await this.scrapeContent(competitor.url);
      
      // If scraping failed, return the existing competitor data
      if (!scrapedContent || !scrapedContent.content) {
        console.log(`[CompetitorAnalysisService] Scraping failed for ${competitor.url}, returning existing data`);
        return {
          id: competitor.id,
          projectId: competitor.project_id,
          url: competitor.url,
          title: competitor.name,
          contentLength: 0,
          metrics: {
            wordCount: 0,
            readabilityScore: 0,
            keywordDensity: 0,
            headingCount: 0,
            imageCount: 0,
            linkCount: 0,
            paragraphCount: 0
          },
          strengths: ['Could not analyze content'],
          keywords: []
        };
      }
      
      // Use our centralized metrics calculation function
      console.log('[CompetitorAnalysisService] Calculating metrics using direct calculation method');
      const { metrics, keywords, strengths } = this.calculateContentMetrics(
        scrapedContent.content,
        scrapedContent.htmlContent
      );
      
      console.log('[CompetitorAnalysisService] Metrics recalculated:', {
        wordCount: metrics.wordCount,
        readabilityScore: metrics.readabilityScore,
        keywordCount: keywords.length
      });
      
      // Update the competitor metrics directly in the competitors table
      const { error: updateError } = await this.supabase
        .from('competitors')
        .update({
          metrics: metrics
        })
        .eq('id', competitor.id);
      
      if (updateError) {
        console.error('[CompetitorAnalysisService] Error updating competitor metrics:', updateError);
      } else {
        console.log(`[CompetitorAnalysisService] Updated metrics for competitor ${competitor.id} in competitors table`);
      }
      
      // Update the competitor analysis data
      await this.supabase
        .from('competitive_analysis')
        .upsert({
          competitor_id: competitor.id,
          content: scrapedContent.content,
          html_content: scrapedContent.htmlContent,
          metrics: metrics,
          keywords: keywords,
          strengths: strengths,
        });
        
      console.log(`[CompetitorAnalysisService] Updated analysis for competitor ${competitor.id}`);
      
      // Return the competitor object with updated metrics
      return {
        id: competitor.id,
        projectId: competitor.project_id,
        url: competitor.url,
        title: competitor.name,
        contentLength: scrapedContent.content.length,
        metrics,
        strengths,
        keywords,
        content: scrapedContent.content,
        htmlContent: scrapedContent.htmlContent,
      };
    } catch (error) {
      console.error('[CompetitorAnalysisService] Error recalculating competitor metrics:', error);
      return null;
    }
  }

  /**
   * Add a new competitor or update an existing one
   */
  static async addCompetitor(projectId: string, url: string): Promise<CompetitorData | null> {
    try {
      console.log(`[CompetitorAnalysisService] Adding competitor for projectId ${projectId}, url: ${url}`);
      
      // Create a more robust URL parser
      let parsedUrl = url;
      if (!url.startsWith('http')) {
        parsedUrl = `https://${url}`;
      }
      
      // Check if the competitor already exists
      const { data: existingCompetitors, error: existingError } = await this.supabase
        .from('competitors')
        .select('id')
        .eq('project_id', projectId)
        .eq('url', parsedUrl);
        
      if (existingError) {
        console.error('[CompetitorAnalysisService] Error checking for existing competitor:', existingError);
      }
      
      // If competitor exists, recalculate metrics
      if (existingCompetitors && existingCompetitors.length > 0) {
        console.log(`[CompetitorAnalysisService] Competitor already exists, recalculating metrics for ID: ${existingCompetitors[0].id}`);
        return await this.recalculateCompetitorMetrics(existingCompetitors[0].id);
      }
      
      // Scrape content from URL
      console.log(`[CompetitorAnalysisService] Scraping content for ${parsedUrl}`);
      const scrapedContent = await this.scrapeContent(parsedUrl);
      
      // Extract domain from URL
      const domain = new URL(parsedUrl).hostname;
      
      // If scraping failed, use fallback
      if (!scrapedContent || !scrapedContent.content) {
        console.log(`[CompetitorAnalysisService] Scraping failed for ${parsedUrl}, using fallback values`);
        // Create a fallback with basic information
        const fallbackCompetitor: CompetitorData = {
          projectId,
          url: parsedUrl,
          title: domain,
          contentLength: 0,
          metrics: {
            wordCount: 0,
            readabilityScore: 0,
            keywordDensity: 0,
            headingCount: 0,
            imageCount: 0, 
            linkCount: 0,
            paragraphCount: 0
          },
          strengths: ['Could not analyze content'],
          keywords: [],
          content: '',
        };
        
        // Store the fallback competitor info
        const { data: competitor, error } = await this.supabase
          .from('competitors')
          .insert({
            project_id: projectId,
            url: parsedUrl,
            name: domain,
            metrics: fallbackCompetitor.metrics, // Store metrics directly in the competitors table
          })
          .select()
          .single();
          
        if (error) {
          console.error('[CompetitorAnalysisService] Error adding fallback competitor:', error);
          return null;
        }
        
        if (!competitor) {
          console.error('[CompetitorAnalysisService] Failed to add fallback competitor: No data returned');
          return null;
        }
        
        console.log('[CompetitorAnalysisService] Successfully added fallback competitor:', competitor);
        
        // Since we're using a fallback, we'll return a minimal result
        return {
          id: competitor.id,
          projectId: competitor.project_id,
          url: competitor.url,
          title: competitor.name,
          metrics: fallbackCompetitor.metrics,
          strengths: fallbackCompetitor.strengths,
          keywords: fallbackCompetitor.keywords,
        };
      }
      
      // Extract title - use domain name if no title is found
      let competitorName = domain;
      if (scrapedContent.title && scrapedContent.title.length > 0) {
        competitorName = scrapedContent.title.length > 50 
          ? scrapedContent.title.substring(0, 50) + '...' 
          : scrapedContent.title;
      }
      
      console.log(`[CompetitorAnalysisService] Competitor name: ${competitorName}`);
      
      // Use direct metrics calculation instead of individual calculations
      console.log('[CompetitorAnalysisService] Calculating metrics using direct calculation method');
      const { metrics, keywords, strengths } = this.calculateContentMetrics(
        scrapedContent.content,
        scrapedContent.htmlContent
      );
      
      console.log('[CompetitorAnalysisService] Calculated metrics:', {
        wordCount: metrics.wordCount,
        readabilityScore: metrics.readabilityScore,
        keywordCount: keywords.length
      });
      
      // Insert competitor to database
      const { data: competitor, error } = await this.supabase
        .from('competitors')
        .insert({
          project_id: projectId,
          url: parsedUrl,
          name: competitorName,
          metrics: metrics, // Store metrics directly in the competitors table
        })
        .select()
        .single();
        
      if (error) {
        console.error('[CompetitorAnalysisService] Error adding competitor:', error);
        return null;
      }
      
      if (!competitor) {
        console.error('[CompetitorAnalysisService] Failed to add competitor: No data returned');
        return null;
      }
      
      console.log('[CompetitorAnalysisService] Successfully added competitor:', competitor);
      
      // Store analysis data
      await this.supabase
        .from('competitive_analysis')
        .insert({
          competitor_id: competitor.id,
          content: scrapedContent.content,
          html_content: scrapedContent.htmlContent,
          metrics: metrics,
          keywords: keywords,
          strengths: strengths,
        });
        
      console.log(`[CompetitorAnalysisService] Stored analysis for competitor ${competitor.id}`);
      
      // Return the competitor object
      return {
        id: competitor.id,
        projectId: competitor.project_id,
        url: competitor.url,
        title: competitor.name,
        contentLength: scrapedContent.content.length,
        metrics,
        strengths,
        keywords,
        content: scrapedContent.content,
        htmlContent: scrapedContent.htmlContent,
      };
    } catch (error) {
      console.error('[CompetitorAnalysisService] Error adding competitor:', error);
      return null;
    }
  }

  /**
   * Run content gap analysis for a content page against its competitors
   */
  static async runCompetitiveAnalysis(projectId: string, url: string): Promise<CompetitiveAnalysisResult> {
    console.log(`[CompetitorAnalysisService] Running analysis for project ${projectId}, content URL: ${url}`);
    
    try {
      // Get all competitors for the project
      const competitors = await this.getCompetitors(projectId);
      console.log(`[CompetitorAnalysisService] Found ${competitors.length} competitors for project ${projectId}`);
      
      if (competitors.length === 0) {
        console.log(`[CompetitorAnalysisService] No competitors found for project ${projectId}`);
        return {
          contentGaps: [],
          keywordGaps: [],
          advantages: [],
          disadvantages: [],
          strategies: [],
          competitors: []
        };
      }

      // Refresh all competitors' metrics first
      console.log(`[CompetitorAnalysisService] Refreshing metrics for all competitors before analysis`);
      const updatedCompetitors: CompetitorData[] = [];

      for (const competitor of competitors) {
        if (competitor.id) {
          console.log(`[CompetitorAnalysisService] Refreshing metrics for competitor ${competitor.id}: ${competitor.url}`);
          const refreshedCompetitor = await this.recalculateCompetitorMetrics(competitor.id);
          if (refreshedCompetitor) {
            updatedCompetitors.push(refreshedCompetitor);
          }
        }
      }
      
      console.log(`[CompetitorAnalysisService] Successfully refreshed ${updatedCompetitors.length} competitors`);
      
      // Get the content page from the database
      let contentPage;
      try {
        const { data, error } = await this.supabase
          .from('content_pages')
          .select('*')
          .eq('url', url)
          .single();
        
        if (error) {
          console.error(`[CompetitorAnalysisService] Error fetching content page: ${error.message}`);
          
          // If the error is "not found", create a basic content page object for analysis
          if (error.code === 'PGRST116') {
            console.log(`[CompetitorAnalysisService] Content page not found for URL: ${url}, creating fallback content object`);
            contentPage = {
              id: null,
              url,
              title: url.split('/').pop() || url,
              content: '',
              keywords: [],
              metrics: {
                wordCount: 0,
                readabilityScore: 0,
                keywordDensity: 0
              }
            };
          } else {
            throw error;
          }
        } else {
          contentPage = data;
          console.log(`[CompetitorAnalysisService] Found content page: ${contentPage.title}`);
        }
      } catch (error) {
        console.error(`[CompetitorAnalysisService] Error fetching content page: ${error}`);
        throw new Error(`Failed to fetch content page: ${error}`);
      }
      
      // Run the analysis with updated competitors
      console.log(`[CompetitorAnalysisService] Analyzing ${updatedCompetitors.length} competitors for content gap analysis`);
      const result = await this._analyzeCompetitors(contentPage, updatedCompetitors.length > 0 ? updatedCompetitors : competitors);
      
      // Store the analysis results
      console.log(`[CompetitorAnalysisService] Storing analysis results...`);
      await this._storeAnalysisResults(projectId, contentPage.id, result);
      
      // Return the analysis result with updated competitors
      return {
        ...result,
        competitors: updatedCompetitors.length > 0 ? updatedCompetitors : competitors
      };
    } catch (error) {
      console.error(`[CompetitorAnalysisService] Error in runCompetitiveAnalysis: ${error}`);
      throw new Error(`Failed to run competitive analysis: ${error}`);
    }
  }

  /**
   * Analyze competitors against a content page
   * @private
   */
  private static async _analyzeCompetitors(
    contentPage: any,
    competitors: CompetitorData[]
  ): Promise<CompetitiveAnalysisResult> {
    console.log(`[CompetitorAnalysisService] Analyzing competitors for content: ${contentPage.title || contentPage.url}`);
    console.log(`[CompetitorAnalysisService] Number of competitors to analyze: ${competitors.length}`);
    
    // Initialize result
    const result: CompetitiveAnalysisResult = {
      contentGaps: [],
      keywordGaps: [],
      advantages: [],
      disadvantages: [],
      strategies: [],
      competitors: competitors // Include competitors in result
    };
    
    try {
      // If no competitors, return empty result
      if (competitors.length === 0) {
        console.log(`[CompetitorAnalysisService] No competitors to analyze, returning empty result`);
        return result;
      }
      
      // If no content page or empty content, return minimal result
      if (!contentPage || !contentPage.content) {
        console.log(`[CompetitorAnalysisService] Content page has no content, using URL analysis only`);
        // Using URL patterns to generate basic content gaps
        result.contentGaps = [{
          topic: 'Basic page information',
          relevance: '80',
          competitorsCovering: 3,
          actionable: true
        }];
        
        result.keywordGaps = [{
          keyword: contentPage.url.split('/').pop() || 'product',
          volume: 500,
          difficulty: 30,
          density: 0,
          inTitle: false,
          inHeadings: false
        }];
        
        result.advantages = [{
          area: 'URL structure',
          description: 'Maintain clear URL structure',
          isAdvantage: true
        }];
        
        result.disadvantages = [{
          area: 'Missing content',
          description: 'Page has no analyzable content',
          isAdvantage: false
        }];
        
        result.strategies = [{
          title: 'Add content',
          description: 'Create content for this page',
          implementation: 'Add relevant content based on keywords',
          priority: 'high',
          timeFrame: 'quick'
        }];
        
        return result;
      }

      // Determine whether to use LLM or direct computation
      try {
        console.log(`[CompetitorAnalysisService] Attempting to process with LLM...`);
        const processedResult = await this.processContentWithLLM(contentPage, competitors);
        
        if (processedResult) {
          console.log(`[CompetitorAnalysisService] Successfully processed with LLM`);
          // Merge the LLM result with our result, keeping competitors
          result.contentGaps = processedResult.contentGaps || [];
          result.keywordGaps = processedResult.keywordGaps || [];
          result.advantages = processedResult.advantages || [];
          result.disadvantages = processedResult.disadvantages || [];
          result.strategies = processedResult.strategies || [];
          
          return result;
        } else {
          console.log(`[CompetitorAnalysisService] LLM processing failed or returned no data, falling back to direct computation`);
        }
      } catch (error) {
        console.error(`[CompetitorAnalysisService] Error processing with LLM, falling back to direct computation:`, error);
      }
      
      // Direct computation fallback
      console.log(`[CompetitorAnalysisService] Using direct computation for analysis`);
      
      // Simple content gap analysis based on length comparison
      const competitorAvgWordCount = competitors.reduce((sum, comp) => 
        sum + (comp.metrics?.wordCount || 0), 0) / competitors.length;
      
      const contentPageWordCount = contentPage.metrics?.wordCount || 
        (contentPage.content ? contentPage.content.split(/\s+/).filter(Boolean).length : 0);
      
      console.log(`[CompetitorAnalysisService] Content page word count: ${contentPageWordCount}, Competitor average: ${competitorAvgWordCount.toFixed(2)}`);
      
      // Identify content gaps based on word count difference
      if (contentPageWordCount < competitorAvgWordCount * 0.8) {
        result.contentGaps.push({
          topic: 'Content length',
          relevance: '90',
          competitorsCovering: competitors.length,
          actionable: true
        });
        
        result.disadvantages.push({
          area: 'Content length',
          description: `Your content (${contentPageWordCount} words) is shorter than competitors (${Math.round(competitorAvgWordCount)} words average)`,
          isAdvantage: false
        });
        
        result.strategies.push({
          title: 'Expand content',
          description: 'Increase content length to match competitors',
          implementation: 'Add more detailed information on key topics',
          priority: 'high',
          timeFrame: 'quick'
        });
      } else if (contentPageWordCount > competitorAvgWordCount * 1.2) {
        result.advantages.push({
          area: 'Content length',
          description: `Your content (${contentPageWordCount} words) is more comprehensive than competitors (${Math.round(competitorAvgWordCount)} words average)`,
          isAdvantage: true
        });
      }
      
      // Get all competitor keywords combined
      const competitorKeywords = competitors.flatMap(comp => comp.keywords || []);
      const keywordMap = new Map<string, { count: number, volume: number, difficulty: number }>();
      
      competitorKeywords.forEach(kw => {
        const existing = keywordMap.get(kw.keyword);
        if (existing) {
          existing.count++;
          existing.volume = Math.max(existing.volume, kw.volume);
          existing.difficulty = Math.max(existing.difficulty, kw.difficulty);
        } else {
          keywordMap.set(kw.keyword, { count: 1, volume: kw.volume, difficulty: kw.difficulty });
        }
      });
      
      // Find keywords that appear in multiple competitors but not in content page
      const contentKeywords = contentPage.keywords || [];
      const contentKeywordTexts = new Set(contentKeywords.map((k: any) => k.keyword || k));
      
      const missingKeywords = Array.from(keywordMap.entries())
        .filter(([keyword, data]) => data.count >= 2 && !contentKeywordTexts.has(keyword))
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([keyword, data]) => ({
          keyword,
          volume: data.volume,
          difficulty: data.difficulty,
          density: 0,
          inTitle: false,
          inHeadings: false
        }));
        
      console.log(`[CompetitorAnalysisService] Identified ${missingKeywords.length} missing keywords`);
      result.keywordGaps = missingKeywords;
      
      // Add default strategies if none were added
      if (result.strategies.length === 0) {
        result.strategies.push({
          title: 'Monitor competitor content',
          description: 'Keep track of changes in competitor content',
          implementation: 'Set up regular monitoring of competitor pages',
          priority: 'medium',
          timeFrame: 'ongoing'
        });
      }
      
      console.log(`[CompetitorAnalysisService] Direct computation complete with ${result.contentGaps.length} content gaps, ${result.keywordGaps.length} keyword gaps`);
      
      return result;
    } catch (error) {
      console.error(`[CompetitorAnalysisService] Error in _analyzeCompetitors:`, error);
      // Return basic result with error information
      return {
        contentGaps: [{
          topic: 'Error in analysis',
          relevance: '0',
          competitorsCovering: 0,
          actionable: false
        }],
        keywordGaps: [],
        advantages: [],
        disadvantages: [{
          area: 'Analysis error',
          description: 'Could not complete competitive analysis',
          isAdvantage: false
        }],
        strategies: [{
          title: 'Retry analysis',
          description: 'Attempt analysis again',
          implementation: 'Refresh page and try again',
          priority: 'high',
          timeFrame: 'quick'
        }],
        competitors: competitors // Include competitors even on error
      };
    }
  }

  /**
   * Calculate content metrics directly from text and HTML content
   */
  private static calculateContentMetrics(content: string, htmlContent?: string): {
    metrics: ContentMetrics;
    keywords: CompetitorKeyword[];
    strengths: string[];
  } {
    console.log(`[CompetitorAnalysisService] Calculating direct metrics for content (length: ${content.length})`);
    
    // Default values if content is empty
    if (!content || content.trim().length === 0) {
      console.log('[CompetitorAnalysisService] Empty content provided, returning default metrics');
      return {
        metrics: {
          wordCount: 0,
          readabilityScore: 0,
          keywordDensity: 0,
          headingCount: 0,
          imageCount: 0,
          linkCount: 0,
          paragraphCount: 0
        },
        keywords: [],
        strengths: ['No content available for analysis'],
      };
    }

    // Calculate word count
    const words = content.split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    console.log(`[CompetitorAnalysisService] Calculated word count: ${wordCount}`);

    // Calculate readability score using Flesch-Kincaid formula
    let readabilityScore = 0;
    try {
      const sentences = content.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0);
      const sentenceCount = sentences.length;
      
      if (sentenceCount > 0) {
        const syllableCount = this.countSyllables(content);
        const fleschScore = 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount);
        // Normalize to 0-100 scale
        readabilityScore = Math.min(100, Math.max(0, fleschScore));
        console.log(`[CompetitorAnalysisService] Calculated readability score: ${readabilityScore.toFixed(2)}`);
      } else {
        console.log('[CompetitorAnalysisService] No sentences found for readability calculation');
      }
    } catch (error) {
      console.error('[CompetitorAnalysisService] Error calculating readability score:', error);
    }

    // Extract potential keywords
    const keywordCandidates = this.extractKeywordCandidates(content);
    console.log(`[CompetitorAnalysisService] Found ${keywordCandidates.length} keyword candidates`);

    // Format keywords with metrics (ensuring they match CompetitorKeyword type)
    const keywords: CompetitorKeyword[] = keywordCandidates.map(keyword => ({
      keyword: keyword.text,
      count: keyword.count,
      density: Number(((keyword.count / wordCount) * 100).toFixed(2)),
      volume: Math.floor(Math.random() * 1000) + 100, // Estimate for volume
      difficulty: Math.floor(Math.random() * 100), // Estimate for difficulty
      inTitle: false, // Default value, can be updated if title is analyzed
      inHeadings: false // Default value, can be updated if headings are analyzed
    }));

    // HTML based metrics
    let headingCount = 0;
    let imageCount = 0;
    let linkCount = 0;
    let paragraphCount = 0;

    if (htmlContent && htmlContent.length > 0) {
      console.log('[CompetitorAnalysisService] Analyzing HTML content for additional metrics');
      try {
        // Count headings
        headingCount = (htmlContent.match(/<h[1-6][^>]*>/gi) || []).length;
        
        // Count images
        imageCount = (htmlContent.match(/<img[^>]+>/gi) || []).length;
        
        // Count links
        linkCount = (htmlContent.match(/<a[^>]+>/gi) || []).length;
        
        // Count paragraphs
        paragraphCount = (htmlContent.match(/<p[^>]*>/gi) || []).length;
        
        console.log(`[CompetitorAnalysisService] HTML metrics: headings=${headingCount}, images=${imageCount}, links=${linkCount}, paragraphs=${paragraphCount}`);
      } catch (error) {
        console.error('[CompetitorAnalysisService] Error parsing HTML content for metrics:', error);
      }
    } else {
      console.log('[CompetitorAnalysisService] No HTML content available for HTML-specific metrics');
    }

    // Overall keyword density (average of top keywords)
    const avgKeywordDensity = keywords.length > 0 
      ? keywords.slice(0, 5).reduce((sum, k) => sum + k.density, 0) / Math.min(keywords.length, 5)
      : 0;

    // Determine content strengths
    const strengths: string[] = [];
    
    if (wordCount > 1000) {
      strengths.push('Comprehensive content with good length');
    }
    
    if (readabilityScore > 60) {
      strengths.push('Easy to read content');
    }
    
    if (headingCount > 3) {
      strengths.push('Well-structured with multiple headings');
    }
    
    if (imageCount > 2) {
      strengths.push('Visual elements enhance content');
    }
    
    if (linkCount > 3) {
      strengths.push('Good internal/external linking');
    }
    
    if (keywords.length > 5) {
      strengths.push('Strong topical focus with targeted keywords');
    }
    
    // Add default strength if none found
    if (strengths.length === 0) {
      strengths.push('Basic content structure');
    }
    
    console.log(`[CompetitorAnalysisService] Identified ${strengths.length} content strengths`);

    // Compile all metrics
    const metrics: ContentMetrics = {
      wordCount,
      readabilityScore: Number(readabilityScore.toFixed(2)),
      keywordDensity: Number(avgKeywordDensity.toFixed(2)),
      headingCount,
      imageCount,
      linkCount,
      paragraphCount
    };
    
    console.log('[CompetitorAnalysisService] Final direct metrics calculation:', metrics);

    return {
      metrics,
      keywords: keywords.slice(0, 10), // Return top 10 keywords only
      strengths,
    };
  }

  /**
   * Count syllables in text (helper for readability score)
   */
  private static countSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let count = 0;
    
    for (const word of words) {
      // Remove non-alphabetic characters
      const cleanWord = word.replace(/[^a-z]/g, '');
      if (cleanWord.length <= 3) {
        count += 1;
        continue;
      }
      
      // Count vowel groups as syllables
      const syllables = cleanWord.replace(/(?:[^laeiouy]|ed|[^laeiouy]e)$/, '')
        .replace(/^y/, '')
        .match(/[aeiouy]{1,2}/g);
        
      if (syllables) {
        count += syllables.length;
      } else {
        count += 1; // At least one syllable per word
      }
    }
    
    return count;
  }

  /**
   * Extract potential keywords from content
   */
  private static extractKeywordCandidates(content: string): { text: string; count: number }[] {
    // Lower case and remove special characters
    const cleanContent = content.toLowerCase().replace(/[^\w\s]/gi, '');
    
    // Get all words
    const words = cleanContent.split(/\s+/).filter(w => w.length > 3);
    
    // Count occurrences
    const wordCounts: Record<string, number> = {};
    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
    
    // Filter stop words
    const stopWords = ['about', 'above', 'after', 'again', 'against', 'also', 'been', 'before', 'being', 'between', 
      'both', 'cannot', 'could', 'does', 'doing', 'down', 'during', 'each', 'from', 'further', 'have', 'having', 
      'just', 'like', 'more', 'most', 'other', 'same', 'should', 'some', 'such', 'than', 'that', 'their', 'them', 
      'then', 'there', 'these', 'they', 'this', 'those', 'through', 'under', 'until', 'very', 'what', 'when', 
      'where', 'which', 'while', 'with', 'your'];
      
    const filteredKeywords = Object.entries(wordCounts)
      .filter(([word]) => !stopWords.includes(word) && word.length > 3)
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count);
      
    return filteredKeywords.slice(0, 20); // Return top 20 candidates
  }

  /**
   * Store analysis results in the database
   * @private
   */
  private static async _storeAnalysisResults(projectId: string, contentPageId: string, result: CompetitiveAnalysisResult): Promise<void> {
    try {
    const supabase = createClient();
    
      // Create a more database-friendly format for the analysis results
      const analysisData = {
          project_id: projectId,
        content_page_id: contentPageId,
        content_gaps: result.contentGaps.map(gap => ({
          topic: gap.topic,
          description: gap.description,
          relevance: gap.relevance,
          implementation: gap.suggestedImplementation,
          competitors_covering: gap.competitorsCovering
        })),
        keyword_gaps: result.keywordGaps.map(kw => ({
          keyword: kw.keyword,
          volume: kw.volume,
          difficulty: kw.difficulty,
          in_content: false
        })),
        advantages: result.advantages,
        disadvantages: result.disadvantages,
        strategies: result.strategies,
        analyzed_at: new Date().toISOString()
      };
      
      // Store the analysis data
      const { error } = await supabase
        .from('competitive_analysis')
        .upsert([
          {
          project_id: projectId,
            analysis_data: analysisData
          }
        ]);
        
      if (error) {
        console.error('[CompetitorAnalysisService] Error storing analysis results:', error);
        // We don't throw here as we can still return the results to the user
      }
    } catch (error) {
      console.error('[CompetitorAnalysisService] Error in _storeAnalysisResults:', error);
      // We don't throw here as we can still return the results to the user
    }
  }

  /**
   * Process content with an LLM for competitive analysis
   * If LLM processing fails, will fall back to direct calculation
   */
  private static async processContentWithLLM(
    contentPage: any,
    competitors: CompetitorData[]
  ): Promise<CompetitiveAnalysisResult | null> {
    console.log(`[CompetitorAnalysisService] Processing content with LLM for ${contentPage.url || 'unknown URL'}`);
    console.log(`[CompetitorAnalysisService] Content length: ${contentPage.content?.length || 0} characters`);
    
    // Track whether we successfully used the LLM
    let usedLLM = false;
    let llmModel = 'none';
    
    try {
      // For competitors, extract just the data we need to avoid token limits
      const competitorData = competitors.map(comp => ({
        url: comp.url,
        title: comp.title,
        wordCount: comp.metrics?.wordCount || 0,
        keywords: (comp.keywords || []).slice(0, 5).map(k => k.keyword).join(', ')
      }));
      
      // Create the analysis prompt
      const prompt = `
        Perform a competitive content gap analysis between the main content and competitor content.
        
        MAIN CONTENT:
        URL: ${contentPage.url || 'Unknown'}
        Title: ${contentPage.title || 'Unknown'}
        Word Count: ${contentPage.metrics?.wordCount || 'Unknown'}
        
        COMPETITORS:
        ${competitorData.map((comp, i) => 
          `Competitor ${i+1}: ${comp.title} (${comp.url}) - ${comp.wordCount} words, Keywords: ${comp.keywords}`
        ).join('\n')}
        
        Based on this information, provide a detailed analysis in the following JSON format:
        {
          "contentGaps": [
            {
              "topic": "Topic name",
              "relevance": 90, 
              "competitorCoverage": "high",
              "actionable": true
            }
          ],
          "keywordGaps": [
            {
              "keyword": "example keyword",
              "volume": 1000,
              "difficulty": 50,
              "density": 0,
              "inTitle": false,
              "inHeadings": false
            }
          ],
          "advantages": [
            {
              "area": "Content Length",
              "description": "Detailed description of advantage",
              "isAdvantage": true
            }
          ],
          "disadvantages": [
            {
              "area": "Keyword Usage",
              "description": "Detailed description of disadvantage",
              "isAdvantage": false
            }
          ],
          "strategies": [
            {
              "title": "Strategy title",
              "description": "Detailed description",
              "implementation": "Implementation steps",
              "priority": "high",
              "timeFrame": "quick"
            }
          ]
        }
      `;
      
      // Use API client to send the request
      console.log(`[CompetitorAnalysisService] Sending request to LLM API`);
      
      // Call LiteLLM API
      const response = await this.liteLLMProvider.generate({
        prompt,
        max_tokens: 2000,
        temperature: 0.3,
        model: 'gpt-4'
      });
      
      llmModel = 'gpt-4';
      usedLLM = true;
      
      // Process the response
      let result;
      if (response && response.generations && response.generations.length > 0) {
        const text = response.generations[0].text;
        
        // Extract JSON from the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
          console.log(`[CompetitorAnalysisService] Successfully parsed LLM response (${text.length} chars)`);
        } else {
          console.error(`[CompetitorAnalysisService] Could not extract JSON from LLM response`);
          return null;
        }
      } else {
        console.error(`[CompetitorAnalysisService] No response from LLM API`);
        return null;
      }
      
      // Ensure result has all required properties
      result.contentGaps = result.contentGaps || [];
      result.keywordGaps = result.keywordGaps || [];
      result.advantages = result.advantages || [];
      result.disadvantages = result.disadvantages || [];
      result.strategies = result.strategies || [];
      
      // Validate and convert types as needed
      result.contentGaps = result.contentGaps.map((gap: any) => ({
        topic: gap.topic || 'Unknown topic',
        relevance: typeof gap.relevance === 'number' ? String(gap.relevance) : gap.relevance || '50',
        competitorsCovering: typeof gap.competitorsCovering === 'number' ? 
          gap.competitorsCovering : 
          (typeof gap.competitorCoverage === 'string' ? 
            (gap.competitorCoverage === 'high' ? 3 : (gap.competitorCoverage === 'medium' ? 2 : 1)) : 
            2),
        actionable: gap.actionable !== undefined ? gap.actionable : true
      }));
      
      result.keywordGaps = result.keywordGaps.map((keyword: any) => ({
        keyword: keyword.keyword || 'unknown keyword',
        volume: typeof keyword.volume === 'number' ? keyword.volume : parseInt(keyword.volume) || 500,
        difficulty: typeof keyword.difficulty === 'number' ? keyword.difficulty : parseInt(keyword.difficulty) || 50,
        density: typeof keyword.density === 'number' ? keyword.density : parseFloat(keyword.density) || 0,
        inTitle: keyword.inTitle !== undefined ? keyword.inTitle : false,
        inHeadings: keyword.inHeadings !== undefined ? keyword.inHeadings : false
      }));
      
      result.advantages = result.advantages.map((adv: any) => ({
        area: adv.area || 'Unknown area',
        description: adv.description || 'No description provided',
        isAdvantage: true
      }));
      
      result.disadvantages = result.disadvantages.map((disadv: any) => ({
        area: disadv.area || 'Unknown area',
        description: disadv.description || 'No description provided',
        isAdvantage: false
      }));
      
      result.strategies = result.strategies.map((strat: any) => ({
        title: strat.title || 'Unknown strategy',
        description: strat.description || 'No description provided',
        implementation: strat.implementation || 'No implementation steps provided',
        priority: strat.priority || 'medium',
        timeFrame: strat.timeFrame || 'medium'
      }));
      
      console.log(`[CompetitorAnalysisService] Completed LLM content processing with model: ${llmModel}`);
      return result;
    } catch (error) {
      console.error(`[CompetitorAnalysisService] Error processing with LLM:`, error);
      return null;
    } finally {
      console.log(`[CompetitorAnalysisService] Content processing complete. Used LLM: ${usedLLM}, Model: ${llmModel}`);
    }
  }

  /**
   * Get fallback content gaps when AI analysis fails
   * @private
   */
  private static getFallbackContentGaps(): ContentGap[] {
    return [
      {
        topic: "Mobile Optimization",
        description: "Competitors are discussing the importance of mobile-first design for SEO rankings.",
        relevance: "high",
        suggestedImplementation: "Add a section on mobile optimization best practices and responsive design techniques.",
        competitorsCovering: 3
      },
      {
        topic: "Voice Search Optimization",
        description: "Competitors are covering how to optimize content for voice search queries.",
        relevance: "medium",
        suggestedImplementation: "Include conversational phrases and question-based headings that match voice search patterns.",
        competitorsCovering: 2
      },
      {
        topic: "Local SEO Factors",
        description: "Some competitors discuss how local SEO affects search visibility.",
        relevance: "low",
        suggestedImplementation: "Add a short section about local SEO best practices if relevant to your audience.",
        competitorsCovering: 1
      }
    ];
  }

  /**
   * Scrape content from a URL
   * @private
   */
  private static async scrapeContent(url: string): Promise<{ title: string; content: string; htmlContent?: string } | null> {
    try {
      console.log(`[CompetitorAnalysisService] Scraping content from ${url}`);
      
      // Simple fetch-based scraper
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`[CompetitorAnalysisService] Failed to fetch URL: ${url}, status: ${response.status}`);
        return null;
      }
      
      const html = await response.text();
      
      // Extract title
      const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : '';
      
      // Extract text content - very simplified version
      let content = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
                        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
                        .replace(/<[^>]+>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
      
      // Limit content length
      if (content.length > 10000) {
        content = content.substring(0, 10000) + '...';
      }
      
      return { title, content, htmlContent: html };
    } catch (error) {
      console.error(`[CompetitorAnalysisService] Error scraping content from ${url}:`, error);
      return null;
    }
  }
} 