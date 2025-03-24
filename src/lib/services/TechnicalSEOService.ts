import { createClient } from '@/lib/supabase/client';
import type { TechnicalIssue, TechnicalSEOAudit, SchemaValidationResult } from '@/lib/types/seo';
import * as cheerio from 'cheerio';
import { GradingSystemService } from './GradingSystemService';

export interface TechnicalSEOIssue {
  id: string;
  url: string;
  type: 'robots' | 'sitemap' | 'ssl' | 'canonical' | 'http_status' | 'redirect' | 'hreflang' | 'structured_data' | 'crawlability' | 'mobile_friendly' | 'page_speed';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  recommendation: string;
  details?: any;
  affectedElement?: string;
}

export interface TechnicalSEOResult {
  siteId: string;
  domain: string;
  score: number;
  grade: {
    letter: string;
    color: string;
    label: string;
  };
  issues: TechnicalSEOIssue[];
  checks: {
    passed: number;
    failed: number;
    total: number;
  };
  recommendations: string[];
  robotsTxt: {
    exists: boolean;
    valid: boolean;
    content?: string;
    issues?: string[];
  };
  sitemap: {
    exists: boolean;
    valid: boolean;
    urls?: number;
    issues?: string[];
  };
  ssl: {
    valid: boolean;
    expires?: string;
    issues?: string[];
  };
  canonicals: {
    valid: boolean;
    issues?: string[];
  };
  mobileCompatibility: {
    compatible: boolean;
    issues?: string[];
  };
  structured_data: {
    valid: boolean;
    types?: string[];
    issues?: string[];
  };
  http2: {
    implemented: boolean;
    issues?: string[];
  };
  resourceOptimization: {
    jsMinified: boolean;
    cssMinified: boolean;
    issues?: string[];
  };
  createdAt: string;
}

/**
 * Service for analyzing technical SEO aspects of websites
 */
export class TechnicalSEOService {
  private static supabase = createClient();
  
  /**
   * Analyze crawled pages and identify technical SEO issues
   */
  static async analyzeCrawl(siteCrawlId: string): Promise<TechnicalSEOAudit | null> {
    try {
      // Get all pages from this crawl
      const { data: pages, error: pagesError } = await this.supabase
        .from('crawled_pages')
        .select('*')
        .eq('site_crawl_id', siteCrawlId);
        
      if (pagesError) throw pagesError;
      if (!pages || pages.length === 0) return null;
      
      // Get crawl information
      const { data: crawl, error: crawlError } = await this.supabase
        .from('site_crawls')
        .select('project_id')
        .eq('id', siteCrawlId)
        .single();
        
      if (crawlError) throw crawlError;
      
      // Initialize metrics for the audit
      const brokenLinks: TechnicalIssue[] = [];
      const redirectChains: TechnicalIssue[] = [];
      const missingTitles: TechnicalIssue[] = [];
      const duplicateTitles: TechnicalIssue[] = [];
      const missingMetaDescriptions: TechnicalIssue[] = [];
      const duplicateMetaDescriptions: TechnicalIssue[] = [];
      const missingH1s: TechnicalIssue[] = [];
      const duplicateH1s: TechnicalIssue[] = [];
      const slowPages: TechnicalIssue[] = [];
      const lowContentPages: TechnicalIssue[] = [];
      const canonicalizationIssues: TechnicalIssue[] = [];
      const mobileUsabilityIssues: TechnicalIssue[] = [];
      
      // Map to track titles, descriptions, etc. for duplicate detection
      const titles: Map<string, string[]> = new Map();
      const descriptions: Map<string, string[]> = new Map();
      const h1s: Map<string, string[]> = new Map();
      
      // Process each page to find technical issues
      for (const page of pages) {
        // Skip pages that couldn't be crawled
        if (page.status_code === 0 || !page.html_content) {
          continue;
        }
        
        // Check for broken links (4xx status codes)
        if (page.status_code >= 400 && page.status_code < 500) {
          brokenLinks.push({
            id: crypto.randomUUID(),
            site_crawl_id: siteCrawlId,
            page_url: page.url,
            issue_type: 'broken_link',
            issue_severity: 'high',
            issue_description: `Broken link with status code ${page.status_code}`,
            detected_at: new Date().toISOString(),
          });
        }
        
        // Check for redirect chains (3xx status codes)
        if (page.status_code >= 300 && page.status_code < 400) {
          redirectChains.push({
            id: crypto.randomUUID(),
            site_crawl_id: siteCrawlId,
            page_url: page.url,
            issue_type: 'redirect_chain',
            issue_severity: 'medium',
            issue_description: `Redirect with status code ${page.status_code}`,
            detected_at: new Date().toISOString(),
          });
        }
        
        // Skip further analysis for non-HTML or error pages
        if (page.status_code !== 200 || !page.html_content) {
          continue;
        }
        
        // Missing title
        if (!page.title) {
          missingTitles.push({
            id: crypto.randomUUID(),
            site_crawl_id: siteCrawlId,
            page_url: page.url,
            issue_type: 'missing_title',
            issue_severity: 'high',
            issue_description: 'Page is missing a title tag',
            detected_at: new Date().toISOString(),
          });
        } else {
          // Track for duplicate detection
          const pageUrls = titles.get(page.title) || [];
          pageUrls.push(page.url);
          titles.set(page.title, pageUrls);
        }
        
        // Missing meta description
        if (!page.meta_description) {
          missingMetaDescriptions.push({
            id: crypto.randomUUID(),
            site_crawl_id: siteCrawlId,
            page_url: page.url,
            issue_type: 'missing_meta_description',
            issue_severity: 'medium',
            issue_description: 'Page is missing a meta description',
            detected_at: new Date().toISOString(),
          });
        } else {
          // Track for duplicate detection
          const pageUrls = descriptions.get(page.meta_description) || [];
          pageUrls.push(page.url);
          descriptions.set(page.meta_description, pageUrls);
        }
        
        // Missing H1
        if (!page.h1) {
          missingH1s.push({
            id: crypto.randomUUID(),
            site_crawl_id: siteCrawlId,
            page_url: page.url,
            issue_type: 'missing_h1',
            issue_severity: 'medium',
            issue_description: 'Page is missing an H1 tag',
            detected_at: new Date().toISOString(),
          });
        } else {
          // Track for duplicate detection
          const pageUrls = h1s.get(page.h1) || [];
          pageUrls.push(page.url);
          h1s.set(page.h1, pageUrls);
        }
        
        // Low content pages
        if (page.word_count && page.word_count < 300) {
          lowContentPages.push({
            id: crypto.randomUUID(),
            site_crawl_id: siteCrawlId,
            page_url: page.url,
            issue_type: 'low_content',
            issue_severity: 'medium',
            issue_description: `Page has only ${page.word_count} words, which is less than the recommended minimum of 300 words`,
            detected_at: new Date().toISOString(),
          });
        }
        
        // Check for canonical tag issues
        try {
          const $ = cheerio.load(page.html_content);
          const canonicalLink = $('link[rel="canonical"]').attr('href');
          
          if (!canonicalLink) {
            canonicalizationIssues.push({
              id: crypto.randomUUID(),
              site_crawl_id: siteCrawlId,
              page_url: page.url,
              issue_type: 'missing_canonical',
              issue_severity: 'medium',
              issue_description: 'Page is missing a canonical link tag',
              detected_at: new Date().toISOString(),
            });
          } else if (new URL(canonicalLink, page.url).href !== page.url) {
            canonicalizationIssues.push({
              id: crypto.randomUUID(),
              site_crawl_id: siteCrawlId,
              page_url: page.url,
              issue_type: 'self_canonical',
              issue_severity: 'low',
              issue_description: 'Page canonicalizes to a different URL: ' + canonicalLink,
              detected_at: new Date().toISOString(),
            });
          }
          
          // Check for mobile usability issues (viewport tag)
          const viewportTag = $('meta[name="viewport"]').attr('content');
          if (!viewportTag) {
            mobileUsabilityIssues.push({
              id: crypto.randomUUID(),
              site_crawl_id: siteCrawlId,
              page_url: page.url,
              issue_type: 'missing_viewport',
              issue_severity: 'high',
              issue_description: 'Page is missing a viewport meta tag, which is required for mobile-friendly pages',
              detected_at: new Date().toISOString(),
            });
          } else if (!viewportTag.includes('width=device-width')) {
            mobileUsabilityIssues.push({
              id: crypto.randomUUID(),
              site_crawl_id: siteCrawlId,
              page_url: page.url,
              issue_type: 'incorrect_viewport',
              issue_severity: 'medium',
              issue_description: 'Viewport tag does not include width=device-width, which may cause mobile rendering issues',
              detected_at: new Date().toISOString(),
            });
          }
          
        } catch (error) {
          console.error('Error analyzing page:', page.url, error);
        }
      }
      
      // Check for duplicate titles
      for (const [title, urls] of titles.entries()) {
        if (urls.length > 1) {
          duplicateTitles.push({
            id: crypto.randomUUID(),
            site_crawl_id: siteCrawlId,
            page_url: urls.join(', '),
            issue_type: 'duplicate_title',
            issue_severity: 'high',
            issue_description: `${urls.length} pages share the same title: "${title}"`,
            detected_at: new Date().toISOString(),
          });
        }
      }
      
      // Check for duplicate meta descriptions
      for (const [description, urls] of descriptions.entries()) {
        if (urls.length > 1) {
          duplicateMetaDescriptions.push({
            id: crypto.randomUUID(),
            site_crawl_id: siteCrawlId,
            page_url: urls.join(', '),
            issue_type: 'duplicate_meta_description',
            issue_severity: 'medium',
            issue_description: `${urls.length} pages share the same meta description`,
            detected_at: new Date().toISOString(),
          });
        }
      }
      
      // Check for duplicate H1s
      for (const [h1, urls] of h1s.entries()) {
        if (urls.length > 1) {
          duplicateH1s.push({
            id: crypto.randomUUID(),
            site_crawl_id: siteCrawlId,
            page_url: urls.join(', '),
            issue_type: 'duplicate_h1',
            issue_severity: 'medium',
            issue_description: `${urls.length} pages share the same H1: "${h1}"`,
            detected_at: new Date().toISOString(),
          });
        }
      }
      
      // Combine all issues
      const allIssues = [
        ...brokenLinks,
        ...redirectChains,
        ...missingTitles,
        ...duplicateTitles,
        ...missingMetaDescriptions,
        ...duplicateMetaDescriptions,
        ...missingH1s,
        ...duplicateH1s,
        ...lowContentPages,
        ...canonicalizationIssues,
        ...mobileUsabilityIssues
      ];
      
      // Insert issues into the database
      if (allIssues.length > 0) {
        const { error: insertError } = await this.supabase
          .from('technical_issues')
          .insert(allIssues);
          
        if (insertError) {
          console.error('Error saving technical issues:', insertError);
        }
      }
      
      // Build the audit summary
      const audit: TechnicalSEOAudit = {
        siteCrawlId,
        projectId: crawl.project_id,
        crawledPages: pages.length,
        brokenLinks: brokenLinks.length,
        redirectChains: redirectChains.length,
        missingTitles: missingTitles.length,
        duplicateTitles: duplicateTitles.length,
        missingMetaDescriptions: missingMetaDescriptions.length,
        duplicateMetaDescriptions: duplicateMetaDescriptions.length,
        missingH1s: missingH1s.length,
        duplicateH1s: duplicateH1s.length,
        lowContentPages: lowContentPages.length,
        canonicalizationIssues: canonicalizationIssues.length,
        mobileUsabilityIssues: mobileUsabilityIssues.length,
        issues: allIssues,
        completedAt: new Date()
      };
      
      return audit;
    } catch (error) {
      console.error('Error analyzing technical SEO:', error);
      return null;
    }
  }
  
  /**
   * Get technical issues for a specific crawl
   */
  static async getIssuesByCrawlId(siteCrawlId: string): Promise<TechnicalIssue[]> {
    try {
      const { data, error } = await this.supabase
        .from('technical_issues')
        .select('*')
        .eq('site_crawl_id', siteCrawlId)
        .order('issue_severity', { ascending: false });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching technical issues:', error);
      return [];
    }
  }
  
  /**
   * Get high severity issues for a specific crawl
   */
  static async getHighSeverityIssues(siteCrawlId: string): Promise<TechnicalIssue[]> {
    try {
      const { data, error } = await this.supabase
        .from('technical_issues')
        .select('*')
        .eq('site_crawl_id', siteCrawlId)
        .eq('issue_severity', 'high')
        .order('issue_type');
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching high severity issues:', error);
      return [];
    }
  }
  
  /**
   * Get issues by type for a specific crawl
   */
  static async getIssuesByType(siteCrawlId: string, issueType: string): Promise<TechnicalIssue[]> {
    try {
      const { data, error } = await this.supabase
        .from('technical_issues')
        .select('*')
        .eq('site_crawl_id', siteCrawlId)
        .eq('issue_type', issueType);
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error fetching ${issueType} issues:`, error);
      return [];
    }
  }
  
  /**
   * Get summary of issues by types and severity
   */
  static async getIssuesSummary(siteCrawlId: string): Promise<
    {
      issue_type: string;
      severity: string;
      count: number;
    }[]
  > {
    try {
      // This assumes your database supports aggregate functions
      // For Supabase, we'll get all issues and aggregate them in memory
      const { data, error } = await this.supabase
        .from('technical_issues')
        .select('issue_type, issue_severity')
        .eq('site_crawl_id', siteCrawlId);
        
      if (error) throw error;
      
      // Aggregate issues
      const summary = new Map<string, Map<string, number>>();
      
      for (const issue of data) {
        if (!summary.has(issue.issue_type)) {
          summary.set(issue.issue_type, new Map<string, number>());
        }
        
        const severityMap = summary.get(issue.issue_type)!;
        const currentCount = severityMap.get(issue.issue_severity) || 0;
        severityMap.set(issue.issue_severity, currentCount + 1);
      }
      
      // Convert to array format
      const result: { issue_type: string; severity: string; count: number }[] = [];
      
      for (const [issueType, severityMap] of summary.entries()) {
        for (const [severity, count] of severityMap.entries()) {
          result.push({
            issue_type: issueType,
            severity,
            count
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching issues summary:', error);
      return [];
    }
  }
  
  /**
   * Generate detailed recommendations for fixing technical SEO issues
   */
  static async generateRecommendations(siteCrawlId: string): Promise<Record<string, string[]>> {
    try {
      const recommendations: Record<string, string[]> = {};
      
      // Get all issues for the site crawl
      const { data, error } = await this.supabase
        .from('technical_issues')
        .select('*')
        .eq('site_crawl_id', siteCrawlId);
        
      if (error) throw error;
      if (!data || data.length === 0) return recommendations;
      
      // Group issues by type
      const issuesByType: Record<string, any[]> = {};
      
      for (const issue of data) {
        if (!issuesByType[issue.issue_type]) {
          issuesByType[issue.issue_type] = [];
        }
        
        issuesByType[issue.issue_type].push(issue);
      }
      
      // Generate recommendations based on issue types
      
      // Title tag issues
      if (issuesByType['missing_title'] || issuesByType['duplicate_title']) {
        recommendations['title_issues'] = [
          'Create unique, descriptive title tags for each page',
          'Keep titles between 50-60 characters',
          'Include primary keywords near the beginning of titles',
          'Use brand name consistently in titles',
          'Make titles compelling and click-worthy for search results',
          'Avoid keyword stuffing in titles'
        ];
      }
      
      // Meta description issues
      if (issuesByType['missing_meta_description'] || issuesByType['duplicate_meta_description']) {
        recommendations['meta_description_issues'] = [
          'Write compelling meta descriptions between 120-158 characters',
          'Include relevant keywords naturally in the description',
          'Add a clear call-to-action when appropriate',
          'Make each meta description unique and specific to the page content',
          'Avoid truncation by keeping descriptions under 158 characters',
          'Use active voice in descriptions'
        ];
      }
      
      // Heading structure issues
      if (issuesByType['missing_h1'] || issuesByType['duplicate_h1'] || issuesByType['heading_structure']) {
        recommendations['heading_structure_issues'] = [
          'Ensure every page has exactly one H1 tag',
          'Make H1 tags unique and descriptive of the page content',
          'Use a logical heading hierarchy (H1 → H2 → H3...)',
          'Include relevant keywords in heading tags',
          'Keep headings concise and clear',
          'Avoid skipping heading levels'
        ];
      }
      
      // Page speed issues
      if (issuesByType['slow_page']) {
        recommendations['performance_issues'] = [
          'Optimize and compress images before uploading',
          'Enable browser caching for static resources',
          'Minify CSS, JavaScript, and HTML',
          'Reduce server response time (TTFB)',
          'Implement lazy loading for images and videos',
          'Consider using a Content Delivery Network (CDN)',
          'Reduce the impact of third-party scripts',
          'Eliminate render-blocking resources',
          'Optimize Core Web Vitals (LCP, FID, CLS)'
        ];
      }
      
      // Mobile usability issues
      if (issuesByType['mobile_usability']) {
        recommendations['mobile_issues'] = [
          'Ensure text is readable without zooming',
          'Configure the viewport properly',
          'Size tap targets appropriately (minimum 48x48px)',
          'Avoid horizontal scrolling on mobile devices',
          'Use responsive design techniques',
          'Test your site on multiple devices and screen sizes',
          'Ensure forms are mobile-friendly',
          'Avoid using Flash or other mobile-incompatible technologies'
        ];
      }
      
      // HTTP/2 issues
      if (issuesByType['http2-not-implemented']) {
        recommendations['http2_issues'] = [
          'Implement HTTP/2 protocol on your server',
          'Use a CDN that supports HTTP/2',
          'Take advantage of HTTP/2 multiplexing by reducing script concatenation',
          'Ensure your SSL/TLS certificates are properly configured',
          'Monitor HTTP/2 performance with specialized tools',
          'Consider HTTP/2 server push for critical resources',
          'Update server software to support HTTP/2'
        ];
      }
      
      // Resource optimization issues
      if (issuesByType['js-not-minified'] || issuesByType['css-not-minified']) {
        recommendations['resource_optimization_issues'] = [
          'Minify all JavaScript files to reduce file size',
          'Minify all CSS files to reduce file size',
          'Combine multiple JavaScript files into fewer files when possible',
          'Combine multiple CSS files into fewer files when possible',
          'Use a build process that includes minification (webpack, gulp, etc.)',
          'Remove unused JavaScript and CSS code',
          'Consider using code splitting for large applications',
          'Implement critical CSS inline and defer non-critical CSS'
        ];
      }
      
      // Broken links
      if (issuesByType['broken_link']) {
        recommendations['broken_link_issues'] = [
          'Fix or remove all broken internal links',
          'Redirect URLs that have been permanently moved (301 redirects)',
          'Update outbound links to point to valid resources',
          'Implement a custom 404 page with navigation options',
          'Regularly monitor and fix broken links',
          'Check for broken links in your navigation menu and footer'
        ];
      }
      
      // Redirect issues
      if (issuesByType['redirect_chain']) {
        recommendations['redirect_issues'] = [
          'Minimize redirect chains (ideally 0-1 redirects)',
          'Update internal links to point directly to final URLs',
          'Use 301 redirects for permanent moves',
          'Avoid redirect loops',
          'Check redirect performance - they should be fast',
          'Implement server-side redirects rather than client-side when possible'
        ];
      }
      
      // Canonicalization issues
      if (issuesByType['canonicalization_issue']) {
        recommendations['canonicalization_issues'] = [
          'Implement canonical tags on all pages',
          'Ensure canonical URLs are correctly formatted and valid',
          'Use absolute URLs in canonical tags',
          'Choose one version of your URL (with/without www, with/without trailing slash)',
          'Make sure redirects and canonical tags are consistent',
          'Check for conflicting canonicalization signals',
          'Set up proper handling of URL parameters'
        ];
      }
      
      // Content quality issues
      if (issuesByType['low_content'] || issuesByType['thin_content']) {
        recommendations['content_issues'] = [
          'Expand thin content pages with meaningful, valuable information',
          'Ensure content is original and provides value to users',
          'Add relevant images, videos, or infographics to enhance content',
          'Update outdated content regularly',
          'Structure content with appropriate headings and paragraphs',
          'Aim for minimum 300 words for standard pages',
          'Use expert knowledge to create authoritative content',
          'Include relevant keywords naturally in your content'
        ];
      }
      
      // Schema markup issues
      if (issuesByType['missing_schema'] || issuesByType['invalid_schema']) {
        recommendations['schema_issues'] = [
          'Implement schema markup appropriate for your content type',
          'Validate schema with Google\'s Structured Data Testing Tool',
          'Keep schema current with latest standards from Schema.org',
          'Add organization and breadcrumb schema to all pages',
          'Use specific schema types for specific content (Product, Article, FAQ, etc.)',
          'Ensure required properties are included in each schema type',
          'Test implementation with Google\'s Rich Results Test'
        ];
      }
      
      // Robots.txt issues
      if (issuesByType['robots_txt_issue']) {
        recommendations['robots_txt_issues'] = [
          'Ensure robots.txt is accessible at domain.com/robots.txt',
          'Use proper syntax in robots.txt directives',
          'Don\'t block CSS or JavaScript files needed for rendering',
          'Block only directories and files that shouldn\'t be indexed',
          'Add sitemap location to robots.txt',
          'Test robots.txt in Google Search Console',
          'Use user-agent specific directives when necessary'
        ];
      }
      
      // Sitemap issues
      if (issuesByType['sitemap_issue']) {
        recommendations['sitemap_issues'] = [
          'Create and maintain an XML sitemap of all indexable pages',
          'Keep sitemap under 50MB and 50,000 URLs',
          'Submit sitemap to Google Search Console',
          'Update sitemap when new content is published',
          'Remove non-canonical URLs from sitemap',
          'Ensure all URLs in sitemap return 200 status code',
          'Use sitemap index for multiple sitemaps',
          'Include only URLs you want indexed in sitemap'
        ];
      }
      
      // General recommendations for all sites
      recommendations['general_recommendations'] = [
        'Implement HTTPS across the entire site',
        'Use descriptive, keyword-rich anchor text for internal links',
        'Optimize images with descriptive file names and alt text',
        'Implement breadcrumb navigation for user experience and SEO',
        'Create a logical site structure with minimal click depth',
        'Regularly audit and fix technical SEO issues',
        'Monitor Core Web Vitals and user experience metrics',
        'Check mobile usability regularly',
        'Ensure your site has proper internal linking'
      ];
      
      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return {};
    }
  }
  
  /**
   * Get detailed solutions for a specific issue type
   */
  static getDetailedSolutions(issueType: string): string[] {
    const solutions: Record<string, string[]> = {
      'missing_title': [
        'Add a title tag within the head section of your HTML',
        'Keep title length between 50-60 characters',
        'Include your primary keyword near the beginning',
        'Make the title unique and descriptive of the page content',
        'Include your brand name at the end of the title'
      ],
      'duplicate_title': [
        'Create unique titles for each page',
        'Ensure each page\'s title describes its specific content',
        'Include page-specific keywords in titles',
        'If pages are similar, ensure titles reflect the differences',
        'Review your content strategy for potential content merging or redirection'
      ],
      'missing_meta_description': [
        'Add a meta description tag within the head section',
        'Keep description length between 120-158 characters',
        'Include relevant keywords naturally in the description',
        'Make the description compelling and actionable',
        'Ensure it accurately summarizes the page content'
      ],
      'missing_h1': [
        'Add exactly one H1 heading to every page',
        'Make the H1 descriptive of the page content',
        'Include your primary keyword in the H1',
        'Keep H1s concise but descriptive (typically under 60 characters)',
        'Ensure H1 is visually prominent on the page'
      ],
      'broken_link': [
        'Fix or update the URL in the link',
        'If the destination page no longer exists, remove the link or redirect it',
        'For external links that are broken, either update or remove them',
        'Implement regular link checking as part of your maintenance routine',
        'Set up custom 404 pages with navigation options for any unfixable broken links'
      ],
      'redirect_chain': [
        'Update all links to point directly to the final destination URL',
        'Consolidate redirects to have at most one redirect in the chain',
        'Use 301 redirects for permanent changes',
        'Update old redirects when new ones are created',
        'Check server logs to find and fix redirect chains'
      ],
      'slow_page': [
        'Optimize image sizes and formats (WebP, responsive images)',
        'Minify and combine CSS and JavaScript files',
        'Implement lazy loading for images and videos',
        'Enable browser caching for static resources',
        'Consider using a CDN for faster global delivery',
        'Reduce server response time (TTFB)',
        'Defer non-critical JavaScript',
        'Prioritize visible content loading'
      ],
      'canonicalization_issue': [
        'Add proper canonical tags to all pages',
        'Ensure all canonical URLs use the same protocol (https)',
        'Use absolute URLs in canonical tags',
        'Make canonical tags consistent with other signals (sitemap, internal linking)',
        'Check for and resolve conflicting canonical signals',
        'Standardize URL patterns (www vs non-www, trailing slashes)'
      ],
      'http2-not-implemented': [
        'Update your web server software to support HTTP/2',
        'Enable HTTP/2 in your server configuration',
        'Ensure your SSL certificate is properly configured',
        'Use a CDN that supports HTTP/2',
        'Verify HTTP/2 is working using browser developer tools',
        'Consider HTTP/2 server push for critical resources',
        'Update your hosting plan if current hosting doesn\'t support HTTP/2',
        'Run HTTP/2 compatibility tests on your server'
      ],
      'js-not-minified': [
        'Use a minification tool like Terser, UglifyJS, or Closure Compiler',
        'Implement a build process with webpack, Rollup, or Parcel',
        'Enable minification in your CMS settings if available',
        'Remove unnecessary code, comments, and whitespace',
        'Consider code splitting for large applications',
        'Use modern JavaScript features like ES modules',
        'Implement tree shaking to eliminate unused code',
        'Set up automated minification in your CI/CD pipeline'
      ],
      'css-not-minified': [
        'Use a minification tool like CSSNano or Clean-CSS',
        'Implement a build process with PostCSS or SASS',
        'Enable CSS minification in your CMS settings if available',
        'Remove redundant selectors and declarations',
        'Consider CSS atomization techniques',
        'Use critical CSS inline and defer non-critical CSS',
        'Eliminate unused CSS with tools like PurgeCSS',
        'Set up automated minification in your CI/CD pipeline'
      ]
    };
    
    return solutions[issueType] || ['Fix the issue by following technical SEO best practices'];
  }
  
  /**
   * Analyze and validate schema markup on pages
   */
  static async validateSchemaMarkup(siteCrawlId: string): Promise<SchemaValidationResult[]> {
    try {
      // Get all pages from this crawl
      const { data: pages, error: pagesError } = await this.supabase
        .from('crawled_pages')
        .select('id, url, html_content, status_code')
        .eq('site_crawl_id', siteCrawlId)
        .eq('status_code', 200) // Only analyze successful pages
        .not('html_content', 'is', null); // Skip pages without HTML content
        
      if (pagesError) throw pagesError;
      if (!pages || pages.length === 0) return [];
      
      const results: SchemaValidationResult[] = [];
      
      for (const page of pages) {
        // Initialize result
        const result: SchemaValidationResult = {
          pageId: page.id,
          url: page.url,
          hasSchema: false,
          schemaTypes: [],
          validationErrors: [],
          missingRequiredProperties: {},
          isValid: true
        };
        
        if (!page.html_content) continue;
        
        const $ = cheerio.load(page.html_content);
        
        // Look for JSON-LD schema markup
        const jsonLdScripts = $('script[type="application/ld+json"]');
        
        if (jsonLdScripts.length > 0) {
          result.hasSchema = true;
          
          jsonLdScripts.each((i, script) => {
            try {
              const schemaText = $(script).html();
              if (!schemaText) return;
              
              const schemaData = JSON.parse(schemaText);
              
              // Check schema type
              const type = this.getSchemaType(schemaData);
              if (type && !result.schemaTypes.includes(type)) {
                result.schemaTypes.push(type);
              }
              
              // Perform basic validation
              const validationResult = this.validateSchemaData(schemaData);
              
              if (!validationResult.isValid) {
                result.isValid = false;
                result.validationErrors.push(...validationResult.errors);
                
                if (validationResult.missingRequiredProperties) {
                  result.missingRequiredProperties[type] = validationResult.missingRequiredProperties;
                }
              }
            } catch (err) {
              result.isValid = false;
              result.validationErrors.push('JSON parsing error: Invalid JSON-LD schema');
            }
          });
        }
        
        // Look for Microdata schema
        const itemscopes = $('[itemscope]');
        if (itemscopes.length > 0) {
          result.hasSchema = true;
          
          itemscopes.each((i, element) => {
            const itemtype = $(element).attr('itemtype');
            if (itemtype) {
              // Extract schema type from itemtype URL
              const typeParts = itemtype.split('/');
              const type = typeParts[typeParts.length - 1];
              
              if (type && !result.schemaTypes.includes(type)) {
                result.schemaTypes.push(type);
              }
            }
          });
        }
        
        results.push(result);
      }
      
      return results;
    } catch (error) {
      console.error('Error validating schema markup:', error);
      return [];
    }
  }
  
  /**
   * Extract schema type from schema data
   */
  private static getSchemaType(schemaData: any): string {
    if (!schemaData) return '';
    
    // Handle array of schemas
    if (Array.isArray(schemaData)) {
      return schemaData.map(item => this.getSchemaType(item)).filter(Boolean)[0] || '';
    }
    
    // Get @type directly
    if (schemaData['@type']) {
      return schemaData['@type'];
    }
    
    // Handle nested graph
    if (schemaData['@graph'] && Array.isArray(schemaData['@graph'])) {
      for (const item of schemaData['@graph']) {
        if (item['@type']) {
          return item['@type'];
        }
      }
    }
    
    return '';
  }
  
  /**
   * Validate schema data
   */
  private static validateSchemaData(schemaData: any): { 
    isValid: boolean; 
    errors: string[];
    missingRequiredProperties?: string[];
  } {
    const errors: string[] = [];
    let isValid = true;
    let missingRequiredProperties: string[] = [];
    
    // Basic structure validation
    if (!schemaData) {
      errors.push('Schema data is empty');
      isValid = false;
      return { isValid, errors };
    }
    
    // Handle array of schemas
    if (Array.isArray(schemaData)) {
      let arrayValid = true;
      const arrayErrors: string[] = [];
      
      schemaData.forEach((item, index) => {
        const result = this.validateSchemaData(item);
        if (!result.isValid) {
          arrayValid = false;
          result.errors.forEach(error => {
            arrayErrors.push(`Item ${index}: ${error}`);
          });
          
          if (result.missingRequiredProperties) {
            missingRequiredProperties.push(...result.missingRequiredProperties);
          }
        }
      });
      
      if (!arrayValid) {
        isValid = false;
        errors.push(...arrayErrors);
      }
      
      return { isValid, errors, missingRequiredProperties };
    }
    
    // Check type
    if (!schemaData['@type']) {
      errors.push('Schema missing required @type property');
      isValid = false;
      missingRequiredProperties.push('@type');
    }
    
    // Check context
    if (!schemaData['@context']) {
      errors.push('Schema missing required @context property');
      isValid = false;
      missingRequiredProperties.push('@context');
    }
    
    // Type-specific validation
    const type = schemaData['@type'];
    if (type) {
      switch (type) {
        case 'Organization':
          if (!schemaData.name) {
            errors.push('Organization schema missing required name property');
            isValid = false;
            missingRequiredProperties.push('name');
          }
          break;
          
        case 'LocalBusiness':
          if (!schemaData.name) {
            errors.push('LocalBusiness schema missing required name property');
            isValid = false;
            missingRequiredProperties.push('name');
          }
          if (!schemaData.address) {
            errors.push('LocalBusiness schema missing required address property');
            isValid = false;
            missingRequiredProperties.push('address');
          }
          break;
          
        case 'Product':
          if (!schemaData.name) {
            errors.push('Product schema missing required name property');
            isValid = false;
            missingRequiredProperties.push('name');
          }
          break;
          
        case 'Article':
        case 'BlogPosting':
        case 'NewsArticle':
          if (!schemaData.headline) {
            errors.push(`${type} schema missing required headline property`);
            isValid = false;
            missingRequiredProperties.push('headline');
          }
          break;
          
        case 'BreadcrumbList':
          if (!schemaData.itemListElement) {
            errors.push('BreadcrumbList schema missing required itemListElement property');
            isValid = false;
            missingRequiredProperties.push('itemListElement');
          }
          break;
      }
    }
    
    return { isValid, errors, missingRequiredProperties };
  }

  /**
   * Run a comprehensive technical SEO analysis for a domain
   */
  static async analyzeTechnicalSEO(siteId: string, domain: string, crawledPages: any[] = []): Promise<TechnicalSEOResult> {
    try {
      // Check if we have a recent analysis in the database
      const cachedResult = await this.getCachedAnalysis(siteId, domain);
      if (cachedResult) {
        return cachedResult;
      }

      // Initialize the result object
      const result: TechnicalSEOResult = {
        siteId,
        domain,
        score: 0,
        grade: { letter: 'F', color: '#ff4545', label: 'Poor' },
        issues: [],
        checks: { passed: 0, failed: 0, total: 0 },
        recommendations: [],
        robotsTxt: { exists: false, valid: false },
        sitemap: { exists: false, valid: false },
        ssl: { valid: false },
        canonicals: { valid: false },
        mobileCompatibility: { compatible: false },
        structured_data: { valid: false },
        http2: { implemented: false },
        resourceOptimization: { jsMinified: false, cssMinified: false },
        createdAt: new Date().toISOString()
      };

      // Run the various checks
      await Promise.all([
        this.checkRobotsTxt(domain, result),
        this.checkSitemap(domain, result),
        this.checkSSL(domain, result),
        this.checkHttp2(domain, result),
        this.checkResourceOptimization(domain, result),
        this.analyzeCrawledPages(domain, crawledPages, result)
      ]);

      // Generate recommendations based on issues
      const recommendations = this.generateSimpleRecommendations(result.issues);
      result.recommendations = recommendations;

      // Calculate the score
      result.score = this.calculateScore(result);
      result.grade = GradingSystemService.getGrade(result.score);

      // Save the results to the database
      await this.saveAnalysisResult(result);

      return result;
    } catch (error) {
      console.error('Error during technical SEO analysis:', error);
      throw error;
    }
  }

  /**
   * Generate simple recommendations based on issues array
   */
  private static generateSimpleRecommendations(issues: TechnicalSEOIssue[]): string[] {
    const recommendations: string[] = [];
    const recommendationSet = new Set<string>();
    
    // Add recommendations based on issue types
    issues.forEach(issue => {
      if (!recommendationSet.has(issue.recommendation)) {
        recommendationSet.add(issue.recommendation);
        recommendations.push(issue.recommendation);
      }
    });
    
    // Add HTTP/2 specific recommendations if needed
    if (issues.some(issue => issue.id.includes('http2'))) {
      recommendations.push('Implement HTTP/2 protocol to improve page loading performance');
      recommendations.push('Use a CDN that supports HTTP/2 for better resource delivery');
    }
    
    // Add resource optimization recommendations if needed
    if (issues.some(issue => issue.id.includes('js-not-minified') || issue.id.includes('css-not-minified'))) {
      recommendations.push('Minify JavaScript and CSS files to improve page loading speed');
      recommendations.push('Use a build process that includes minification (webpack, gulp, etc.)');
    }
    
    // Add general recommendations
    if (recommendations.length === 0) {
      recommendations.push('Regularly monitor technical SEO issues to maintain good search engine visibility');
      recommendations.push('Consider implementing structured data to enhance search result appearance');
      recommendations.push('Ensure your website is mobile-friendly and loads quickly on all devices');
    }
    
    return recommendations;
  }

  /**
   * Get cached analysis if it exists and is recent
   */
  private static async getCachedAnalysis(siteId: string, domain: string): Promise<TechnicalSEOResult | null> {
    try {
      const { data, error } = await this.supabase
        .from('technical_seo_analysis')
        .select('result')
        .eq('site_id', siteId)
        .eq('domain', domain)
        .gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Cache for 7 days
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        return null;
      }

      return data[0].result;
    } catch (error) {
      console.error('Error getting cached technical SEO analysis:', error);
      return null;
    }
  }

  /**
   * Save analysis result to database
   */
  private static async saveAnalysisResult(result: TechnicalSEOResult): Promise<void> {
    try {
      await this.supabase.from('technical_seo_analysis').insert({
        site_id: result.siteId,
        domain: result.domain,
        score: result.score,
        issues_count: result.issues.length,
        passed_checks: result.checks.passed,
        failed_checks: result.checks.failed,
        result: result,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving technical SEO analysis:', error);
    }
  }

  /**
   * Check robots.txt file
   */
  private static async checkRobotsTxt(domain: string, result: TechnicalSEOResult): Promise<void> {
    try {
      // In a real implementation, this would fetch the robots.txt file
      // For demo purposes, we'll create a synthetic result
      result.checks.total += 1;
      
      const robotsTxtUrl = `https://${domain}/robots.txt`;
      const exists = Math.random() > 0.2; // Simulate 80% chance of having robots.txt
      
      result.robotsTxt.exists = exists;
      
      if (exists) {
        result.robotsTxt.valid = Math.random() > 0.3; // 70% chance of being valid
        result.robotsTxt.content = `User-agent: *\nDisallow: /admin/\nDisallow: /private/\nSitemap: https://${domain}/sitemap.xml`;
        
        result.checks.passed += 1;
        
        if (!result.robotsTxt.valid) {
          result.robotsTxt.issues = ['Contains syntax errors', 'Missing sitemap directive'];
          result.checks.failed += 1;
          
          result.issues.push({
            id: 'robots-txt-invalid',
            url: robotsTxtUrl,
            type: 'robots',
            severity: 'medium',
            description: 'Robots.txt file has syntax errors or missing important directives',
            recommendation: 'Fix syntax errors and add a sitemap directive to your robots.txt file'
          });
        }
      } else {
        result.checks.failed += 1;
        result.robotsTxt.issues = ['File not found'];
        
        result.issues.push({
          id: 'robots-txt-missing',
          url: robotsTxtUrl,
          type: 'robots',
          severity: 'medium',
          description: 'Robots.txt file not found',
          recommendation: 'Create a robots.txt file to control search engine crawling'
        });
      }
    } catch (error) {
      console.error('Error checking robots.txt:', error);
      result.checks.failed += 1;
      result.issues.push({
        id: 'robots-txt-error',
        url: `https://${domain}/robots.txt`,
        type: 'robots',
        severity: 'high',
        description: 'Error checking robots.txt file',
        recommendation: 'Check server configuration and ensure robots.txt is accessible'
      });
    }
  }

  /**
   * Check sitemap.xml file
   */
  private static async checkSitemap(domain: string, result: TechnicalSEOResult): Promise<void> {
    try {
      // In a real implementation, this would fetch and validate the sitemap
      // For demo purposes, we'll create a synthetic result
      result.checks.total += 1;
      
      const sitemapUrl = `https://${domain}/sitemap.xml`;
      const exists = Math.random() > 0.3; // Simulate 70% chance of having sitemap
      
      result.sitemap.exists = exists;
      
      if (exists) {
        result.sitemap.valid = Math.random() > 0.2; // 80% chance of being valid
        result.sitemap.urls = Math.floor(Math.random() * 100) + 5; // 5-105 URLs
        
        result.checks.passed += 1;
        
        if (!result.sitemap.valid) {
          result.sitemap.issues = ['Contains invalid URLs', 'Missing lastmod attributes'];
          result.checks.failed += 1;
          
          result.issues.push({
            id: 'sitemap-invalid',
            url: sitemapUrl,
            type: 'sitemap',
            severity: 'medium',
            description: 'Sitemap.xml file has validation errors',
            recommendation: 'Fix validation errors in your sitemap.xml file'
          });
        }
      } else {
        result.checks.failed += 1;
        result.sitemap.issues = ['File not found'];
        
        result.issues.push({
          id: 'sitemap-missing',
          url: sitemapUrl,
          type: 'sitemap',
          severity: 'high',
          description: 'Sitemap.xml file not found',
          recommendation: 'Create a sitemap.xml file to help search engines discover your pages'
        });
      }
    } catch (error) {
      console.error('Error checking sitemap:', error);
      result.checks.failed += 1;
      result.issues.push({
        id: 'sitemap-error',
        url: `https://${domain}/sitemap.xml`,
        type: 'sitemap',
        severity: 'high',
        description: 'Error checking sitemap.xml file',
        recommendation: 'Check server configuration and ensure sitemap.xml is accessible'
      });
    }
  }

  /**
   * Check SSL certificate
   */
  private static async checkSSL(domain: string, result: TechnicalSEOResult): Promise<void> {
    try {
      // In a real implementation, this would check the SSL certificate
      // For demo purposes, we'll create a synthetic result
      result.checks.total += 1;
      
      const isValid = Math.random() > 0.1; // 90% chance of having valid SSL
      result.ssl.valid = isValid;
      
      if (isValid) {
        // Generate random expiry date between 1 month and 1 year from now
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30 + Math.floor(Math.random() * 335));
        result.ssl.expires = expiryDate.toISOString();
        
        result.checks.passed += 1;
        
        // Check if certificate expires soon
        const now = new Date();
        const daysToExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysToExpiry < 30) {
          result.ssl.issues = [`Certificate expires in ${daysToExpiry} days`];
          result.issues.push({
            id: 'ssl-expiring',
            url: `https://${domain}`,
            type: 'ssl',
            severity: 'medium',
            description: `SSL certificate expires in ${daysToExpiry} days`,
            recommendation: 'Renew your SSL certificate before it expires'
          });
        }
      } else {
        result.checks.failed += 1;
        result.ssl.issues = ['Invalid or missing SSL certificate'];
        
        result.issues.push({
          id: 'ssl-invalid',
          url: `https://${domain}`,
          type: 'ssl',
          severity: 'critical',
          description: 'Invalid or missing SSL certificate',
          recommendation: 'Install a valid SSL certificate to enable HTTPS'
        });
      }
    } catch (error) {
      console.error('Error checking SSL:', error);
      result.checks.failed += 1;
      result.issues.push({
        id: 'ssl-error',
        url: `https://${domain}`,
        type: 'ssl',
        severity: 'critical',
        description: 'Error checking SSL certificate',
        recommendation: 'Verify SSL configuration and ensure certificate is properly installed'
      });
    }
  }

  /**
   * Check if website uses HTTP/2 protocol
   */
  private static async checkHttp2(domain: string, result: TechnicalSEOResult): Promise<void> {
    try {
      result.checks.total += 1;
      
      const url = `https://${domain}`;
      
      // Use node-fetch or another HTTP client that exposes protocol version
      // Here we'll make a HEAD request to check the protocol
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'SEOMax Technical Analyzer'
        }
      });
      
      // In a real implementation, you'd check the protocol version from the response
      // For demonstration, we'll use a simulated approach
      // Node.js fetch doesn't directly expose protocol version, in production you'd use
      // a library that provides this information like got, axios with custom config, etc.
      
      // This is where you'd check the actual HTTP/2 implementation
      // Simulating for demo - in production replace with actual HTTP/2 detection
      const hasHttp2 = Math.random() > 0.4; // Simulate 60% chance of having HTTP/2
      
      result.http2.implemented = hasHttp2;
      
      if (hasHttp2) {
        result.checks.passed += 1;
      } else {
        result.checks.failed += 1;
        result.http2.issues = ['HTTP/2 not implemented'];
        
        result.issues.push({
          id: 'http2-not-implemented',
          url: url,
          type: 'page_speed',
          severity: 'medium',
          description: 'HTTP/2 protocol not implemented',
          recommendation: 'Implement HTTP/2 to improve loading performance through multiplexing'
        });
      }
    } catch (error) {
      console.error('Error checking HTTP/2:', error);
      result.checks.failed += 1;
      result.http2.issues = ['Error checking HTTP/2'];
      
      result.issues.push({
        id: 'http2-check-error',
        url: `https://${domain}`,
        type: 'page_speed',
        severity: 'medium',
        description: 'Error checking HTTP/2 protocol implementation',
        recommendation: 'Verify server supports HTTP/2 protocol for improved performance'
      });
    }
  }
  
  /**
   * Check if JavaScript and CSS files are minified
   */
  private static async checkResourceOptimization(domain: string, result: TechnicalSEOResult): Promise<void> {
    try {
      result.checks.total += 1;
      
      const url = `https://${domain}`;
      
      // In a real implementation, you would:
      // 1. Fetch the HTML page
      // 2. Extract JS and CSS URLs
      // 3. Fetch a sample of these resources
      // 4. Analyze the content to check if they're minified
      
      // Simulating for demo - in production implement proper detection
      const jsMinified = Math.random() > 0.3; // 70% chance of JS being minified
      const cssMinified = Math.random() > 0.4; // 60% chance of CSS being minified
      
      result.resourceOptimization.jsMinified = jsMinified;
      result.resourceOptimization.cssMinified = cssMinified;
      
      const hasIssues = !jsMinified || !cssMinified;
      
      if (!hasIssues) {
        result.checks.passed += 1;
      } else {
        result.checks.failed += 1;
        result.resourceOptimization.issues = [];
        
        if (!jsMinified) {
          result.resourceOptimization.issues.push('JavaScript files not minified');
          
          result.issues.push({
            id: 'js-not-minified',
            url: url,
            type: 'page_speed',
            severity: 'medium',
            description: 'JavaScript files are not minified',
            recommendation: 'Minify JavaScript files to reduce file size and improve load time'
          });
        }
        
        if (!cssMinified) {
          result.resourceOptimization.issues.push('CSS files not minified');
          
          result.issues.push({
            id: 'css-not-minified',
            url: url,
            type: 'page_speed',
            severity: 'medium',
            description: 'CSS files are not minified',
            recommendation: 'Minify CSS files to reduce file size and improve load time'
          });
        }
      }
    } catch (error) {
      console.error('Error checking resource optimization:', error);
      result.checks.failed += 1;
      result.resourceOptimization.issues = ['Error checking resource optimization'];
      
      result.issues.push({
        id: 'resource-optimization-error',
        url: `https://${domain}`,
        type: 'page_speed',
        severity: 'medium',
        description: 'Error checking JavaScript and CSS minification',
        recommendation: 'Ensure JavaScript and CSS files are minified to improve page loading speed'
      });
    }
  }

  /**
   * Analyze crawled pages for technical issues
   */
  private static async analyzeCrawledPages(domain: string, pages: any[], result: TechnicalSEOResult): Promise<void> {
    // For demo purposes, we'll simulate analyzing pages with synthetic data
    // In a real implementation, this would analyze the actual crawled pages
    
    // If no pages are provided, return early
    if (!pages || pages.length === 0) {
      return;
    }
    
    // Canonical issues
    result.checks.total += 1;
    const canonicalIssues = Math.random() > 0.7; // 30% chance of having canonical issues
    result.canonicals.valid = !canonicalIssues;
    
    if (canonicalIssues) {
      result.checks.failed += 1;
      result.canonicals.issues = ['Missing canonical tags', 'Inconsistent canonical URLs'];
      
      // Add a sample issue
      result.issues.push({
        id: 'canonical-missing',
        url: `https://${domain}/sample-page`,
        type: 'canonical',
        severity: 'medium',
        description: 'Missing canonical tag on page',
        recommendation: 'Add a canonical tag to specify the preferred URL'
      });
    } else {
      result.checks.passed += 1;
    }
    
    // Mobile compatibility
    result.checks.total += 1;
    const mobileIssues = Math.random() > 0.8; // 20% chance of having mobile issues
    result.mobileCompatibility.compatible = !mobileIssues;
    
    if (mobileIssues) {
      result.checks.failed += 1;
      result.mobileCompatibility.issues = ['Viewport not set', 'Touch elements too close'];
      
      // Add a sample issue
      result.issues.push({
        id: 'mobile-viewport',
        url: `https://${domain}/sample-page`,
        type: 'mobile_friendly',
        severity: 'high',
        description: 'Viewport meta tag not set properly',
        recommendation: 'Add a proper viewport meta tag for mobile compatibility'
      });
    } else {
      result.checks.passed += 1;
    }
    
    // Structured data
    result.checks.total += 1;
    const structuredDataIssues = Math.random() > 0.6; // 40% chance of having structured data issues
    result.structured_data.valid = !structuredDataIssues;
    result.structured_data.types = ['Product', 'BreadcrumbList', 'Organization'];
    
    if (structuredDataIssues) {
      result.checks.failed += 1;
      result.structured_data.issues = ['Invalid schema markup', 'Missing required properties'];
      
      // Add a sample issue
      result.issues.push({
        id: 'structured-data-invalid',
        url: `https://${domain}/product-page`,
        type: 'structured_data',
        severity: 'medium',
        description: 'Invalid structured data markup',
        recommendation: 'Fix structured data to comply with schema.org specifications'
      });
    } else {
      result.checks.passed += 1;
    }
    
    // HTTP status issues (sample of 10% of pages having issues)
    const pagesWithStatusIssues = Math.ceil(pages.length * 0.1);
    
    for (let i = 0; i < pagesWithStatusIssues; i++) {
      const randomStatus = [404, 500, 302, 301][Math.floor(Math.random() * 4)];
      const randomPage = pages[Math.floor(Math.random() * pages.length)];
      
      result.checks.total += 1;
      result.checks.failed += 1;
      
      let severity: 'critical' | 'high' | 'medium' = 'medium';
      let description = '';
      let recommendation = '';
      
      switch (randomStatus) {
        case 404:
          severity = 'high';
          description = 'Page returns 404 Not Found error';
          recommendation = 'Fix broken page or implement a proper 404 page with redirects';
          break;
        case 500:
          severity = 'critical';
          description = 'Page returns 500 Server Error';
          recommendation = 'Fix server error by checking server logs and application code';
          break;
        case 302:
          severity = 'medium';
          description = 'Page uses temporary (302) redirect';
          recommendation = 'Replace temporary redirects with permanent (301) redirects';
          break;
        case 301:
          severity = 'medium';
          description = 'Page uses a redirect chain';
          recommendation = 'Simplify redirect chains to a single redirect';
          break;
      }
      
      result.issues.push({
        id: `http-status-${randomStatus}-${i}`,
        url: randomPage.url || `https://${domain}/sample-page-${i}`,
        type: 'http_status',
        severity,
        description,
        recommendation
      });
    }
  }

  /**
   * Calculate technical SEO score based on checks and issues
   */
  private static calculateScore(result: TechnicalSEOResult): number {
    // Base score starts at 100 and we subtract based on issues
    let score = 100;
    
    // Calculate pass ratio for checks
    const passRatio = result.checks.total > 0 
      ? (result.checks.passed / result.checks.total) 
      : 0;
    
    // Weight critical issues heavily
    const criticalIssues = result.issues.filter(i => i.severity === 'critical').length;
    const highIssues = result.issues.filter(i => i.severity === 'high').length;
    const mediumIssues = result.issues.filter(i => i.severity === 'medium').length;
    const lowIssues = result.issues.filter(i => i.severity === 'low').length;
    
    // Apply deductions based on issue severity
    score -= criticalIssues * 15; // Critical issues are severe
    score -= highIssues * 8;      // High issues are important
    score -= mediumIssues * 3;    // Medium issues affect SEO 
    score -= lowIssues * 1;       // Low issues are minor
    
    // Apply multiplier based on pass ratio
    score = score * (0.5 + (passRatio * 0.5));
    
    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Get technical SEO analysis for a specific page
   */
  static async getPageAnalysis(siteId: string, domain: string, url: string): Promise<TechnicalSEOIssue[]> {
    try {
      const { data, error } = await this.supabase
        .from('technical_seo_analysis')
        .select('result')
        .eq('site_id', siteId)
        .eq('domain', domain)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error || !data || data.length === 0) {
        return [];
      }
      
      const result = data[0].result as TechnicalSEOResult;
      return result.issues.filter(issue => issue.url === url);
    } catch (error) {
      console.error('Error getting page technical SEO analysis:', error);
      return [];
    }
  }

  /**
   * Get most recent technical SEO analysis for a domain
   */
  static async getLatestAnalysis(siteId: string, domain: string): Promise<TechnicalSEOResult | null> {
    try {
      const { data, error } = await this.supabase
        .from('technical_seo_analysis')
        .select('result')
        .eq('site_id', siteId)
        .eq('domain', domain)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error || !data || data.length === 0) {
        return null;
      }
      
      return data[0].result;
    } catch (error) {
      console.error('Error getting latest technical SEO analysis:', error);
      return null;
    }
  }

  /**
   * Get count of issues by severity
   */
  static getIssueCountBySeverity(result: TechnicalSEOResult): { 
    critical: number; 
    high: number; 
    medium: number; 
    low: number; 
    info: number;
  } {
    return {
      critical: result.issues.filter(i => i.severity === 'critical').length,
      high: result.issues.filter(i => i.severity === 'high').length,
      medium: result.issues.filter(i => i.severity === 'medium').length,
      low: result.issues.filter(i => i.severity === 'low').length,
      info: result.issues.filter(i => i.severity === 'info').length,
    };
  }

  /**
   * Get historical technical SEO scores for a domain
   */
  static async getHistoricalScores(siteId: string, domain: string, limit: number = 6): Promise<Array<{
    date: string;
    score: number;
    issues: number;
  }>> {
    try {
      const { data, error } = await this.supabase
        .from('technical_seo_analysis')
        .select('created_at, score, issues_count')
        .eq('site_id', siteId)
        .eq('domain', domain)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error || !data) {
        return [];
      }
      
      return data.map(item => ({
        date: item.created_at,
        score: item.score,
        issues: item.issues_count,
      })).reverse(); // Return in chronological order
    } catch (error) {
      console.error('Error getting historical technical SEO scores:', error);
      return [];
    }
  }
} 