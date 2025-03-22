import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContentPerformance } from '@/components/content/ContentPerformance';
import { ContentPageService, ContentPerformanceService } from '@/lib/services/content-service';

// Mock the services
jest.mock('@/lib/services/content-service', () => ({
  ContentPageService: {
    getContentPage: jest.fn(),
  },
  ContentPerformanceService: {
    getContentPerformance: jest.fn(),
    getContentPerformanceSummary: jest.fn(),
  },
}));

// Mock the chart component
jest.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="chart-line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="chart-bar" />,
}));

describe('ContentPerformance Component', () => {
  const mockContentPage = {
    id: 'page-1',
    project_id: 'project-1',
    url: 'https://example.com/test',
    title: 'Test Page',
    content: 'This is test content',
    status: 'published',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };
  
  const mockPerformanceData = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(2023, 0, i + 1).toISOString().split('T')[0],
    impressions: Math.floor(Math.random() * 1000) + 100,
    clicks: Math.floor(Math.random() * 100) + 10,
    position: Math.random() * 10 + 1,
  }));
  
  const mockPerformanceSummary = {
    totalImpressions: 15000,
    totalClicks: 750,
    ctr: 5.0,
    avgPosition: 3.2,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (ContentPageService.getContentPage as jest.Mock).mockResolvedValue(mockContentPage);
    (ContentPerformanceService.getContentPerformance as jest.Mock).mockResolvedValue(mockPerformanceData);
    (ContentPerformanceService.getContentPerformanceSummary as jest.Mock).mockResolvedValue(mockPerformanceSummary);
  });

  it('renders loading state initially', () => {
    render(<ContentPerformance contentPageId="page-1" />);
    
    expect(screen.getByText(/loading performance data/i)).toBeInTheDocument();
  });
  
  it('loads and displays performance data correctly', async () => {
    render(<ContentPerformance contentPageId="page-1" />);
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/performance metrics/i)).toBeInTheDocument();
    });
    
    // Check summary section
    expect(screen.getByText(/15,000/)).toBeInTheDocument(); // Total impressions
    expect(screen.getByText(/750/)).toBeInTheDocument(); // Total clicks
    expect(screen.getByText(/5.0%/)).toBeInTheDocument(); // CTR
    expect(screen.getByText(/3.2/)).toBeInTheDocument(); // Avg position
    
    // Check tabs
    expect(screen.getByRole('tab', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /impressions/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /clicks/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /position/i })).toBeInTheDocument();
    
    // Check chart exists
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
  });
  
  it('handles errors when loading content', async () => {
    // Mock an error response
    (ContentPageService.getContentPage as jest.Mock).mockRejectedValue(new Error('Failed to load content'));
    
    render(<ContentPerformance contentPageId="page-1" />);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/error loading content page/i)).toBeInTheDocument();
    });
    
    // Retry button should be available
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
  
  it('handles errors when loading performance data', async () => {
    // Success for content page, but error for performance data
    (ContentPageService.getContentPage as jest.Mock).mockResolvedValue(mockContentPage);
    (ContentPerformanceService.getContentPerformance as jest.Mock).mockRejectedValue(new Error('Failed to load performance data'));
    
    render(<ContentPerformance contentPageId="page-1" />);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/error loading performance data/i)).toBeInTheDocument();
    });
    
    // Retry button should be available
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
  
  it('allows changing date range', async () => {
    const user = userEvent.setup();
    
    render(<ContentPerformance contentPageId="page-1" />);
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/performance metrics/i)).toBeInTheDocument();
    });
    
    // Find and click the date range selector
    const dateRangeSelector = screen.getByRole('combobox');
    await user.click(dateRangeSelector);
    
    // Select a different range (e.g., 7 days)
    const option7Days = screen.getByRole('option', { name: /7 days/i });
    await user.click(option7Days);
    
    // Verify the performance service was called with the new range
    expect(ContentPerformanceService.getContentPerformance).toHaveBeenCalledWith('page-1', 7);
    expect(ContentPerformanceService.getContentPerformanceSummary).toHaveBeenCalledWith('page-1', 7);
  });
  
  it('allows switching between tabs', async () => {
    const user = userEvent.setup();
    
    render(<ContentPerformance contentPageId="page-1" />);
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/performance metrics/i)).toBeInTheDocument();
    });
    
    // Check overview tab is active by default
    expect(screen.getByRole('tab', { name: /overview/i, selected: true })).toBeInTheDocument();
    
    // Switch to impressions tab
    const impressionsTab = screen.getByRole('tab', { name: /impressions/i });
    await user.click(impressionsTab);
    
    // Check that impressions tab is now active
    expect(screen.getByRole('tab', { name: /impressions/i, selected: true })).toBeInTheDocument();
    
    // Verify charts are updated for impressions tab
    expect(screen.getAllByTestId('line-chart').length).toBeGreaterThanOrEqual(1);
  });
  
  it('displays a back button when onBack prop is provided', async () => {
    const mockOnBack = jest.fn();
    const user = userEvent.setup();
    
    render(<ContentPerformance contentPageId="page-1" onBack={mockOnBack} />);
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/performance metrics/i)).toBeInTheDocument();
    });
    
    // Find and click the back button
    const backButton = screen.getByRole('button', { name: /back to content/i });
    await user.click(backButton);
    
    // Verify the onBack handler was called
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });
}); 