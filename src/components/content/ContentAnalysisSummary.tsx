import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// Define the types for the analysis metrics
interface ReadabilityMetrics {
  readingLevel: string;
  sentenceComplexity: string;
  vocabularyLevel: string;
  passiveVoiceUsage: string;
  overallScore: number;
  improvementAreas: string[];
}

interface KeywordMetrics {
  density: string;
  placement: string;
  naturalUsage: string;
  relatedKeywords: string[];
  optimizationScore: number;
  recommendations: string[];
}

interface StructureMetrics {
  headingHierarchy: string;
  contentOrganization: string;
  introAndConclusion: string;
  formatting: string;
  contentGaps: string[];
  overallScore: number;
}

interface ContentAnalysisSummaryProps {
  readability: ReadabilityMetrics;
  keywords: KeywordMetrics;
  structure: StructureMetrics;
  overallScore: number;
}

export function ContentAnalysisSummary({
  readability,
  keywords,
  structure,
  overallScore,
}: ContentAnalysisSummaryProps) {
  // Helper functions for formatting scores
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Overall Content Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Overall Score</span>
            <Badge className={getScoreBadge(overallScore) === 'success' ? 'bg-green-500' : 
                             getScoreBadge(overallScore) === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}>
              {overallScore}/100
            </Badge>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full ${getScoreColor(overallScore)}`} 
              style={{ width: `${overallScore}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="readability" className="w-full">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="readability">Readability</TabsTrigger>
          <TabsTrigger value="keywords">Keywords</TabsTrigger>
          <TabsTrigger value="structure">Structure</TabsTrigger>
        </TabsList>
        
        {/* Readability Tab */}
        <TabsContent value="readability" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Readability Analysis</CardTitle>
                <Badge className={getScoreBadge(readability.overallScore) === 'success' ? 'bg-green-500' : 
                                getScoreBadge(readability.overallScore) === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}>
                  {readability.overallScore}/100
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Reading Level</p>
                    <p className="text-sm text-muted-foreground">{readability.readingLevel}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Sentence Complexity</p>
                    <p className="text-sm text-muted-foreground">{readability.sentenceComplexity}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Vocabulary Level</p>
                    <p className="text-sm text-muted-foreground">{readability.vocabularyLevel}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Passive Voice Usage</p>
                    <p className="text-sm text-muted-foreground">{readability.passiveVoiceUsage}</p>
                  </div>
                </div>
              </div>
              
              {readability.improvementAreas.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Improvement Areas</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {readability.improvementAreas.map((area, index) => (
                      <li key={index} className="text-sm text-muted-foreground">{area}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Keywords Tab */}
        <TabsContent value="keywords" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Keyword Analysis</CardTitle>
                <Badge className={getScoreBadge(keywords.optimizationScore) === 'success' ? 'bg-green-500' : 
                                getScoreBadge(keywords.optimizationScore) === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}>
                  {keywords.optimizationScore}/100
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Keyword Density</p>
                    <p className="text-sm text-muted-foreground">{keywords.density}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Keyword Placement</p>
                    <p className="text-sm text-muted-foreground">{keywords.placement}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Natural Usage</p>
                    <p className="text-sm text-muted-foreground">{keywords.naturalUsage}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Related Keywords</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {keywords.relatedKeywords.map((keyword, index) => (
                        <Badge key={index} variant="outline" className="bg-muted">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {keywords.recommendations.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Recommendations</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {keywords.recommendations.map((recommendation, index) => (
                      <li key={index} className="text-sm text-muted-foreground">{recommendation}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Structure Tab */}
        <TabsContent value="structure" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Structure Analysis</CardTitle>
                <Badge className={getScoreBadge(structure.overallScore) === 'success' ? 'bg-green-500' : 
                                getScoreBadge(structure.overallScore) === 'warning' ? 'bg-yellow-500' : 'bg-red-500'}>
                  {structure.overallScore}/100
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Heading Hierarchy</p>
                    <p className="text-sm text-muted-foreground">{structure.headingHierarchy}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Content Organization</p>
                    <p className="text-sm text-muted-foreground">{structure.contentOrganization}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Intro & Conclusion</p>
                    <p className="text-sm text-muted-foreground">{structure.introAndConclusion}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Formatting</p>
                    <p className="text-sm text-muted-foreground">{structure.formatting}</p>
                  </div>
                </div>
              </div>
              
              {structure.contentGaps.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Content Gaps</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {structure.contentGaps.map((gap, index) => (
                      <li key={index} className="text-sm text-muted-foreground">{gap}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 