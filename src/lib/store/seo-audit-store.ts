import { create } from 'zustand';
import { CategoryRecommendations } from '@/components/seo-audit/charts/RecommendationList';
import { PDFGenerationService } from '@/lib/services/pdf-generation-service';

// Technical Issues types
export interface TechnicalIssue {
  id: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  url?: string;
}

export interface TechnicalCategory {
  name: string;
  issues: TechnicalIssue[];
}

// SEO Audit Category Score
export interface SEOAuditCategoryScore {
  categoryId: string;
  categoryName: string;
  score: number;
  grade: string;
  issuesCount: number;
}

// SEO Audit Report
export interface SEOAuditReport {
  id: string;
  projectId: string;
  name: string;
  url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  overallScore?: number;
  overallGrade?: string;
  categories?: SEOAuditCategoryScore[];
  recommendations?: CategoryRecommendations[];
  technicalIssues?: TechnicalCategory[];
  pdfUrl?: string;
  error?: string;
}

// Report Filters
export interface ReportFilter {
  search?: string;
  status?: string[];
}

// Store State
export interface SEOAuditState {
  // Reports listing
  reports: SEOAuditReport[];
  filteredReports: SEOAuditReport[];
  filters: ReportFilter;
  
  // Current report
  currentReport: SEOAuditReport | null;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
  
  // PDF generation state
  pdfGenerationStatus: 'idle' | 'loading' | 'success' | 'error';
  pdfGenerationError: string | null;
  pdfDataUri: string | null;
  
  // Actions
  fetchReports: (projectId: string) => Promise<void>;
  setFilters: (filters: ReportFilter) => void;
  applyFilters: () => void;
  startAudit: (projectId: string, data: { name: string; url: string }) => Promise<SEOAuditReport | null>;
  fetchReportById: (reportId: string) => Promise<SEOAuditReport | null>;
  generatePDF: (reportId: string) => Promise<string | null>;
}

export const useSEOAuditStore = create<SEOAuditState>((set, get) => ({
  // Reports listing state
  reports: [],
  filteredReports: [],
  filters: {},
  
  // Current report state
  currentReport: null,
  
  // Loading and error states
  isLoading: false,
  error: null,
  
  // PDF generation state
  pdfGenerationStatus: 'idle',
  pdfGenerationError: null,
  pdfDataUri: null,
  
  // Actions
  fetchReports: async (projectId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`/api/seo-audit?projectId=${projectId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch reports: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      set({
        reports: data.reports || [],
        filteredReports: data.reports || [],
        isLoading: false
      });
      
      // Apply any existing filters
      get().applyFilters();
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch reports'
      });
    }
  },
  
  setFilters: (filters: ReportFilter) => {
    set({ filters });
    get().applyFilters();
  },
  
  applyFilters: () => {
    const { reports, filters } = get();
    
    let filtered = [...reports];
    
    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        report => report.name.toLowerCase().includes(searchLower) || 
                 report.url.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply status filter
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(report => filters.status?.includes(report.status));
    }
    
    set({ filteredReports: filtered });
  },
  
  startAudit: async (projectId: string, data: { name: string; url: string }) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch('/api/seo-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          reportName: data.name,
          url: data.url,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start audit: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      
      if (!responseData.success) {
        throw new Error(responseData.error || 'Failed to start audit');
      }
      
      const newReport = responseData.report;
      
      // Add to reports and apply filters
      set(state => ({
        reports: [newReport, ...state.reports],
        isLoading: false
      }));
      
      get().applyFilters();
      
      return newReport;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to start audit'
      });
      return null;
    }
  },
  
  fetchReportById: async (reportId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`/api/seo-audit/${reportId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch report: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.report) {
        throw new Error(data.error || 'Invalid report data');
      }
      
      const report = data.report;
      
      // Update the reports state and set currentReport
      set(state => ({
        reports: state.reports.map(r => r.id === reportId ? report : r),
        currentReport: report,
        isLoading: false
      }));
      
      return report;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch report'
      });
      return null;
    }
  },
  
  generatePDF: async (reportId: string) => {
    const state = get();
    
    // Check if we already have the report in the store
    let report = state.reports.find(r => r.id === reportId) || state.currentReport;
    
    // If no report, get the detailed report
    if (!report) {
      try {
        set({ pdfGenerationStatus: 'loading' });
        
        // First fetch the report details
        report = await state.fetchReportById(reportId);
        
        if (!report) {
          set({ 
            pdfGenerationStatus: 'error', 
            pdfGenerationError: 'Report not found' 
          });
          return null;
        }
      } catch (error) {
        set({ 
          pdfGenerationStatus: 'error', 
          pdfGenerationError: error instanceof Error ? error.message : 'Failed to fetch report' 
        });
        return null;
      }
    }
    
    // Generate PDF
    try {
      set({ pdfGenerationStatus: 'loading' });
      
      // Use the PDF generation service
      const pdfDataUri = await PDFGenerationService.generatePDF(report);
      
      // Store the PDF data URI
      set({ 
        pdfDataUri, 
        pdfGenerationStatus: 'success',
        pdfGenerationError: null
      });
      
      return pdfDataUri;
    } catch (error) {
      set({ 
        pdfGenerationStatus: 'error', 
        pdfGenerationError: error instanceof Error ? error.message : 'Failed to generate PDF' 
      });
      return null;
    }
  }
})); 