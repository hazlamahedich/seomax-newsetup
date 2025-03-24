/**
 * Standard SEO score interfaces for consistent grading across analyzers
 */
export interface SEOScore {
  value: number;            // The numeric score value (0-100)
  grade: SEOGrade;          // The letter grade representation
  label: string;            // Descriptive label for the score
  color: string;            // Color code for visual representation
  issueCount: number;       // Total number of issues found
  improvementPotential: number; // How much the score could improve (0-100)
}

export interface SEOGrade {
  letter: 'A' | 'B' | 'C' | 'D' | 'F';
  color: string;
  label: string;
}

export interface SEOIssue {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  description: string;
  recommendation: string;
  affectedElement?: string;
  affectedUrl?: string;
  impact?: string;
}

export interface SEOCategory {
  id: string;
  name: string;
  score: SEOScore;
  issues: SEOIssue[];
  recommendations: string[];
}

export interface SEOAuditSummary {
  overallScore: SEOScore;
  categories: SEOCategory[];
  improvementsSummary: string;
  topIssues: SEOIssue[];
  passedChecks: number;
  failedChecks: number;
  createdAt: string;
} 