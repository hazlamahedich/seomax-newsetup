import { createClient } from '@/lib/supabase/client';
import { GradingSystemService } from './GradingSystemService';

export interface BacklinkData {
  sourceDomain: string;
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  linkType: 'dofollow' | 'nofollow' | 'ugc' | 'sponsored';
  domainAuthority: number;
  pageAuthority: number;
  firstSeen: string;
  lastSeen: string;
}

export interface BacklinkMetrics {
  totalBacklinks: number;
  uniqueDomains: number;
  dofollowLinks: number;
  nofollowLinks: number;
  averageDomainAuthority: number;
  educationalBacklinks: number;
  governmentBacklinks: number;
  topAnchorTexts: Array<{ text: string; count: number }>;
  quality: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface BacklinkAnalysis {
  siteId: string;
  url: string;
  metrics: BacklinkMetrics;
  topBacklinks: BacklinkData[];
  highValueBacklinks: {
    educational: BacklinkData[];
    government: BacklinkData[];
  };
  competitorComparison?: Array<{
    domain: string;
    totalBacklinks: number;
    uniqueDomains: number;
  }>;
  score: number;
  summary: string;
  recommendations: string[];
  createdAt: string;
}

export interface BacklinkIssue {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  recommendation: string;
  impact: string;
  affectedElements?: string[];
}

/**
 * Service to analyze and evaluate backlinks pointing to a website
 */
export class BacklinkAnalysisService {
  private static supabase = createClient();

  /**
   * Fetch backlink data from multiple sources using a hybrid approach.
   * This method combines internal DB data with external API data if available.
   */
  static async fetchBacklinkData(domain: string): Promise<BacklinkData[]> {
    try {
      // First check if we have recent backlink data in our database
      const { data: cachedData, error: cacheError } = await this.supabase
        .from('backlink_cache')
        .select('*')
        .eq('domain', domain)
        .gt('updated_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Cache for 30 days
      
      if (cachedData && cachedData.length > 0) {
        console.log(`Using cached backlink data for ${domain}`);
        return JSON.parse(cachedData[0].data);
      }
      
      // If no recent cache, fetch from the external API or simulation
      const backlinks = await this.fetchFromExternalSource(domain);
      
      // Store the new data in cache
      await this.supabase
        .from('backlink_cache')
        .upsert({
          domain,
          data: JSON.stringify(backlinks),
          updated_at: new Date().toISOString()
        });
      
      return backlinks;
    } catch (error) {
      console.error('Error fetching backlink data:', error);
      return [];
    }
  }
  
  /**
   * This would connect to actual backlink data providers in production
   * For development, it returns simulated backlink data
   */
  private static async fetchFromExternalSource(domain: string): Promise<BacklinkData[]> {
    try {
      // First try to get data from CommonCrawl
      const commonCrawlBacklinks = await this.fetchFromCommonCrawl(domain);
      
      // If we have enough data from CommonCrawl, return it
      if (commonCrawlBacklinks.length >= 10) {
        console.log(`Found ${commonCrawlBacklinks.length} backlinks from CommonCrawl for ${domain}`);
        return commonCrawlBacklinks;
      }
      
      // If not enough data from CommonCrawl, try additional sources
      console.log(`Not enough backlinks from CommonCrawl for ${domain}, fetching from additional sources`);
      const additionalBacklinks = await this.fetchFromAdditionalSources(domain);
      
      // Combine backlinks from all sources
      const allBacklinks = [...commonCrawlBacklinks, ...additionalBacklinks];
      
      if (allBacklinks.length > 0) {
        return allBacklinks;
      }
      
      // If all else fails, fall back to simulated data
      console.log(`No backlinks found from external sources for ${domain}, using simulated data`);
      return this.generateSimulatedBacklinks(domain);
    } catch (error) {
      console.error('Error fetching data from external sources:', error);
      console.log('Falling back to simulated data');
      return this.generateSimulatedBacklinks(domain);
    }
  }
  
  /**
   * Fetch backlink data from CommonCrawl's open dataset
   */
  private static async fetchFromCommonCrawl(domain: string): Promise<BacklinkData[]> {
    try {
      // CDAPI is a service that provides access to CommonCrawl data
      // We're using their free API endpoint
      const apiUrl = `https://index.commoncrawl.org/CC-MAIN-2023-06-index?url=*.&output=json&fl=url,target&filter=target:${domain}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.warn(`CommonCrawl API returned ${response.status}: ${response.statusText}`);
        return [];
      }
      
      // Parse the response as text first
      const text = await response.text();
      
      // Process each line as a separate JSON object
      const backlinks: BacklinkData[] = [];
      const lines = text.trim().split('\n');
      
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.url && data.target) {
            // Parse source domain from URL
            let sourceDomain = '';
            try {
              const urlObj = new URL(data.url);
              sourceDomain = urlObj.hostname;
            } catch (e) {
              // Invalid URL, skip
              continue;
            }
            
            // Create normalized backlink data object
            const backlink: BacklinkData = {
              sourceDomain,
              sourceUrl: data.url,
              targetUrl: data.target,
              anchorText: data.anchor_text || 'unknown',
              linkType: 'dofollow', // CommonCrawl doesn't provide this info, assuming dofollow by default
              domainAuthority: 0, // Will be populated later
              pageAuthority: 0, // Will be populated later
              firstSeen: new Date().toISOString(), // Using current date as first seen
              lastSeen: new Date().toISOString() // Using current date as last seen
            };
            
            // Add to backlinks array
            backlinks.push(backlink);
          }
        } catch (e) {
          console.warn('Error parsing CommonCrawl data line:', e);
          // Continue with next line
        }
      }
      
      // Enrich backlinks with authority estimates
      return await this.enrichBacklinksWithAuthorityData(backlinks);
    } catch (error) {
      console.error('Error fetching data from CommonCrawl:', error);
      return [];
    }
  }
  
  /**
   * Fetch backlink data from additional free sources
   */
  private static async fetchFromAdditionalSources(domain: string): Promise<BacklinkData[]> {
    // Try to fetch from GitHub's search API to find repositories linking to the domain
    try {
      const githubResponse = await fetch(
        `https://api.github.com/search/code?q=${domain}`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'SEOMax-BacklinkAnalyzer'
          }
        }
      );
      
      if (!githubResponse.ok) {
        console.warn(`GitHub API returned ${githubResponse.status}: ${githubResponse.statusText}`);
        return [];
      }
      
      const githubData = await githubResponse.json();
      
      if (!githubData.items || !Array.isArray(githubData.items)) {
        return [];
      }
      
      const backlinks: BacklinkData[] = [];
      
      for (const item of githubData.items) {
        if (item.html_url && item.repository && item.repository.html_url) {
          const backlink: BacklinkData = {
            sourceDomain: 'github.com',
            sourceUrl: item.html_url,
            targetUrl: `https://${domain}`,
            anchorText: 'github reference',
            linkType: 'dofollow',
            domainAuthority: 95, // GitHub has very high domain authority
            pageAuthority: 70, // GitHub pages typically have good authority
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString()
          };
          
          backlinks.push(backlink);
        }
      }
      
      return backlinks;
    } catch (error) {
      console.error('Error fetching data from GitHub:', error);
      return [];
    }
  }
  
  /**
   * Enrich backlinks with domain and page authority data
   * In a production environment, this would use a paid API like Moz
   * For this implementation, we'll estimate based on domain TLD and size
   */
  private static async enrichBacklinksWithAuthorityData(backlinks: BacklinkData[]): Promise<BacklinkData[]> {
    // Create a set of unique domains to process
    const uniqueDomains = new Set<string>();
    backlinks.forEach(link => uniqueDomains.add(link.sourceDomain));
    
    // Create a map to store domain authority scores
    const domainAuthorityMap = new Map<string, number>();
    
    // Process each unique domain
    for (const domain of uniqueDomains) {
      let authorityScore = 30; // Default middle authority
      
      // Check for educational or government domains
      if (domain.endsWith('.edu')) {
        authorityScore = 80; // Educational domains typically have high authority
      } else if (domain.endsWith('.gov')) {
        authorityScore = 85; // Government domains typically have very high authority
      } else if (domain.endsWith('.org')) {
        authorityScore = 70; // Organizational domains typically have good authority
      } else if (domain === 'github.com' || domain === 'wikipedia.org') {
        authorityScore = 95; // Known high-authority domains
      } else {
        // Try to get a better estimate based on Alexa rank or similar
        try {
          // This would be replaced with a real API call in production
          // For now, we'll just use a random score between 20-60 for most domains
          authorityScore = Math.floor(Math.random() * 40) + 20;
        } catch (error) {
          console.warn(`Couldn't estimate authority for ${domain}, using default`);
        }
      }
      
      // Store in map
      domainAuthorityMap.set(domain, authorityScore);
    }
    
    // Update backlinks with authority data
    return backlinks.map(link => {
      const domainAuthority = domainAuthorityMap.get(link.sourceDomain) || 30;
      // Page authority is typically a bit lower than domain authority
      const pageAuthority = Math.max(10, domainAuthority - Math.floor(Math.random() * 20));
      
      return {
        ...link,
        domainAuthority,
        pageAuthority
      };
    });
  }
  
  /**
   * Generate simulated backlink data for fallback
   */
  private static generateSimulatedBacklinks(domain: string): Promise<BacklinkData[]> {
    // Ensure we have a consistent but different seed for different domains
    const seed = domain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (min: number, max: number) => Math.floor((Math.sin(seed * (Math.random() + 1)) + 1) * (max - min) / 2) + min;
    
    const totalBacklinks = random(20, 200);
    const backlinks: BacklinkData[] = [];
    
    const topLevelDomains = ['.com', '.org', '.net', '.io', '.co', '.us', '.edu', '.gov'];
    const linkTypes: Array<'dofollow' | 'nofollow' | 'ugc' | 'sponsored'> = ['dofollow', 'nofollow', 'ugc', 'sponsored'];
    const anchorTextOptions = [
      domain,
      'click here',
      'read more',
      'website',
      'learn more',
      'great resource',
      'official site',
      domain.split('.')[0], // Domain name without TLD
      'visit site',
      'reference'
    ];
    
    for (let i = 0; i < totalBacklinks; i++) {
      const sourceDomainName = this.generateRandomDomainName();
      const sourceDomain = sourceDomainName + topLevelDomains[random(0, topLevelDomains.length)];
      const sourceUrl = `https://www.${sourceDomain}/path/to/${random(1, 999)}`;
      const targetUrl = `https://${domain}/page-${random(1, 30)}`;
      const anchorText = anchorTextOptions[random(0, anchorTextOptions.length)];
      const linkType = linkTypes[random(0, 100) < 70 ? 0 : random(1, linkTypes.length)]; // 70% dofollow
      const domainAuthority = random(10, 90);
      const pageAuthority = Math.max(10, Math.min(90, domainAuthority + random(-15, 15)));
      
      // Generate random date within the last 2 years
      const now = new Date();
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(now.getFullYear() - 2);
      
      const firstSeenTime = twoYearsAgo.getTime() + random(0, now.getTime() - twoYearsAgo.getTime());
      const firstSeen = new Date(firstSeenTime).toISOString();
      
      // Last seen is between first seen and now
      const lastSeenTime = firstSeenTime + random(0, now.getTime() - firstSeenTime);
      const lastSeen = new Date(lastSeenTime).toISOString();
      
      backlinks.push({
        sourceDomain,
        sourceUrl,
        targetUrl,
        anchorText,
        linkType,
        domainAuthority,
        pageAuthority,
        firstSeen,
        lastSeen
      });
    }
    
    return Promise.resolve(backlinks);
  }
  
  /**
   * Generate a random domain name for simulated backlinks
   */
  private static generateRandomDomainName(): string {
    const prefixes = ['blog', 'news', 'tech', 'digital', 'online', 'my', 'the', 'best', 'top', 'info'];
    const words = ['marketing', 'seo', 'design', 'business', 'health', 'travel', 'food', 'tech', 'sports', 'finance'];
    const suffixes = ['hub', 'spot', 'central', 'zone', 'place', 'world', 'network', 'center', 'guide', 'pro'];
    
    const random = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    
    // 50% chance to include a prefix
    const prefix = Math.random() > 0.5 ? random(prefixes) : '';
    const word = random(words);
    // 30% chance to include a suffix
    const suffix = Math.random() > 0.7 ? random(suffixes) : '';
    
    return (prefix + (prefix ? '-' : '') + word + (suffix ? '-' : '') + suffix).toLowerCase();
  }
  
  /**
   * Analyze backlinks for a domain and save the results
   */
  static async analyzeBacklinks(siteId: string, domain: string): Promise<BacklinkAnalysis> {
    const backlinks = await this.fetchBacklinkData(domain);
    
    // Extract metrics
    const metrics = this.calculateBacklinkMetrics(backlinks);
    
    // Get top backlinks (high authority, dofollow)
    const topBacklinks = this.getTopBacklinks(backlinks);
    
    // Get educational and government backlinks
    const highValueBacklinks = this.getHighValueBacklinks(backlinks);
    
    // Calculate score based on metrics
    const score = this.calculateBacklinkScore(metrics);
    
    // Get relevant issues
    const issues = this.identifyBacklinkIssues(metrics, backlinks);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(issues, metrics);
    
    // Create a summary
    const summary = this.generateSummary(metrics, score);
    
    // Fetch competitor data if available
    const competitorComparison = await this.fetchCompetitorData(domain);
    
    // Create analysis object
    const analysis: BacklinkAnalysis = {
      siteId,
      url: domain,
      metrics,
      topBacklinks,
      highValueBacklinks,
      competitorComparison,
      score,
      summary,
      recommendations,
      createdAt: new Date().toISOString()
    };
    
    // Store the analysis in the database
    await this.storeBacklinkAnalysis(siteId, domain, analysis);
    
    return analysis;
  }
  
  /**
   * Calculate key backlink metrics
   */
  private static calculateBacklinkMetrics(backlinks: BacklinkData[]): BacklinkMetrics {
    // Count unique domains
    const domains = new Set<string>();
    backlinks.forEach(link => domains.add(link.sourceDomain));
    
    // Count by link type
    const dofollowLinks = backlinks.filter(link => link.linkType === 'dofollow').length;
    const nofollowLinks = backlinks.filter(link => link.linkType !== 'dofollow').length;
    
    // Count educational and government backlinks
    const educationalBacklinks = backlinks.filter(link => link.sourceDomain.endsWith('.edu')).length;
    const governmentBacklinks = backlinks.filter(link => link.sourceDomain.endsWith('.gov')).length;
    
    // Calculate average domain authority
    const totalDA = backlinks.reduce((sum, link) => sum + link.domainAuthority, 0);
    const averageDomainAuthority = backlinks.length > 0 ? totalDA / backlinks.length : 0;
    
    // Count anchor texts
    const anchorTextMap = new Map<string, number>();
    backlinks.forEach(link => {
      const count = anchorTextMap.get(link.anchorText) || 0;
      anchorTextMap.set(link.anchorText, count + 1);
    });
    
    // Get top anchor texts
    const topAnchorTexts = Array.from(anchorTextMap.entries())
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Count by quality (based on domain authority)
    const highQuality = backlinks.filter(link => link.domainAuthority >= 70).length;
    const mediumQuality = backlinks.filter(link => link.domainAuthority >= 40 && link.domainAuthority < 70).length;
    const lowQuality = backlinks.filter(link => link.domainAuthority < 40).length;
    
    return {
      totalBacklinks: backlinks.length,
      uniqueDomains: domains.size,
      dofollowLinks,
      nofollowLinks,
      averageDomainAuthority,
      educationalBacklinks,
      governmentBacklinks,
      topAnchorTexts,
      quality: {
        high: highQuality,
        medium: mediumQuality,
        low: lowQuality
      }
    };
  }
  
  /**
   * Select the top backlinks based on authority and type
   */
  private static getTopBacklinks(backlinks: BacklinkData[]): BacklinkData[] {
    return backlinks
      .filter(link => link.linkType === 'dofollow')
      .sort((a, b) => b.domainAuthority - a.domainAuthority)
      .slice(0, 10);
  }
  
  /**
   * Calculate a score for the backlink profile
   */
  private static calculateBacklinkScore(metrics: BacklinkMetrics): number {
    // Base score components
    const quantityScore = this.calculateQuantityScore(metrics.totalBacklinks, metrics.uniqueDomains);
    const qualityScore = this.calculateQualityScore(metrics);
    const diversityScore = this.calculateDiversityScore(metrics);
    const highValueScore = this.calculateHighValueBacklinksScore(metrics);
    
    // Component weights (sum = 1.0)
    const weights = {
      quantity: 0.2,
      quality: 0.35,
      diversity: 0.2,
      highValue: 0.25
    };
    
    // Weighted score calculation
    const score = (
      quantityScore * weights.quantity +
      qualityScore * weights.quality +
      diversityScore * weights.diversity +
      highValueScore * weights.highValue
    );
    
    // Round to a whole number
    return Math.round(score);
  }
  
  /**
   * Calculate a score for the quantity of backlinks
   */
  private static calculateQuantityScore(totalBacklinks: number, uniqueDomains: number): number {
    // Calculate a base score using log scale (diminishing returns for large numbers)
    let baseScore = Math.min(100, Math.log10(totalBacklinks + 1) * 30);
    
    // Boost score if there are many unique domains
    if (uniqueDomains > 50) {
      baseScore = Math.min(100, baseScore + 20);
    } else if (uniqueDomains > 20) {
      baseScore = Math.min(100, baseScore + 10);
    } else if (uniqueDomains > 10) {
      baseScore = Math.min(100, baseScore + 5);
    }
    
    // Penalize if the ratio of backlinks to domains is too high (could indicate spam)
    const backlinksToDomainRatio = totalBacklinks / Math.max(1, uniqueDomains);
    if (backlinksToDomainRatio > 50) {
      baseScore = Math.max(0, baseScore - 30);
    } else if (backlinksToDomainRatio > 20) {
      baseScore = Math.max(0, baseScore - 15);
    } else if (backlinksToDomainRatio > 10) {
      baseScore = Math.max(0, baseScore - 5);
    }
    
    return baseScore;
  }
  
  /**
   * Calculate a score for the quality of backlinks
   */
  private static calculateQualityScore(metrics: BacklinkMetrics): number {
    // Use the distribution of high, medium, and low quality backlinks
    const totalBacklinks = metrics.totalBacklinks;
    if (totalBacklinks === 0) return 0;
    
    // Calculate the percentage of each quality tier
    const highPercent = (metrics.quality.high / totalBacklinks) * 100;
    const mediumPercent = (metrics.quality.medium / totalBacklinks) * 100;
    
    // Weighted score calculation (high quality links are worth more)
    const qualityScore = (highPercent * 0.7) + (mediumPercent * 0.3);
    
    // Account for overall domain authority
    let authorityBonus = 0;
    if (metrics.averageDomainAuthority > 70) {
      authorityBonus = 20;
    } else if (metrics.averageDomainAuthority > 50) {
      authorityBonus = 10;
    } else if (metrics.averageDomainAuthority > 30) {
      authorityBonus = 5;
    }
    
    return Math.min(100, qualityScore + authorityBonus);
  }
  
  /**
   * Calculate a score for the diversity of the backlink profile
   */
  private static calculateDiversityScore(metrics: BacklinkMetrics): number {
    if (metrics.totalBacklinks === 0) return 0;
    
    // Calculate the ratio of unique domains to total backlinks
    const domainDiversityRatio = metrics.uniqueDomains / metrics.totalBacklinks;
    
    // A higher ratio means more diversity (better)
    let diversityScore = Math.min(100, domainDiversityRatio * 100);
    
    // Boost score based on the distribution of dofollow vs nofollow links
    // A healthy profile has mostly dofollow but some nofollow
    const dofollowPercent = (metrics.dofollowLinks / metrics.totalBacklinks) * 100;
    if (dofollowPercent > 95) {
      // Too many dofollow links (could be unnatural)
      diversityScore = Math.max(0, diversityScore - 10);
    } else if (dofollowPercent < 50) {
      // Too many nofollow links (less valuable)
      diversityScore = Math.max(0, diversityScore - 20);
    } else if (dofollowPercent > 70 && dofollowPercent <= 95) {
      // Ideal range
      diversityScore = Math.min(100, diversityScore + 10);
    }
    
    return diversityScore;
  }
  
  /**
   * Identify potential issues with the backlink profile
   */
  private static identifyBacklinkIssues(metrics: BacklinkMetrics, backlinks: BacklinkData[]): BacklinkIssue[] {
    const issues: BacklinkIssue[] = [];
    
    // Check for low overall backlink count
    if (metrics.totalBacklinks < 10) {
      issues.push({
        id: crypto.randomUUID(),
        type: 'low_backlink_count',
        severity: 'high',
        description: `Only ${metrics.totalBacklinks} backlinks detected for the domain.`,
        recommendation: 'Implement a link building strategy to increase quality backlinks.',
        impact: 'Low backlink count limits search visibility and authority.'
      });
    }
    
    // Check for low domain diversity
    if (metrics.uniqueDomains < 5 && metrics.totalBacklinks > 0) {
      issues.push({
        id: crypto.randomUUID(),
        type: 'low_domain_diversity',
        severity: 'medium',
        description: `Backlinks coming from only ${metrics.uniqueDomains} unique domains.`,
        recommendation: 'Focus on acquiring backlinks from a variety of relevant domains.',
        impact: 'Links from diverse domains create a more natural link profile.'
      });
    }
    
    // Check for low average domain authority
    if (metrics.averageDomainAuthority < 20 && metrics.totalBacklinks > 5) {
      issues.push({
        id: crypto.randomUUID(),
        type: 'low_authority_backlinks',
        severity: 'medium',
        description: `Low average domain authority (${Math.round(metrics.averageDomainAuthority)}) for backlinks.`,
        recommendation: 'Focus on acquiring backlinks from more authoritative domains.',
        impact: 'Higher authority backlinks typically transfer more ranking power.'
      });
    }
    
    // Check for lack of educational backlinks
    if (metrics.educationalBacklinks === 0) {
      issues.push({
        id: crypto.randomUUID(),
        type: 'no_edu_backlinks',
        severity: 'low',
        description: 'No backlinks from educational (.edu) domains.',
        recommendation: 'Consider outreach to educational institutions or contribute to educational resources.',
        impact: 'Educational backlinks are highly valuable for domain authority and credibility.'
      });
    }
    
    // Check for lack of government backlinks
    if (metrics.governmentBacklinks === 0) {
      issues.push({
        id: crypto.randomUUID(),
        type: 'no_gov_backlinks',
        severity: 'low',
        description: 'No backlinks from government (.gov) domains.',
        recommendation: 'Consider providing resources that government sites might reference or participate in government initiatives.',
        impact: 'Government backlinks are highly valuable for domain authority and credibility.'
      });
    }
    
    // Check for too many nofollow links
    const nofollowPercent = (metrics.nofollowLinks / metrics.totalBacklinks) * 100;
    if (nofollowPercent > 70 && metrics.totalBacklinks > 10) {
      issues.push({
        id: crypto.randomUUID(),
        type: 'high_nofollow_ratio',
        severity: 'medium',
        description: `${Math.round(nofollowPercent)}% of backlinks are nofollow.`,
        recommendation: 'Focus on acquiring more dofollow links from quality sources.',
        impact: 'Dofollow links pass more SEO value than nofollow links.'
      });
    }
    
    // Check for too many low-quality backlinks
    const lowQualityPercent = (metrics.quality.low / metrics.totalBacklinks) * 100;
    if (lowQualityPercent > 60 && metrics.totalBacklinks > 10) {
      issues.push({
        id: crypto.randomUUID(),
        type: 'high_low_quality_ratio',
        severity: 'high',
        description: `${Math.round(lowQualityPercent)}% of backlinks are from low authority domains.`,
        recommendation: 'Focus on quality over quantity in link building and consider disavowing toxic backlinks.',
        impact: 'Low-quality backlinks can harm your site if they appear manipulative or spammy.'
      });
    }
    
    // Check for over-optimized anchor text
    const anchorTextIssue = this.checkAnchorTextOptimization(metrics.topAnchorTexts);
    if (anchorTextIssue) {
      issues.push(anchorTextIssue);
    }
    
    return issues;
  }
  
  /**
   * Check for over-optimized or unnatural anchor text patterns
   */
  private static checkAnchorTextOptimization(topAnchorTexts: Array<{ text: string; count: number }>): BacklinkIssue | null {
    // Count generic anchor texts like "click here", "read more", etc.
    const genericAnchors = ['click here', 'read more', 'here', 'website', 'link', 'this page'];
    
    let genericCount = 0;
    let exactMatchCount = 0;
    let totalCount = 0;
    
    topAnchorTexts.forEach(({ text, count }) => {
      totalCount += count;
      
      if (genericAnchors.includes(text.toLowerCase())) {
        genericCount += count;
      }
      
      // Check for exact match keyword anchors (this is a simplified check)
      if (text.length > 10 && text === text.toLowerCase() && !text.includes(' and ')) {
        exactMatchCount += count;
      }
    });
    
    // Calculate percentages
    const genericPercent = (genericCount / totalCount) * 100;
    const exactMatchPercent = (exactMatchCount / totalCount) * 100;
    
    // Issue for too many generic anchors
    if (genericPercent > 70) {
      return {
        id: crypto.randomUUID(),
        type: 'generic_anchor_text',
        severity: 'medium',
        description: `${Math.round(genericPercent)}% of anchor text is generic (e.g., "click here").`,
        recommendation: 'Try to acquire more descriptive, contextual anchor text in backlinks.',
        impact: 'Descriptive anchor text helps search engines understand what your pages are about.'
      };
    }
    
    // Issue for too many exact match anchors (possible over-optimization)
    if (exactMatchPercent > 30) {
      return {
        id: crypto.randomUUID(),
        type: 'over_optimized_anchor_text',
        severity: 'medium',
        description: `${Math.round(exactMatchPercent)}% of anchor text appears to be exact match keywords.`,
        recommendation: 'Maintain a more natural anchor text distribution to avoid over-optimization penalties.',
        impact: 'Over-optimized anchor text can trigger spam filters in search algorithms.'
      };
    }
    
    return null;
  }
  
  /**
   * Generate actionable recommendations based on issues
   */
  private static generateRecommendations(issues: BacklinkIssue[], metrics: BacklinkMetrics): string[] {
    const recommendations: string[] = [];
    
    // Add recommendations based on specific issues
    issues.forEach(issue => {
      recommendations.push(issue.recommendation);
    });
    
    // Add standard recommendations based on metrics
    if (metrics.totalBacklinks < 50) {
      recommendations.push('Develop a comprehensive link building strategy focusing on quality content and outreach.');
    }
    
    if (metrics.educationalBacklinks === 0 && metrics.governmentBacklinks === 0) {
      recommendations.push('Create valuable resources that educational and government sites might reference, such as research studies, comprehensive guides, or data visualizations.');
    } else if (metrics.educationalBacklinks > 0 && metrics.educationalBacklinks < 3) {
      recommendations.push('Expand your educational outreach efforts to gain more .edu backlinks by offering student resources, research partnerships, or educational content.');
    }
    
    if (metrics.uniqueDomains / metrics.totalBacklinks < 0.5 && metrics.totalBacklinks > 20) {
      recommendations.push('Focus on acquiring backlinks from new domains rather than getting more links from the same domains.');
    }
    
    if (metrics.quality.high / metrics.totalBacklinks < 0.3 && metrics.totalBacklinks > 10) {
      recommendations.push('Prioritize quality over quantity by targeting higher authority websites in your link building efforts.');
    }
    
    // Always add this recommendation for best practices
    recommendations.push('Regularly audit your backlink profile to identify and disavow potentially harmful or spammy links.');
    
    // Add educational/government domain specific recommendation if they have some
    if (metrics.educationalBacklinks > 0 || metrics.governmentBacklinks > 0) {
      recommendations.push('Leverage your existing relationships with educational and government domains to acquire additional high-value backlinks.');
    }
    
    // Remove duplicates and limit to top 5 most important
    return [...new Set(recommendations)].slice(0, 7);
  }
  
  /**
   * Generate a human-readable summary of the backlink analysis
   */
  private static generateSummary(metrics: BacklinkMetrics, score: number): string {
    // Get grade based on score
    const grade = GradingSystemService.getGrade(score);
    
    // Generate base summary
    let summary = `Your backlink profile has a grade of ${grade.letter} (${score}/100). `;
    
    // Add details about backlink count and domains
    summary += `Found ${metrics.totalBacklinks} backlinks from ${metrics.uniqueDomains} unique domains. `;
    
    // Add dofollow/nofollow distribution
    const dofollowPercent = Math.round((metrics.dofollowLinks / metrics.totalBacklinks) * 100);
    summary += `${dofollowPercent}% of links are dofollow. `;
    
    // Add information about high-value backlinks
    if (metrics.educationalBacklinks > 0 || metrics.governmentBacklinks > 0) {
      summary += `You have ${metrics.educationalBacklinks} educational and ${metrics.governmentBacklinks} government backlinks, which significantly boost your authority. `;
    } else {
      summary += `No educational or government backlinks were found. These high-value links could greatly improve your authority. `;
    }
    
    // Add quality assessment
    const highQualityPercent = Math.round((metrics.quality.high / metrics.totalBacklinks) * 100);
    if (highQualityPercent > 70) {
      summary += `Your backlink profile has excellent quality with ${highQualityPercent}% high-authority links.`;
    } else if (highQualityPercent > 40) {
      summary += `Your backlink profile has good quality with ${highQualityPercent}% high-authority links.`;
    } else {
      summary += `Your backlink profile could be improved, with only ${highQualityPercent}% high-authority links.`;
    }
    
    return summary;
  }
  
  /**
   * Fetch and compare competitor backlink data
   */
  private static async fetchCompetitorData(domain: string): Promise<Array<{
    domain: string;
    totalBacklinks: number;
    uniqueDomains: number;
  }> | undefined> {
    try {
      // In production, this would fetch real competitor data
      // For development, we'll generate simulated data
      
      // Get domain extension (.com, .org, etc.)
      const extension = domain.substring(domain.lastIndexOf('.'));
      const domainName = domain.substring(0, domain.lastIndexOf('.'));
      
      // Generate competitor domains
      const competitors = [
        domainName + '-competitor1' + extension,
        domainName + '-alternative' + extension,
        'best-' + domainName + extension,
        domainName + '-pro' + extension
      ];
      
      // Get target metrics for comparison
      const targetBacklinks = await this.fetchBacklinkData(domain);
      const targetMetrics = this.calculateBacklinkMetrics(targetBacklinks);
      
      // Generate competitor data around target metrics
      return competitors.map(competitorDomain => {
        // Random variation around target metrics
        const variation = () => Math.random() * 0.5 + 0.75; // 75% to 125% of target
        
        return {
          domain: competitorDomain,
          totalBacklinks: Math.round(targetMetrics.totalBacklinks * variation()),
          uniqueDomains: Math.round(targetMetrics.uniqueDomains * variation())
        };
      });
    } catch (error) {
      console.error('Error fetching competitor data:', error);
      return undefined;
    }
  }
  
  /**
   * Store backlink analysis in database
   */
  private static async storeBacklinkAnalysis(siteId: string, domain: string, analysis: BacklinkAnalysis): Promise<void> {
    try {
      await this.supabase
        .from('backlink_analysis')
        .upsert({
          site_id: siteId,
          domain,
          total_backlinks: analysis.metrics.totalBacklinks,
          unique_domains: analysis.metrics.uniqueDomains,
          average_domain_authority: analysis.metrics.averageDomainAuthority,
          dofollow_ratio: analysis.metrics.dofollowLinks / analysis.metrics.totalBacklinks,
          high_quality_ratio: analysis.metrics.quality.high / analysis.metrics.totalBacklinks,
          score: analysis.score,
          summary: analysis.summary,
          recommendations: analysis.recommendations,
          created_at: new Date().toISOString(),
          full_analysis: analysis
        });
    } catch (error) {
      console.error('Error storing backlink analysis:', error);
    }
  }
  
  /**
   * Get the stored backlink analysis for a domain
   */
  static async getBacklinkAnalysis(siteId: string, domain: string): Promise<BacklinkAnalysis | null> {
    try {
      const { data, error } = await this.supabase
        .from('backlink_analysis')
        .select('full_analysis')
        .eq('site_id', siteId)
        .eq('domain', domain)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error || !data || data.length === 0) {
        return null;
      }
      
      return data[0].full_analysis;
    } catch (error) {
      console.error('Error retrieving backlink analysis:', error);
      return null;
    }
  }
  
  /**
   * Get historical backlink metrics for trend analysis
   */
  static async getHistoricalMetrics(siteId: string, domain: string, limit: number = 6): Promise<Array<{
    date: string;
    totalBacklinks: number;
    uniqueDomains: number;
    averageDomainAuthority: number;
    score: number;
  }>> {
    try {
      const { data, error } = await this.supabase
        .from('backlink_analysis')
        .select('created_at, total_backlinks, unique_domains, average_domain_authority, score')
        .eq('site_id', siteId)
        .eq('domain', domain)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error || !data) {
        return [];
      }
      
      return data.map(item => ({
        date: item.created_at,
        totalBacklinks: item.total_backlinks,
        uniqueDomains: item.unique_domains,
        averageDomainAuthority: item.average_domain_authority,
        score: item.score
      })).reverse(); // Return in chronological order
    } catch (error) {
      console.error('Error retrieving historical backlink metrics:', error);
      return [];
    }
  }

  /**
   * Extract educational and government backlinks and provide detailed analysis
   */
  private static getHighValueBacklinks(backlinks: BacklinkData[]): {
    educational: BacklinkData[];
    government: BacklinkData[];
  } {
    // Get educational backlinks
    const educationalBacklinks = backlinks.filter(link => 
      link.sourceDomain.endsWith('.edu') || 
      link.sourceDomain.includes('university') || 
      link.sourceDomain.includes('college')
    );
    
    // Get government backlinks
    const governmentBacklinks = backlinks.filter(link => 
      link.sourceDomain.endsWith('.gov') || 
      link.sourceDomain.includes('government') || 
      link.sourceDomain.includes('agency')
    );
    
    // Sort by domain authority (highest first)
    const sortByAuthority = (a: BacklinkData, b: BacklinkData) => 
      b.domainAuthority - a.domainAuthority;
    
    return {
      educational: educationalBacklinks.sort(sortByAuthority),
      government: governmentBacklinks.sort(sortByAuthority)
    };
  }

  /**
   * Calculate a score for the educational and government backlinks
   * These are especially valuable for SEO, so we give them extra weight
   */
  private static calculateHighValueBacklinksScore(metrics: BacklinkMetrics): number {
    const totalHighValueLinks = metrics.educationalBacklinks + metrics.governmentBacklinks;
    
    // Even a few .edu or .gov backlinks are valuable
    if (totalHighValueLinks === 0) {
      return 0;
    } else if (totalHighValueLinks === 1) {
      return 20; // One high-value backlink gets a modest score
    } else if (totalHighValueLinks < 5) {
      return 40; // A few high-value backlinks get a good score
    } else if (totalHighValueLinks < 10) {
      return 70; // Several high-value backlinks get a very good score
    } else {
      return 90; // Many high-value backlinks get an excellent score
    }
  }
} 