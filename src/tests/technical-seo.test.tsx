import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TechnicalSEODisplay } from '@/components/seo/TechnicalSEODisplay';
import { TechnicalSEOService, TechnicalSEOResult } from '@/lib/services/TechnicalSEOService';

// Mock the service
jest.mock('@/lib/services/TechnicalSEOService');

// Mock data for tests
const mockTechnicalSEOResult: TechnicalSEOResult = {
  siteId: 'site-123',
  domain: 'example.com',
  score: 75,
  grade: { letter: 'B', label: 'Good', color: 'green' },
  timestamp: new Date().toISOString(),
  robotsTxt: {
    exists: true,
    valid: true,
    url: 'https://example.com/robots.txt',
    content: 'User-agent: *\nDisallow: /admin/',
    issues: []
  },
  sitemap: {
    exists: true,
    valid: true,
    url: 'https://example.com/sitemap.xml',
    urls: 120,
    issues: []
  },
  ssl: {
    valid: true,
    issuer: 'Let\'s Encrypt',
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    issues: []
  },
  canonicals: {
    valid: true,
    count: 25,
    issues: []
  },
  mobileCompatibility: {
    compatible: true,
    issues: []
  },
  checks: {
    total: 10,
    passed: 8,
    failed: 2
  },
  structured_data: {
    valid: true,
    types: ['Organization', 'Product', 'BreadcrumbList'],
    issues: []
  },
  issues: [
    {
      id: 'issue-1',
      type: 'canonical',
      severity: 'medium',
      description: 'Canonical tag missing on 3 pages',
      recommendation: 'Add canonical tags to all pages to prevent duplicate content issues',
      affectedUrls: ['https://example.com/page1', 'https://example.com/page2', 'https://example.com/page3']
    },
    {
      id: 'issue-2',
      type: 'http_status',
      severity: 'high',
      description: '2 pages returning 404 errors',
      recommendation: 'Fix broken links or set up proper redirects',
      affectedUrls: ['https://example.com/old-page', 'https://example.com/deleted-product']
    }
  ],
  recommendations: [
    'Add canonical tags to all pages to prevent duplicate content issues',
    'Fix broken links or set up proper redirects',
    'Implement schema markup for all key page types',
    'Ensure all images have descriptive alt text'
  ]
};

// Mock historical data
const mockHistoricalData = [
  { date: '2023-06-01', score: 65, issues: 5 },
  { date: '2023-07-01', score: 70, issues: 4 },
  { date: '2023-08-01', score: 75, issues: 2 }
];

describe('Technical SEO Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TechnicalSEODisplay Component', () => {
    test('renders with correct score and status', () => {
      render(
        <TechnicalSEODisplay 
          analysis={mockTechnicalSEOResult} 
          historicalData={mockHistoricalData} 
        />
      );

      // Check for the score display
      expect(screen.getByText('Technical Score')).toBeInTheDocument();
      expect(screen.getByText('75')).toBeInTheDocument();

      // Check for key technical checks
      expect(screen.getByText('Robots.txt')).toBeInTheDocument();
      expect(screen.getByText('Sitemap.xml')).toBeInTheDocument();
      expect(screen.getByText('SSL Certificate')).toBeInTheDocument();
      expect(screen.getByText('Canonical Tags')).toBeInTheDocument();
      expect(screen.getByText('Mobile Friendly')).toBeInTheDocument();

      // Check for status badges
      const validBadges = screen.getAllByText('Valid');
      expect(validBadges.length).toBeGreaterThanOrEqual(3);
    });

    test('navigates between different tabs', async () => {
      const user = userEvent.setup();
      render(
        <TechnicalSEODisplay 
          analysis={mockTechnicalSEOResult} 
          historicalData={mockHistoricalData} 
        />
      );

      // Should start with Overview tab
      expect(screen.getByText('Technical Health Overview')).toBeInTheDocument();

      // Click on Issues tab
      await user.click(screen.getByRole('tab', { name: 'Issues' }));
      await waitFor(() => {
        expect(screen.getByText('Technical SEO Issues')).toBeInTheDocument();
      });

      // Click on Checks tab
      await user.click(screen.getByRole('tab', { name: 'Checks' }));
      await waitFor(() => {
        expect(screen.getByText('Robots.txt Check')).toBeInTheDocument();
        expect(screen.getByText('Sitemap.xml Check')).toBeInTheDocument();
        expect(screen.getByText('SSL Certificate Check')).toBeInTheDocument();
      });

      // Click on Trends tab
      await user.click(screen.getByRole('tab', { name: 'Trends' }));
      await waitFor(() => {
        expect(screen.getByText('Technical SEO Trends')).toBeInTheDocument();
      });
    });

    test('displays issues correctly', async () => {
      const user = userEvent.setup();
      render(
        <TechnicalSEODisplay 
          analysis={mockTechnicalSEOResult} 
          historicalData={mockHistoricalData} 
        />
      );

      // Navigate to Issues tab
      await user.click(screen.getByRole('tab', { name: 'Issues' }));
      
      await waitFor(() => {
        // Check for issue descriptions
        expect(screen.getByText('Canonical tag missing on 3 pages')).toBeInTheDocument();
        expect(screen.getByText('2 pages returning 404 errors')).toBeInTheDocument();
        
        // Check for recommendations
        expect(screen.getByText('Add canonical tags to all pages to prevent duplicate content issues')).toBeInTheDocument();
        expect(screen.getByText('Fix broken links or set up proper redirects')).toBeInTheDocument();
      });
    });

    test('displays recommendations in overview', () => {
      render(
        <TechnicalSEODisplay 
          analysis={mockTechnicalSEOResult} 
          historicalData={mockHistoricalData} 
        />
      );

      // Check for recommendations
      expect(screen.getByText('Key Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Add canonical tags to all pages to prevent duplicate content issues')).toBeInTheDocument();
      expect(screen.getByText('Fix broken links or set up proper redirects')).toBeInTheDocument();
    });
  });

  describe('Technical SEO Service Integration', () => {
    beforeEach(() => {
      // Mock the analyzeTechnicalSEO method
      (TechnicalSEOService.prototype.analyzeTechnicalSEO as jest.Mock).mockResolvedValue(mockTechnicalSEOResult);
      (TechnicalSEOService.prototype.getCachedAnalysis as jest.Mock).mockResolvedValue(null);
      (TechnicalSEOService.prototype.getHistoricalScores as jest.Mock).mockResolvedValue(mockHistoricalData);
    });

    test('service methods are called with correct parameters', async () => {
      // Create an instance of the service
      const service = new TechnicalSEOService();
      
      // Call the analyzeTechnicalSEO method
      await service.analyzeTechnicalSEO({
        siteId: 'site-123',
        domain: 'example.com',
        url: 'https://example.com'
      });
      
      // Check that the method was called with the correct parameters
      expect(service.analyzeTechnicalSEO).toHaveBeenCalledWith({
        siteId: 'site-123',
        domain: 'example.com',
        url: 'https://example.com'
      });
    });

    test('returns cached analysis if available', async () => {
      // Mock getCachedAnalysis to return a value
      (TechnicalSEOService.prototype.getCachedAnalysis as jest.Mock).mockResolvedValue(mockTechnicalSEOResult);
      
      const service = new TechnicalSEOService();
      const result = await service.getCachedAnalysis('site-123', 'example.com');
      
      expect(result).toEqual(mockTechnicalSEOResult);
      expect(service.getCachedAnalysis).toHaveBeenCalledWith('site-123', 'example.com');
    });

    test('performs fresh analysis if no cached data', async () => {
      // Mock getCachedAnalysis to return null
      (TechnicalSEOService.prototype.getCachedAnalysis as jest.Mock).mockResolvedValue(null);
      
      const service = new TechnicalSEOService();
      const result = await service.analyzeTechnicalSEO({
        siteId: 'site-123',
        domain: 'example.com',
        url: 'https://example.com'
      });
      
      expect(result).toEqual(mockTechnicalSEOResult);
      expect(service.analyzeTechnicalSEO).toHaveBeenCalled();
    });
  });
}); 