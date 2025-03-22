import { createClient } from '@/lib/supabase/client';
import type { TechnicalIssue, TechnicalSEOAudit, SchemaValidationResult } from '@/lib/types/seo';
import * as cheerio from 'cheerio';

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
      // Get all issues from this crawl
      const { data: issues, error } = await this.supabase
        .from('technical_issues')
        .select('*')
        .eq('site_crawl_id', siteCrawlId);
        
      if (error) throw error;
      if (!issues || issues.length === 0) return {};
      
      // Group issues by type
      const issuesByType: Record<string, TechnicalIssue[]> = {};
      for (const issue of issues) {
        if (!issuesByType[issue.issue_type]) {
          issuesByType[issue.issue_type] = [];
        }
        issuesByType[issue.issue_type].push(issue);
      }
      
      // Generate recommendations for each issue type
      const recommendations: Record<string, string[]> = {};
      
      // Missing or duplicate title tags
      if (issuesByType['missing_title'] || issuesByType['duplicate_title']) {
        recommendations['title_issues'] = [
          'Create unique, descriptive title tags for each page',
          'Keep titles between 50-60 characters in length',
          'Include your main keyword near the beginning of the title',
          'Use title format: Primary Keyword | Secondary Keyword | Brand Name',
          'Avoid keyword stuffing in titles',
          'Use a unique title on every page'
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
      
      // URL structure issues
      if (issuesByType['url_structure']) {
        recommendations['url_structure_issues'] = [
          'Keep URLs short and descriptive',
          'Use lowercase letters in URLs',
          'Include keywords in URLs when relevant',
          'Use hyphens (-) instead of underscores (_) to separate words',
          'Avoid using query parameters for indexable content',
          'Create a logical URL structure that reflects your site hierarchy',
          'Avoid special characters in URLs'
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
        'Add a unique title tag between 50-60 characters to each page',
        'Include relevant keywords near the beginning of the title',
        'Follow a consistent pattern like: Primary Keyword | Secondary Keyword | Brand Name',
        'Make titles compelling and clickable for better CTR',
        'Implement titles using the <title> tag in the <head> section'
      ],
      'duplicate_title': [
        'Review all pages with duplicate titles and create unique titles for each',
        'Ensure each title accurately describes the specific content of the page',
        'For similar content, highlight unique aspects in the title',
        'Audit your CMS templates to ensure they don\'t generate duplicate titles',
        'Check for dynamically generated titles from parameters'
      ],
      'missing_meta_description': [
        'Write a compelling meta description between 120-158 characters',
        'Include relevant keywords naturally in the description',
        'Add a clear call-to-action when appropriate',
        'Ensure the description accurately summarizes the page content',
        'Implement meta descriptions using the <meta name="description"> tag'
      ],
      'duplicate_meta_description': [
        'Create unique meta descriptions for each page',
        'Focus on the unique value proposition of each page in the description',
        'Review and update meta description templates in your CMS',
        'Prioritize high-traffic pages when updating descriptions',
        'Make descriptions actionable and specific to the page'
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
      'low_content': [
        'Expand content with valuable, relevant information',
        'Add detailed explanations, examples, or case studies',
        'Include multimedia elements like images, videos, or infographics',
        'Merge similar thin content pages into more comprehensive guides',
        'Focus on addressing user questions and providing complete answers',
        'Add statistical data, quotes from experts, or research findings'
      ]
    };
    
    return solutions[issueType] || [
      'Review best practices for this issue type',
      'Consult Google\'s official documentation',
      'Consider conducting a more detailed audit of this issue',
      'Test changes incrementally and monitor results',
      'Ensure all changes align with overall SEO strategy'
    ];
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
} 