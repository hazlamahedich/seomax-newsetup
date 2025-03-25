'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Loader2, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReadabilityAnalysisProps {
  contentPageId: string;
}

export function ReadabilityAnalysis({ contentPageId }: ReadabilityAnalysisProps) {
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
        console.error("Error fetching readability analysis:", err);
        setError("Failed to load readability analysis");
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
          <CardTitle>Readability Analysis</CardTitle>
          <CardDescription>
            Analyzing the readability of your content to ensure it meets audience expectations.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
          <h3 className="text-xl font-semibold mb-2">Loading Analysis</h3>
          <p className="text-muted-foreground mb-4">
            Please wait while we fetch the readability analysis for your content.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Readability Analysis</CardTitle>
          <CardDescription>
            Analyze the readability of your content to ensure it meets audience expectations.
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

  if (!analysis || !analysis.readability_analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Readability Analysis</CardTitle>
          <CardDescription>
            Analyze the readability of your content to ensure it meets audience expectations.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <Info className="h-10 w-10 text-amber-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Analysis Available</h3>
          <p className="text-muted-foreground mb-4">
            We haven't analyzed this content yet. Run a content analysis to get readability insights.
          </p>
          <Button onClick={() => window.location.href = `/api/analyze/content?contentId=${contentPageId}`}>
            Analyze Content
          </Button>
        </CardContent>
      </Card>
    );
  }

  const readabilityData = analysis.readability_analysis;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Readability Analysis</CardTitle>
        <CardDescription>
          Detailed analysis of your content's readability to ensure it meets audience expectations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col items-center justify-center p-4 bg-background rounded-lg border">
            <h3 className="text-lg font-medium mb-2">Readability Score</h3>
            <div className="w-24 h-24 relative flex items-center justify-center mb-2">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle
                  className="text-muted-foreground/20"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                />
                <circle
                  className={`${
                    readabilityData.readabilityScore >= 80
                      ? "text-green-500"
                      : readabilityData.readabilityScore >= 60
                      ? "text-amber-500"
                      : "text-red-500"
                  }`}
                  strokeWidth="10"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                  strokeDasharray={`${readabilityData.readabilityScore * 2.51} 251.2`}
                  strokeDashoffset="0"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <span className="absolute text-2xl font-bold">{readabilityData.readabilityScore}</span>
            </div>
            <Badge 
              className={`${
                readabilityData.readabilityScore >= 80
                  ? "bg-green-100 text-green-800"
                  : readabilityData.readabilityScore >= 60
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {readabilityData.readabilityScore >= 80
                ? "Excellent"
                : readabilityData.readabilityScore >= 60
                ? "Good"
                : "Needs Improvement"}
            </Badge>
          </div>

          <div className="flex flex-col p-4 bg-background rounded-lg border">
            <h3 className="text-lg font-medium mb-2">Reading Level</h3>
            <div className="flex items-center mb-2">
              <span className="text-xl font-semibold">{readabilityData.readingLevel}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your content is written at a {readabilityData.readingLevel} reading level.
            </p>
            <Separator className="my-3" />
            <div className="flex justify-between mt-1">
              <span className="text-sm">Elementary</span>
              <span className="text-sm">Graduate</span>
            </div>
            <Progress 
              value={
                readabilityData.readingLevel === "Elementary" ? 20 :
                readabilityData.readingLevel === "Middle School" ? 40 :
                readabilityData.readingLevel === "High School" ? 60 :
                readabilityData.readingLevel === "College" ? 80 : 100
              } 
              className="h-2 mt-1" 
            />
          </div>

          <div className="flex flex-col p-4 bg-background rounded-lg border">
            <h3 className="text-lg font-medium mb-2">Vocabulary Level</h3>
            <div className="flex items-center mb-2">
              <span className="text-xl font-semibold">{readabilityData.vocabularyLevel}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your content uses {readabilityData.vocabularyLevel.toLowerCase()} level vocabulary.
            </p>
            <Separator className="my-3" />
            <div className="flex justify-between mt-1">
              <span className="text-sm">Basic</span>
              <span className="text-sm">Advanced</span>
            </div>
            <Progress 
              value={
                readabilityData.vocabularyLevel === "Basic" ? 33 :
                readabilityData.vocabularyLevel === "Intermediate" ? 66 : 100
              } 
              className="h-2 mt-1" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-background rounded-lg border p-4">
            <h3 className="text-lg font-medium mb-3">Sentence Complexity</h3>
            <div className="flex items-center justify-between mb-2">
              <span>Complexity Level</span>
              <Badge 
                variant="outline" 
                className={`${
                  readabilityData.sentenceComplexity === "Simple" ? "bg-green-100 text-green-800" :
                  readabilityData.sentenceComplexity === "Moderate" ? "bg-blue-100 text-blue-800" :
                  "bg-amber-100 text-amber-800"
                }`}
              >
                {readabilityData.sentenceComplexity}
              </Badge>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span>Passive Voice</span>
              <Badge 
                variant="outline" 
                className={`${
                  readabilityData.passiveVoicePercentage <= 10 ? "bg-green-100 text-green-800" :
                  readabilityData.passiveVoicePercentage <= 20 ? "bg-blue-100 text-blue-800" :
                  "bg-amber-100 text-amber-800"
                }`}
              >
                {readabilityData.passiveVoicePercentage}%
              </Badge>
            </div>
          </div>

          <div className="bg-background rounded-lg border p-4">
            <h3 className="text-lg font-medium mb-3">Analysis Summary</h3>
            <p className="text-sm text-muted-foreground">{readabilityData.analysisSummary}</p>
          </div>
        </div>

        <div className="bg-background rounded-lg border p-4">
          <h3 className="text-lg font-medium mb-3">Improvement Areas</h3>
          <ul className="space-y-2">
            {readabilityData.improvementAreas.map((area: string, index: number) => (
              <li key={index} className="flex items-start">
                <Check className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 