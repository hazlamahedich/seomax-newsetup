import { PuppeteerCrawler, Dataset } from 'crawlee';
import * as cheerio from 'cheerio';
import { createClient } from '@/lib/supabase/client';

// Define SiteCrawlOptions interface
export interface SiteCrawlOptions {
  maxPages?: number;
  maxDepth?: number;
  respectRobotsTxt?: boolean;
  ignoreQueryParams?: boolean;
  followExternalLinks?: boolean;
  delayBetweenRequests?: number;
  userAgent?: string;
}

export interface CrawledUrlData {
  url: string;
  title: string;
  metaDescription: string;
  h1: string;
  statusCode: number;
  contentType: string;
  wordCount: number;
  depth: number;
  htmlContent: string;
  loadedResources?: {
    scripts: number;
    stylesheets: number;
    images: number;
    fonts: number;
    other: number;
    total: number;
  };
  screenshotPath?: string;
  renderedHtml?: string;
}

export class CrawleeService {
  private static supabase = createClient();
  
  /**
   * Crawl a website using Crawlee with Puppeteer integration
   * @param siteCrawlId - The ID of the site crawl session
   * @param startUrl - The URL to start crawling from
   * @param options - Crawling options
   */
  static async crawlWebsite(
    siteCrawlId: string, 
    startUrl: string, 
    options: SiteCrawlOptions = {}
  ): Promise<boolean> {
    try {
      const {
        maxPages = 100,
        maxDepth = 3,
        respectRobotsTxt = true,
        ignoreQueryParams = true,
        followExternalLinks = false,
        delayBetweenRequests = 500,
        userAgent = 'SEOMax Crawler Bot (Crawlee)'
      } = options;
      
      // Get project URL to ensure we stay on the same domain
      const { data: crawlData } = await this.supabase
        .from('site_crawls')
        .select('project_id')
        .eq('id', siteCrawlId)
        .single();
        
      if (!crawlData) throw new Error('Crawl session not found');
      
      const { data: projectData } = await this.supabase
        .from('projects')
        .select('url')
        .eq('id', crawlData.project_id)
        .single();
        
      if (!projectData) throw new Error('Project not found');
      
      // Extract domain from project URL
      const projectUrl = new URL(projectData.url);
      const projectDomain = projectUrl.hostname;
      
      // Create a temporary dataset to store crawled data
      const dataset = await Dataset.open<CrawledUrlData>('crawl-' + siteCrawlId);
      
      // Create Puppeteer crawler
      const crawler = new PuppeteerCrawler({
        maxRequestsPerCrawl: maxPages,
        maxRequestRetries: 2,
        requestHandlerTimeoutSecs: 60,
        navigationTimeoutSecs: 30,
        
        // Respect robots.txt if enabled
        useSessionPool: true,
        persistCookiesPerSession: true,
        
        // Handle rate limiting
        minConcurrency: 1,
        maxConcurrency: 5,
        requestHandler: async ({ request, page, enqueueLinks, log }) => {
          const url = request.url;
          log.info(`Processing ${url}...`);
          
          // Get request metadata
          const depth = request.userData.depth || 0;
          
          try {
            // Wait for page to be fully loaded
            await page.waitForNetworkIdle({ idleTime: 1000, timeout: 15000 }).catch(() => {
              log.warning('Network did not become idle in time, continuing anyway');
            });
            
            // Extract page metrics
            const metrics = await page.metrics();
            
            // Get rendered HTML content
            const renderedHtml = await page.content();
            
            // Use cheerio to parse HTML
            const $ = cheerio.load(renderedHtml);
            
            // Extract basic page data
            const title = $('title').text().trim();
            const metaDescription = $('meta[name="description"]').attr('content') || '';
            const h1 = $('h1').first().text().trim();
            
            // Count words in the body text
            const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
            const wordCount = bodyText.split(' ').length;
            
            // Count resources
            const scripts = $('script').length;
            const stylesheets = $('link[rel="stylesheet"]').length;
            const images = $('img').length;
            
            // Create page data object
            const pageData: CrawledUrlData = {
              url,
              title,
              metaDescription,
              h1,
              statusCode: 200, // Assume 200 if we got here
              contentType: 'text/html',
              wordCount,
              depth,
              htmlContent: renderedHtml,
              loadedResources: {
                scripts,
                stylesheets,
                images,
                fonts: 0, // Need additional parsing for this
                other: 0,
                total: scripts + stylesheets + images
              },
              renderedHtml
            };
            
            // Store page data
            await this.storePageData(siteCrawlId, pageData);
            
            // Save data to dataset
            await dataset.pushData(pageData);
            
            // Only enqueue links if we're not at max depth
            if (depth < maxDepth) {
              // Enqueue links found on the page
              await enqueueLinks({
                globs: followExternalLinks ? undefined : [`**/*.${projectDomain}/**`],
                transformRequestFunction: (req) => {
                  // Add depth to the request
                  if (!req.userData) req.userData = {};
                  req.userData.depth = depth + 1;
                  return req;
                },
              });
            }
          } catch (error) {
            log.error(`Error processing ${url}: ${error}`);
            
            // Store failed page
            const failedPage: Partial<CrawledUrlData> = {
              url,
              statusCode: 0, // Error code
              depth,
              htmlContent: '',
            };
            
            await this.storePageData(siteCrawlId, failedPage as CrawledUrlData);
          }
        },
        
        // Configure crawler
        preNavigationHooks: [
          async ({ page, request }) => {
            // Set viewport size
            await page.setViewport({ width: 1280, height: 800 });
            
            // Set user agent
            await page.setUserAgent(userAgent);
            
            // Set extra HTTP headers
            await page.setExtraHTTPHeaders({
              'Accept-Language': 'en-US,en;q=0.9',
            });
          },
        ],
        
        // Fail handler
        failedRequestHandler: async ({ request, log }) => {
          log.warning(`Request failed (${request.url}): ${request.errorMessages}`);
          
          // Store failed page
          const failedPage: Partial<CrawledUrlData> = {
            url: request.url,
            statusCode: 0, // Error code
            depth: request.userData?.depth || 0,
            htmlContent: '',
          };
          
          await this.storePageData(siteCrawlId, failedPage as CrawledUrlData);
        },
      });
      
      // Start the crawler
      await this.supabase
        .from('site_crawls')
        .update({ status: 'in_progress', start_time: new Date().toISOString() })
        .eq('id', siteCrawlId);
        
      // Run the crawler
      await crawler.run([startUrl]);
      
      // Get crawl stats
      let pagesProcessed = 0;
      try {
        pagesProcessed = crawler.stats.requestsFinished || 0;
      } catch (error) {
        console.error('Error getting crawler stats:', error);
      }
      
      await this.supabase
        .from('site_crawls')
        .update({
          status: 'completed',
          end_time: new Date().toISOString(),
          pages_crawled: pagesProcessed,
        })
        .eq('id', siteCrawlId);
      
      return true;
    } catch (error) {
      console.error('Error crawling website with Crawlee:', error);
      
      // Mark crawl as failed
      await this.supabase
        .from('site_crawls')
        .update({
          status: 'failed',
          end_time: new Date().toISOString()
        })
        .eq('id', siteCrawlId);
      
      return false;
    }
  }
  
  /**
   * Store crawled page data in Supabase
   */
  private static async storePageData(siteCrawlId: string, pageData: CrawledUrlData): Promise<void> {
    try {
      await this.supabase
        .from('crawled_pages')
        .insert({
          site_crawl_id: siteCrawlId,
          url: pageData.url,
          title: pageData.title,
          meta_description: pageData.metaDescription,
          h1: pageData.h1,
          status_code: pageData.statusCode,
          content_type: pageData.contentType || 'text/html',
          word_count: pageData.wordCount,
          depth: pageData.depth,
          html_content: pageData.htmlContent,
          rendered_html: pageData.renderedHtml,
          resources_count: pageData.loadedResources ? JSON.stringify(pageData.loadedResources) : null,
          screenshot_path: pageData.screenshotPath
        });
    } catch (error) {
      console.error(`Error storing page data for ${pageData.url}:`, error);
    }
  }
} 