'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Check, AlertCircle, ThumbsUp, ThumbsDown, Edit, Lightbulb, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ContentPageService, ContentSuggestionService } from '@/lib/services/content-service';
import { toast } from '@/components/ui/use-toast';

interface ContentOptimizerProps {
  contentPageId: string;
  onBack?: () => void;
  onEdit?: (contentId: string) => void;
}

export function ContentOptimizer({ contentPageId, onBack, onEdit }: ContentOptimizerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [contentPage, setContentPage] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [appliedCount, setAppliedCount] = useState(0);

  useEffect(() => {
    loadContentAndSuggestions();
  }, [contentPageId]);

  const loadContentAndSuggestions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Load content page data with analysis and suggestions
      const data = await ContentPageService.getContentPageWithAnalysis(contentPageId);
      setContentPage(data.page);
      setAnalysis(data.analysis);
      setSuggestions(data.suggestions || []);
      
      // Count applied suggestions
      if (data.suggestions) {
        const applied = data.suggestions.filter(s => s.implemented).length;
        setAppliedCount(applied);
      }
    } catch (err) {
      setError('Failed to load content data');
      console.error('Error loading content:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySuggestion = async (suggestionId: string) => {
    try {
      await ContentSuggestionService.updateContentSuggestion(suggestionId, true);
      setSuggestions(prevSuggestions => 
        prevSuggestions.map(suggestion => 
          suggestion.id === suggestionId 
            ? { ...suggestion, implemented: true } 
            : suggestion
        )
      );
      setAppliedCount(prev => prev + 1);
      toast({
        title: "Suggestion applied",
        description: "The suggestion has been marked as applied."
      });
    } catch (err) {
      console.error('Error applying suggestion:', err);
      toast({
        title: "Error",
        description: "Failed to update suggestion status.",
        variant: "destructive"
      });
    }
  };

  const handleIgnoreSuggestion = async (suggestionId: string) => {
    // In this implementation, we're soft-ignoring by just removing from UI
    // You could implement this differently based on your needs
    setSuggestions(prevSuggestions => 
      prevSuggestions.filter(suggestion => suggestion.id !== suggestionId)
    );
    toast({
      title: "Suggestion ignored",
      description: "The suggestion has been removed from the list."
    });
  };

  const handleEditContent = () => {
    if (onEdit && contentPageId) {
      onEdit(contentPageId);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-4">Loading content optimization suggestions...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-xl font-semibold mb-2">Error Loading Suggestions</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadContentAndSuggestions}>Try Again</Button>
          {onBack && (
            <Button variant="outline" onClick={onBack} className="mt-2">
              Go Back
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!contentPage) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Content Not Found</h3>
          <p className="text-muted-foreground mb-4">The requested content could not be found.</p>
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              Go Back
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Content Not Analyzed</h3>
          <p className="text-muted-foreground mb-4">
            This content needs to be analyzed before optimization suggestions can be generated.
          </p>
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              Go Back
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const pendingSuggestions = suggestions.filter(s => !s.implemented);
  const implementedSuggestions = suggestions.filter(s => s.implemented);

  const getCategoryBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'readability':
        return <Badge className="bg-blue-500">Readability</Badge>;
      case 'keyword':
        return <Badge className="bg-green-500">Keyword</Badge>;
      case 'structure':
        return <Badge className="bg-purple-500">Structure</Badge>;
      case 'seo':
        return <Badge className="bg-amber-500">SEO</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Optimization</h1>
          <p className="text-muted-foreground text-sm">
            {contentPage.title || 'Untitled Page'} - {pendingSuggestions.length} pending suggestion(s)
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="default"
            onClick={handleEditContent}
            className="flex items-center"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Content
          </Button>
          
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
          )}
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
            Optimization Suggestions
          </CardTitle>
          <CardDescription>
            Apply these suggestions to improve your content's performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {pendingSuggestions.length === 0 ? (
            <div className="text-center py-6">
              <Check className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
              <p className="text-muted-foreground">
                You've applied all the optimization suggestions for this content.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingSuggestions.map((suggestion) => (
                <Card key={suggestion.id} className="overflow-hidden">
                  <div className="flex">
                    <div className="flex-1 p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        {getCategoryBadge(suggestion.type)}
                        <span className="text-sm text-muted-foreground">Priority: {suggestion.priority || 'Medium'}</span>
                      </div>
                      <p className="mb-2">{suggestion.suggestion}</p>
                    </div>
                    <div className="flex flex-col border-l">
                      <Button 
                        variant="ghost" 
                        className="h-1/2 rounded-none hover:bg-green-50 text-green-600 hover:text-green-700 border-b"
                        onClick={() => handleApplySuggestion(suggestion.id)}
                      >
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Apply
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="h-1/2 rounded-none hover:bg-red-50 text-red-600 hover:text-red-700"
                        onClick={() => handleIgnoreSuggestion(suggestion.id)}
                      >
                        <ThumbsDown className="h-4 w-4 mr-2" />
                        Ignore
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
          
          {implementedSuggestions.length > 0 && (
            <>
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-3">Applied Suggestions ({implementedSuggestions.length})</h3>
                <div className="space-y-2">
                  {implementedSuggestions.map((suggestion) => (
                    <div key={suggestion.id} className="p-3 bg-muted rounded-md flex items-start">
                      <Check className="h-4 w-4 mr-2 text-green-500 mt-1" />
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          {getCategoryBadge(suggestion.type)}
                        </div>
                        <p className="text-sm text-muted-foreground">{suggestion.suggestion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
        {pendingSuggestions.length > 0 && (
          <CardFooter>
            <Button variant="outline" onClick={handleEditContent} className="w-full">
              <ArrowRight className="h-4 w-4 mr-2" />
              Go to Editor to Apply Changes
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
} 