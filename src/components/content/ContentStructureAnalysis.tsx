'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2, Check, Info, CheckCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';

interface ContentStructureAnalysisProps {
  contentPageId: string;
  title: string;
  url: string;
  analyzed: boolean;
}

export default function ContentStructureAnalysis({ contentPageId, title, url, analyzed }: ContentStructureAnalysisProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [contentNotFound, setContentNotFound] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [success, setSuccess] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/content-analysis?contentPageId=${contentPageId}&skipAuth=true`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch analysis: ${response.status}`);
        }
        
        const data = await response.json();
        setAnalysis(data);
        setContentNotFound(false);
      } catch (error) {
        console.error('Error fetching analysis:', error);
        setError((error as Error).message);
        setContentNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (contentPageId) {
      fetchAnalysis();
    }
  }, [contentPageId]);

  const handleAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    setSuccess(false);
    
    try {
      const response = await fetch('/api/content-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contentPageId,
          skipAuth: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        toast({
          title: "Analysis Complete",
          description: "Content analysis has been completed successfully.",
          variant: "default",
        });
        
        // Refresh the page after a short delay to show updated analysis
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        throw new Error(data.error || 'Unknown error during analysis');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during analysis');
      toast({
        title: "Analysis Failed",
        description: err.message || 'Failed to complete content analysis',
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content Structure Analysis</CardTitle>
          <CardDescription>
            Analyzing your content structure for better readability and SEO performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
          <h3 className="text-xl font-semibold mb-2">Loading Analysis</h3>
          <p className="text-muted-foreground mb-4">
            Please wait while we fetch the structure analysis for your content.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (contentNotFound) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content Structure Analysis</CardTitle>
          <CardDescription>
            Analyze your content structure for better readability and SEO performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <AlertCircle className="h-10 w-10 text-amber-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Content Not Found</h3>
          <p className="text-muted-foreground mb-4">
            The content page you're trying to analyze doesn't exist or has been deleted.
            Content ID: {contentPageId}
          </p>
          <Button onClick={() => window.location.href = '/dashboard/content'}>
            Back to Content Pages
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content Structure Analysis</CardTitle>
          <CardDescription>
            Analyze your content structure for better readability and SEO performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mb-4" />
          <h3 className="text-xl font-semibold mb-2">Error Loading Analysis</h3>
          <p className="text-muted-foreground mb-4">
            {error}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => window.location.href = '/dashboard/content'}>
              Back to Content
            </Button>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis || !analysis.structure_analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content Structure Analysis</CardTitle>
          <CardDescription>
            Analyze your content structure for better readability and SEO performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Info className="h-10 w-10 text-amber-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Analysis Available</h3>
          <p className="text-muted-foreground mb-4">
            We haven't analyzed this content yet. Run a content analysis to get structure insights.
          </p>
          <Button onClick={handleAnalysis}>
            Analyze Content
          </Button>
        </CardContent>
      </Card>
    );
  }

  const structureData = analysis.structure_analysis;
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Content Structure Analysis</CardTitle>
        <CardDescription>
          Analyze your content to get recommendations on improving its structure and SEO performance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{url}</p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>Analysis completed successfully. Refreshing page...</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleAnalysis} 
          disabled={isAnalyzing}
          className="w-full"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Analyzing Content...
            </>
          ) : analyzed ? (
            'Re-Analyze Content'
          ) : (
            'Analyze Content'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
} 