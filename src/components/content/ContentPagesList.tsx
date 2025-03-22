'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, PlusCircle, Edit, BarChart2, Trash2, ExternalLink } from 'lucide-react';
import { ContentPageService } from '@/lib/services/content-service';
import { ContentPage } from '@/lib/types/database.types';

interface ContentPagesListProps {
  projectId: string;
  onCreatePage?: () => void;
  onEditPage?: (pageId: string) => void;
  onAnalyzePage?: (pageId: string) => void;
}

export function ContentPagesList({
  projectId,
  onCreatePage,
  onEditPage,
  onAnalyzePage,
}: ContentPagesListProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pages, setPages] = useState<ContentPage[]>([]);
  const [filteredPages, setFilteredPages] = useState<ContentPage[]>([]);

  useEffect(() => {
    if (projectId) {
      loadPages();
    }
  }, [projectId]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredPages(pages);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredPages(
        pages.filter(
          (page) =>
            page.title?.toLowerCase().includes(term) ||
            page.url?.toLowerCase().includes(term) ||
            page.content?.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, pages]);

  const loadPages = async () => {
    try {
      setIsLoading(true);
      const contentPages = await ContentPageService.getContentPages(projectId);
      setPages(contentPages);
      setFilteredPages(contentPages);
    } catch (error) {
      console.error('Error loading content pages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePage = async (pageId: string) => {
    if (window.confirm('Are you sure you want to delete this content page?')) {
      try {
        await ContentPageService.deleteContentPage(pageId);
        setPages((prevPages) => prevPages.filter((page) => page.id !== pageId));
      } catch (error) {
        console.error('Error deleting content page:', error);
      }
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
      return <Badge className="bg-green-100 text-green-800">Easy to Read ({score})</Badge>;
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

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Content Pages</CardTitle>
        <Button onClick={onCreatePage}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Content Page
        </Button>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search content pages..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="ml-2" onClick={loadPages}>
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center">Loading content pages...</div>
        ) : filteredPages.length === 0 ? (
          <div className="py-8 text-center">
            {pages.length === 0
              ? 'No content pages found. Click "Add Content Page" to create one.'
              : 'No pages match your search criteria.'}
          </div>
        ) : (
          <div className="rounded-md border">
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
                {filteredPages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-medium">
                      <div>{page.title || 'Untitled'}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
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
                        variant={page.analyzed_at ? 'default' : 'outline'}
                        className={page.analyzed_at ? 'bg-blue-100 text-blue-800' : ''}
                      >
                        {page.analyzed_at ? 'Analyzed' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getSeoScoreBadge(page.seo_score)}</TableCell>
                    <TableCell>{getReadabilityBadge(page.readability_score)}</TableCell>
                    <TableCell>{page.word_count || 0}</TableCell>
                    <TableCell>{formatDate(page.updated_at)}</TableCell>
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
                          onClick={() => onAnalyzePage?.(page.id)}
                          title="Analyze content"
                        >
                          <BarChart2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePage(page.id)}
                          title="Delete content"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 