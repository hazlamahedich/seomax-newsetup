import { createClient } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { scrapeUrl, ScrapedContent } from "@/lib/services/ScraperService";
import { WebsiteMetricsService } from "@/lib/services/WebsiteMetricsService";
import { liteLLMProvider } from '@/lib/ai/litellm-provider';
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

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
  actionable?: boolean;
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
  private static supabase = createAdminClient();

  /**
   * Normalize a URL to ensure consistent formatting and storage
   * This enhanced version handles various edge cases and ensures URLs are consistently matched
   */
  static normalizeUrl(url: string): string {
    if (!url) return '';
    
    try {
      // Trim whitespace
      let normalizedUrl = url.trim();
      
      // Ensure URL has a protocol
      if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = 'https://' + normalizedUrl;
      }
      
      // Use URL parser to properly handle all URL components
      const parsedUrl = new URL(normalizedUrl);
      
      // Normalize hostname to lowercase (domain names are case-insensitive)
      parsedUrl.hostname = parsedUrl.hostname.toLowerCase();
      
      // Preserve path case (paths can be case-sensitive)
      // But ensure trailing slashes are consistent - we'll keep them for root domains
      if (parsedUrl.pathname === '/' || parsedUrl.pathname === '') {
        parsedUrl.pathname = '/';
      } else if (parsedUrl.pathname.endsWith('/') && parsedUrl.pathname.length > 1) {
        // Remove trailing slash for non-root paths
        parsedUrl.pathname = parsedUrl.pathname.slice(0, -1);
      }
      
      // Remove default ports
      if ((parsedUrl.protocol === 'http:' && parsedUrl.port === '80') || 
          (parsedUrl.protocol === 'https:' && parsedUrl.port === '443')) {
        parsedUrl.port = '';
      }
      
      // Standardize to https for common domains unless explicitly http
      if (parsedUrl.protocol === 'http:' && !url.startsWith('http://')) {
        parsedUrl.protocol = 'https:';
      }
      
      // Sort query parameters for consistent ordering
      if (parsedUrl.search) {
        const searchParams = new URLSearchParams(parsedUrl.search);
        const sortedParams = new URLSearchParams();
        
        // Sort params by key
        Array.from(searchParams.keys())
          .sort()
          .forEach(key => {
            const values = searchParams.getAll(key);
            values.forEach(value => sortedParams.append(key, value));
          });
        
        parsedUrl.search = sortedParams.toString() ? `?${sortedParams.toString()}` : '';
      }
      
      // Remove common tracking parameters
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
      if (parsedUrl.search) {
        const searchParams = new URLSearchParams(parsedUrl.search);
        let modified = false;
        
        trackingParams.forEach(param => {
          if (searchParams.has(param)) {
            searchParams.delete(param);
            modified = true;
          }
        });
        
        if (modified) {
          parsedUrl.search = searchParams.toString() ? `?${searchParams.toString()}` : '';
        }
      }
      
      // Convert back to string
      normalizedUrl = parsedUrl.toString();
      
      // Security check to prevent excessively long URLs
      if (normalizedUrl.length > 2000) {
        console.warn(`[CompetitorAnalysisService] URL exceeds 2000 chars, truncating: ${normalizedUrl.substring(0, 50)}...`);
        normalizedUrl = normalizedUrl.substring(0, 2000);
      }
      
      return normalizedUrl;
    } catch (error) {
      console.error(`[CompetitorAnalysisService] Error normalizing URL: ${url}`, error);
      // Return original URL if normalization fails
      return url;
    }
  }

  /**
   * Calculate similarity between two URL paths (0-1 scale)
   * @private
   */
  private static calculatePathSimilarity(path1: string, path2: string): number {
    // Remove trailing slashes for comparison
    if (path1.endsWith('/')) path1 = path1.slice(0, -1);
    if (path2.endsWith('/')) path2 = path2.slice(0, -1);
    
    // If both are just root path
    if ((path1 === '' || path1 === '/') && (path2 === '' || path2 === '/')) {
      return 1.0;
    }
    
    // Split into segments
    const segments1 = path1.split('/').filter(Boolean);
    const segments2 = path2.split('/').filter(Boolean);
    
    // If one is empty and the other isn't
    if ((segments1.length === 0 && segments2.length > 0) || 
        (segments2.length === 0 && segments1.length > 0)) {
      return 0.0;
    }
    
    // Count matching segments
    const maxSegments = Math.max(segments1.length, segments2.length);
    if (maxSegments === 0) return 1.0; // Both empty
    
    let matchingSegments = 0;
    for (let i = 0; i < Math.min(segments1.length, segments2.length); i++) {
      // Case-insensitive comparison for paths
      if (segments1[i].toLowerCase() === segments2[i].toLowerCase()) {
        matchingSegments++;
      }
    }
    
    return matchingSegments / maxSegments;
  }

  /**
   * Find content page using flexible URL matching with multiple fallback strategies
   * This addresses the issue of exact URL matches failing despite URLs appearing identical
   */
  static async findContentPageByUrl(url: string): Promise<{ contentPage: any; exact: boolean } | null> {
    if (!url) return null;
    
    try {
      // Normalize URL for consistent lookup
      const normalizedUrl = this.normalizeUrl(url);
      console.log(`[CompetitorAnalysisService] Finding content page for normalized URL: ${normalizedUrl}`);
      
      // Use admin client for this query to bypass RLS
      const adminClient = createAdminClient();
      
      // Original URL variations to try
      const urlVariations = [
        normalizedUrl, 
        url,
        normalizedUrl.replace(/\/$/, ''),  // Without trailing slash
        normalizedUrl.endsWith('/') ? normalizedUrl : `${normalizedUrl}/` // With trailing slash
      ].filter(Boolean);
      
      // De-duplicate variations
      const uniqueVariations = [...new Set(urlVariations)];
      
      // 1. First try exact match with each variation
      for (const urlVariant of uniqueVariations) {
        try {
          const { data, error } = await adminClient
            .from('content_pages')
            .select('*')
            .eq('url', urlVariant)
            .maybeSingle();
          
          if (data) {
            console.log(`[CompetitorAnalysisService] Found exact URL match: ${data.url}`);
            return { contentPage: data, exact: true };
          }
        } catch (err) {
          console.log(`[CompetitorAnalysisService] Error in exact match for ${urlVariant}, continuing to next variation`);
        }
      }
      
      // 2. Try case-insensitive match with ILIKE
      try {
        console.log(`[CompetitorAnalysisService] Trying case-insensitive match for: ${normalizedUrl}`);
        
        // Create an exact pattern by escaping special characters
        const escapedUrl = normalizedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        const { data, error } = await adminClient
          .from('content_pages')
          .select('*')
          .ilike('url', escapedUrl)
          .maybeSingle();
        
        if (data) {
          console.log(`[CompetitorAnalysisService] Found case-insensitive match: ${data.url}`);
          return { contentPage: data, exact: false };
        }
      } catch (err) {
        console.log('[CompetitorAnalysisService] Error in case-insensitive match, continuing to next strategy');
      }
      
      // 3. Try domain-only matching as fallback
      try {
        // Extract domain for partial matching
        let domain = '';
        try {
          const parsedUrl = new URL(normalizedUrl);
          domain = parsedUrl.hostname;
        } catch (err) {
          // If URL parsing fails, use original URL
          domain = normalizedUrl.split('/')[0];
        }
        
        if (domain) {
          console.log(`[CompetitorAnalysisService] Trying domain-only matching for: ${domain}`);
          
          const { data, error } = await adminClient
            .from('content_pages')
            .select('*')
            .ilike('url', `%${domain}%`)
            .order('created_at', { ascending: false });
          
          if (data && data.length > 0) {
            console.log(`[CompetitorAnalysisService] Found ${data.length} URLs with domain: ${domain}`);
            
            // First look for similar paths
            const parsedNormalizedUrl = new URL(normalizedUrl);
            const normalizedPath = parsedNormalizedUrl.pathname;
            
            let bestMatch = null;
            let bestScore = -1;
            
            for (const page of data) {
              try {
                const candidateUrl = new URL(page.url);
                const candidatePath = candidateUrl.pathname;
                
                // Path similarity check
                const similarity = this.calculatePathSimilarity(
                  String(normalizedPath || '/'), 
                  String(candidatePath || '/')
                );
                
                if (similarity > bestScore) {
                  bestScore = similarity;
                  bestMatch = page;
                }
              } catch (err) {
                // Skip invalid URLs
                continue;
              }
            }
            
            // Use best match if similarity is above threshold
            if (bestMatch && bestScore > 0.5) {
              console.log(`[CompetitorAnalysisService] Using best domain match with ${Math.round(bestScore * 100)}% path similarity: ${bestMatch.url}`);
              return { contentPage: bestMatch, exact: false };
            }
            
            // If no good path match, just use the first result
            console.log(`[CompetitorAnalysisService] Using first domain match: ${data[0].url}`);
            return { contentPage: data[0], exact: false };
          }
        }
      } catch (err) {
        console.log('[CompetitorAnalysisService] Error in domain matching, continuing to next strategy');
      }
      
      // 4. Try direct DB query with more permissive approach as a last resort
      try {
        console.log(`[CompetitorAnalysisService] Trying direct DB query for any URL containing significant parts of: ${normalizedUrl}`);
        
        // Extract significant parts from URL
        const urlParts = normalizedUrl
          .replace(/https?:\/\//i, '')
          .replace(/www\./i, '')
          .split(/[/?&#]/)
          .filter(part => part.length > 3)
          .map(part => part.toLowerCase());
        
        if (urlParts.length > 0) {
          // Try to find matches for each significant part
          for (const part of urlParts) {
            const { data, error } = await adminClient
              .from('content_pages')
              .select('*')
              .ilike('url', `%${part}%`)
              .limit(1);
            
            if (data && data.length > 0) {
              console.log(`[CompetitorAnalysisService] Found match by URL fragment "${part}": ${data[0].url}`);
              return { contentPage: data[0], exact: false };
            }
          }
        }
      } catch (err) {
        console.log('[CompetitorAnalysisService] Error in URL fragment matching');
      }
      
      // No matches found after trying all strategies
      console.log(`[CompetitorAnalysisService] No matching content page found for URL after trying all strategies: ${normalizedUrl}`);
      return null;
    } catch (error) {
      console.error(`[CompetitorAnalysisService] Error finding content page by URL: ${url}`, error);
      return null;
    }
  }

  /**
   * Get competitors for a project
   */
  static async getCompetitors(projectId: string): Promise<CompetitorData[]> {
    try {
      const { data, error } = await this.supabase
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
        title: comp.title || comp.name,
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
      
      // Normalize the URL to ensure consistent format
      const normalizedUrl = this.normalizeUrl(url);
      console.log(`[CompetitorAnalysisService] Using normalized URL: ${normalizedUrl}`);
      
      // Check if the competitor already exists
      const { data: existingCompetitors, error: existingError } = await this.supabase
        .from('competitors')
        .select('id')
        .eq('project_id', projectId)
        .eq('url', normalizedUrl);
        
      if (existingError) {
        console.error('[CompetitorAnalysisService] Error checking for existing competitor:', existingError);
      }
      
      // If competitor exists, recalculate metrics
      if (existingCompetitors && existingCompetitors.length > 0) {
        console.log(`[CompetitorAnalysisService] Competitor already exists, recalculating metrics for ID: ${existingCompetitors[0].id}`);
        return await this.recalculateCompetitorMetrics(existingCompetitors[0].id);
      }
      
      // Scrape content from URL
      console.log(`[CompetitorAnalysisService] Scraping content for ${normalizedUrl}`);
      const scrapedContent = await this.scrapeContent(normalizedUrl);
      
      // Extract domain from URL
      const domain = new URL(normalizedUrl).hostname;
      
      // If scraping failed, use fallback
      if (!scrapedContent || !scrapedContent.content) {
        console.log(`[CompetitorAnalysisService] Scraping failed for ${normalizedUrl}, using fallback values`);
        // Create a fallback with basic information
        const fallbackCompetitor: CompetitorData = {
          projectId,
          url: normalizedUrl,
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
            url: normalizedUrl,
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
          url: normalizedUrl,
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
   * Run a competitive analysis for a URL
   */
  static async runCompetitiveAnalysis(projectId: string, url: string): Promise<CompetitiveAnalysisResult> {
    console.log(`[CompetitorAnalysisService] Running analysis for project ${projectId}, content URL: ${url}`);
    
    try {
      // Normalize URL for consistent matching
      const normalizedUrl = this.normalizeUrl(url);
      console.log(`[CompetitorAnalysisService] Normalized URL: ${normalizedUrl}`);
      
      // Get competitors for this project
      const { data: competitors, error: competitorError } = await this.supabase
        .from('competitors')
        .select('*')
        .eq('project_id', projectId);
        
      if (competitorError) {
        console.error(`[CompetitorAnalysisService] Error fetching competitors: ${competitorError.message}`);
        throw new Error(`Failed to fetch competitors: ${competitorError.message}`);
      }
      
      console.log(`[CompetitorAnalysisService] Found ${competitors.length} competitors`);
      
      // Map competitors to the expected data structure
      let mappedCompetitors: CompetitorData[] = competitors.map(comp => ({
        id: comp.id,
        projectId: comp.project_id,
        url: comp.url,
        title: comp.name,
        metrics: comp.metrics || {
          wordCount: 0,
          readabilityScore: 0,
          keywordDensity: 0,
          headingCount: 0,
          imageCount: 0,
          linkCount: 0,
          paragraphCount: 0
        },
        strengths: [],
        keywords: []
      }));
      
      // Update competitors without metrics
      const updatedCompetitors: CompetitorData[] = [];
      for (const competitor of mappedCompetitors) {
        if (!competitor.metrics || Object.keys(competitor.metrics).length === 0) {
          console.log(`[CompetitorAnalysisService] Updating metrics for competitor: ${competitor.url}`);
          if (competitor.id) {
            const updatedCompetitor = await this.recalculateCompetitorMetrics(competitor.id);
            if (updatedCompetitor) {
              updatedCompetitors.push(updatedCompetitor);
            } else {
              updatedCompetitors.push(competitor);
            }
          } else {
            console.log(`[CompetitorAnalysisService] Skipping metrics update for competitor with no ID: ${competitor.url}`);
            updatedCompetitors.push(competitor);
          }
        } else {
          updatedCompetitors.push(competitor);
        }
      }
      
      // Get the content page from the database using enhanced flexible matching
      let contentPage;
      
      // Use our new flexible URL finder
      const contentPageMatch = await this.findContentPageByUrl(normalizedUrl);
      
      if (contentPageMatch) {
        contentPage = contentPageMatch.contentPage;
        
        if (!contentPageMatch.exact) {
          console.log(`[CompetitorAnalysisService] Found similar content page: ${contentPage.url} (not exact match)`);
        } else {
          console.log(`[CompetitorAnalysisService] Found exact content page match: ${contentPage.title}`);
        }
      } else {
        // Create a fallback content page if none found
        console.log(`[CompetitorAnalysisService] Content page not found for URL: ${normalizedUrl}, creating fallback content object`);
        contentPage = {
          id: null,
          url: normalizedUrl,
          title: normalizedUrl.split('/').pop() || normalizedUrl,
          content: '',
          keywords: [],
          metrics: {
            wordCount: 0,
            readabilityScore: 0,
            keywordDensity: 0
          }
        };
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
          description: 'Add fundamental page content to match competitors',
          relevance: '80',
          suggestedImplementation: 'Create content that includes key information found on competitor pages',
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
          description: 'Content is significantly shorter than competitor average',
          relevance: '90',
          suggestedImplementation: 'Add more comprehensive information to increase content length',
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
          description: 'An error occurred during the competitive analysis',
          relevance: '0',
          suggestedImplementation: 'Try refreshing the page or analyzing again later',
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
      const systemPrompt = `You are an expert SEO competitive analyst. Analyze the main content and competitor content 
      to identify content gaps, keyword gaps, competitive advantages, and disadvantages. Provide strategic recommendations.
      Format your response as detailed JSON.`;
      
      const userPrompt = `
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
              "description": "Detailed description of what competitors cover that is missing in main content",
              "relevance": 90, 
              "suggestedImplementation": "Specific suggestions on how to implement this topic",
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
        
        Only return valid JSON, no other text or explanations.
      `;
      
      // Use centralized liteLLMProvider to send the request
      console.log(`[CompetitorAnalysisService] Getting LangChain model from liteLLMProvider`);
      
      // Get model from centralized provider
      const model = await liteLLMProvider.getLangChainModel();
      llmModel = model.modelName;
      
      console.log(`[CompetitorAnalysisService] Using model: ${llmModel}`);
      
      // Create messages for the model
      const systemMessage = new SystemMessage(systemPrompt);
      const userMessage = new HumanMessage(userPrompt);
      
      // Call the model with the messages
      const response = await model.invoke([systemMessage, userMessage]);
      
      usedLLM = true;
      
      // Process the response
      let result;
      if (response && response.content) {
        const text = typeof response.content === 'string' 
          ? response.content 
          : JSON.stringify(response.content);
        
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
        description: gap.description || `Content gap identified related to ${gap.topic}`,
        relevance: typeof gap.relevance === 'number' ? String(gap.relevance) : gap.relevance || '50',
        suggestedImplementation: gap.suggestedImplementation || gap.implementation || `Add more comprehensive information about ${gap.topic}`,
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
      console.log(`[CompetitorAnalysisService] Scraping content from ${url} (length: ${url.length})`);
      
      // Normalize URL to ensure it's valid
      const normalizedUrl = this.normalizeUrl(url);
      console.log(`[CompetitorAnalysisService] Using normalized URL: ${normalizedUrl}`);
      
      // Set up fetch options with headers and timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout
      
      const fetchOptions = {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 SEOMax Content Analyzer',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive',
        },
        signal: controller.signal
      };
      
      // Simple fetch-based scraper
      const response = await fetch(normalizedUrl, fetchOptions)
        .catch(error => {
          if (error.name === 'AbortError') {
            console.error(`[CompetitorAnalysisService] Request timeout after 30 seconds: ${normalizedUrl}`);
          }
          throw error;
        })
        .finally(() => {
          clearTimeout(timeoutId);
        });
      
      if (!response || !response.ok) {
        console.error(`[CompetitorAnalysisService] Failed to fetch URL: ${normalizedUrl}, status: ${response?.status || 'unknown'}`);
        return null;
      }
      
      // Check content type to ensure it's HTML
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
        console.warn(`[CompetitorAnalysisService] Non-HTML content type: ${contentType} for URL: ${normalizedUrl}`);
        // Continue anyway, but log the warning
      }
      
      // Get the HTML content
      const html = await response.text();
      
      if (!html || html.length < 100) {
        console.error(`[CompetitorAnalysisService] Empty or very small HTML response: ${html.length} chars`);
        return null;
      }
      
      console.log(`[CompetitorAnalysisService] Successfully scraped content, HTML size: ${html.length} bytes`);
      
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
      const originalLength = content.length;
      if (content.length > 10000) {
        content = content.substring(0, 10000) + '...';
        console.log(`[CompetitorAnalysisService] Content truncated from ${originalLength} to 10000 chars`);
      }
      
      return { 
        title, 
        content, 
        htmlContent: html.length > 100000 ? html.substring(0, 100000) + '...' : html // Limit HTML size as well
      };
    } catch (error) {
      console.error(`[CompetitorAnalysisService] Error scraping content from ${url}:`, error);
      return null;
    }
  }

  /**
   * Debug function to validate URL storage in the database
   * Use this to check if URLs are being stored correctly
   */
  static async validateUrlStorage(url: string): Promise<{
    originalUrl: string;
    normalizedUrl: string;
    storedUrl: string | null;
    matchesExactly: boolean;
    matchesNormalized: boolean;
    urlLength: number;
    normalizedLength: number;
    storageError: string | null;
  }> {
    console.log(`[CompetitorAnalysisService] Validating URL storage for: ${url}`);
    
    // Normalize the URL
    const normalizedUrl = this.normalizeUrl(url);
    
    // Use admin client for direct database access
    const adminClient = createAdminClient();
    
    // Check if it exists in the database
    const { data, error } = await adminClient
      .from('content_pages')
      .select('url')
      .eq('url', normalizedUrl)
      .maybeSingle();
    
    const storedUrl = data?.url || null;
    
    // Also try with the original URL if normalized is different
    let exactMatchData = null;
    if (url !== normalizedUrl) {
      const { data: exactData } = await adminClient
        .from('content_pages')
        .select('url')
        .eq('url', url)
        .maybeSingle();
      
      exactMatchData = exactData;
    }
    
    const result = {
      originalUrl: url,
      normalizedUrl: normalizedUrl,
      storedUrl: storedUrl || (exactMatchData?.url || null),
      matchesExactly: (exactMatchData?.url === url) || (storedUrl === url),
      matchesNormalized: storedUrl === normalizedUrl,
      urlLength: url.length,
      normalizedLength: normalizedUrl.length,
      storageError: error ? error.message : null
    };
    
    console.log(`[CompetitorAnalysisService] URL validation result:`, result);
    
    return result;
  }
} 