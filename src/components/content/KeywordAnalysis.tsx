'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Loader2, Check, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface KeywordAnalysisProps {
  contentPageId: string;
}

export function KeywordAnalysis({ contentPageId }: KeywordAnalysisProps) {
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
        console.error("Error fetching keyword analysis:", err);
        setError("Failed to load keyword analysis");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchAnalysis();
  }, [contentPageId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keyword Analysis</CardTitle>
          <CardDescription>
            Analyzing keyword usage in your content to improve SEO performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
          <h3 className="text-xl font-semibold mb-2">Loading Analysis</h3>
          <p className="text-muted-foreground mb-4">
            Please wait while we fetch the keyword analysis for your content.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keyword Analysis</CardTitle>
          <CardDescription>
            Analyze keyword usage and discover opportunities to improve your content.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mb-4" />
          <h3 className="text-xl font-semibold mb-2">Error Loading Analysis</h3>
          <p className="text-muted-foreground mb-4">
            {error}
          </p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  if (!analysis || !analysis.keyword_analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Keyword Analysis</CardTitle>
          <CardDescription>
            Analyze keyword usage and discover opportunities to improve your content.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Info className="h-10 w-10 text-amber-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Analysis Available</h3>
          <p className="text-muted-foreground mb-4">
            We haven't analyzed this content yet. Run a content analysis to get keyword insights.
          </p>
          <Button onClick={() => window.location.href = `/api/analyze/content?contentId=${contentPageId}`}>
            Analyze Content
          </Button>
        </CardContent>
      </Card>
    );
  }

  const keywordData = analysis.keyword_analysis;
  const primaryKeyword = Object.keys(keywordData.keywordDensity)[0] || "No primary keyword";
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Keyword Analysis</CardTitle>
        <CardDescription>
          Detailed analysis of keyword usage throughout your content.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-background rounded-lg border p-4">
            <h3 className="text-lg font-medium mb-3">Primary Keyword</h3>
            <div className="flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{primaryKeyword}</span>
                <Badge className="bg-blue-100 text-blue-800">
                  {keywordData.primaryKeywordUsage} occurrences
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Density</span>
                  <span 
                    className={
                      keywordData.keywordDensity[primaryKeyword] < 0.5 ? "text-red-500" :
                      keywordData.keywordDensity[primaryKeyword] > 3 ? "text-amber-500" :
                      "text-green-500"
                    }
                  >
                    {keywordData.keywordDensity[primaryKeyword]}%
                  </span>
                </div>
                <Progress 
                  value={Math.min(keywordData.keywordDensity[primaryKeyword] * 33, 100)} 
                  className="h-2" 
                />
                {keywordData.keywordDensity[primaryKeyword] < 0.5 && (
                  <p className="text-xs text-amber-600 flex items-start mt-1">
                    <AlertTriangle className="h-3 w-3 mr-1 mt-0.5" />
                    Keyword density is low. Consider using it more.
                  </p>
                )}
                {keywordData.keywordDensity[primaryKeyword] > 3 && (
                  <p className="text-xs text-amber-600 flex items-start mt-1">
                    <AlertTriangle className="h-3 w-3 mr-1 mt-0.5" />
                    Keyword density is high. This may be seen as keyword stuffing.
                  </p>
                )}
              </div>
            </div>
            
            <Separator className="my-3" />
            
            <div className="space-y-3">
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full ${keywordData.keywordInTitle ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                <span>Keyword in Title</span>
              </div>
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full ${keywordData.keywordInFirstParagraph ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                <span>Keyword in First Paragraph</span>
              </div>
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full ${keywordData.keywordInHeadings > 0 ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                <span>Keyword in Headings ({keywordData.keywordInHeadings})</span>
              </div>
            </div>
          </div>
          
          <div className="bg-background rounded-lg border p-4">
            <h3 className="text-lg font-medium mb-3">Keyword Distribution</h3>
            <div className="mb-4">
              <Badge 
                className={`${
                  keywordData.keywordDistribution === 'even' ? 'bg-green-100 text-green-800' :
                  keywordData.keywordDistribution === 'somewhat even' ? 'bg-blue-100 text-blue-800' :
                  'bg-amber-100 text-amber-800'
                }`}
              >
                {keywordData.keywordDistribution === 'even' ? 'Evenly Distributed' :
                keywordData.keywordDistribution === 'somewhat even' ? 'Somewhat Even' :
                'Unevenly Distributed'}
              </Badge>
              
              <p className="text-sm text-muted-foreground mt-2">
                {keywordData.keywordDistribution === 'even' ? 
                  'Your keywords are evenly distributed throughout the content, which is ideal for SEO.' :
                  keywordData.keywordDistribution === 'somewhat even' ?
                  'Your keywords are somewhat evenly distributed. Consider improving distribution for better SEO.' :
                  'Your keywords are not evenly distributed. Try to spread keywords throughout your content.'
                }
              </p>
            </div>
            
            <Separator className="my-3" />
            
            <h3 className="text-md font-medium mb-2">Secondary Keywords</h3>
            {Object.entries(keywordData.keywordDensity)
              .slice(1, 5)
              .map(([keyword, density]: [string, any], index: number) => (
                <div key={index} className="flex items-center justify-between mb-2 text-sm">
                  <span className="truncate max-w-[200px]">{keyword}</span>
                  <span
                    className={
                      Number(density) < 0.3 ? "text-red-500" :
                      Number(density) > 2 ? "text-amber-500" :
                      "text-green-500"
                    }
                  >
                    {density}%
                  </span>
                </div>
              ))}
            
            {Object.entries(keywordData.keywordDensity).length <= 1 && (
              <p className="text-sm text-muted-foreground">
                No secondary keywords detected. Consider using related terms to improve your SEO.
              </p>
            )}
          </div>
        </div>
        
        <div className="bg-background rounded-lg border p-4">
          <h3 className="text-lg font-medium mb-3">Improvement Areas</h3>
          {keywordData.improvementAreas?.length > 0 ? (
            <ul className="space-y-2">
              {keywordData.improvementAreas.map((area: string, index: number) => (
                <li key={index} className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No specific improvement areas identified.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 