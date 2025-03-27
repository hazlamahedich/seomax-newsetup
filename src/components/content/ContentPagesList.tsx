'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Edit, BarChart2, Trash2, ExternalLink, Lightbulb, LineChart, PieChart, AlertCircle, Pencil, Layers, RefreshCw
} from 'lucide-react';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { ContentPageService } from '@/lib/services/content-service';
import { ContentPage } from '@/lib/types/database.types';
import { toast } from '@/components/ui/use-toast';

interface ContentPagesListProps {
  projectId: string;
  contentPages?: ContentPage[];
  onCreatePage?: () => void;
  onEditPage?: (pageId: string) => void;
  onAnalyzePage?: (pageId: string) => void;
  onOptimizePage?: (pageId: string) => void;
  onViewPerformance?: (pageId: string) => void;
  onAnalyzeGap?: (pageId: string) => void;
  onPageDeleted?: () => void;
}

export function ContentPagesList({
  projectId,
  contentPages,
  onCreatePage,
  onEditPage,
  onAnalyzePage,
  onOptimizePage,
  onViewPerformance,
  onAnalyzeGap,
  onPageDeleted
}: ContentPagesListProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [localPages, setLocalPages] = useState<ContentPage[]>([]);
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({});

  // Use provided content pages if available, otherwise use local state
  const pages = contentPages || localPages;

  const handleDeletePage = async (pageId: string) => {
    try {
      setIsDeleting(pageId);
      await ContentPageService.deleteContentPage(pageId);
      
      // If we're using local pages, update them
      if (!contentPages) {
        setLocalPages((prevPages) => prevPages.filter((page) => page.id !== pageId));
      }
      
      // Notify parent component about deletion
      if (onPageDeleted) {
        onPageDeleted();
      }
      toast({
        title: "Page deleted",
        description: "The content page has been successfully deleted.",
      });
    } catch (error) {
      console.error('Error deleting content page:', error);
      toast({
        title: "Error",
        description: "There was an error deleting the content page.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleAnalyze = async (pageId: string) => {
    try {
      setAnalyzing(prev => ({ ...prev, [pageId]: true }));
      
      const response = await fetch('/api/content-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentPageId: pageId,
          action: 'analyze'
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start analysis');
      }
      
      toast({
        title: "Analysis started",
        description: "Content analysis is now in progress. This may take a minute.",
      });
      
      // Call the parent component's analyze handler to update the UI
      onAnalyzePage?.(pageId);
    } catch (error) {
      console.error('Error starting analysis:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start analysis",
        variant: "destructive"
      });
    } finally {
      setAnalyzing(prev => {
        const newState = { ...prev };
        delete newState[pageId];
        return newState;
      });
    }
  };

  const getSeoScoreBadge = (score: number | null) => {
    if (score === null) return <Badge variant="outline">Not analyzed</Badge>;

    if (score >= 80) {
      return <Badge className="bg-green-100 text-green-800">Good ({score})</Badge>;
    } else if (score >= 60) {
      return <Badge className="bg-yellow-100 text-yellow-800">Needs Improvement ({score})</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Poor ({score})</Badge>;
    }
  };

  const getReadabilityBadge = (score: number | null) => {
    if (score === null) return <Badge variant="outline">Not analyzed</Badge>;

    if (score >= 80) {
      return <Badge className="bg-green-100 text-green-800">Easy ({score})</Badge>;
    } else if (score >= 60) {
      return <Badge className="bg-yellow-100 text-yellow-800">Moderate ({score})</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Difficult ({score})</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (pages.length === 0) {
    return (
      <div className="py-8 text-center border rounded-md">
        <div className="flex flex-col items-center justify-center space-y-3">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
          <h3 className="text-lg font-medium">No content pages found</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            You haven't created any content pages yet. Add your first page to start
            tracking and optimizing your content.
          </p>
          <Button onClick={onCreatePage} className="mt-2">
            Add Your First Content Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title / URL</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>SEO Score</TableHead>
            <TableHead>Readability</TableHead>
            <TableHead>Words</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pages.map((page) => (
            <TableRow key={page.id}>
              <TableCell className="font-medium">
                <div className="font-medium">{page.title || 'Untitled'}</div>
                <div className="text-sm text-muted-foreground truncate max-w-xs">
                  {page.url ? (
                    <a
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center"
                    >
                      {page.url}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  ) : (
                    'No URL'
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={page.status !== 'not-analyzed' ? 'default' : 'outline'}
                  className={page.status !== 'not-analyzed' ? 'bg-blue-100 text-blue-800' : ''}
                >
                  {page.status === 'analyzing' ? 'Analyzing...' : page.status !== 'not-analyzed' ? 'Analyzed' : 'Draft'}
                </Badge>
              </TableCell>
              <TableCell>{getSeoScoreBadge(page.seo_score)}</TableCell>
              <TableCell>{getReadabilityBadge(page.readability_score)}</TableCell>
              <TableCell>{page.word_count?.toLocaleString() || 0}</TableCell>
              <TableCell>{formatDate(page.updated_at || page.created_at)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditPage?.(page.id)}
                    title="Edit content"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleAnalyze(page.id)}
                    disabled={analyzing[page.id] || page.status === 'analyzing'}
                    title="Analyze content"
                  >
                    <RefreshCw className={`h-4 w-4 ${analyzing[page.id] || page.status === 'analyzing' ? 'animate-spin' : ''}`} />
                  </Button>
                  {onOptimizePage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onOptimizePage(page.id)}
                      title="Optimize content"
                    >
                      <Lightbulb className="h-4 w-4" />
                    </Button>
                  )}
                  {onViewPerformance && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewPerformance(page.id)}
                      title="View performance"
                    >
                      <LineChart className="h-4 w-4" />
                    </Button>
                  )}
                  {onAnalyzeGap && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onAnalyzeGap(page.id)}
                      title="Gap analysis"
                    >
                      <PieChart className="h-4 w-4" />
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete content"
                        disabled={isDeleting === page.id}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this content page?
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeletePage(page.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isDeleting === page.id ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 