import puppeteer, { Browser, Page } from 'puppeteer';
import * as cheerio from 'cheerio';
import { createClient } from '@/lib/supabase/client';
import { SiteCrawlerService } from './SiteCrawlerService';
import { TechnicalSEOService } from './TechnicalSEOService';
import { liteLLMProvider } from '@/lib/ai/litellm-provider';
import type { SiteCrawlOptions, CrawledPage } from '@/lib/types/seo';

// Define interfaces for enhanced crawling
interface EnhancedCrawlOptions extends SiteCrawlOptions {
  renderJavaScript: boolean;
  captureScreenshots: boolean;
  waitForSelector?: string;
  waitTime?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  deviceScaleFactor?: number;
  isMobile?: boolean;
}

interface PagePerformanceMetrics {
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  totalBlockingTime: number;
  cumulativeLayoutShift: number;
  speedIndex: number;
}

interface EnhancedPageData extends CrawledPage {
  javascriptRenderedHtml?: string;
  screenshotPath?: string;
  performanceMetrics?: PagePerformanceMetrics;
  domSize?: number;
  resourceCounts?: {
    total: number;
    scripts: number;
    stylesheets: number;
    images: number;
    fonts: number;
    other: number;
  };
  schemaMarkup?: {
    type: string;
    properties: Record<string, any>;
    isValid: boolean;
    missingRequiredProps?: string[];
  }[];
  semanticAnalysis?: {
    mainTopic: string;
    entities: string[];
    keywords: { term: string; relevance: number }[];
    sentimentScore: number;
  };
}

export class EnhancedCrawlerService extends SiteCrawlerService {
  private static supabase = createClient();
  private static browser: Browser | null = null;
  private static readonly MOBILE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1';
  private static readonly DESKTOP_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 SEOMax/1.0';

  /**
   * Initialize browser for JavaScript rendering
   */
  private static async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
    }
    return this.browser;
  }

  /**
   * Close browser instance
   */
  public static async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Create a new enhanced crawl session with JavaScript rendering support
   */
  static async createEnhancedCrawl(projectId: string, userId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('site_crawls')
        .insert({
          project_id: projectId,
          user_id: userId,
          status: 'in_progress',
          is_enhanced: true,
          js_rendering_enabled: true,
        })
        .select()
        .single();

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error creating enhanced site crawl:', error);
      return null;
    }
  }

  /**
   * Start enhanced crawling process with JavaScript rendering
   */
  static async crawlWebsiteEnhanced(
    siteCrawlId: string, 
    startUrl: string, 
    options: EnhancedCrawlOptions = { renderJavaScript: true, captureScreenshots: true }
  ): Promise<boolean> {
    try {
      // Initialize browser if JavaScript rendering is enabled
      if (options.renderJavaScript) {
        await this.initBrowser();
      }
      
      // Continue with standard crawling but use enhanced page processing
      return await super.crawlWebsite(siteCrawlId, startUrl, options);
    } catch (error) {
      console.error('Error in enhanced crawl:', error);
      return false;
    } finally {
      // Ensure browser is closed
      if (options.renderJavaScript) {
        await this.closeBrowser();
      }
    }
  }

  /**
   * Enhanced page crawling with Puppeteer for JavaScript rendering
   */
  static async crawlPageEnhanced(
    url: string, 
    siteCrawlId: string, 
    depth: number, 
    options: EnhancedCrawlOptions
  ): Promise<EnhancedPageData | null> {
    try {
      const {
        renderJavaScript = true,
        captureScreenshots = false,
        waitForSelector,
        waitTime = 5000,
        viewportWidth = 1366,
        viewportHeight = 768,
        deviceScaleFactor = 1,
        isMobile = false,
        userAgent
      } = options;

      // Get basic page data without JavaScript rendering
      const basicPageData = await super.crawlPage(url, siteCrawlId, depth, 
        isMobile ? this.MOBILE_USER_AGENT : userAgent || this.DESKTOP_USER_AGENT);
      
      if (!basicPageData) return null;
      
      const enhancedData: EnhancedPageData = { ...basicPageData };
      
      if (renderJavaScript) {
        // Initialize browser and create new page
        const browser = await this.initBrowser();
        const page = await browser.newPage();
        
        // Configure viewport
        await page.setViewport({
          width: viewportWidth,
          height: viewportHeight,
          deviceScaleFactor,
          isMobile,
        });
        
        // Set user agent
        await page.setUserAgent(
          isMobile ? this.MOBILE_USER_AGENT : userAgent || this.DESKTOP_USER_AGENT
        );
        
        // Enable JavaScript and collect performance metrics
        await page.setJavaScriptEnabled(true);
        
        try {
          // Navigate to URL
          await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
          
          // Wait for specific selector if provided
          if (waitForSelector) {
            await page.waitForSelector(waitForSelector, { timeout: 10000 }).catch(() => {});
          } else {
            // Or wait a fixed amount of time
            await page.waitForTimeout(waitTime);
          }
          
          // Capture rendered HTML
          enhancedData.javascriptRenderedHtml = await page.content();
          
          // Capture screenshot if enabled
          if (captureScreenshots) {
            const screenshotBuffer = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 80 });
            const screenshotBase64 = screenshotBuffer.toString('base64');
            
            // Store screenshot in Supabase storage
            const screenshotPath = `crawls/${siteCrawlId}/screenshots/${Date.now()}.jpg`;
            const { data: storageData, error: storageError } = await this.supabase.storage
              .from('seo-screenshots')
              .upload(screenshotPath, screenshotBuffer, {
                contentType: 'image/jpeg',
                upsert: true
              });
              
            if (!storageError) {
              enhancedData.screenshotPath = screenshotPath;
            }
          }
          
          // Collect performance metrics
          const performanceMetrics = await this.collectPerformanceMetrics(page);
          enhancedData.performanceMetrics = performanceMetrics;
          
          // Collect DOM size metrics
          enhancedData.domSize = await this.collectDOMSizeMetrics(page);
          
          // Collect resource counts
          enhancedData.resourceCounts = await this.collectResourceMetrics(page);
          
          // Extract schema markup
          enhancedData.schemaMarkup = await this.extractSchemaMarkup(page);
        } catch (error) {
          console.error(`Error rendering JavaScript for ${url}:`, error);
        } finally {
          await page.close();
        }
      }
      
      // Extract semantic content using LLM for deeper analysis
      if (enhancedData.javascriptRenderedHtml || enhancedData.htmlContent) {
        enhancedData.semanticAnalysis = await this.performSemanticAnalysis(
          enhancedData.javascriptRenderedHtml || enhancedData.htmlContent || '',
          url
        );
      }
      
      // Store enhanced page data
      await this.storeEnhancedPageData(enhancedData, siteCrawlId);
      
      return enhancedData;
    } catch (error) {
      console.error(`Error in enhanced crawl of ${url}:`, error);
      return null;
    }
  }
  
  /**
   * Collect performance metrics from the page
   */
  private static async collectPerformanceMetrics(page: Page): Promise<PagePerformanceMetrics> {
    // Use Performance API to collect metrics
    const metrics = await page.evaluate(() => {
      const perfEntries = performance.getEntriesByType('navigation')[0] as any;
      const paintEntries = performance.getEntriesByType('paint');
      
      const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0;
      const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
      
      return {
        firstPaint,
        firstContentfulPaint,
        domComplete: perfEntries?.domComplete || 0,
        loadEventEnd: perfEntries?.loadEventEnd || 0,
        domInteractive: perfEntries?.domInteractive || 0,
        // Estimate for other metrics
        largestContentfulPaint: 0, // Needs PerformanceObserver
        timeToInteractive: 0,      // Estimate
        totalBlockingTime: 0,      // Estimate
        cumulativeLayoutShift: 0,  // Needs PerformanceObserver
        speedIndex: 0              // Calculated from visual progression
      };
    });
    
    return {
      firstPaint: metrics.firstPaint,
      firstContentfulPaint: metrics.firstContentfulPaint,
      largestContentfulPaint: metrics.largestContentfulPaint,
      timeToInteractive: metrics.domInteractive + 500, // Rough estimate
      totalBlockingTime: Math.max(0, metrics.domComplete - metrics.domInteractive),
      cumulativeLayoutShift: metrics.cumulativeLayoutShift,
      speedIndex: (metrics.firstContentfulPaint + metrics.loadEventEnd) / 2 // Rough estimate
    };
  }
  
  /**
   * Calculate DOM size metrics
   */
  private static async collectDOMSizeMetrics(page: Page): Promise<number> {
    return page.evaluate(() => {
      return document.querySelectorAll('*').length;
    });
  }
  
  /**
   * Collect resource metrics
   */
  private static async collectResourceMetrics(page: Page): Promise<EnhancedPageData['resourceCounts']> {
    return page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      const counts = {
        total: resources.length,
        scripts: 0,
        stylesheets: 0,
        images: 0,
        fonts: 0,
        other: 0
      };
      
      resources.forEach((resource: any) => {
        const type = resource.initiatorType;
        if (type === 'script') counts.scripts++;
        else if (type === 'link' && resource.name.includes('.css')) counts.stylesheets++;
        else if (type === 'img' || resource.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) counts.images++;
        else if (resource.name.match(/\.(woff|woff2|ttf|otf|eot)$/i)) counts.fonts++;
        else counts.other++;
      });
      
      return counts;
    });
  }
  
  /**
   * Extract schema markup from the page
   */
  private static async extractSchemaMarkup(page: Page): Promise<EnhancedPageData['schemaMarkup']> {
    return page.evaluate(() => {
      const schemaScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
      const schemas = [];
      
      for (const script of schemaScripts) {
        try {
          const schema = JSON.parse(script.textContent || '{}');
          const schemaType = schema['@type'] || 'Unknown';
          
          // Basic validation (would be more complex in real implementation)
          const isValid = Boolean(schema['@context'] && schema['@type']);
          
          schemas.push({
            type: schemaType,
            properties: schema,
            isValid,
            missingRequiredProps: isValid ? [] : ['@context', '@type'].filter(prop => !schema[prop])
          });
        } catch (error) {
          console.error('Error parsing schema:', error);
        }
      }
      
      return schemas;
    });
  }
  
  /**
   * Perform semantic analysis using the LLM service
   */
  private static async performSemanticAnalysis(
    htmlContent: string, 
    url: string
  ): Promise<EnhancedPageData['semanticAnalysis']> {
    try {
      // Extract text content from HTML
      const $ = cheerio.load(htmlContent);
      
      // Remove script, style tags and unwanted elements
      $('script, style, nav, footer, header, aside, [role="banner"], [role="navigation"]').remove();
      
      // Extract text content
      const textContent = $('body').text().trim().replace(/\s+/g, ' ').substring(0, 5000);
      
      if (!textContent) {
        return {
          mainTopic: 'Unknown',
          entities: [],
          keywords: [],
          sentimentScore: 0
        };
      }
      
      // Construct prompt for LLM analysis
      const prompt = `
Analyze the following webpage content and provide semantic analysis:

URL: ${url}
Content: ${textContent}

Provide a structured analysis with:
1. Main topic of the page
2. Key entities mentioned (people, companies, locations, products)
3. Important keywords with relevance scores (0-1)
4. Overall sentiment score (-1 for negative, 0 for neutral, 1 for positive)

Format your response as a valid JSON object with these keys: mainTopic, entities (array), keywords (array of objects with term and relevance), sentimentScore (number).
      `;
      
      // Use the LLM provider to analyze the content
      const result = await liteLLMProvider.callLLM(prompt);
      
      if (result) {
        try {
          // Parse the JSON response from the LLM
          const jsonStart = result.indexOf('{');
          const jsonEnd = result.lastIndexOf('}') + 1;
          
          if (jsonStart >= 0 && jsonEnd > jsonStart) {
            const jsonString = result.substring(jsonStart, jsonEnd);
            const semanticData = JSON.parse(jsonString);
            
            return {
              mainTopic: semanticData.mainTopic || 'Unknown',
              entities: semanticData.entities || [],
              keywords: semanticData.keywords || [],
              sentimentScore: semanticData.sentimentScore || 0
            };
          }
        } catch (error) {
          console.error('Error parsing LLM response:', error);
        }
      }
      
      // Fallback if LLM fails or returns invalid JSON
      return {
        mainTopic: 'Unknown',
        entities: [],
        keywords: [],
        sentimentScore: 0
      };
    } catch (error) {
      console.error('Error in semantic analysis:', error);
      return {
        mainTopic: 'Unknown',
        entities: [],
        keywords: [],
        sentimentScore: 0
      };
    }
  }
  
  /**
   * Store enhanced page data in database
   */
  private static async storeEnhancedPageData(
    pageData: EnhancedPageData, 
    siteCrawlId: string
  ): Promise<void> {
    try {
      // Store enhanced data in the crawled_pages table
      const { error } = await this.supabase
        .from('crawled_pages')
        .update({
          js_rendered_html: pageData.javascriptRenderedHtml,
          screenshot_path: pageData.screenshotPath,
          performance_metrics: pageData.performanceMetrics,
          dom_size: pageData.domSize,
          resource_counts: pageData.resourceCounts,
          schema_markup: pageData.schemaMarkup,
          semantic_analysis: pageData.semanticAnalysis,
          updated_at: new Date().toISOString()
        })
        .eq('id', pageData.id);
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error storing enhanced page data:', error);
    }
  }
} 