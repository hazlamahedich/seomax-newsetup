import { createClient } from '@/lib/supabase/client';
import * as cheerio from 'cheerio';
import { URL } from 'url';

export interface InternalLinkingAnalysisResult {
  siteCrawlId: string;
  totalPages: number;
  totalInternalLinks: number;
  averageLinksPerPage: number;
  orphanedPages: InternalLinkPage[];
  mostLinkedPages: InternalLinkPage[];
  leastLinkedPages: InternalLinkPage[];
  brokenInternalLinks: BrokenInternalLink[];
  keyPageAnalysis: KeyPageLinkAnalysis[];
  linkDistributionScore: number;
  linkDepthAnalysis: Record<number, number>;
  improvementSuggestions: string[];
}

export interface InternalLinkPage {
  pageId: string;
  url: string;
  title: string;
  incomingLinks: number;
  outgoingLinks: number;
}

export interface BrokenInternalLink {
  sourceUrl: string;
  targetUrl: string;
  linkText: string;
  statusCode: number;
}

export interface KeyPageLinkAnalysis {
  pageId: string;
  url: string;
  title: string;
  isPriority: boolean;
  incomingLinks: number;
  pageImportance: string;
  linkedFrom: string[];
}

export class InternalLinkingAnalyzerService {
  private static supabase = createClient();

  /**
   * Analyze internal linking structure for a site crawl
   */
  static async analyzeInternalLinking(siteCrawlId: string): Promise<InternalLinkingAnalysisResult> {
    try {
      // Get all crawled pages for this site
      const { data: pages, error } = await this.supabase
        .from('crawled_pages')
        .select('id, url, title, html_content, js_rendered_html, status_code, depth')
        .eq('site_crawl_id', siteCrawlId);
      
      if (error) throw error;
      
      if (!pages || pages.length === 0) {
        return this.createEmptyAnalysisResult(siteCrawlId);
      }
      
      // Get the site's domain from the first page
      let siteDomain = '';
      try {
        const firstPageUrl = new URL(pages[0].url);
        siteDomain = firstPageUrl.hostname;
      } catch (e) {
        console.error('Error parsing URL:', e);
      }
      
      // Create a map of pages by URL for quick lookup
      const pageMap = new Map();
      pages.forEach(page => {
        pageMap.set(page.url, {
          id: page.id,
          url: page.url,
          title: page.title || page.url,
          status: page.status_code,
          depth: page.depth || 0,
          incomingLinks: 0,
          outgoingLinks: 0,
          incomingLinkSources: new Set(),
          outgoingLinkTargets: new Set()
        });
      });
      
      // Track broken internal links
      const brokenLinks: BrokenInternalLink[] = [];
      
      // Analyze links on each page
      for (const page of pages) {
        const pageData = pageMap.get(page.url);
        const content = page.js_rendered_html || page.html_content;
        
        if (!content) continue;
        
        // Parse HTML
        const $ = cheerio.load(content);
        
        // Find all links
        $('a[href]').each((_, link) => {
          const href = $(link).attr('href') || '';
          const linkText = $(link).text().trim();
          
          try {
            // Normalize URL
            const resolvedUrl = new URL(href, page.url).href;
            const linkUrl = new URL(resolvedUrl);
            
            // Check if this is an internal link (same domain)
            if (linkUrl.hostname === siteDomain) {
              // Remove hash and search params for page identification
              const cleanUrl = `${linkUrl.protocol}//${linkUrl.hostname}${linkUrl.pathname}`;
              
              // Track outgoing link from current page
              pageData.outgoingLinks++;
              pageData.outgoingLinkTargets.add(cleanUrl);
              
              // Check if target page exists in our crawl
              const targetPage = pageMap.get(cleanUrl);
              if (targetPage) {
                // Track incoming link to target page
                targetPage.incomingLinks++;
                targetPage.incomingLinkSources.add(page.url);
              } else {
                // This might be a broken internal link if not in our crawl
                if (!resolvedUrl.includes('#') && !href.startsWith('mailto:')) {
                  brokenLinks.push({
                    sourceUrl: page.url,
                    targetUrl: cleanUrl,
                    linkText,
                    statusCode: 404 // Assuming 404 if not in our crawl
                  });
                }
              }
            }
          } catch (e) {
            // Skip invalid URLs
          }
        });
      }
      
      // Calculate total internal links
      const totalInternalLinks = Array.from(pageMap.values())
        .reduce((sum, page) => sum + page.outgoingLinks, 0);
      
      // Calculate average links per page
      const averageLinksPerPage = Math.round(totalInternalLinks / pages.length * 10) / 10;
      
      // Identify orphaned pages (no incoming links)
      const orphanedPages = Array.from(pageMap.values())
        .filter(page => page.incomingLinks === 0)
        .map(page => ({
          pageId: page.id,
          url: page.url,
          title: page.title,
          incomingLinks: 0,
          outgoingLinks: page.outgoingLinks
        }));
      
      // Identify most linked pages
      const mostLinkedPages = Array.from(pageMap.values())
        .sort((a, b) => b.incomingLinks - a.incomingLinks)
        .slice(0, 10)
        .map(page => ({
          pageId: page.id,
          url: page.url,
          title: page.title,
          incomingLinks: page.incomingLinks,
          outgoingLinks: page.outgoingLinks
        }));
      
      // Identify least linked pages (excluding orphaned)
      const leastLinkedPages = Array.from(pageMap.values())
        .filter(page => page.incomingLinks > 0)
        .sort((a, b) => a.incomingLinks - b.incomingLinks)
        .slice(0, 10)
        .map(page => ({
          pageId: page.id,
          url: page.url,
          title: page.title,
          incomingLinks: page.incomingLinks,
          outgoingLinks: page.outgoingLinks
        }));
      
      // Analyze key pages (homepage, category pages, etc.)
      const keyPageAnalysis = this.analyzeKeyPages(pageMap);
      
      // Analyze link depth distribution
      const linkDepthAnalysis: Record<number, number> = {};
      Array.from(pageMap.values()).forEach(page => {
        const depth = page.depth || 0;
        linkDepthAnalysis[depth] = (linkDepthAnalysis[depth] || 0) + 1;
      });
      
      // Calculate link distribution score
      const linkDistributionScore = this.calculateLinkDistributionScore(
        pageMap,
        orphanedPages.length,
        brokenLinks.length
      );
      
      // Generate improvement suggestions
      const improvementSuggestions = this.generateImprovementSuggestions(
        orphanedPages.length,
        brokenLinks.length,
        linkDistributionScore,
        pages.length
      );
      
      // Store analysis results
      await this.storeAnalysisResults(siteCrawlId, {
        siteCrawlId,
        totalPages: pages.length,
        totalInternalLinks,
        averageLinksPerPage,
        orphanedPages,
        mostLinkedPages,
        leastLinkedPages,
        brokenInternalLinks: brokenLinks,
        keyPageAnalysis,
        linkDistributionScore,
        linkDepthAnalysis,
        improvementSuggestions
      });
      
      return {
        siteCrawlId,
        totalPages: pages.length,
        totalInternalLinks,
        averageLinksPerPage,
        orphanedPages,
        mostLinkedPages,
        leastLinkedPages,
        brokenInternalLinks: brokenLinks,
        keyPageAnalysis,
        linkDistributionScore,
        linkDepthAnalysis,
        improvementSuggestions
      };
    } catch (error) {
      console.error('Error analyzing internal linking:', error);
      return this.createEmptyAnalysisResult(siteCrawlId);
    }
  }

  /**
   * Analyze key pages for internal linking
   */
  private static analyzeKeyPages(pageMap: Map<string, any>): KeyPageLinkAnalysis[] {
    const keyPages: KeyPageLinkAnalysis[] = [];
    
    // Identify homepage
    let homepage: any = null;
    for (const [url, page] of pageMap.entries()) {
      const parsedUrl = new URL(url);
      // Check if this is likely the homepage
      if (parsedUrl.pathname === '/' || parsedUrl.pathname === '/index.html') {
        homepage = page;
        break;
      }
    }
    
    // Add homepage to key pages if found
    if (homepage) {
      keyPages.push({
        pageId: homepage.id,
        url: homepage.url,
        title: homepage.title,
        isPriority: true,
        incomingLinks: homepage.incomingLinks,
        pageImportance: 'Homepage',
        linkedFrom: Array.from(homepage.incomingLinkSources)
      });
    }
    
    // Identify other key pages (based on structure and links)
    for (const page of pageMap.values()) {
      // Skip homepage
      if (page === homepage) continue;
      
      // Identify likely category pages
      const url = new URL(page.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      
      // Check if this is a first-level page
      if (pathParts.length === 1 && !pathParts[0].includes('.')) {
        keyPages.push({
          pageId: page.id,
          url: page.url,
          title: page.title,
          isPriority: true,
          incomingLinks: page.incomingLinks,
          pageImportance: 'Category Page',
          linkedFrom: Array.from(page.incomingLinkSources)
        });
      }
      
      // Include pages with many incoming links (hubs)
      if (page.incomingLinks > 10) {
        // Only add if not already in key pages
        if (!keyPages.some(kp => kp.pageId === page.id)) {
          keyPages.push({
            pageId: page.id,
            url: page.url,
            title: page.title,
            isPriority: page.incomingLinks > 20,
            incomingLinks: page.incomingLinks,
            pageImportance: 'Hub Page',
            linkedFrom: Array.from(page.incomingLinkSources)
          });
        }
      }
    }
    
    return keyPages;
  }

  /**
   * Calculate link distribution score
   */
  private static calculateLinkDistributionScore(
    pageMap: Map<string, any>,
    orphanedPageCount: number,
    brokenLinkCount: number
  ): number {
    // Start with perfect score
    let score = 100;
    
    // Get all pages as array
    const pages = Array.from(pageMap.values());
    const totalPages = pages.length;
    
    // Calculate incoming link distribution (Gini coefficient-like approach)
    const incomingLinkCounts = pages.map(page => page.incomingLinks);
    const totalIncomingLinks = incomingLinkCounts.reduce((sum, count) => sum + count, 0);
    
    if (totalIncomingLinks > 0) {
      // Sort incoming link counts
      incomingLinkCounts.sort((a, b) => a - b);
      
      // Calculate cumulative sums
      let cumulativeSum = 0;
      const cumulativeSums = incomingLinkCounts.map(count => {
        cumulativeSum += count;
        return cumulativeSum;
      });
      
      // Calculate Gini coefficient (0 = perfect equality, 1 = perfect inequality)
      let giniSum = 0;
      for (let i = 0; i < cumulativeSums.length; i++) {
        giniSum += (i + 1) * incomingLinkCounts[i];
      }
      
      const gini = (2 * giniSum) / (totalPages * totalIncomingLinks) - (totalPages + 1) / totalPages;
      
      // Deduct based on inequality (more inequality = lower score)
      score -= Math.round(gini * 25);
    }
    
    // Deduct for orphaned pages
    const orphanedPagePercentage = (orphanedPageCount / totalPages) * 100;
    if (orphanedPagePercentage > 0) {
      if (orphanedPagePercentage > 30) {
        score -= 30;
      } else if (orphanedPagePercentage > 20) {
        score -= 20;
      } else if (orphanedPagePercentage > 10) {
        score -= 10;
      } else if (orphanedPagePercentage > 5) {
        score -= 5;
      }
    }
    
    // Deduct for broken internal links
    if (brokenLinkCount > 0) {
      if (brokenLinkCount > 20) {
        score -= 20;
      } else if (brokenLinkCount > 10) {
        score -= 15;
      } else if (brokenLinkCount > 5) {
        score -= 10;
      } else {
        score -= 5;
      }
    }
    
    // Ensure score stays within 0-100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate improvement suggestions based on analysis
   */
  private static generateImprovementSuggestions(
    orphanedPageCount: number,
    brokenLinkCount: number,
    linkDistributionScore: number,
    totalPages: number
  ): string[] {
    const suggestions: string[] = [];
    
    // Orphaned pages
    if (orphanedPageCount > 0) {
      if (orphanedPageCount === 1) {
        suggestions.push('Add internal links to 1 orphaned page with no incoming links');
      } else {
        suggestions.push(`Add internal links to ${orphanedPageCount} orphaned pages with no incoming links`);
      }
    }
    
    // Broken links
    if (brokenLinkCount > 0) {
      if (brokenLinkCount === 1) {
        suggestions.push('Fix 1 broken internal link');
      } else {
        suggestions.push(`Fix ${brokenLinkCount} broken internal links`);
      }
    }
    
    // Link distribution
    if (linkDistributionScore < 70) {
      suggestions.push('Improve internal linking structure to distribute link equity more evenly');
    }
    
    // General suggestions
    if (totalPages > 20) {
      suggestions.push('Create a clear hierarchical structure with proper internal linking');
    }
    
    suggestions.push('Ensure important pages receive more internal links');
    suggestions.push('Use descriptive anchor text for internal links');
    suggestions.push('Add contextual links within content where relevant');
    
    if (totalPages > 50) {
      suggestions.push('Consider creating a sitemap page for users');
    }
    
    return suggestions;
  }

  /**
   * Create empty analysis result for sites with no pages
   */
  private static createEmptyAnalysisResult(siteCrawlId: string): InternalLinkingAnalysisResult {
    return {
      siteCrawlId,
      totalPages: 0,
      totalInternalLinks: 0,
      averageLinksPerPage: 0,
      orphanedPages: [],
      mostLinkedPages: [],
      leastLinkedPages: [],
      brokenInternalLinks: [],
      keyPageAnalysis: [],
      linkDistributionScore: 0,
      linkDepthAnalysis: {},
      improvementSuggestions: ['No pages available for internal linking analysis']
    };
  }

  /**
   * Store analysis results in database
   */
  private static async storeAnalysisResults(
    siteCrawlId: string,
    result: InternalLinkingAnalysisResult
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('internal_linking_analysis')
        .insert({
          site_crawl_id: siteCrawlId,
          total_pages: result.totalPages,
          total_internal_links: result.totalInternalLinks,
          average_links_per_page: result.averageLinksPerPage,
          orphaned_pages: result.orphanedPages,
          most_linked_pages: result.mostLinkedPages,
          least_linked_pages: result.leastLinkedPages,
          broken_internal_links: result.brokenInternalLinks,
          key_page_analysis: result.keyPageAnalysis,
          link_distribution_score: result.linkDistributionScore,
          link_depth_analysis: result.linkDepthAnalysis,
          improvement_suggestions: result.improvementSuggestions
        });
      
      if (error) {
        console.error('Error storing internal linking analysis:', error);
      }
    } catch (error) {
      console.error('Error in storeAnalysisResults:', error);
    }
  }

  /**
   * Get the latest internal linking analysis for a site crawl
   */
  static async getInternalLinkingAnalysis(siteCrawlId: string): Promise<InternalLinkingAnalysisResult | null> {
    try {
      const { data, error } = await this.supabase
        .from('internal_linking_analysis')
        .select('*')
        .eq('site_crawl_id', siteCrawlId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        return null;
      }
      
      return {
        siteCrawlId: data[0].site_crawl_id,
        totalPages: data[0].total_pages,
        totalInternalLinks: data[0].total_internal_links,
        averageLinksPerPage: data[0].average_links_per_page,
        orphanedPages: data[0].orphaned_pages || [],
        mostLinkedPages: data[0].most_linked_pages || [],
        leastLinkedPages: data[0].least_linked_pages || [],
        brokenInternalLinks: data[0].broken_internal_links || [],
        keyPageAnalysis: data[0].key_page_analysis || [],
        linkDistributionScore: data[0].link_distribution_score,
        linkDepthAnalysis: data[0].link_depth_analysis || {},
        improvementSuggestions: data[0].improvement_suggestions || []
      };
    } catch (error) {
      console.error('Error getting internal linking analysis:', error);
      return null;
    }
  }
} 