import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { createClient } from '@/lib/supabase/client';

export interface LighthouseMetrics {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa: number;
  firstContentfulPaint: number;
  speedIndex: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  totalBlockingTime: number;
  cumulativeLayoutShift: number;
}

export interface LighthouseAudit {
  id: string;
  siteCrawlId: string;
  pageId: string;
  url: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa: number;
  firstContentfulPaint: number;
  speedIndex: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  totalBlockingTime: number;
  cumulativeLayoutShift: number;
  rawData?: string;
  createdAt: string;
}

/**
 * Service for running Lighthouse audits on web pages
 */
export class LighthouseService {
  private static supabase = createClient();
  
  /**
   * Run a Lighthouse audit on a single URL and store the results
   * @param siteCrawlId - The crawl session ID
   * @param pageId - The ID of the crawled page
   * @param url - The URL to audit
   * @param options - Lighthouse configuration options
   */
  static async auditUrl(
    siteCrawlId: string,
    pageId: string,
    url: string,
    options: {
      device?: 'mobile' | 'desktop';
      categories?: Array<'performance' | 'accessibility' | 'best-practices' | 'seo' | 'pwa'>;
      throttling?: {
        cpuSlowdownMultiplier?: number;
        downloadThroughputKbps?: number;
        uploadThroughputKbps?: number;
      };
    } = {}
  ): Promise<LighthouseAudit | null> {
    try {
      const {
        device = 'mobile',
        categories = ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
        throttling = {
          cpuSlowdownMultiplier: 4,
          downloadThroughputKbps: 1600,
          uploadThroughputKbps: 750,
        }
      } = options;
      
      // Launch Chrome
      const chrome = await launch({
        chromeFlags: ['--headless', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage']
      });
      
      // Configure Lighthouse options
      const lighthouseOptions = {
        logLevel: 'info',
        output: 'json',
        port: chrome.port,
        formFactor: device,
        screenEmulation: device === 'mobile' ? {
          mobile: true,
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
          disabled: false,
        } : {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false,
        },
        throttling: device === 'mobile' ? {
          cpuSlowdownMultiplier: throttling.cpuSlowdownMultiplier,
          requestLatencyMs: 150,
          downloadThroughputKbps: throttling.downloadThroughputKbps,
          uploadThroughputKbps: throttling.uploadThroughputKbps,
        } : {
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
        },
        onlyCategories: categories,
      };
      
      try {
        // Run Lighthouse audit
        const result = await lighthouse(url, lighthouseOptions);
        
        // Extract metrics from the audit
        const lhr = result?.lhr;
        
        if (!lhr) {
          throw new Error('Lighthouse failed to return results');
        }
        
        // Get performance metrics
        const metrics: LighthouseMetrics = {
          performance: lhr.categories.performance?.score * 100 || 0,
          accessibility: lhr.categories.accessibility?.score * 100 || 0,
          bestPractices: lhr.categories['best-practices']?.score * 100 || 0,
          seo: lhr.categories.seo?.score * 100 || 0,
          pwa: lhr.categories.pwa?.score * 100 || 0,
          
          // Core Web Vitals and other metrics
          firstContentfulPaint: lhr.audits['first-contentful-paint']?.numericValue || 0,
          speedIndex: lhr.audits['speed-index']?.numericValue || 0,
          largestContentfulPaint: lhr.audits['largest-contentful-paint']?.numericValue || 0,
          timeToInteractive: lhr.audits['interactive']?.numericValue || 0,
          totalBlockingTime: lhr.audits['total-blocking-time']?.numericValue || 0,
          cumulativeLayoutShift: lhr.audits['cumulative-layout-shift']?.numericValue || 0,
        };
        
        // Store audit result in database
        const auditData: Omit<LighthouseAudit, 'id'> = {
          siteCrawlId,
          pageId,
          url,
          ...metrics,
          rawData: JSON.stringify(lhr),
          createdAt: new Date().toISOString(),
        };
        
        const { data: storedAudit, error } = await this.supabase
          .from('lighthouse_audits')
          .insert(auditData)
          .select()
          .single();
          
        if (error) throw error;
        
        return storedAudit as LighthouseAudit;
      } finally {
        // Always kill Chrome
        await chrome.kill();
      }
    } catch (error) {
      console.error(`Error running Lighthouse audit for ${url}:`, error);
      return null;
    }
  }
  
  /**
   * Run Lighthouse audits on multiple pages from a site crawl
   * @param siteCrawlId - The ID of the site crawl
   * @param limit - Maximum number of pages to audit (defaults to 5 to prevent rate limiting)
   */
  static async auditCrawledPages(siteCrawlId: string, limit = 5): Promise<number> {
    try {
      // Get pages from the crawl
      const { data: pages, error } = await this.supabase
        .from('crawled_pages')
        .select('id, url, status_code')
        .eq('site_crawl_id', siteCrawlId)
        .eq('status_code', 200) // Only audit pages that returned 200 OK
        .limit(limit);
        
      if (error) throw error;
      
      if (!pages || pages.length === 0) {
        return 0;
      }
      
      // Audit each page sequentially to avoid overloading
      let successCount = 0;
      
      for (const page of pages) {
        const audit = await this.auditUrl(siteCrawlId, page.id, page.url);
        
        if (audit) {
          successCount++;
          
          // Wait between audits to prevent rate limiting
          if (successCount < pages.length) {
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }
      
      return successCount;
    } catch (error) {
      console.error('Error auditing crawled pages:', error);
      return 0;
    }
  }
  
  /**
   * Get the results of all Lighthouse audits for a site crawl
   */
  static async getAuditsForCrawl(siteCrawlId: string): Promise<LighthouseAudit[]> {
    try {
      const { data, error } = await this.supabase
        .from('lighthouse_audits')
        .select('*')
        .eq('site_crawl_id', siteCrawlId);
        
      if (error) throw error;
      
      return data as LighthouseAudit[];
    } catch (error) {
      console.error('Error getting Lighthouse audits:', error);
      return [];
    }
  }
  
  /**
   * Calculate average performance metrics for a site crawl
   */
  static async calculateAverageMetrics(siteCrawlId: string): Promise<Partial<LighthouseMetrics> | null> {
    try {
      const audits = await this.getAuditsForCrawl(siteCrawlId);
      
      if (audits.length === 0) {
        return null;
      }
      
      // Calculate average scores
      const avgMetrics: Partial<LighthouseMetrics> = {
        performance: 0,
        accessibility: 0,
        bestPractices: 0,
        seo: 0,
        pwa: 0,
        firstContentfulPaint: 0,
        speedIndex: 0,
        largestContentfulPaint: 0,
        timeToInteractive: 0,
        totalBlockingTime: 0,
        cumulativeLayoutShift: 0,
      };
      
      // Sum all metrics
      for (const audit of audits) {
        avgMetrics.performance! += audit.performance;
        avgMetrics.accessibility! += audit.accessibility;
        avgMetrics.bestPractices! += audit.bestPractices;
        avgMetrics.seo! += audit.seo;
        avgMetrics.pwa! += audit.pwa;
        avgMetrics.firstContentfulPaint! += audit.firstContentfulPaint;
        avgMetrics.speedIndex! += audit.speedIndex;
        avgMetrics.largestContentfulPaint! += audit.largestContentfulPaint;
        avgMetrics.timeToInteractive! += audit.timeToInteractive;
        avgMetrics.totalBlockingTime! += audit.totalBlockingTime;
        avgMetrics.cumulativeLayoutShift! += audit.cumulativeLayoutShift;
      }
      
      // Calculate averages
      const count = audits.length;
      Object.keys(avgMetrics).forEach(key => {
        avgMetrics[key as keyof LighthouseMetrics] = avgMetrics[key as keyof LighthouseMetrics]! / count;
      });
      
      return avgMetrics;
    } catch (error) {
      console.error('Error calculating average metrics:', error);
      return null;
    }
  }
} 