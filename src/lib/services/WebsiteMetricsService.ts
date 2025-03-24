interface PageMetrics {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  mobile: number;
  loadTime: number;
  ttfb: number;
  lcp: number;
  fid: number;
  cls: number;
  pageSize: number;
  requests: number;
}

interface DomainMetrics {
  domain: string;
  domainAuthority: number;
  organicTraffic: number;
  organicKeywords: number;
  backlinks: number;
  uniqueDomains: number;
  topKeywords: Array<{
    keyword: string;
    position: number;
    volume: number;
  }>;
}

export class WebsiteMetricsService {
  /**
   * Get page performance metrics
   * In a real implementation, this would use Lighthouse/PageSpeed Insights API
   * or other performance measurement tools
   */
  static async getMetrics(url: string): Promise<PageMetrics> {
    try {
      // In a real implementation, we would:
      // 1. Call PageSpeed Insights API or run Lighthouse
      // 2. Parse and process the results
      
      // For this demo, we'll generate simulated metrics
      return this.generateSimulatedMetrics(url);
    } catch (error) {
      console.error(`Error getting metrics for ${url}:`, error);
      return this.getDefaultMetrics();
    }
  }
  
  /**
   * Get domain-level metrics (SEO metrics, traffic, etc.)
   * In a real implementation, this would use third-party APIs
   * like SEMrush, Ahrefs, Moz, etc.
   */
  static async getDomainMetrics(domain: string): Promise<DomainMetrics> {
    try {
      // In a real implementation, we would call APIs to get this data
      
      // For this demo, we'll generate simulated metrics
      return this.generateSimulatedDomainMetrics(domain);
    } catch (error) {
      console.error(`Error getting domain metrics for ${domain}:`, error);
      return this.getDefaultDomainMetrics(domain);
    }
  }
  
  /**
   * Generate simulated page metrics for testing/development
   */
  private static generateSimulatedMetrics(url: string): PageMetrics {
    // Generate a deterministic but seemingly random score based on URL
    const hash = this.simpleHash(url);
    
    // Use the hash to generate values between certain ranges
    const performanceScore = 50 + (hash % 50); // 50-99
    const accessibilityScore = 70 + (hash % 30); // 70-99
    const bestPracticesScore = 60 + (hash % 40); // 60-99
    const seoScore = 75 + (hash % 25); // 75-99
    const mobileScore = 65 + (hash % 35); // 65-99
    
    // Generate performance metrics
    const loadTime = 1 + (hash % 10) / 2; // 1-6 seconds
    const ttfb = 200 + (hash % 800); // 200-999ms
    const lcp = 1.5 + (hash % 5) / 2; // 1.5-4s
    const fid = 50 + (hash % 150); // 50-199ms
    const cls = (hash % 25) / 100; // 0-0.24
    
    // Generate page size and requests
    const pageSize = 500 + (hash % 3000); // 500-3500KB
    const requests = 30 + (hash % 70); // 30-99 requests
    
    return {
      performance: performanceScore,
      accessibility: accessibilityScore,
      bestPractices: bestPracticesScore,
      seo: seoScore,
      mobile: mobileScore,
      loadTime,
      ttfb,
      lcp,
      fid,
      cls,
      pageSize,
      requests
    };
  }
  
  /**
   * Generate simulated domain metrics for testing/development
   */
  private static generateSimulatedDomainMetrics(domain: string): DomainMetrics {
    // Generate a deterministic but seemingly random score based on domain
    const hash = this.simpleHash(domain);
    
    // Generate top keywords
    const topKeywords = [
      'digital marketing',
      'seo services',
      'content marketing',
      'link building',
      'web design',
      'social media marketing',
      'local seo',
      'technical seo',
      'keyword research',
      'competitor analysis'
    ].slice(0, 5 + (hash % 5)).map((keyword, index) => ({
      keyword,
      position: 1 + (hash + index) % 10,
      volume: 1000 + ((hash + index * 100) % 9000)
    }));
    
    return {
      domain,
      domainAuthority: 20 + (hash % 80), // 20-99
      organicTraffic: 1000 + (hash % 99000), // 1k-100k
      organicKeywords: 100 + (hash % 900), // 100-999
      backlinks: 500 + (hash % 9500), // 500-10k
      uniqueDomains: 50 + (hash % 450), // 50-499
      topKeywords
    };
  }
  
  /**
   * Generate a simple hash from a string
   */
  private static simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Get default metrics for when API calls fail
   */
  private static getDefaultMetrics(): PageMetrics {
    return {
      performance: 75,
      accessibility: 85,
      bestPractices: 80,
      seo: 85,
      mobile: 75,
      loadTime: 3.5,
      ttfb: 500,
      lcp: 2.5,
      fid: 100,
      cls: 0.1,
      pageSize: 1500,
      requests: 50
    };
  }
  
  /**
   * Get default domain metrics when API calls fail
   */
  private static getDefaultDomainMetrics(domain: string): DomainMetrics {
    return {
      domain,
      domainAuthority: 30,
      organicTraffic: 5000,
      organicKeywords: 200,
      backlinks: 1000,
      uniqueDomains: 100,
      topKeywords: [
        { keyword: 'default keyword 1', position: 5, volume: 1000 },
        { keyword: 'default keyword 2', position: 8, volume: 800 }
      ]
    };
  }
} 