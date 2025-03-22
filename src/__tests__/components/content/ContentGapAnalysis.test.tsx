import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ContentGapAnalysis } from '@/components/content/ContentGapAnalysis';
import { ContentPageService } from '@/lib/services/content-service';
import { toast } from '@/components/ui/use-toast';
import '@testing-library/jest-dom';

// Mock services
jest.mock('@/lib/services/content-service', () => ({
  ContentPageService: {
    getContentPage: jest.fn(),
  }
}));

// Mock toast
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

// Mock data
const mockContentPage = {
  id: 'page-123',
  title: 'SEO Best Practices',
  url: 'https://example.com/seo-best-practices',
  content: 'This is the content of the page.',
  status: 'analyzed',
};

describe('ContentGapAnalysis Component', () => {
  const mockCompetitors = [
    { 
      url: 'https://competitor1.com/test',
      title: 'Competitor 1',
      contentOverlap: 65,
      keywordOverlap: 70,
      strengths: ['Comprehensive coverage', 'Clear explanations'],
      weaknesses: ['Missing examples', 'Outdated information']
    },
    { 
      url: 'https://competitor2.com/test',
      title: 'Competitor 2',
      contentOverlap: 45,
      keywordOverlap: 50,
      strengths: ['Visual content', 'Recent information'],
      weaknesses: ['Limited scope', 'Not well structured']
    }
  ];
  
  const mockContentGaps = [
    {
      topic: 'Implementation examples',
      importance: 'high',
      competitorsCovering: ['Competitor 2', 'Competitor 3'],
      suggestedHeading: 'How to Implement: Real-World Examples'
    },
    {
      topic: 'Industry statistics',
      importance: 'medium',
      competitorsCovering: ['Competitor 1'],
      suggestedHeading: 'Industry Statistics and Trends'
    }
  ];
  
  const mockMissingKeywords = [
    {
      keyword: 'implementation guide',
      volume: 2400,
      difficulty: 'medium',
      competitorsRanking: ['Competitor 1 (#3)', 'Competitor 2 (#7)']
    },
    {
      keyword: 'latest trends',
      volume: 1900,
      difficulty: 'low',
      competitorsRanking: ['Competitor 3 (#5)']
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (ContentPageService.getContentPage as jest.Mock).mockResolvedValue(mockContentPage);
  });

  it('renders loading state initially', () => {
    render(<ContentGapAnalysis contentPageId="page-1" />);
    
    expect(screen.getByText(/loading content data/i)).toBeInTheDocument();
  });
  
  it('loads and displays gap analysis data correctly', async () => {
    render(<ContentGapAnalysis contentPageId="page-1" />);
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/content gap analysis/i)).toBeInTheDocument();
    });
    
    // Check tabs are present
    expect(screen.getByRole('tab', { name: /competitors/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /content gaps/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /missing keywords/i })).toBeInTheDocument();
    
    // Check competitor data is shown
    expect(screen.getByText(/competitor 1/i)).toBeInTheDocument();
    expect(screen.getByText(/65%/)).toBeInTheDocument(); // Content overlap
    
    // Switch to content gaps tab
    const contentGapsTab = screen.getByRole('tab', { name: /content gaps/i });
    fireEvent.click(contentGapsTab);
    
    // Check content gaps data
    await waitFor(() => {
      expect(screen.getByText(/implementation examples/i)).toBeInTheDocument();
      expect(screen.getByText(/high/i)).toBeInTheDocument(); // Importance
    });
    
    // Switch to missing keywords tab
    const missingKeywordsTab = screen.getByRole('tab', { name: /missing keywords/i });
    fireEvent.click(missingKeywordsTab);
    
    // Check missing keywords data
    await waitFor(() => {
      expect(screen.getByText(/implementation guide/i)).toBeInTheDocument();
      expect(screen.getByText(/2,400/)).toBeInTheDocument(); // Volume
    });
  });
  
  it('handles errors when loading content', async () => {
    // Mock error response for content page
    (ContentPageService.getContentPage as jest.Mock).mockRejectedValue(new Error('Failed to load content'));
    
    render(<ContentGapAnalysis contentPageId="page-1" />);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/error loading data/i)).toBeInTheDocument();
    });
    
    // Retry button should be available
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
  
  it('allows adding a new competitor', async () => {
    render(<ContentGapAnalysis contentPageId="page-1" />);
    
    await waitFor(() => {
      expect(screen.getByText(/competitor content/i)).toBeInTheDocument();
    });
    
    const urlInput = screen.getByPlaceholderText(/competitor.com\/page/i);
    const addButton = screen.getByRole('button', { name: /add competitor/i });
    
    // Type a URL and click add
    fireEvent.change(urlInput, { target: { value: 'https://newcomp.com/page' } });
    fireEvent.click(addButton);
    
    // Verify toast was called when adding competitor
    expect(toast).toHaveBeenCalled();
  });
  
  it('displays a back button when onBack prop is provided', async () => {
    const mockOnBack = jest.fn();
    
    render(<ContentGapAnalysis contentPageId="page-1" onBack={mockOnBack} />);
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/content gap analysis/i)).toBeInTheDocument();
    });
    
    // Find and click the back button
    const backButton = screen.getByRole('button', { name: /back to content/i });
    fireEvent.click(backButton);
    
    // Verify the onBack handler was called
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });
}); 