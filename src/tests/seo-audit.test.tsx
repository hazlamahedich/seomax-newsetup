import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuditSummary from '@/components/seo/AuditSummary';
import { ScoreDisplay, ScoreCard } from '@/components/ui/ScoreDisplay';
import { IssuesList } from '@/components/ui/IssuesList';
import { SEOAuditSummary, SEOCategory, SEOIssue, SEOScore } from '@/lib/types/seo';
import { GradingSystemService } from '@/lib/services/GradingSystemService';

// Mock the PDF generation service
jest.mock('@/lib/services/pdf-generation-service', () => ({
  PDFGenerationService: {
    generateAuditReportPDF: jest.fn(),
  },
}));

// Sample test data
const mockIssues: SEOIssue[] = [
  {
    id: '1',
    type: 'image_alt_text',
    severity: 'critical',
    description: 'Missing alt text on 5 images',
    recommendation: 'Add descriptive alt text to all images for better accessibility and SEO',
    affectedElements: ['<img src="image1.jpg">', '<img src="image2.jpg">'],
    affectedUrls: ['https://example.com/page1', 'https://example.com/page2'],
  },
  {
    id: '2',
    type: 'meta_description',
    severity: 'warning',
    description: 'Meta description too short on 3 pages',
    recommendation: 'Expand meta descriptions to 120-160 characters for better search visibility',
    affectedUrls: ['https://example.com/page3', 'https://example.com/page4'],
  },
  {
    id: '3',
    type: 'heading_structure',
    severity: 'info',
    description: 'Improper heading structure on homepage',
    recommendation: 'Ensure proper H1-H6 hierarchy for better content organization',
    affectedUrls: ['https://example.com'],
  },
];

const mockCategories: SEOCategory[] = [
  {
    id: 'performance',
    name: 'Performance',
    score: {
      value: 85,
      grade: { letter: 'B', color: '#94c447', label: 'Good' },
      issueCount: 2,
      improvementPotential: 12,
    },
    issues: mockIssues.slice(0, 1),
    recommendations: [
      'Optimize image sizes',
      'Implement lazy loading for images',
    ],
    summary: 'Your site performance is good but has room for improvement.',
  },
  {
    id: 'content',
    name: 'Content',
    score: {
      value: 92,
      grade: { letter: 'A', color: '#4caf50', label: 'Excellent' },
      issueCount: 1,
      improvementPotential: 5,
    },
    issues: mockIssues.slice(1, 2),
    recommendations: [
      'Expand meta descriptions on key pages',
      'Add more keyword-rich content to thin pages',
    ],
    summary: 'Your content is well-optimized with a few minor improvements possible.',
  },
  {
    id: 'technical',
    name: 'Technical SEO',
    score: {
      value: 78,
      grade: { letter: 'C', color: '#ff9800', label: 'Average' },
      issueCount: 3,
      improvementPotential: 18,
    },
    issues: mockIssues.slice(2, 3),
    recommendations: [
      'Fix heading structure issues',
      'Improve site navigation',
      'Fix broken links',
    ],
    summary: 'Several technical issues need attention to improve crawlability.',
  },
  {
    id: 'mobile',
    name: 'Mobile Usability',
    score: {
      value: 95,
      grade: { letter: 'A', color: '#4caf50', label: 'Excellent' },
      issueCount: 0,
      improvementPotential: 3,
    },
    issues: [],
    recommendations: [
      'Ensure tap targets are appropriately sized',
    ],
    summary: 'Your site performs excellently on mobile devices.',
  },
];

const mockAuditSummary: SEOAuditSummary = {
  id: '123',
  title: 'SEO Audit for example.com',
  date: new Date().toISOString(),
  overallScore: {
    value: 87,
    grade: { letter: 'B', color: '#94c447', label: 'Good' },
    issueCount: 6,
    improvementPotential: 10,
  },
  categories: mockCategories,
  passedChecks: 42,
  failedChecks: 6,
  crawledPages: 25,
  improvementsSummary: 'Focus on image optimization and technical SEO improvements to boost your overall score.',
  summary: 'Your website has good SEO foundations. There are some opportunities for improvement in technical SEO and performance areas.',
  nextSteps: 'Prioritize fixing critical image issues and improving meta descriptions. Consider implementing a structured data strategy.',
};

describe('SEO Audit Components', () => {
  describe('ScoreDisplay Component', () => {
    test('renders numeric score correctly', () => {
      render(<ScoreDisplay score={75} />);
      expect(screen.getByText('75')).toBeInTheDocument();
      expect(screen.getByText('Average')).toBeInTheDocument(); // Label for grade C
    });

    test('renders SEOScore object correctly', () => {
      const score: SEOScore = {
        value: 92,
        grade: { letter: 'A', color: '#4caf50', label: 'Excellent' },
        issueCount: 2,
        improvementPotential: 8,
      };
      
      render(<ScoreDisplay score={score} showIssueCount />);
      expect(screen.getByText('92')).toBeInTheDocument();
      expect(screen.getByText('Excellent')).toBeInTheDocument();
      expect(screen.getByText('2 issues found')).toBeInTheDocument();
    });

    test('applies different sizes correctly', () => {
      const { rerender } = render(<ScoreDisplay score={85} size="sm" />);
      
      const smallContainer = screen.getByText('85').closest('div');
      expect(smallContainer).toHaveClass('w-16');
      
      rerender(<ScoreDisplay score={85} size="lg" />);
      const largeContainer = screen.getByText('85').closest('div');
      expect(largeContainer).toHaveClass('w-32');
    });
  });

  describe('ScoreCard Component', () => {
    test('renders card with title and score', () => {
      render(<ScoreCard title="Performance" score={85} />);
      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    test('shows improvement potential when provided', () => {
      const score: SEOScore = {
        value: 85,
        grade: { letter: 'B', color: '#94c447', label: 'Good' },
        issueCount: 3,
        improvementPotential: 12,
      };
      
      render(<ScoreCard title="Performance" score={score} showImprovement />);
      expect(screen.getByText('+12%')).toBeInTheDocument();
    });
  });

  describe('IssuesList Component', () => {
    test('renders list of issues correctly', () => {
      render(<IssuesList issues={mockIssues} />);
      expect(screen.getByText('Missing alt text on 5 images')).toBeInTheDocument();
      expect(screen.getByText('Meta description too short on 3 pages')).toBeInTheDocument();
      expect(screen.getByText('Improper heading structure on homepage')).toBeInTheDocument();
    });

    test('shows severity badges when enabled', () => {
      render(<IssuesList issues={mockIssues} showSeverity />);
      expect(screen.getByText('critical')).toBeInTheDocument();
      expect(screen.getByText('warning')).toBeInTheDocument();
      expect(screen.getByText('info')).toBeInTheDocument();
    });

    test('hides recommendations when disabled', () => {
      render(<IssuesList issues={mockIssues} showRecommendations={false} />);
      expect(screen.queryByText('Add descriptive alt text to all images for better accessibility and SEO')).not.toBeInTheDocument();
    });

    test('groups issues by type when enabled', () => {
      render(<IssuesList issues={mockIssues} groupByType />);
      expect(screen.getByText('Image Alt Text')).toBeInTheDocument();
      expect(screen.getByText('Meta Description')).toBeInTheDocument();
      expect(screen.getByText('Heading Structure')).toBeInTheDocument();
    });

    test('limits issues when maxIssues is provided', () => {
      render(<IssuesList issues={mockIssues} maxIssues={2} />);
      expect(screen.getByText('Missing alt text on 5 images')).toBeInTheDocument();
      expect(screen.getByText('Meta description too short on 3 pages')).toBeInTheDocument();
      expect(screen.queryByText('Improper heading structure on homepage')).not.toBeInTheDocument();
      expect(screen.getByText('Show all 3 issues')).toBeInTheDocument();
      
      // Click "Show all" button
      fireEvent.click(screen.getByText('Show all 3 issues'));
      expect(screen.getByText('Improper heading structure on homepage')).toBeInTheDocument();
    });
  });

  describe('AuditSummary Component', () => {
    test('renders full audit summary correctly', () => {
      render(<AuditSummary auditSummary={mockAuditSummary} />);
      
      // Check title and score
      expect(screen.getByText('SEO Audit for example.com')).toBeInTheDocument();
      expect(screen.getByText('87')).toBeInTheDocument();
      
      // Check statistics
      expect(screen.getByText('Passed checks:')).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
      expect(screen.getByText('Failed checks:')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
      
      // Check improvement summary
      expect(screen.getByText('Focus on image optimization and technical SEO improvements to boost your overall score.')).toBeInTheDocument();
      
      // Check category cards
      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      expect(screen.getByText('Technical SEO')).toBeInTheDocument();
      expect(screen.getByText('Mobile Usability')).toBeInTheDocument();
    });

    test('tabs navigation works correctly', async () => {
      render(<AuditSummary auditSummary={mockAuditSummary} />);
      
      // Default tab should be Overview
      expect(screen.getByText('Audit Overview')).toBeInTheDocument();
      
      // Click on Issues tab
      fireEvent.click(screen.getByRole('tab', { name: /issues/i }));
      await waitFor(() => {
        expect(screen.getByText('All Issues')).toBeInTheDocument();
      });
      
      // Click on Performance tab
      fireEvent.click(screen.getByRole('tab', { name: /performance/i }));
      await waitFor(() => {
        expect(screen.getByText('Your site performance is good but has room for improvement.')).toBeInTheDocument();
      });
    });

    test('PDF generation is triggered on button click', () => {
      const mockGeneratePDF = jest.fn();
      render(<AuditSummary auditSummary={mockAuditSummary} onGeneratePDF={mockGeneratePDF} />);
      
      fireEvent.click(screen.getByText('Download PDF'));
      expect(mockGeneratePDF).toHaveBeenCalledTimes(1);
    });

    test('shows comparison when previous score is provided', () => {
      render(<AuditSummary auditSummary={mockAuditSummary} previousScore={82} />);
      expect(screen.getByText(/\+5 pts since last check/)).toBeInTheDocument();
    });

    test('shows industry average when provided', () => {
      render(<AuditSummary auditSummary={mockAuditSummary} industryAverage={75} />);
      expect(screen.getByText(/12 pts above industry avg/)).toBeInTheDocument();
    });
  });

  describe('GradingSystemService', () => {
    test('returns correct grades based on scores', () => {
      expect(GradingSystemService.getGrade(95).letter).toBe('A');
      expect(GradingSystemService.getGrade(85).letter).toBe('B');
      expect(GradingSystemService.getGrade(75).letter).toBe('C');
      expect(GradingSystemService.getGrade(65).letter).toBe('D');
      expect(GradingSystemService.getGrade(55).letter).toBe('F');
    });

    test('normalizes scores correctly', () => {
      // For metrics where lower values are better (like LCP)
      expect(GradingSystemService.normalizeScoreLowerBetter(1.5, 2.5, 4.0, 1.0)).toBeGreaterThan(75); // Good value
      expect(GradingSystemService.normalizeScoreLowerBetter(3.0, 2.5, 4.0, 1.0)).toBeLessThan(75); // Poor value
      
      // For metrics where higher values are better (like performance score)
      expect(GradingSystemService.normalizeScoreHigherBetter(85, 50, 90, 30)).toBeGreaterThan(75); // Good value
      expect(GradingSystemService.normalizeScoreHigherBetter(45, 50, 90, 30)).toBeLessThan(50); // Poor value
    });
  });
}); 