import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/client';
import { TechnicalSEOService } from './TechnicalSEOService';
import { SiteCrawlerService } from './SiteCrawlerService';
import { PDFGenerationService } from './PDFGenerationService';

// Types for the audit report
export interface SEOAuditReport {
  id: string;
  projectId: string;
  reportName: string;
  status: 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  pdfUrl?: string;
  overallScore?: number;
  overallGrade?: string;
}

// Database representation of the audit report
interface SEOAuditReportTable {
  id: string;
  project_id: string;
  report_name: string;
  report_data: any;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  pdf_url?: string;
}

// Category score type
export interface SEOAuditCategoryScore {
  id: string;
  categoryId: string;
  categoryName: string;
  score: number;
  grade: string;
  issuesCount: number;
}

// Database representation of category score
interface SEOAuditScoreTable {
  id: string;
  audit_report_id: string;
  category_id: string;
  score: number;
  grade: string;
  issues_count: number;
  created_at: string;
}

// Category type
export interface SEOAuditCategory {
  id: string;
  name: string;
  description: string;
  weight: number;
}

// Audit options type
export interface SEOAuditOptions {
  includeOnPage?: boolean;
  includeTechnical?: boolean;
  includeLinks?: boolean;
  includeContent?: boolean;
  includePerformance?: boolean;
  includeSocial?: boolean;
  includeLocal?: boolean;
  includeMobile?: boolean;
}

// Audit data type with proper typing
interface AuditData {
  siteCrawlId: string;
  categories: Record<string, any>;
  scores: Record<string, {
    score: number;
    grade: string;
    issuesCount: number;
  }>;
  summary: {
    totalIssues: number;
    criticalIssues: number;
    warningIssues: number;
    infoIssues: number;
  };
  recommendations: Record<string, string[]>;
}

// Map database model to application model
const mapToAuditReport = (data: SEOAuditReportTable, categoryScores?: SEOAuditCategoryScore[]): SEOAuditReport => {
  // Calculate overall score if category scores are provided
  let overallScore: number | undefined;
  let overallGrade: string | undefined;
  
  if (categoryScores && categoryScores.length > 0) {
    // Simple average for now - could be weighted in future
    overallScore = Math.round(
      categoryScores.reduce((sum, score) => sum + score.score, 0) / categoryScores.length
    );
    overallGrade = scoreToGrade(overallScore);
  }
  
  return {
    id: data.id,
    projectId: data.project_id,
    reportName: data.report_name,
    status: data.status as 'in_progress' | 'completed' | 'failed',
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    createdBy: data.created_by,
    pdfUrl: data.pdf_url,
    overallScore,
    overallGrade,
  };
};

// Map database model to category score
const mapToCategoryScore = (data: SEOAuditScoreTable, categoryName: string): SEOAuditCategoryScore => ({
  id: data.id,
  categoryId: data.category_id,
  categoryName: categoryName,
  score: data.score,
  grade: data.grade,
  issuesCount: data.issues_count,
});

// Convert numerical score to letter grade
const scoreToGrade = (score: number): string => {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 63) return 'D';
  if (score >= 60) return 'D-';
  return 'F';
};

export class SEOAuditService {
  // Start a new SEO audit
  static async startAudit(
    projectId: string, 
    reportName: string, 
    userId: string,
    options: SEOAuditOptions = {}
  ): Promise<SEOAuditReport> {
    const supabase = createServerClient();
    
    try {
      // Create initial audit record
      const { data, error } = await supabase
        .from('seo_audit_reports')
        .insert({
          project_id: projectId,
          report_name: reportName,
          report_data: { options },
          status: 'in_progress',
          created_by: userId,
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error starting SEO audit:', error);
        throw new Error(`Error starting SEO audit: ${error.message}`);
      }
      
      // Schedule or start the actual audit process
      // This would typically be moved to a background worker/task
      // For now, we'll just return the created report and assume the audit
      // will be processed asynchronously
      
      // Start the audit process (mock for now, would be asynchronous in production)
      this.processAuditAsync(data.id, projectId, options);
      
      return mapToAuditReport(data as SEOAuditReportTable);
    } catch (error) {
      console.error('Error in startAudit:', error);
      throw error;
    }
  }
  
  // Check the status of an audit
  static async getAuditStatus(auditId: string): Promise<SEOAuditReport> {
    const supabase = createServerClient();
    
    try {
      const { data: reportData, error: reportError } = await supabase
        .from('seo_audit_reports')
        .select('*')
        .eq('id', auditId)
        .single();
      
      if (reportError) {
        throw new Error(`Error fetching audit status: ${reportError.message}`);
      }
      
      // Get the category scores for this audit
      const { data: scoresData, error: scoresError } = await supabase
        .from('seo_audit_scores')
        .select(`*, seo_audit_categories(name)`)
        .eq('audit_report_id', auditId);
      
      if (scoresError) {
        console.error('Error fetching audit scores:', scoresError);
        // Continue without scores
      }
      
      // Map scores with category names
      const categoryScores = scoresData?.map(score => 
        mapToCategoryScore(score, score.seo_audit_categories?.name || 'Unknown')
      ) || [];
      
      return mapToAuditReport(reportData as SEOAuditReportTable, categoryScores);
    } catch (error) {
      console.error('Error in getAuditStatus:', error);
      throw error;
    }
  }
  
  // Save a completed audit report
  static async saveAuditReport(auditId: string, auditData: any): Promise<SEOAuditReport> {
    const supabase = createServerClient();
    
    try {
      // Update the audit record with the completed data
      const { data, error } = await supabase
        .from('seo_audit_reports')
        .update({
          report_data: auditData,
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', auditId)
        .select()
        .single();
      
      if (error) {
        throw new Error(`Error saving audit report: ${error.message}`);
      }
      
      return mapToAuditReport(data as SEOAuditReportTable);
    } catch (error) {
      console.error('Error in saveAuditReport:', error);
      throw error;
    }
  }
  
  // Generate a PDF from the audit report
  static async generatePDF(auditId: string): Promise<string> {
    try {
      // Use our new PDFGenerationService to generate the PDF
      // This will handle all the PDF generation logic, storage upload, and database updates
      const pdfUrl = await PDFGenerationService.generatePDFFromReport(auditId);
      return pdfUrl;
    } catch (error) {
      console.error('Error in generatePDF:', error);
      throw error;
    }
  }
  
  // Get all audit reports for a project
  static async getAuditReports(projectId: string): Promise<SEOAuditReport[]> {
    const supabase = createServerClient();
    
    try {
      const { data, error } = await supabase
        .from('seo_audit_reports')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(`Error fetching audit reports: ${error.message}`);
      }
      
      return (data as SEOAuditReportTable[]).map(report => mapToAuditReport(report));
    } catch (error) {
      console.error('Error in getAuditReports:', error);
      throw error;
    }
  }
  
  // Get a specific audit report by ID
  static async getAuditReportById(reportId: string): Promise<SEOAuditReport> {
    const supabase = createServerClient();
    
    try {
      const { data: reportData, error: reportError } = await supabase
        .from('seo_audit_reports')
        .select('*')
        .eq('id', reportId)
        .single();
      
      if (reportError) {
        throw new Error(`Error fetching audit report: ${reportError.message}`);
      }
      
      // Get the category scores for this audit
      const { data: scoresData, error: scoresError } = await supabase
        .from('seo_audit_scores')
        .select(`*, seo_audit_categories(name)`)
        .eq('audit_report_id', reportId);
      
      if (scoresError) {
        console.error('Error fetching audit scores:', scoresError);
        // Continue without scores
      }
      
      // Map scores with category names
      const categoryScores = scoresData?.map(score => 
        mapToCategoryScore(score, score.seo_audit_categories?.name || 'Unknown')
      ) || [];
      
      return mapToAuditReport(reportData as SEOAuditReportTable, categoryScores);
    } catch (error) {
      console.error('Error in getAuditReportById:', error);
      throw error;
    }
  }
  
  // Get all categories
  static async getAuditCategories(): Promise<SEOAuditCategory[]> {
    const supabase = createServerClient();
    
    try {
      const { data, error } = await supabase
        .from('seo_audit_categories')
        .select('*')
        .order('weight', { ascending: false });
      
      if (error) {
        throw new Error(`Error fetching audit categories: ${error.message}`);
      }
      
      return data.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description,
        weight: category.weight,
      }));
    } catch (error) {
      console.error('Error in getAuditCategories:', error);
      throw error;
    }
  }
  
  // Process the audit asynchronously
  private static async processAuditAsync(
    auditId: string, 
    projectId: string,
    options: SEOAuditOptions
  ): Promise<void> {
    const supabase = createClient();
    
    try {
      // In a production environment, this would be handled by a background worker
      // For now, we'll simulate the process with a setTimeout
      
      // Get the user ID from the audit report
      const { data: auditReport, error: auditError } = await supabase
        .from('seo_audit_reports')
        .select('created_by')
        .eq('id', auditId)
        .single();
        
      if (auditError || !auditReport) {
        throw new Error(`Failed to get audit report: ${auditError?.message || 'Not found'}`);
      }
      
      // Start a site crawl using the existing SiteCrawlerService
      // Use the correct method from SiteCrawlerService with proper userId
      const siteCrawl = await SiteCrawlerService.createCrawl(projectId, auditReport.created_by);
      
      if (!siteCrawl) {
        throw new Error('Failed to create site crawl');
      }
      
      // Initialize the audit data
      const auditData: AuditData = {
        siteCrawlId: siteCrawl.id,
        categories: {},
        scores: {},
        summary: {
          totalIssues: 0,
          criticalIssues: 0,
          warningIssues: 0,
          infoIssues: 0,
        },
        recommendations: {},
      };
      
      // Update audit status to show progress
      await supabase
        .from('seo_audit_reports')
        .update({
          report_data: {
            ...auditData,
            status: 'crawling',
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', auditId);
      
      // Wait for the crawl to complete (simulated for now)
      // In a real implementation, you'd poll or use webhooks
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Now analyze the crawl data using TechnicalSEOService
      const technicalAudit = await TechnicalSEOService.analyzeCrawl(siteCrawl.id);
      
      if (options.includeTechnical && technicalAudit) {
        // Add technical SEO section to the audit data
        auditData.categories['technical'] = technicalAudit;
        
        // Generate recommendations
        const recommendations = await TechnicalSEOService.generateRecommendations(siteCrawl.id);
        auditData.recommendations = recommendations;
        
        // Update summary counts
        auditData.summary.totalIssues = technicalAudit.issues.length;
        auditData.summary.criticalIssues = technicalAudit.issues.filter(i => i.issue_severity === 'high').length;
        auditData.summary.warningIssues = technicalAudit.issues.filter(i => i.issue_severity === 'medium').length;
        auditData.summary.infoIssues = technicalAudit.issues.filter(i => i.issue_severity === 'low').length;
      }
      
      // Generate scores for each category 
      // For now, we'll only implement the technical score
      if (options.includeTechnical && technicalAudit) {
        // Calculate a technical SEO score based on issues found
        // This is a simplified calculation - in reality would be more complex
        const maxIssues = 20; // Assuming this is the worst case
        const actualIssues = Math.min(technicalAudit.issues.length, maxIssues);
        const technicalScore = Math.max(0, Math.round(100 - (actualIssues / maxIssues) * 100));
        
        // Get the technical SEO category ID
        const { data: categories } = await supabase
          .from('seo_audit_categories')
          .select('id')
          .eq('name', 'Technical SEO')
          .limit(1);
        
        if (categories && categories.length > 0) {
          const categoryId = categories[0].id;
          
          // Save the score
          const { data: scoreData } = await supabase
            .from('seo_audit_scores')
            .insert({
              audit_report_id: auditId,
              category_id: categoryId,
              score: technicalScore,
              grade: scoreToGrade(technicalScore),
              issues_count: technicalAudit.issues.length,
            })
            .select()
            .single();
            
          // Store score in audit data
          auditData.scores['technical'] = {
            score: technicalScore,
            grade: scoreToGrade(technicalScore),
            issuesCount: technicalAudit.issues.length,
          };
        }
      }
      
      // Additional category implementations would go here
      // For each of: OnPage, Links, Content, Performance, Social, Local, Mobile
      
      // Update the audit report with the completed data
      await supabase
        .from('seo_audit_reports')
        .update({
          report_data: auditData,
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', auditId);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error processing audit:', errorMessage);
      
      // Update the audit status to failed
      await supabase
        .from('seo_audit_reports')
        .update({
          status: 'failed',
          report_data: { error: errorMessage },
          updated_at: new Date().toISOString(),
        })
        .eq('id', auditId);
    }
  }
}