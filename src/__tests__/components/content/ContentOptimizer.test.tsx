import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContentOptimizer } from '@/components/content/ContentOptimizer';
import { ContentPageService, ContentSuggestionService } from '@/lib/services/content-service';
import { toast } from '@/components/ui/use-toast';

// Mock the services and toast
jest.mock('@/lib/services/content-service', () => ({
  ContentPageService: {
    getContentPage: jest.fn(),
    updateContentPage: jest.fn(),
  },
  ContentSuggestionService: {
    getSuggestions: jest.fn(),
    implementSuggestion: jest.fn(),
    rejectSuggestion: jest.fn(),
  },
}));

jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
  useToast: jest.fn().mockReturnValue({
    toast: jest.fn(),
  }),
}));

describe('ContentOptimizer Component', () => {
  const mockContentPage = {
    id: 'page-1',
    project_id: 'project-1',
    url: 'https://example.com/test',
    title: 'Test Page',
    content: 'This is test content for optimization.',
    status: 'analyzed',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };
  
  const mockAnalysis = {
    id: 'analysis-1',
    content_page_id: 'page-1',
    score: 75,
    recommendations: ['Improve title', 'Add more keywords'],
    created_at: '2023-01-01T00:00:00Z',
  };
  
  const mockSuggestions = [
    {
      id: 'suggestion-1',
      analysis_id: 'analysis-1',
      type: 'title',
      original_text: 'Test Page',
      suggested_text: 'Optimized Test Page with Keywords',
      status: 'pending',
      created_at: '2023-01-01T00:00:00Z',
    },
    {
      id: 'suggestion-2',
      analysis_id: 'analysis-1',
      type: 'content',
      original_text: 'This is test content',
      suggested_text: 'This is optimized test content with better keywords',
      status: 'pending',
      created_at: '2023-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (ContentPageService.getContentPage as jest.Mock).mockResolvedValue({
      ...mockContentPage,
      latestAnalysis: mockAnalysis,
    });
    
    (ContentSuggestionService.getSuggestions as jest.Mock).mockResolvedValue(mockSuggestions);
    (ContentSuggestionService.implementSuggestion as jest.Mock).mockResolvedValue({ success: true });
    (ContentSuggestionService.rejectSuggestion as jest.Mock).mockResolvedValue({ success: true });
    (ContentPageService.updateContentPage as jest.Mock).mockResolvedValue({ ...mockContentPage });
  });

  it('renders loading state initially', () => {
    render(<ContentOptimizer contentPageId="page-1" />);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
  
  it('loads and displays content with suggestions', async () => {
    render(<ContentOptimizer contentPageId="page-1" />);
    
    // Check loading is shown initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/optimization suggestions/i)).toBeInTheDocument();
    });
    
    // Check content page details are shown
    expect(screen.getByText(/test page/i)).toBeInTheDocument();
    
    // Check suggestions are displayed
    expect(screen.getByText(/optimized test page with keywords/i)).toBeInTheDocument();
    expect(screen.getByText(/this is optimized test content with better keywords/i)).toBeInTheDocument();
  });
  
  it('handles errors when loading content', async () => {
    // Mock an error response
    (ContentPageService.getContentPage as jest.Mock).mockRejectedValue(new Error('Failed to load content'));
    
    render(<ContentOptimizer contentPageId="page-1" />);
    
    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/error loading content/i)).toBeInTheDocument();
    });
    
    // Retry button should be available
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
  
  it('handles applying a suggestion', async () => {
    const user = userEvent.setup();
    
    render(<ContentOptimizer contentPageId="page-1" />);
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/optimization suggestions/i)).toBeInTheDocument();
    });
    
    // Find and click the apply button for a suggestion
    const applyButtons = screen.getAllByRole('button', { name: /apply/i });
    await user.click(applyButtons[0]);
    
    // Verify the suggestion service was called
    expect(ContentSuggestionService.implementSuggestion).toHaveBeenCalledWith('suggestion-1');
    
    // Verify toast was shown
    await waitFor(() => {
      expect(toast).toHaveBeenCalled();
    });
  });
  
  it('handles ignoring a suggestion', async () => {
    const user = userEvent.setup();
    
    render(<ContentOptimizer contentPageId="page-1" />);
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/optimization suggestions/i)).toBeInTheDocument();
    });
    
    // Find and click the ignore button for a suggestion
    const ignoreButtons = screen.getAllByRole('button', { name: /ignore/i });
    await user.click(ignoreButtons[0]);
    
    // Verify the suggestion service was called
    expect(ContentSuggestionService.rejectSuggestion).toHaveBeenCalledWith('suggestion-1');
    
    // Verify toast was shown
    await waitFor(() => {
      expect(toast).toHaveBeenCalled();
    });
  });
  
  it('handles manually editing content', async () => {
    const user = userEvent.setup();
    
    render(<ContentOptimizer contentPageId="page-1" />);
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/optimization suggestions/i)).toBeInTheDocument();
    });
    
    // Click edit button
    const editButton = screen.getByRole('button', { name: /edit content/i });
    await user.click(editButton);
    
    // Find the textarea and update its value
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'New updated content');
    
    // Save the changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);
    
    // Verify the update service was called
    expect(ContentPageService.updateContentPage).toHaveBeenCalledWith({
      id: 'page-1',
      content: 'New updated content',
    });
    
    // Verify toast was shown
    await waitFor(() => {
      expect(toast).toHaveBeenCalled();
    });
  });
  
  it('displays a message when no suggestions are available', async () => {
    // Mock empty suggestions array
    (ContentSuggestionService.getSuggestions as jest.Mock).mockResolvedValue([]);
    
    render(<ContentOptimizer contentPageId="page-1" />);
    
    // Wait for content to load
    await waitFor(() => {
      expect(screen.getByText(/optimization suggestions/i)).toBeInTheDocument();
    });
    
    // Check for no suggestions message
    expect(screen.getByText(/no optimization suggestions available/i)).toBeInTheDocument();
  });
}); 