import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@/lib/supabase/client';
import type { SiteCrawlOptions, SiteCrawl, CrawledPage } from '@/lib/types/seo';

export class SiteCrawlerService {
  private static supabase = createClient();
  
  /**
   * Create a new site crawl session
   */
  static async createCrawl(projectId: string, userId: string): Promise<SiteCrawl | null> {
    try {
      const { data, error } = await this.supabase
        .from('site_crawls')
        .insert({
          project_id: projectId,
          user_id: userId,
          status: 'in_progress',
        })
        .select()
        .single();

      if (error) throw error;
      
      return this.mapCrawlData(data);
    } catch (error) {
      console.error('Error creating site crawl:', error);
      return null;
    }
  }
  
  /**
   * Start the crawling process for a website
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
        userAgent = 'SEOMax Crawler Bot'
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
      const projectDomain = new URL(projectData.url).hostname;
      
      // Set of URLs we've already crawled or queued
      const crawledUrls = new Set<string>();
      
      // Queue of URLs to crawl with their depth
      const queue: Array<{url: string, depth: number}> = [
        { url: this.normalizeUrl(startUrl, ignoreQueryParams), depth: 0 }
      ];
      
      // Add first URL to crawled set to avoid crawling it again
      crawledUrls.add(queue[0].url);
      
      let pagesProcessed = 0;
      
      // Process queue until empty or max pages reached
      while (queue.length > 0 && pagesProcessed < maxPages) {
        // Get next URL from queue
        const { url, depth } = queue.shift()!;
        
        // Skip if we're past max depth
        if (depth > maxDepth) continue;
        
        // Delay between requests
        if (pagesProcessed > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
        }
        
        // Crawl the page
        const pageData = await this.crawlPage(url, siteCrawlId, depth, userAgent);
        pagesProcessed++;
        
        // Update crawl status
        await this.supabase
          .from('site_crawls')
          .update({ pages_crawled: pagesProcessed })
          .eq('id', siteCrawlId);
        
        // If page couldn't be crawled, continue to next
        if (!pageData || !pageData.htmlContent) continue;
        
        // Extract links from the page
        const links = this.extractLinks(pageData.htmlContent, url);
        
        // Process each link
        for (const link of links) {
          try {
            const normalizedUrl = this.normalizeUrl(link, ignoreQueryParams);
            const linkUrl = new URL(normalizedUrl);
            
            // Skip already crawled or queued URLs
            if (crawledUrls.has(normalizedUrl)) continue;
            
            // Skip external links if not following them
            if (!followExternalLinks && linkUrl.hostname !== projectDomain) continue;
            
            // Only add links from same domain to the queue
            if (linkUrl.hostname === projectDomain) {
              queue.push({ url: normalizedUrl, depth: depth + 1 });
              crawledUrls.add(normalizedUrl);
            }
            
            // Store the link in the site structure table
            await this.storeLinkRelationship(
              siteCrawlId,
              pageData.id,
              normalizedUrl,
              linkUrl.hostname === projectDomain ? 'internal' : 'external'
            );
          } catch (error) {
            // Skip invalid URLs
            console.error('Error processing link:', link, error);
          }
        }
      }
      
      // Mark crawl as completed
      await this.supabase
        .from('site_crawls')
        .update({
          status: 'completed',
          end_time: new Date().toISOString(),
          pages_crawled: pagesProcessed
        })
        .eq('id', siteCrawlId);
      
      return true;
    } catch (error) {
      console.error('Error crawling website:', error);
      
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
   * Crawl a single page and store its data
   */
  private static async crawlPage(
    url: string,
    siteCrawlId: string,
    depth: number,
    userAgent: string
  ): Promise<CrawledPage | null> {
    try {
      // Fetch the page content
      const response = await axios.get(url, {
        headers: {
          'User-Agent': userAgent
        },
        maxRedirects: 5,
        timeout: 10000,
        validateStatus: status => status < 500 // Accept 3xx and 4xx responses
      });
      
      // Get content type
      const contentType = response.headers['content-type'] || '';
      
      // Only process HTML content
      if (!contentType.includes('text/html')) {
        // Store non-HTML resource
        const { data, error } = await this.supabase
          .from('crawled_pages')
          .insert({
            site_crawl_id: siteCrawlId,
            url,
            status_code: response.status,
            content_type: contentType,
            depth,
          })
          .select()
          .single();
          
        if (error) throw error;
        return this.mapPageData(data);
      }
      
      // Parse HTML
      const $ = cheerio.load(response.data);
      
      // Extract page data
      const title = $('title').text().trim();
      const metaDescription = $('meta[name="description"]').attr('content') || '';
      const h1 = $('h1').first().text().trim();
      
      // Count words in the body text
      const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
      const wordCount = bodyText.split(' ').length;
      
      // Store page data
      const { data, error } = await this.supabase
        .from('crawled_pages')
        .insert({
          site_crawl_id: siteCrawlId,
          url,
          title,
          meta_description: metaDescription,
          h1,
          status_code: response.status,
          content_type: contentType,
          word_count: wordCount,
          depth,
          html_content: response.data
        })
        .select()
        .single();
        
      if (error) throw error;
      return this.mapPageData(data);
    } catch (axiosError: any) {
      console.error(`Error crawling page ${url}:`, axiosError);
      
      // Store failed crawl attempt
      try {
        const { data, error } = await this.supabase
          .from('crawled_pages')
          .insert({
            site_crawl_id: siteCrawlId,
            url,
            status_code: axiosError.response?.status || 0,
            depth,
          })
          .select()
          .single();
          
        if (error) throw error;
        return this.mapPageData(data);
      } catch (insertError) {
        console.error('Error storing failed crawl:', insertError);
        return null;
      }
    }
  }
  
  /**
   * Extract links from HTML content
   */
  private static extractLinks(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const links: string[] = [];
    
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) return;
      
      try {
        // Convert relative URLs to absolute
        const absoluteUrl = new URL(href, baseUrl).href;
        links.push(absoluteUrl);
      } catch (error) {
        // Skip invalid URLs
        console.error('Invalid URL:', href, error);
      }
    });
    
    return links;
  }
  
  /**
   * Store link relationship between pages
   */
  private static async storeLinkRelationship(
    siteCrawlId: string,
    sourcePageId: string,
    targetUrl: string,
    linkType: 'internal' | 'external' | 'resource'
  ): Promise<void> {
    try {
      // First, check if target page exists
      const { data: targetPage } = await this.supabase
        .from('crawled_pages')
        .select('id')
        .eq('url', targetUrl)
        .eq('site_crawl_id', siteCrawlId)
        .single();
      
      // If target doesn't exist yet, create a placeholder
      let targetPageId = targetPage?.id;
      
      if (!targetPageId) {
        const { data: newPage, error } = await this.supabase
          .from('crawled_pages')
          .insert({
            site_crawl_id: siteCrawlId,
            url: targetUrl,
            depth: 999, // Placeholder depth until actually crawled
          })
          .select('id')
          .single();
          
        if (error) throw error;
        targetPageId = newPage.id;
      }
      
      // Store the relationship
      await this.supabase
        .from('site_structure')
        .insert({
          site_crawl_id: siteCrawlId,
          source_page_id: sourcePageId,
          target_page_id: targetPageId,
          link_type: linkType,
        });
    } catch (error) {
      console.error('Error storing link relationship:', error);
    }
  }
  
  /**
   * Normalize a URL by removing query parameters and fragments
   */
  private static normalizeUrl(url: string, ignoreQueryParams: boolean): string {
    try {
      const urlObj = new URL(url);
      
      // Remove query parameters if specified
      if (ignoreQueryParams) {
        urlObj.search = '';
      }
      
      // Always remove fragments
      urlObj.hash = '';
      
      return urlObj.href;
    } catch (error) {
      // Return original if invalid URL
      return url;
    }
  }
  
  /**
   * Get crawl by ID
   */
  static async getCrawlById(id: string): Promise<SiteCrawl | null> {
    try {
      const { data, error } = await this.supabase
        .from('site_crawls')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      return this.mapCrawlData(data);
    } catch (error) {
      console.error('Error getting crawl:', error);
      return null;
    }
  }
  
  /**
   * Get crawls for a project
   */
  static async getCrawlsByProjectId(projectId: string): Promise<SiteCrawl[]> {
    try {
      const { data, error } = await this.supabase
        .from('site_crawls')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return data.map(this.mapCrawlData);
    } catch (error) {
      console.error('Error getting crawls for project:', error);
      return [];
    }
  }
  
  /**
   * Get pages for a crawl
   */
  static async getPagesByCrawlId(crawlId: string): Promise<CrawledPage[]> {
    try {
      const { data, error } = await this.supabase
        .from('crawled_pages')
        .select('*')
        .eq('site_crawl_id', crawlId)
        .order('depth', { ascending: true });
        
      if (error) throw error;
      return data.map(this.mapPageData);
    } catch (error) {
      console.error('Error getting pages for crawl:', error);
      return [];
    }
  }
  
  /**
   * Map database crawl data to SiteCrawl interface
   */
  private static mapCrawlData(data: any): SiteCrawl {
    return {
      id: data.id,
      projectId: data.project_id,
      startTime: new Date(data.start_time),
      endTime: data.end_time ? new Date(data.end_time) : undefined,
      pagesCrawled: data.pages_crawled,
      status: data.status,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
  
  /**
   * Map database page data to CrawledPage interface
   */
  private static mapPageData(data: any): CrawledPage {
    return {
      id: data.id,
      siteCrawlId: data.site_crawl_id,
      url: data.url,
      title: data.title,
      metaDescription: data.meta_description,
      h1: data.h1,
      statusCode: data.status_code,
      contentType: data.content_type,
      wordCount: data.word_count,
      depth: data.depth,
      crawlDate: new Date(data.crawl_date),
      htmlContent: data.html_content,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
} 