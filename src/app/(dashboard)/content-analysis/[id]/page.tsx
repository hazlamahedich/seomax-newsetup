"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ArrowLeft, ChevronLeft, FileText, BarChart3, Search, Radio, Users } from 'lucide-react';
import { ContentPageService } from '@/lib/services/content-service';
import { ReadabilityAnalysis } from '@/components/content/ReadabilityAnalysis';
import { KeywordAnalysis } from '@/components/content/KeywordAnalysis';
import { ContentStructureAnalysis } from '@/components/content/ContentStructureAnalysis';
import { ContentSuggestions } from '@/components/content/ContentSuggestions';
import { ContentGapAnalysis } from '@/components/content/ContentGapAnalysis';
import { Separator } from '@/components/ui/separator';

export default function ContentAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const contentId = params.id as string;
  
  const [contentPage, setContentPage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('readability');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      try {
        const content = await ContentPageService.getContentPage(contentId);
        setContentPage(content);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading content:', err);
        setError('Failed to load content data. Please try again later.');
        setIsLoading(false);
      }
    };

    loadContent();
  }, [contentId]);

  const handleBackToProject = () => {
    if (contentPage?.project_id) {
      router.push(`/projects/${contentPage.project_id}`);
    } else {
      router.push('/projects');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-[200px]" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-[300px]" />
            <Skeleton className="h-4 w-[200px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mb-4" />
          <h3 className="text-xl font-semibold mb-2">Error</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleBackToProject}>Return to Project</Button>
        </CardContent>
      </Card>
    );
  }

  if (!contentPage) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Content Not Found</h3>
          <p className="text-muted-foreground mb-4">The requested content could not be found.</p>
          <Button onClick={handleBackToProject}>Return to Project</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={handleBackToProject}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Content Analysis</h1>
        </div>
        
        <Button variant="outline" onClick={handleBackToProject}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Project
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{contentPage.title || 'Untitled Content'}</CardTitle>
          <CardDescription>
            {contentPage.url && (
              <a 
                href={contentPage.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:underline"
              >
                {contentPage.url}
              </a>
            )}
            {!contentPage.url && 'No URL provided'}
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="readability" className="flex items-center">
            <FileText className="mr-2 h-4 w-4" />
            <span>Readability</span>
          </TabsTrigger>
          <TabsTrigger value="keywords" className="flex items-center">
            <Search className="mr-2 h-4 w-4" />
            <span>Keywords</span>
          </TabsTrigger>
          <TabsTrigger value="structure" className="flex items-center">
            <BarChart3 className="mr-2 h-4 w-4" />
            <span>Structure</span>
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="flex items-center">
            <Radio className="mr-2 h-4 w-4" />
            <span>Suggestions</span>
          </TabsTrigger>
          <TabsTrigger value="competitors" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            <span>Competitors</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="readability">
          <ReadabilityAnalysis contentPageId={contentId} />
        </TabsContent>
        
        <TabsContent value="keywords">
          <KeywordAnalysis contentPageId={contentId} />
        </TabsContent>
        
        <TabsContent value="structure">
          <ContentStructureAnalysis contentPageId={contentId} />
        </TabsContent>
        
        <TabsContent value="suggestions">
          <ContentSuggestions contentPageId={contentId} />
        </TabsContent>
        
        <TabsContent value="competitors">
          <ContentGapAnalysis contentPageId={contentId} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 