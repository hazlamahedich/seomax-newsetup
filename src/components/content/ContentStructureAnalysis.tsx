'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContentStructureAnalysisProps {
  contentPageId: string;
}

export function ContentStructureAnalysis({ contentPageId }: ContentStructureAnalysisProps) {
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
        console.error("Error fetching structure analysis:", err);
        setError("Failed to load structure analysis");
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
          <Button onClick={() => window.location.reload()}>Try Again</Button>
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
          <Button onClick={() => window.location.href = `/api/analyze/content?contentId=${contentPageId}`}>
            Analyze Content
          </Button>
        </CardContent>
      </Card>
    );
  }

  const structureData = analysis.structure_analysis;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Structure Analysis</CardTitle>
        <CardDescription>
          Detailed analysis of your content structure for better readability and SEO performance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-background rounded-lg border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium">Structure Score</h3>
              <div className="flex items-center">
                <span className="text-xl font-semibold mr-2">{structureData.structureScore}</span>
                <Badge 
                  className={`${
                    structureData.structureScore >= 80 ? "bg-green-100 text-green-800" :
                    structureData.structureScore >= 60 ? "bg-blue-100 text-blue-800" :
                    "bg-amber-100 text-amber-800"
                  }`}
                >
                  {structureData.structureScore >= 80 ? "Excellent" :
                   structureData.structureScore >= 60 ? "Good" :
                   "Needs Improvement"}
                </Badge>
              </div>
            </div>
            
            <Progress 
              value={structureData.structureScore} 
              className="h-2 mb-4"
              color={structureData.structureScore >= 80 ? "bg-green-500" :
                     structureData.structureScore >= 60 ? "bg-blue-500" :
                     "bg-amber-500"}
            />
            
            <p className="text-sm text-muted-foreground mb-4">
              Your content structure score is based on heading organization, paragraph length, 
              content elements, and other factors that impact readability and SEO.
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Paragraphs</span>
                <span className="font-medium">{structureData.paragraphCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Avg. Paragraph Length</span>
                <span className={`font-medium ${
                  structureData.averageParagraphLength <= 3 ? "text-green-500" :
                  structureData.averageParagraphLength <= 5 ? "text-blue-500" :
                  "text-amber-500"
                }`}>
                  {structureData.averageParagraphLength} sentences
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Lists</span>
                <span className="font-medium">{structureData.listCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Images</span>
                <span className="font-medium">{structureData.imageCount}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-background rounded-lg border p-4">
            <h3 className="text-lg font-medium mb-3">Heading Structure</h3>
            <div className="mb-4">
              <Badge 
                className={`${
                  structureData.headingStructure === 'well-structured' ? "bg-green-100 text-green-800" :
                  structureData.headingStructure === 'needs-improvement' ? "bg-amber-100 text-amber-800" :
                  "bg-red-100 text-red-800"
                }`}
              >
                {structureData.headingStructure === 'well-structured' ? 'Well Structured' :
                 structureData.headingStructure === 'needs-improvement' ? 'Needs Improvement' :
                 'Poor Structure'}
              </Badge>
              
              <p className="text-sm text-muted-foreground mt-2">
                {structureData.headingStructure === 'well-structured' ? 
                  'Your headings follow a logical hierarchy, which is ideal for both readers and search engines.' :
                  structureData.headingStructure === 'needs-improvement' ?
                  'Your heading structure could be improved to follow a more logical hierarchy.' :
                  'Your heading structure needs significant improvement. Use proper heading levels (H1-H6) in hierarchical order.'
                }
              </p>
            </div>
            
            <Separator className="my-3" />
            
            <h3 className="text-md font-medium mb-2">Heading Distribution</h3>
            <div className="space-y-2">
              {Object.entries(structureData.headingCount || {}).map(([level, count]: [string, any]) => (
                <div key={level} className="grid grid-cols-6 gap-2 items-center">
                  <span className="col-span-1 font-medium">{level.toUpperCase()}</span>
                  <div className="col-span-4 bg-muted rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-primary h-full rounded-full" 
                      style={{ width: `${Math.min(count * 20, 100)}%` }}
                    ></div>
                  </div>
                  <span className="col-span-1 text-right">{count}</span>
                </div>
              ))}
              
              {Object.keys(structureData.headingCount || {}).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No headings detected in your content. Consider adding headings to improve structure.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-background rounded-lg border p-4">
          <h3 className="text-lg font-medium mb-3">Improvement Areas</h3>
          {structureData.improvementAreas?.length > 0 ? (
            <ul className="space-y-2">
              {structureData.improvementAreas.map((area: string, index: number) => (
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