import { createClient } from '@/lib/supabase/client';
import { SiteCrawlerService } from './SiteCrawlerService';
import { CrawleeService } from './CrawleeService';
import { ImageOptimizationService } from './ImageOptimizationService';
import { DuplicateContentService } from './DuplicateContentService';
import { SchemaMarkupService } from './SchemaMarkupService';
import { CoreWebVitalsService } from './CoreWebVitalsService';
import { ContentAnalyzerService } from './ContentAnalyzerService';
import { GradingSystemService } from './GradingSystemService';
import { BacklinkAnalysisService } from './BacklinkAnalysisService';
import { SocialMediaAnalysisService } from './SocialMediaAnalysisService';
import { TechnicalSEOService } from './TechnicalSEOService';
import { LighthouseService } from './LighthouseService';

export interface AdvancedSEOAuditResult {
  siteCrawlId: string;
  url: string;
  performanceScore: number;
  contentScore: number;
  technicalScore: number;
  onPageScore: number;
  overallScore: number;
  criticalIssues: number;
  warnings: number;
  improvements: number;
  completed: boolean;
  createdAt: string;
}

export interface SEOAuditSummary {
  id: string;
  title: string;
  date: string;
  overallScore: {
    value: number;
    grade: { letter: string };
    issueCount: number;
    improvementPotential: number;
  };
  categories: SEOCategory[];
  passedChecks: number;
  failedChecks: number;
  crawledPages: number;
  improvementsSummary: string;
  summary: string;
  nextSteps: string;
  previousScore: number | null;
  industryAverage?: number;
}

export interface SEOCategory {
  id: string;
  name: string;
  score: {
    value: number;
    grade: { letter: string };
    issueCount: number;
    improvementPotential: number;
  };
  issues: SEOIssue[];
  recommendations?: string[];
  summary: string;
}

export interface SEOIssue {
  id: string;
  type: string;
  severity: string;
  description: string;
  recommendation: string;
  affectedUrls: string[];
}

export class AdvancedSEOAnalyzerService {
  private static supabase = createClient();
  
  /**
   * Run a complete SEO audit including all advanced analysis
   */
  static async runAdvancedAudit(siteId: string, url: string): Promise<AdvancedSEOAuditResult> {
    try {
      // Initial audit result - will be updated as processes complete
      const initialAuditResult: AdvancedSEOAuditResult = {
        siteCrawlId: '',
        url,
        performanceScore: 0,
        contentScore: 0,
        technicalScore: 0,
        onPageScore: 0,
        overallScore: 0,
        criticalIssues: 0,
        warnings: 0,
        improvements: 0,
        completed: false,
        createdAt: new Date().toISOString()
      };
      
      // Store the initial result to get an ID
      const { data: initialData, error: initialError } = await this.supabase
        .from('advanced_seo_audits')
        .insert(initialAuditResult)
        .select()
        .single();
      
      if (initialError) throw initialError;
      
      const auditId = initialData.id;
      
      // Create a new crawl session
      const { data: crawlData, error: crawlError } = await this.supabase
        .from('site_crawls')
        .insert({
          project_id: siteId,
          user_id: 'system', // System crawl
          status: 'pending',
          is_enhanced: true, // Mark as an enhanced crawl
          js_rendering_enabled: true, // Enable JavaScript rendering
        })
        .select()
        .single();
        
      if (crawlError) throw crawlError;
      
      const siteCrawlId = crawlData.id;
      
      // Update the audit with the crawl ID
      const partialUpdate = {
        site_crawl_id: siteCrawlId
      };
      
      await this.supabase
        .from('advanced_seo_audits')
        .update(partialUpdate)
        .eq('id', auditId);
      
      // Start the crawling process using CrawleeService
      // This gives us better JavaScript rendering capabilities
      await CrawleeService.crawlWebsite(siteCrawlId, url, {
        maxPages: 25, // Limit to 25 pages
        maxDepth: 3,
        followExternalLinks: false,
        respectRobotsTxt: true
      });
      
      // Run all analyses in parallel
      const analyzePromises = [
        this.analyzePerformance(siteCrawlId),
        this.analyzeContent(siteCrawlId),
        this.analyzeTechnicalSEO(siteCrawlId),
        this.analyzeOnPageSEO(siteCrawlId)
      ];
      
      const [
        performanceResult,
        contentResult,
        technicalResult,
        onPageResult
      ] = await Promise.all(analyzePromises);
      
      // Calculate overall score and issue counts
      const overallScore = Math.round(
        (performanceResult.score * 0.25) +
        (contentResult.score * 0.3) +
        (technicalResult.score * 0.25) +
        (onPageResult.score * 0.2)
      );
      
      const criticalIssues = 
        performanceResult.criticalIssues +
        contentResult.criticalIssues +
        technicalResult.criticalIssues +
        onPageResult.criticalIssues;
      
      const warnings = 
        performanceResult.warnings +
        contentResult.warnings +
        technicalResult.warnings +
        onPageResult.warnings;
      
      const improvements = 
        performanceResult.improvements +
        contentResult.improvements +
        technicalResult.improvements +
        onPageResult.improvements;
      
      // Final audit result
      const finalResult: AdvancedSEOAuditResult = {
        siteCrawlId,
        url,
        performanceScore: performanceResult.score,
        contentScore: contentResult.score,
        technicalScore: technicalResult.score,
        onPageScore: onPageResult.score,
        overallScore,
        criticalIssues,
        warnings,
        improvements,
        completed: true,
        createdAt: new Date().toISOString()
      };
      
      // Update the audit with final results
      await this.supabase
        .from('advanced_seo_audits')
        .update({
          site_crawl_id: finalResult.siteCrawlId,
          performance_score: finalResult.performanceScore,
          content_score: finalResult.contentScore,
          technical_score: finalResult.technicalScore,
          on_page_score: finalResult.onPageScore,
          overall_score: finalResult.overallScore,
          critical_issues: finalResult.criticalIssues,
          warnings: finalResult.warnings,
          improvements: finalResult.improvements,
          completed: finalResult.completed,
          updated_at: finalResult.createdAt
        })
        .eq('id', auditId);
      
      return finalResult;
    } catch (error) {
      console.error('Error running advanced SEO audit:', error);
      throw error;
    }
  }
  
  /**
   * Analyze performance metrics (Core Web Vitals)
   */
  private static async analyzePerformance(siteCrawlId: string): Promise<{
    score: number;
    criticalIssues: number;
    warnings: number;
    improvements: number;
  }> {
    try {
      // Get all pages from the crawl
      const { data: pages, error } = await this.supabase
        .from('crawled_pages')
        .select('id, url, status_code')
        .eq('site_crawl_id', siteCrawlId)
        .eq('status_code', 200);
      
      if (error) throw error;
      
      if (!pages || pages.length === 0) {
        return {
          score: 0,
          criticalIssues: 0,
          warnings: 0,
          improvements: 0
        };
      }
      
      // Run Lighthouse audits on a sample of pages (max 5)
      const pageCount = Math.min(pages.length, 5);
      const pagesToAudit = pages.slice(0, pageCount);
      
      // Run Lighthouse audits on these pages
      await LighthouseService.auditCrawledPages(siteCrawlId, pageCount);
      
      // Get average metrics
      const avgMetrics = await LighthouseService.calculateAverageMetrics(siteCrawlId);
      
      if (!avgMetrics) {
        return {
          score: 0,
          criticalIssues: 0,
          warnings: 0,
          improvements: 0
        };
      }
      
      // Calculate issues based on performance metrics
      let criticalIssues = 0;
      let warnings = 0;
      let improvements = 0;
      
      // Critical issues for very poor performance
      if (avgMetrics.performance && avgMetrics.performance < 30) {
        criticalIssues += 1;
      }
      
      // Warnings for poor performance
      if (avgMetrics.performance && avgMetrics.performance >= 30 && avgMetrics.performance < 50) {
        warnings += 1;
      }
      
      // Improvements for moderate performance
      if (avgMetrics.performance && avgMetrics.performance >= 50 && avgMetrics.performance < 90) {
        improvements += 1;
      }
      
      // Additional metric checks
      if (avgMetrics.largestContentfulPaint && avgMetrics.largestContentfulPaint > 2500) {
        warnings += 1;
      }
      
      if (avgMetrics.cumulativeLayoutShift && avgMetrics.cumulativeLayoutShift > 0.1) {
        warnings += 1;
      }
      
      if (avgMetrics.timeToInteractive && avgMetrics.timeToInteractive > 3500) {
        improvements += 1;
      }
      
      return {
        score: avgMetrics.performance || 0,
        criticalIssues,
        warnings,
        improvements
      };
    } catch (error) {
      console.error('Error analyzing performance:', error);
      
      return {
        score: 0,
        criticalIssues: 0,
        warnings: 0,
        improvements: 0
      };
    }
  }
  
  /**
   * Analyze content quality and duplicate content
   */
  private static async analyzeContent(siteCrawlId: string): Promise<{
    score: number;
    criticalIssues: number;
    warnings: number;
    improvements: number;
  }> {
    try {
      // Find duplicate content
      const duplicateResult = await DuplicateContentService.findDuplicateContent(siteCrawlId);
      
      // Get pages that need content analysis
      const { data: pages, error } = await this.supabase
        .from('crawled_pages')
        .select('id, url, title, html_content, js_rendered_html')
        .eq('site_crawl_id', siteCrawlId)
        .eq('status_code', 200);
      
      if (error) throw error;
      
      if (!pages || pages.length === 0) {
        return {
          score: 0,
          criticalIssues: 0,
          warnings: 0,
          improvements: 0
        };
      }
      
      // Run content analysis on each page
      let totalScore = 0;
      let criticalIssues = 0;
      let warnings = 0;
      let improvements = 0;
      
      // Count duplicate content issues
      const exactDuplicates = duplicateResult.exactDuplicates.length;
      const nearDuplicates = duplicateResult.nearDuplicates.length;
      const similarContent = duplicateResult.similarContent.length;
      
      if (exactDuplicates > 0) {
        criticalIssues += exactDuplicates;
      }
      
      if (nearDuplicates > 0) {
        warnings += nearDuplicates;
      }
      
      if (similarContent > 0) {
        improvements += similarContent;
      }
      
      // Limit content analysis to first 10 pages to avoid excessive API usage
      const pagesToAnalyze = pages.slice(0, 10);
      
      for (const page of pagesToAnalyze) {
        const htmlContent = page.js_rendered_html || page.html_content;
        if (!htmlContent) continue;
        
        // Get content score from ContentAnalyzerService
        try {
          const contentAnalysis = await ContentAnalyzerService.analyzeContent(
            htmlContent,
            page.title,
            page.url
          );
          
          if (contentAnalysis) {
            totalScore += contentAnalysis.contentScore;
            
            // Add issues based on content analysis
            if (contentAnalysis.contentScore < 50) {
              criticalIssues++;
            } else if (contentAnalysis.contentScore < 70) {
              warnings++;
            }
            
            improvements += contentAnalysis.recommendations.length;
          }
        } catch (contentError) {
          console.error(`Error analyzing content for ${page.url}:`, contentError);
        }
      }
      
      // Calculate average score
      const averageScore = Math.round(
        (totalScore / pagesToAnalyze.length) * 
        // Factor in duplicate content - reduce score based on number of duplicates
        (1 - (exactDuplicates * 0.15) - (nearDuplicates * 0.05) - (similarContent * 0.02))
      );
      
      // Ensure score is between 0-100
      const normalizedScore = Math.max(0, Math.min(100, averageScore));
      
      return {
        score: normalizedScore,
        criticalIssues,
        warnings,
        improvements
      };
    } catch (error) {
      console.error('Error analyzing content:', error);
      return {
        score: 0,
        criticalIssues: 0,
        warnings: 0,
        improvements: 0
      };
    }
  }
  
  /**
   * Analyze technical SEO aspects (Schema, etc.)
   */
  private static async analyzeTechnicalSEO(siteCrawlId: string): Promise<{
    score: number;
    criticalIssues: number;
    warnings: number;
    improvements: number;
  }> {
    try {
      // Get site information from crawl
      const { data: crawlData } = await this.supabase
        .from('site_crawls')
        .select('site_id, start_url')
        .eq('id', siteCrawlId)
        .single();
      
      if (!crawlData) {
        throw new Error('Site crawl data not found');
      }
      
      // Get domain from start URL
      const url = new URL(crawlData.start_url);
      const domain = url.hostname;
      
      // Get pages that need technical analysis
      const { data: pages, error } = await this.supabase
        .from('crawled_pages')
        .select('id, url, title, html_content, js_rendered_html')
        .eq('site_crawl_id', siteCrawlId)
        .eq('status_code', 200);
      
      if (error) throw error;
      
      if (!pages || pages.length === 0) {
        return {
          score: 0,
          criticalIssues: 0,
          warnings: 0,
          improvements: 0
        };
      }
      
      // Use TechnicalSEOService for comprehensive technical analysis
      const technicalSEOService = new TechnicalSEOService();
      const technicalAnalysis = await technicalSEOService.analyzeTechnicalSEO({
        siteId: crawlData.site_id,
        domain: domain,
        url: crawlData.start_url
      });
      
      // Run schema analysis on each page
      let totalSchemaScore = 0;
      let schemaCriticalIssues = 0;
      let schemaWarnings = 0;
      let schemaImprovements = 0;
      
      for (const page of pages) {
        const htmlContent = page.js_rendered_html || page.html_content;
        if (!htmlContent) continue;
        
        // Analyze schema markup
        try {
          const schemaAnalysis = await SchemaMarkupService.analyzePageSchema(
            siteCrawlId,
            page.id,
            page.url,
            htmlContent
          );
          
          totalSchemaScore += schemaAnalysis.score;
          
          // Count issues
          if (schemaAnalysis.schemaItems.length === 0) {
            schemaCriticalIssues++;
          } else {
            const invalidSchemas = schemaAnalysis.schemaItems.filter(item => !item.isValid).length;
            if (invalidSchemas > 0) {
              schemaWarnings += invalidSchemas;
            }
          }
          
          schemaImprovements += schemaAnalysis.suggestions.length;
        } catch (schemaError) {
          console.error(`Error analyzing schema for ${page.url}:`, schemaError);
        }
      }
      
      // Calculate average schema score
      const averageSchemaScore = pages.length > 0 ? Math.round(totalSchemaScore / pages.length) : 0;
      
      // Combine schema score with technical SEO score (weighted)
      const technicalScore = Math.round(
        (technicalAnalysis.score * 0.7) + (averageSchemaScore * 0.3)
      );
      
      // Count issues from technical analysis
      const criticalIssues = 
        technicalAnalysis.issues.filter(i => i.severity === 'critical').length + 
        schemaCriticalIssues;
      
      const warnings = 
        technicalAnalysis.issues.filter(i => i.severity === 'high' || i.severity === 'medium').length + 
        schemaWarnings;
      
      const improvements = 
        technicalAnalysis.issues.filter(i => i.severity === 'low' || i.severity === 'info').length + 
        technicalAnalysis.recommendations.length + 
        schemaImprovements;
      
      return {
        score: technicalScore,
        criticalIssues,
        warnings,
        improvements
      };
    } catch (error) {
      console.error('Error analyzing technical SEO:', error);
      return {
        score: 0,
        criticalIssues: 0,
        warnings: 0,
        improvements: 0
      };
    }
  }
  
  /**
   * Analyze on-page SEO elements (images, etc.)
   */
  private static async analyzeOnPageSEO(siteCrawlId: string): Promise<{
    score: number;
    criticalIssues: number;
    warnings: number;
    improvements: number;
  }> {
    try {
      // Get pages for image analysis
      const { data: pages, error } = await this.supabase
        .from('crawled_pages')
        .select('id, url, html_content, js_rendered_html')
        .eq('site_crawl_id', siteCrawlId)
        .eq('status_code', 200);
      
      if (error) throw error;
      
      if (!pages || pages.length === 0) {
        return {
          score: 0,
          criticalIssues: 0,
          warnings: 0,
          improvements: 0
        };
      }
      
      // Run image optimization analysis
      let totalScore = 0;
      let criticalIssues = 0;
      let warnings = 0;
      let improvements = 0;
      
      for (const page of pages) {
        const htmlContent = page.js_rendered_html || page.html_content;
        if (!htmlContent) continue;
        
        // Analyze images
        try {
          const imageAnalysis = await ImageOptimizationService.analyzePageImages(
            siteCrawlId,
            page.id,
            page.url,
            htmlContent
          );
          
          totalScore += imageAnalysis.optimizationScore;
          
          // Count issues
          criticalIssues += imageAnalysis.imageIssues.filter(i => i.severity === 'high').length;
          warnings += imageAnalysis.imageIssues.filter(i => i.severity === 'medium').length;
          improvements += imageAnalysis.imageIssues.filter(i => i.severity === 'low').length;
        } catch (imageError) {
          console.error(`Error analyzing images for ${page.url}:`, imageError);
        }
      }
      
      // Calculate average score
      const averageScore = Math.round(totalScore / pages.length);
      
      return {
        score: averageScore,
        criticalIssues,
        warnings,
        improvements
      };
    } catch (error) {
      console.error('Error analyzing on-page SEO:', error);
      return {
        score: 0,
        criticalIssues: 0,
        warnings: 0,
        improvements: 0
      };
    }
  }
  
  /**
   * Get the results of an advanced SEO audit
   */
  static async getAuditResults(auditId: string): Promise<AdvancedSEOAuditResult | null> {
    try {
      const { data, error } = await this.supabase
        .from('advanced_seo_audits')
        .select('*')
        .eq('id', auditId)
        .single();
      
      if (error) throw error;
      
      if (!data) return null;
      
      return {
        siteCrawlId: data.site_crawl_id,
        url: data.url,
        performanceScore: data.performance_score,
        contentScore: data.content_score,
        technicalScore: data.technical_score,
        onPageScore: data.on_page_score,
        overallScore: data.overall_score,
        criticalIssues: data.critical_issues,
        warnings: data.warnings,
        improvements: data.improvements,
        completed: data.completed,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Error getting audit results:', error);
      return null;
    }
  }
  
  /**
   * Get a list of recent audits for a site
   */
  static async getRecentAudits(siteId: string, limit: number = 5): Promise<AdvancedSEOAuditResult[]> {
    try {
      // First get site crawls for this site
      const { data: siteCrawls, error: crawlError } = await this.supabase
        .from('site_crawls')
        .select('id')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false })
        .limit(20); // Get more than we need to find ones with audits
      
      if (crawlError) throw crawlError;
      
      if (!siteCrawls || siteCrawls.length === 0) {
        return [];
      }
      
      // Get crawl IDs
      const crawlIds = siteCrawls.map(crawl => crawl.id);
      
      // Get audits for these crawls
      const { data: audits, error: auditError } = await this.supabase
        .from('advanced_seo_audits')
        .select('*')
        .in('site_crawl_id', crawlIds)
        .eq('completed', true)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (auditError) throw auditError;
      
      if (!audits) return [];
      
      // Map to our interface
      return audits.map(audit => ({
        siteCrawlId: audit.site_crawl_id,
        url: audit.url,
        performanceScore: audit.performance_score,
        contentScore: audit.content_score,
        technicalScore: audit.technical_score,
        onPageScore: audit.on_page_score,
        overallScore: audit.overall_score,
        criticalIssues: audit.critical_issues,
        warnings: audit.warnings,
        improvements: audit.improvements,
        completed: audit.completed,
        createdAt: audit.created_at
      }));
    } catch (error) {
      console.error('Error getting recent audits:', error);
      return [];
    }
  }

  public static async getAuditSummary(
    auditId: string,
    previousScore: number | null = null,
    industryAverage?: number
  ): Promise<SEOAuditSummary> {
    try {
      const supabase = createClient();
      
      // Get the main audit record
      const { data: audit, error } = await supabase
        .from('seo_audits')
        .select('*')
        .eq('id', auditId)
        .single();
      
      if (error || !audit) {
        throw new Error(`Error fetching audit: ${error?.message}`);
      }
      
      // Get performance metrics
      const { data: performanceData } = await supabase
        .from('performance_metrics')
        .select('*')
        .eq('audit_id', auditId);
      
      // Get content analysis
      const { data: contentData } = await supabase
        .from('content_analysis')
        .select('*')
        .eq('audit_id', auditId);
      
      // Get technical SEO issues
      const { data: technicalData } = await supabase
        .from('technical_seo')
        .select('*')
        .eq('audit_id', auditId);
      
      // Get on-page SEO data
      const { data: onPageData } = await supabase
        .from('onpage_seo')
        .select('*')
        .eq('audit_id', auditId);
      
      // Get schema markup data
      const { data: schemaData } = await supabase
        .from('schema_markup')
        .select('*')
        .eq('audit_id', auditId);
      
      // Get image optimization data
      const { data: imageData } = await supabase
        .from('image_optimization')
        .select('*')
        .eq('audit_id', auditId);
      
      // Get duplicate content data
      const { data: duplicateData } = await supabase
        .from('duplicate_content')
        .select('*')
        .eq('audit_id', auditId);
      
      // Compile categories
      const categories: SEOCategory[] = [];
      
      // Performance category
      if (performanceData && performanceData.length > 0) {
        const performanceIssues = this.compilePerformanceIssues(performanceData);
        categories.push({
          id: 'performance',
          name: 'Performance',
          score: {
            value: audit.performance_score || 0,
            grade: GradingSystemService.getGrade(audit.performance_score || 0),
            issueCount: performanceIssues.length,
            improvementPotential: this.calculateImprovementPotential(
              audit.performance_score || 0,
              performanceIssues
            ),
          },
          issues: performanceIssues,
          recommendations: this.generatePerformanceRecommendations(performanceData),
          summary: `Your site performance score is ${audit.performance_score}/100.`,
        });
      }
      
      // Content category
      if (contentData && contentData.length > 0) {
        const contentIssues = this.compileContentIssues(contentData);
        categories.push({
          id: 'content',
          name: 'Content',
          score: {
            value: audit.content_score || 0,
            grade: GradingSystemService.getGrade(audit.content_score || 0),
            issueCount: contentIssues.length,
            improvementPotential: this.calculateImprovementPotential(
              audit.content_score || 0,
              contentIssues
            ),
          },
          issues: contentIssues,
          recommendations: this.generateContentRecommendations(contentData),
          summary: `Your content quality score is ${audit.content_score}/100.`,
        });
      }
      
      // Technical SEO category
      if (technicalData && technicalData.length > 0) {
        const technicalIssues = this.compileTechnicalIssues(technicalData);
        categories.push({
          id: 'technical',
          name: 'Technical SEO',
          score: {
            value: audit.technical_score || 0,
            grade: GradingSystemService.getGrade(audit.technical_score || 0),
            issueCount: technicalIssues.length,
            improvementPotential: this.calculateImprovementPotential(
              audit.technical_score || 0,
              technicalIssues
            ),
          },
          issues: technicalIssues,
          recommendations: this.generateTechnicalRecommendations(technicalData),
          summary: `Your technical SEO score is ${audit.technical_score}/100.`,
        });
      }
      
      // On-page SEO category
      if (onPageData && onPageData.length > 0) {
        const onPageIssues = this.compileOnPageIssues(onPageData);
        categories.push({
          id: 'onpage',
          name: 'On-Page SEO',
          score: {
            value: audit.onpage_score || 0,
            grade: GradingSystemService.getGrade(audit.onpage_score || 0),
            issueCount: onPageIssues.length,
            improvementPotential: this.calculateImprovementPotential(
              audit.onpage_score || 0,
              onPageIssues
            ),
          },
          issues: onPageIssues,
          recommendations: this.generateOnPageRecommendations(onPageData),
          summary: `Your on-page SEO score is ${audit.onpage_score}/100.`,
        });
      }
      
      // Schema markup category
      if (schemaData && schemaData.length > 0) {
        const schemaIssues = this.compileSchemaIssues(schemaData);
        categories.push({
          id: 'schema',
          name: 'Schema Markup',
          score: {
            value: audit.schema_score || 0,
            grade: GradingSystemService.getGrade(audit.schema_score || 0),
            issueCount: schemaIssues.length,
            improvementPotential: this.calculateImprovementPotential(
              audit.schema_score || 0,
              schemaIssues
            ),
          },
          issues: schemaIssues,
          recommendations: this.generateSchemaRecommendations(schemaData),
          summary: `Your schema markup score is ${audit.schema_score}/100.`,
        });
      }
      
      // Image optimization category
      if (imageData && imageData.length > 0) {
        const imageIssues = this.compileImageIssues(imageData);
        categories.push({
          id: 'images',
          name: 'Image Optimization',
          score: {
            value: audit.image_score || 0,
            grade: GradingSystemService.getGrade(audit.image_score || 0),
            issueCount: imageIssues.length,
            improvementPotential: this.calculateImprovementPotential(
              audit.image_score || 0,
              imageIssues
            ),
          },
          issues: imageIssues,
          recommendations: this.generateImageRecommendations(imageData),
          summary: `Your image optimization score is ${audit.image_score}/100.`,
        });
      }
      
      // Duplicate content category
      if (duplicateData && duplicateData.length > 0) {
        const duplicateIssues = this.compileDuplicateContentIssues(duplicateData);
        categories.push({
          id: 'duplicate',
          name: 'Duplicate Content',
          score: {
            value: audit.duplicate_score || 0,
            grade: GradingSystemService.getGrade(audit.duplicate_score || 0),
            issueCount: duplicateIssues.length,
            improvementPotential: this.calculateImprovementPotential(
              audit.duplicate_score || 0,
              duplicateIssues
            ),
          },
          issues: duplicateIssues,
          recommendations: this.generateDuplicateContentRecommendations(duplicateData),
          summary: `Your duplicate content score is ${audit.duplicate_score}/100.`,
        });
      }
      
      // Count passed and failed checks
      const allIssues = categories.flatMap(cat => cat.issues);
      const failedChecks = allIssues.length;
      
      // Estimate passed checks (this would ideally come from the database)
      const passedChecks = categories.length * 10 - failedChecks;
      
      // Generate improvement summary
      const criticalIssues = allIssues.filter(issue => issue.severity === 'critical');
      let improvementsSummary = '';
      
      if (criticalIssues.length > 0) {
        improvementsSummary = `Focus on fixing the ${criticalIssues.length} critical issues first, particularly in the ${
          this.getLowestScoringCategory(categories).name
        } category. This could improve your overall score by up to ${
          this.calculateTotalImprovementPotential(categories)
        }%.`;
      } else if (allIssues.length > 0) {
        improvementsSummary = `Your site is performing well, but addressing the ${
          allIssues.length
        } minor issues found could further improve your score by up to ${
          this.calculateTotalImprovementPotential(categories)
        }%.`;
      } else {
        improvementsSummary = 'Excellent! Your site is well-optimized with no major issues detected.';
      }
      
      // Generate next steps
      const nextSteps = this.generateNextSteps(categories);
      
      // Compile the final SEOAuditSummary
      return {
        id: auditId,
        title: `SEO Audit for ${audit.site_url}`,
        date: audit.created_at,
        overallScore: {
          value: audit.overall_score || 0,
          grade: GradingSystemService.getGrade(audit.overall_score || 0),
          issueCount: failedChecks,
          improvementPotential: this.calculateTotalImprovementPotential(categories),
        },
        categories,
        passedChecks,
        failedChecks,
        crawledPages: audit.pages_crawled,
        improvementsSummary,
        summary: this.generateOverallSummary(audit, categories),
        nextSteps,
        previousScore,
        industryAverage,
      };
    } catch (error) {
      console.error('Error compiling audit summary:', error);
      throw error;
    }
  }

  private static calculateImprovementPotential(score: number, issues: SEOIssue[]): number {
    if (issues.length === 0) return 0;
    
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const infoCount = issues.filter(i => i.severity === 'info').length;
    
    // The idea is that fixing critical issues has more impact than warnings or info issues
    const potentialImprovement = Math.min(
      100 - score,
      criticalCount * 5 + warningCount * 2 + infoCount * 0.5
    );
    
    return Math.round(potentialImprovement);
  }

  private static calculateTotalImprovementPotential(categories: SEOCategory[]): number {
    if (categories.length === 0) return 0;
    
    // Weight the improvement potential by the importance of each category
    // This is a simplified approach - you might want a more sophisticated one
    const weightedImprovements = categories.map(category => {
      let weight = 1;
      switch (category.id) {
        case 'performance':
        case 'content':
          weight = 1.5;
          break;
        case 'technical':
        case 'onpage':
          weight = 1.2;
          break;
        default:
          weight = 1;
      }
      return (category.score.improvementPotential || 0) * weight;
    });
    
    const totalImprovement = Math.min(
      20, // Cap at 20% overall improvement potential
      weightedImprovements.reduce((sum, val) => sum + val, 0) / (categories.length * 1.2)
    );
    
    return Math.round(totalImprovement);
  }

  private static getLowestScoringCategory(categories: SEOCategory[]): SEOCategory {
    return categories.reduce(
      (lowest, current) => 
        (current.score.value < lowest.score.value) ? current : lowest,
      categories[0]
    );
  }

  private static generateNextSteps(categories: SEOCategory[]): string {
    // Sort categories by score (lowest first)
    const sortedCategories = [...categories].sort(
      (a, b) => a.score.value - b.score.value
    );
    
    // Take recommendations from the lowest scoring categories
    const topRecommendations = sortedCategories
      .slice(0, 2)
      .flatMap(cat => cat.recommendations || [])
      .slice(0, 3);
    
    if (topRecommendations.length === 0) {
      return 'Continue monitoring your SEO performance and make regular updates to your content.';
    }
    
    return `Prioritize these actions: 1) ${topRecommendations.join(', 2) ')}. Focus on improving your ${
      sortedCategories[0].name
    } score first for the biggest impact.`;
  }

  private static generateOverallSummary(audit: any, categories: SEOCategory[]): string {
    const overallScore = audit.overall_score || 0;
    const grade = GradingSystemService.getGrade(overallScore);
    
    let summary = `Your website scores ${overallScore}/100 (Grade ${grade.letter}) for SEO optimization. `;
    
    // Add context based on the score
    if (overallScore >= 90) {
      summary += 'Your site is extremely well-optimized with only minor improvements possible.';
    } else if (overallScore >= 80) {
      summary += 'Your site has good SEO foundations with some specific areas for improvement.';
    } else if (overallScore >= 70) {
      summary += 'Your site has a solid foundation but several areas need attention to improve rankings.';
    } else if (overallScore >= 60) {
      summary += 'Your site has significant SEO issues that are likely impacting your search visibility.';
    } else {
      summary += 'Your site has critical SEO problems that require immediate attention.';
    }
    
    // Add information about strengths and weaknesses
    const highestCategory = categories.reduce(
      (highest, current) => 
        (current.score.value > highest.score.value) ? current : highest,
      categories[0]
    );
    
    const lowestCategory = this.getLowestScoringCategory(categories);
    
    if (highestCategory.id !== lowestCategory.id) {
      summary += ` Strongest area: ${highestCategory.name} (${highestCategory.score.value}/100). Weakest area: ${
        lowestCategory.name
      } (${lowestCategory.score.value}/100).`;
    }
    
    return summary;
  }

  // Helper methods to compile issues from different data sources
  // These would process the raw data from the database into structured SEOIssue objects

  private static compilePerformanceIssues(performanceData: any[]): SEOIssue[] {
    const issues: SEOIssue[] = [];
    
    performanceData.forEach(data => {
      // Process each performance metric and create issues
      if (data.lcp > 2.5) {
        issues.push({
          id: `perf_lcp_${data.page_id}`,
          type: 'performance_lcp',
          severity: data.lcp > 4.0 ? 'critical' : 'warning',
          description: `Slow Largest Contentful Paint (${data.lcp.toFixed(2)}s)`,
          recommendation: 'Optimize critical rendering path and largest page elements',
          affectedUrls: [data.url],
        });
      }
      
      // Similarly for other metrics (simplified for brevity)
      if (data.cls > 0.1) {
        issues.push({
          id: `perf_cls_${data.page_id}`,
          type: 'performance_cls',
          severity: data.cls > 0.25 ? 'critical' : 'warning',
          description: `High Cumulative Layout Shift (${data.cls.toFixed(2)})`,
          recommendation: 'Fix layout shifts by setting explicit dimensions for dynamic content',
          affectedUrls: [data.url],
        });
      }
      
      // Add more performance issue types as needed
    });
    
    return issues;
  }

  // Similar methods for other categories
  // These would be implemented with actual logic to process each type of data

  private static compileContentIssues(contentData: any[]): SEOIssue[] {
    // Placeholder implementation
    return [];
  }

  private static compileTechnicalIssues(technicalData: any[]): SEOIssue[] {
    // Create an array to hold issues
    const issues: SEOIssue[] = [];
    
    // Process each technical SEO data entry
    technicalData.forEach(data => {
      if (data.issues && Array.isArray(data.issues)) {
        // Map the issues to our SEOIssue format
        const technicalIssues = data.issues.map((issue: any) => ({
          id: `tech_${issue.id || Math.random().toString(36).substring(2, 10)}`,
          type: issue.type || 'technical',
          severity: issue.severity || 'medium',
          description: issue.description,
          recommendation: issue.recommendation,
          affectedUrls: issue.affectedUrls || [],
        }));
        
        issues.push(...technicalIssues);
      }
      
      // Handle specific technical checks
      if (data.robotsTxt && !data.robotsTxt.valid) {
        issues.push({
          id: `tech_robots_${data.id || Math.random().toString(36).substring(2, 10)}`,
          type: 'robots_txt',
          severity: 'critical',
          description: 'Invalid or missing robots.txt file',
          recommendation: 'Create or fix your robots.txt file to control search engine access',
          affectedUrls: [data.domain || ''],
        });
      }
      
      if (data.sitemap && !data.sitemap.valid) {
        issues.push({
          id: `tech_sitemap_${data.id || Math.random().toString(36).substring(2, 10)}`,
          type: 'sitemap',
          severity: 'high',
          description: 'Invalid or missing XML sitemap',
          recommendation: 'Create or fix your sitemap.xml file to help search engines crawl your site',
          affectedUrls: [data.domain || ''],
        });
      }
      
      if (data.ssl && !data.ssl.valid) {
        issues.push({
          id: `tech_ssl_${data.id || Math.random().toString(36).substring(2, 10)}`,
          type: 'ssl',
          severity: 'critical',
          description: 'Invalid or missing SSL certificate',
          recommendation: 'Install a valid SSL certificate to secure your website and improve SEO',
          affectedUrls: [data.domain || ''],
        });
      }
      
      if (data.mobileCompatibility && !data.mobileCompatibility.compatible) {
        issues.push({
          id: `tech_mobile_${data.id || Math.random().toString(36).substring(2, 10)}`,
          type: 'mobile_friendly',
          severity: 'high',
          description: 'Website is not mobile-friendly',
          recommendation: 'Optimize your website for mobile devices to improve user experience and SEO',
          affectedUrls: [data.domain || ''],
        });
      }
      
      // Add more specific issue types as needed
    });
    
    return issues;
  }

  private static compileOnPageIssues(onPageData: any[]): SEOIssue[] {
    // Placeholder implementation
    return [];
  }

  private static compileSchemaIssues(schemaData: any[]): SEOIssue[] {
    // Placeholder implementation
    return [];
  }

  private static compileImageIssues(imageData: any[]): SEOIssue[] {
    // Placeholder implementation
    return [];
  }

  private static compileDuplicateContentIssues(duplicateData: any[]): SEOIssue[] {
    // Placeholder implementation
    return [];
  }

  // Methods to generate recommendations for each category

  private static generatePerformanceRecommendations(performanceData: any[]): string[] {
    // Placeholder implementation
    return [
      'Optimize Largest Contentful Paint by reducing server response time',
      'Minimize render-blocking resources to improve First Contentful Paint',
      'Implement proper image sizing and compression',
    ];
  }

  private static generateContentRecommendations(contentData: any[]): string[] {
    // Placeholder implementation
    return [];
  }

  private static generateTechnicalRecommendations(technicalData: any[]): string[] {
    const recommendations: string[] = [];
    
    // Process each technical SEO data entry
    technicalData.forEach(data => {
      if (data.recommendations && Array.isArray(data.recommendations)) {
        recommendations.push(...data.recommendations);
      }
      
      // Add specific recommendations based on key checks
      if (data.robotsTxt && !data.robotsTxt.valid) {
        recommendations.push('Create or fix your robots.txt file to control search engine access');
      }
      
      if (data.sitemap && !data.sitemap.valid) {
        recommendations.push('Create or fix your sitemap.xml file to help search engines crawl your site');
      }
      
      if (data.ssl && !data.ssl.valid) {
        recommendations.push('Install a valid SSL certificate to secure your website');
      }
      
      if (data.canonicals && !data.canonicals.valid) {
        recommendations.push('Fix canonical tag issues to prevent duplicate content problems');
      }
      
      if (data.mobileCompatibility && !data.mobileCompatibility.compatible) {
        recommendations.push('Optimize your website for mobile devices to improve user experience and SEO');
      }
      
      if (data.structured_data && !data.structured_data.valid) {
        recommendations.push('Implement or fix structured data markup to enhance search result appearance');
      }
    });
    
    // Remove duplicates
    const uniqueRecommendations = [...new Set(recommendations)];
    
    // Return top 5 recommendations
    return uniqueRecommendations.slice(0, 5);
  }

  private static generateOnPageRecommendations(onPageData: any[]): string[] {
    // Placeholder implementation
    return [];
  }

  private static generateSchemaRecommendations(schemaData: any[]): string[] {
    // Placeholder implementation
    return [];
  }

  private static generateImageRecommendations(imageData: any[]): string[] {
    // Placeholder implementation
    return [];
  }

  private static generateDuplicateContentRecommendations(duplicateData: any[]): string[] {
    // Placeholder implementation
    return [];
  }

  /**
   * Analyze backlinks for the target domain
   */
  private static async analyzeBacklinks(
    auditId: string,
    siteId: string,
    targetDomain: string
  ): Promise<{
    score: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  } | null> {
    try {
      // Update audit status
      await this.supabase
        .from('seo_audits')
        .update({
          status: 'analyzing_backlinks',
          status_message: 'Analyzing backlink profile...',
        })
        .eq('id', auditId);

      // Run backlink analysis
      const backlinkAnalysis = await BacklinkAnalysisService.analyzeBacklinks(siteId, targetDomain);

      if (!backlinkAnalysis) {
        console.error('Backlink analysis failed');
        return null;
      }

      // Extract issues by severity
      const issues = this.extractBacklinkIssues(backlinkAnalysis);

      return {
        score: backlinkAnalysis.score,
        criticalIssues: issues.critical,
        highIssues: issues.high,
        mediumIssues: issues.medium,
        lowIssues: issues.low,
      };
    } catch (error) {
      console.error('Error analyzing backlinks:', error);
      return null;
    }
  }

  /**
   * Extract backlink issues by severity from analysis recommendations
   */
  private static extractBacklinkIssues(backlinkAnalysis: any): {
    critical: number;
    high: number;
    medium: number;
    low: number;
  } {
    // For backlink analysis, we determine severity based on the backlink score
    // This is a simplified approach - in a real implementation, 
    // BacklinkAnalysisService would provide actual issues with severities
    const score = backlinkAnalysis.score;
    
    return {
      critical: score < 30 ? 1 : 0,
      high: score < 50 ? 2 : (score < 70 ? 1 : 0),
      medium: score < 70 ? 2 : (score < 85 ? 1 : 0),
      low: score < 90 ? 1 : 0,
    };
  }

  /**
   * Get backlink issues from the backlink analysis
   */
  private static async getBacklinkIssues(auditId: string, siteId: string, domain: string): Promise<any[]> {
    try {
      const backlinkAnalysis = await BacklinkAnalysisService.getBacklinkAnalysis(siteId, domain);
      
      if (!backlinkAnalysis) {
        return [];
      }
      
      // Convert recommendations to issues
      return backlinkAnalysis.recommendations.map((recommendation, index) => {
        // Determine severity based on index (first recommendations are typically more important)
        const severity = index < 2 ? 'high' : (index < 4 ? 'medium' : 'low');
        
        return {
          id: `backlink-${index}`,
          type: 'backlink',
          severity,
          description: recommendation,
          recommendation: recommendation,
          impact: 'Affects overall backlink profile strength',
        };
      });
    } catch (error) {
      console.error('Error getting backlink issues:', error);
      return [];
    }
  }

  /**
   * Analyze social media presence and integration for the target domain
   */
  private static async analyzeSocialMedia(
    auditId: string,
    siteId: string,
    targetDomain: string
  ): Promise<{
    score: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
  } | null> {
    try {
      // Update audit status
      await this.supabase
        .from('seo_audits')
        .update({
          status: 'analyzing_social_media',
          status_message: 'Analyzing social media presence and integration...',
        })
        .eq('id', auditId);

      // Run social media analysis
      const socialMediaAnalysis = await SocialMediaAnalysisService.analyzeSocialMedia(siteId, targetDomain);

      if (!socialMediaAnalysis) {
        console.error('Social media analysis failed');
        return null;
      }

      // Extract issues by severity
      const issues = this.extractSocialMediaIssues(socialMediaAnalysis);

      return {
        score: socialMediaAnalysis.score,
        criticalIssues: 0, // Social media issues are typically not critical
        highIssues: issues.high,
        mediumIssues: issues.medium,
        lowIssues: issues.low,
      };
    } catch (error) {
      console.error('Error analyzing social media:', error);
      return null;
    }
  }

  /**
   * Extract social media issues by severity from analysis recommendations
   */
  private static extractSocialMediaIssues(socialMediaAnalysis: any): {
    high: number;
    medium: number;
    low: number;
  } {
    // For social media analysis, we determine severity based on the score
    const score = socialMediaAnalysis.score;
    
    return {
      high: score < 50 ? 2 : (score < 70 ? 1 : 0),
      medium: score < 70 ? 2 : (score < 85 ? 1 : 0),
      low: score < 85 ? 2 : 1,
    };
  }

  /**
   * Get social media issues from the social media analysis
   */
  private static async getSocialMediaIssues(auditId: string, siteId: string, domain: string): Promise<any[]> {
    try {
      const socialMediaAnalysis = await SocialMediaAnalysisService.getSocialMediaAnalysis(siteId, domain);
      
      if (!socialMediaAnalysis) {
        return [];
      }
      
      // Convert recommendations to issues
      return socialMediaAnalysis.recommendations.map((recommendation, index) => {
        // Determine severity based on index (first recommendations are typically more important)
        const severity = index < 2 ? 'high' : (index < 4 ? 'medium' : 'low');
        
        return {
          id: `social-${index}`,
          type: 'social_media',
          severity,
          description: recommendation,
          recommendation: recommendation,
          impact: 'Affects social media effectiveness and brand visibility',
        };
      });
    } catch (error) {
      console.error('Error getting social media issues:', error);
      return [];
    }
  }
} 