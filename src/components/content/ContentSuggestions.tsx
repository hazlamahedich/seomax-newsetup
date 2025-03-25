'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Check, Info, Edit, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

interface ContentSuggestionsProps {
  contentPageId: string;
}

export function ContentSuggestions({ contentPageId }: ContentSuggestionsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/analyze/content?contentId=${contentPageId}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch analysis data");
        }
        
        const data = await response.json();
        setAnalysis(data.analysis);
        setError(null);
      } catch (err) {
        console.error("Error fetching content suggestions:", err);
        setError("Failed to load content suggestions");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchAnalysis();
  }, [contentPageId]);

  const handleCopySuggestion = (suggestion: string) => {
    navigator.clipboard.writeText(suggestion);
    toast({
      title: "Copied to clipboard",
      description: "Suggestion has been copied to your clipboard",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content Suggestions</CardTitle>
          <CardDescription>
            Loading AI-powered suggestions to improve your content performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
          <h3 className="text-xl font-semibold mb-2">Loading Suggestions</h3>
          <p className="text-muted-foreground mb-4">
            Please wait while we fetch the content suggestions for your content.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content Suggestions</CardTitle>
          <CardDescription>
            Get AI-powered suggestions to improve your content performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mb-4" />
          <h3 className="text-xl font-semibold mb-2">Error Loading Suggestions</h3>
          <p className="text-muted-foreground mb-4">
            {error}
          </p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  if (!analysis || !analysis.recommendations || analysis.recommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content Suggestions</CardTitle>
          <CardDescription>
            Get AI-powered suggestions to improve your content performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Info className="h-10 w-10 text-amber-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Suggestions Available</h3>
          <p className="text-muted-foreground mb-4">
            We haven't analyzed this content yet or there are no specific suggestions for improvement.
          </p>
          <Button onClick={() => window.location.href = `/api/analyze/content?contentId=${contentPageId}`}>
            Analyze Content
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Group recommendations by category
  const groupedRecommendations = analysis.recommendations.reduce((acc: any, recommendation: string) => {
    let category = 'General';
    
    if (recommendation.toLowerCase().includes('readability')) {
      category = 'Readability';
    } else if (recommendation.toLowerCase().includes('keyword')) {
      category = 'Keywords';
    } else if (recommendation.toLowerCase().includes('structure') || 
               recommendation.toLowerCase().includes('heading') || 
               recommendation.toLowerCase().includes('paragraph')) {
      category = 'Structure';
    } else if (recommendation.toLowerCase().includes('link')) {
      category = 'Links';
    } else if (recommendation.toLowerCase().includes('image')) {
      category = 'Images';
    }
    
    if (!acc[category]) {
      acc[category] = [];
    }
    
    acc[category].push(recommendation);
    return acc;
  }, {});
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Suggestions</CardTitle>
        <CardDescription>
          AI-powered suggestions to improve your content's SEO performance and readability.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(groupedRecommendations).map(([category, recommendations]: [string, any]) => (
          <div key={category} className="bg-background rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium">{category} Suggestions</h3>
              <Badge 
                className={`${
                  category === 'Readability' ? 'bg-blue-100 text-blue-800' :
                  category === 'Keywords' ? 'bg-green-100 text-green-800' :
                  category === 'Structure' ? 'bg-purple-100 text-purple-800' :
                  category === 'Links' ? 'bg-amber-100 text-amber-800' :
                  category === 'Images' ? 'bg-indigo-100 text-indigo-800' :
                  'bg-gray-100 text-gray-800'
                }`}
              >
                {recommendations.length} {recommendations.length === 1 ? 'suggestion' : 'suggestions'}
              </Badge>
            </div>
            
            <ul className="space-y-4">
              {recommendations.map((suggestion: string, index: number) => (
                <li key={index} className="bg-muted/50 rounded-md p-3">
                  <div className="flex items-start">
                    <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p>{suggestion}</p>
                      <div className="flex gap-2 mt-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleCopySuggestion(suggestion)}
                          className="flex items-center"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex items-center"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Apply
                        </Button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        
        <div className="bg-muted/30 rounded-lg p-4 text-center">
          <p className="text-sm text-muted-foreground">
            These suggestions are generated using AI analysis of your content and industry best practices. 
            Consider each suggestion in the context of your specific content goals.
          </p>
        </div>
      </CardContent>
    </Card>
  );
} 