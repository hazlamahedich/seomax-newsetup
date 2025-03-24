import { createClient } from "@/lib/supabase/client";
import { ScraperService, ScrapedContent } from "@/lib/services/ScraperService";
import { WebsiteMetricsService } from "@/lib/services/WebsiteMetricsService";

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

export class CompetitorAnalysisService {
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
   * Add a new competitor for analysis
   */
  static async addCompetitor(projectId: string, url: string): Promise<CompetitorData | null> {
    try {
      // Fetch the competitor content using the scraper
      const scrapedContent = await ScraperService.scrapeUrl(url);
      
      if (!scrapedContent) {
        throw new Error(`Failed to scrape content from ${url}`);
      }
      
      // Get website performance metrics
      const metrics = await WebsiteMetricsService.getMetrics(url);
      
      // Get domain metrics for SEO analysis
      const domain = new URL(url).hostname;
      const domainMetrics = await WebsiteMetricsService.getDomainMetrics(domain);
      
      // Create the competitor entry
      const supabase = createClient();
      const { data, error } = await supabase
        .from('competitors')
        .insert([{
          project_id: projectId,
          url: url,
          title: scrapedContent.title,
          content_length: scrapedContent.text.length,
          content: scrapedContent.text,
          html_content: scrapedContent.html,
          metrics: {
            wordCount: scrapedContent.text.split(/\s+/).length,
            readabilityScore: Math.floor(Math.random() * 100), // Placeholder, would use a proper algorithm
            keywordDensity: 0, // Will be updated after analysis
            headingCount: (scrapedContent.headings.h1?.length || 0) + 
                          (scrapedContent.headings.h2?.length || 0) + 
                          (scrapedContent.headings.h3?.length || 0),
            imageCount: scrapedContent.images.length,
            linkCount: scrapedContent.html.match(/<a [^>]+>/g)?.length || 0,
            paragraphCount: scrapedContent.html.match(/<p[^>]*>/g)?.length || 0
          },
          domain_metrics: domainMetrics
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating competitor:', error);
        throw error;
      }

      // Return the created competitor with our interface format
      return data ? {
        id: data.id,
        projectId: data.project_id,
        url: data.url,
        title: data.title,
        contentLength: data.content_length,
        metrics: data.metrics,
        domainMetrics: data.domain_metrics,
        strengths: data.strengths,
        weaknesses: data.weaknesses,
        keywords: data.keywords,
        content: data.content,
        htmlContent: data.html_content
      } : null;
    } catch (error) {
      console.error('Error in addCompetitor:', error);
      throw error;
    }
  }

  /**
   * Run a comprehensive competitive analysis
   */
  static async runCompetitiveAnalysis(projectId: string, contentUrl: string): Promise<CompetitiveAnalysisResult> {
    try {
      // Get all competitors for this project
      const competitors = await this.getCompetitors(projectId);
      
      if (!competitors || competitors.length === 0) {
        throw new Error('No competitors available for analysis');
      }
      
      // Get the content we're analyzing
      const supabase = createClient();
      const { data: contentPage, error: contentError } = await supabase
        .from('content_pages')
        .select('*')
        .eq('url', contentUrl)
        .single();
        
      if (contentError) {
        console.error('Error fetching content page:', contentError);
        throw contentError;
      }
      
      // Implement the competitor analysis logic
      const result = await this._analyzeCompetitors(contentPage, competitors);
      
      // Store the results in the database
      await this._storeAnalysisResults(projectId, contentPage.id, result);
      
      return result;
    } catch (error) {
      console.error('Error in runCompetitiveAnalysis:', error);
      throw error;
    }
  }

  /**
   * Analyze content against competitors
   * @private
   */
  private static async _analyzeCompetitors(contentPage: any, competitors: CompetitorData[]): Promise<CompetitiveAnalysisResult> {
    // This would be a much more complex analysis in a real implementation
    // but we'll create a simplified version for demonstration purposes
    
    // 1. Identify content gaps
    const contentGaps = this._identifyContentGaps(contentPage, competitors);
    
    // 2. Identify keyword gaps
    const keywordGaps = this._identifyKeywordGaps(contentPage, competitors);
    
    // 3. Identify competitive advantages and disadvantages
    const { advantages, disadvantages } = this._identifyCompetitiveEdge(contentPage, competitors);
    
    // 4. Generate strategic recommendations
    const strategies = this._generateStrategies(contentPage, competitors, contentGaps, keywordGaps, advantages, disadvantages);
    
    return {
      contentGaps,
      keywordGaps,
      advantages,
      disadvantages,
      strategies
    };
  }

  /**
   * Identify content gaps based on competitor content
   * @private
   */
  private static _identifyContentGaps(contentPage: any, competitors: CompetitorData[]): ContentGap[] {
    // Simplified implementation - in a real app, this would use NLP and topic modeling
    const sampleGaps: ContentGap[] = [
      {
        topic: "Mobile Optimization",
        description: "Competitors are discussing the importance of mobile-first design for SEO rankings.",
        relevance: "high",
        suggestedImplementation: "Add a section on mobile optimization best practices and responsive design techniques.",
        competitorsCovering: Math.floor(Math.random() * competitors.length) + 1
      },
      {
        topic: "Voice Search Optimization",
        description: "Competitors are covering how to optimize content for voice search queries.",
        relevance: "medium",
        suggestedImplementation: "Include conversational phrases and question-based headings that match voice search patterns.",
        competitorsCovering: Math.floor(Math.random() * competitors.length) + 1
      },
      {
        topic: "Local SEO Factors",
        description: "Some competitors discuss how local SEO affects search visibility.",
        relevance: "low",
        suggestedImplementation: "Add a short section about local SEO best practices if relevant to your audience.",
        competitorsCovering: Math.floor(Math.random() * competitors.length) + 1
      }
    ];

    return sampleGaps;
  }

  /**
   * Identify keyword gaps based on competitor usage
   * @private
   */
  private static _identifyKeywordGaps(contentPage: any, competitors: CompetitorData[]): CompetitorKeyword[] {
    // Simplified implementation - in a real app, this would extract and analyze actual keywords
    const sampleKeywords: CompetitorKeyword[] = [
      {
        keyword: "content optimization",
        volume: 5400,
        difficulty: 68,
        density: 1.2,
        inTitle: false,
        inHeadings: false
      },
      {
        keyword: "seo best practices",
        volume: 9200,
        difficulty: 72,
        density: 0,
        inTitle: false,
        inHeadings: true
      },
      {
        keyword: "keyword research",
        volume: 12500,
        difficulty: 45,
        density: 0.3,
        inTitle: false,
        inHeadings: false
      }
    ];

    return sampleKeywords;
  }

  /**
   * Identify competitive advantages and disadvantages
   * @private
   */
  private static _identifyCompetitiveEdge(contentPage: any, competitors: CompetitorData[]): { 
    advantages: CompetitiveAdvantage[]; 
    disadvantages: CompetitiveAdvantage[]
  } {
    // Simplified implementation - in a real app, this would compare various content metrics
    const advantages: CompetitiveAdvantage[] = [
      {
        area: "Content Length",
        description: "Your content is comprehensive and more in-depth than competitors.",
        isAdvantage: true,
        competitorComparison: {
          "Your content": `${contentPage.word_count || 2500} words`,
          "Competitor average": `${Math.floor(competitors.reduce((sum, comp) => sum + (comp.metrics?.wordCount || 0), 0) / Math.max(1, competitors.length))} words`
        }
      },
      {
        area: "Visual Elements",
        description: "Your content has more images and visual aids than competitors.",
        isAdvantage: true
      }
    ];
    
    const disadvantages: CompetitiveAdvantage[] = [
      {
        area: "Keyword Usage",
        description: "Competitors use target keywords more effectively throughout their content.",
        isAdvantage: false,
        competitorComparison: {
          "Your keyword density": "1.2%",
          "Competitor average": "2.8%"
        }
      },
      {
        area: "Content Structure",
        description: "Competitors use more structured headings and subheadings for better readability.",
        isAdvantage: false
      }
    ];

    return { advantages, disadvantages };
  }

  /**
   * Generate strategic recommendations based on analysis
   * @private
   */
  private static _generateStrategies(
    contentPage: any, 
    competitors: CompetitorData[],
    contentGaps: ContentGap[],
    keywordGaps: CompetitorKeyword[],
    advantages: CompetitiveAdvantage[],
    disadvantages: CompetitiveAdvantage[]
  ): CompetitiveStrategy[] {
    // Generate strategies based on the analysis results
    const strategies: CompetitiveStrategy[] = [
      {
        title: "Optimize Content Structure",
        description: "Improve your content's structure with better headings and subheadings.",
        implementation: "Add more H2 and H3 headings with keywords, and organize content into clear sections.",
        priority: "high",
        timeFrame: "quick"
      },
      {
        title: "Add Missing Keywords",
        description: `Add missing keywords like "${keywordGaps[0]?.keyword}" to improve topical coverage.`,
        implementation: "Incorporate these keywords naturally into your content, especially in headings and important paragraphs.",
        priority: "high",
        timeFrame: "quick"
      },
      {
        title: "Address Content Gaps",
        description: `Add sections covering ${contentGaps.map(g => g.topic).join(', ')}.`,
        implementation: "Create new content sections addressing these topics with comprehensive information.",
        priority: "medium",
        timeFrame: "medium"
      },
      {
        title: "Enhance Mobile Optimization",
        description: "Improve mobile experience to match or exceed competitor standards.",
        implementation: "Ensure responsive design, optimize images, and improve mobile page speed.",
        priority: "medium",
        timeFrame: "medium"
      },
      {
        title: "Develop Comprehensive Content Series",
        description: "Create a series of interconnected content pieces that build on your competitive advantages.",
        implementation: "Develop a content plan with 3-5 additional articles that link back to this piece.",
        priority: "low",
        timeFrame: "long-term"
      }
    ];

    return strategies;
  }

  /**
   * Store analysis results in the database
   * @private
   */
  private static async _storeAnalysisResults(
    projectId: string,
    contentId: string,
    results: CompetitiveAnalysisResult
  ): Promise<void> {
    const supabase = createClient();
    
    // Store content gaps
    for (const gap of results.contentGaps) {
      await supabase
        .from('content_gaps')
        .insert([{
          competitor_id: null, // This isn't tied to a specific competitor
          project_id: projectId,
          content_id: contentId,
          topic: gap.topic,
          description: gap.description,
          relevance: gap.relevance,
          suggested_implementation: gap.suggestedImplementation,
          competitors_covering: gap.competitorsCovering
        }]);
    }
    
    // Store competitive advantages and disadvantages
    for (const advantage of [...results.advantages, ...results.disadvantages]) {
      await supabase
        .from('competitive_advantages')
        .insert([{
          project_id: projectId,
          content_id: contentId,
          area: advantage.area,
          description: advantage.description,
          is_advantage: advantage.isAdvantage,
          competitor_comparison: advantage.competitorComparison
        }]);
    }
    
    // Store strategies
    for (const strategy of results.strategies) {
      await supabase
        .from('competitive_strategies')
        .insert([{
          project_id: projectId,
          content_id: contentId,
          title: strategy.title,
          description: strategy.description,
          implementation: strategy.implementation,
          priority: strategy.priority,
          time_frame: strategy.timeFrame
        }]);
    }
  }
} 