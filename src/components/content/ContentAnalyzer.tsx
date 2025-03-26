'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, Check, AlertCircle, RefreshCw, FileText, Key, Layout, Info, Image, Link } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ContentPageService } from '@/lib/services/content-service';
import { toast } from '@/components/ui/use-toast';
import { ContentAnalysisPdfButton } from './ContentAnalysisPdfButton';

interface ContentAnalyzerProps {
  contentPageId: string;
  onBack?: () => void;
}

export function ContentAnalyzer({ contentPageId, onBack }: ContentAnalyzerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [contentPage, setContentPage] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('readability');

  useEffect(() => {
    loadContentAndAnalysis();
  }, [contentPageId]);

  const loadContentAndAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(`Loading content and analysis for contentId: ${contentPageId}`);
      // Load content page data with analysis
      const data = await ContentPageService.getContentPageWithAnalysis(contentPageId);
      console.log('Content page data received:', data.page);
      console.log('Analysis data received:', data.analysis);
      
      setContentPage(data.page);
      setAnalysis(data.analysis);
      
      if (data.analysis) {
        console.log('Analysis structure:', {
          keys: Object.keys(data.analysis),
          hasResult: Boolean(data.analysis.result),
          resultKeys: data.analysis.result ? Object.keys(data.analysis.result) : null
        });
        
        if (data.analysis.result) {
          // Log details about the nested analysis structure
          const { result } = data.analysis;
          console.log('Result contains readability_analysis:', Boolean(result.readability_analysis));
          console.log('Result contains keyword_analysis:', Boolean(result.keyword_analysis));
          console.log('Result contains structure_analysis:', Boolean(result.structure_analysis));
          
          if (result.readability_analysis) {
            console.log('Readability analysis keys:', Object.keys(result.readability_analysis));
          }
          
          if (result.keyword_analysis) {
            console.log('Keyword analysis keys:', Object.keys(result.keyword_analysis));
          }
        }
      } else {
        console.log('No analysis data received');
      }
    } catch (err) {
      setError('Failed to load content data');
      console.error('Error loading content:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeContent = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      await ContentPageService.analyzeContentPage(contentPageId);
      toast({
        title: "Analysis complete",
        description: "Content has been analyzed successfully.",
      });
      // Reload data after analysis
      await loadContentAndAnalysis();
    } catch (err) {
      setError('Failed to analyze content');
      console.error('Error analyzing content:', err);
      toast({
        title: "Analysis failed",
        description: "There was an error analyzing your content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Add debug function
  const fetchDebugInfo = async () => {
    try {
      console.log("Fetching debug info for content page:", contentPageId);
      const response = await fetch(`/api/debug/content-analysis?contentPageId=${contentPageId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Debug API error:", errorData);
        toast({
          title: "Debug Error",
          description: errorData.error || "Failed to fetch debug information",
          variant: "destructive",
        });
        return;
      }
      
      const debugData = await response.json();
      console.log("Debug API Response:", debugData);
      
      // Display debug information in a more readable format
      console.group("Content Analysis Debug Information");
      console.log("Content Page Data:", debugData.debugInfo.contentPage);
      console.log("Analysis Data:", debugData.debugInfo.analysisData);
      
      if (debugData.debugInfo.analysisDataStructure) {
        console.log("Analysis Structure:", debugData.debugInfo.analysisDataStructure);
        console.log("Raw Analysis Result:", debugData.debugInfo.rawAnalysisResult);
        
        console.group("Analysis Component Keys");
        if (debugData.debugInfo.analysisDataStructure.hasReadabilityAnalysis) {
          console.log("Readability Analysis Keys:", debugData.debugInfo.analysisDataStructure.readabilityAnalysisKeys);
        }
        if (debugData.debugInfo.analysisDataStructure.hasKeywordAnalysis) {
          console.log("Keyword Analysis Keys:", debugData.debugInfo.analysisDataStructure.keywordAnalysisKeys);
        }
        if (debugData.debugInfo.analysisDataStructure.hasStructureAnalysis) {
          console.log("Structure Analysis Keys:", debugData.debugInfo.analysisDataStructure.structureAnalysisKeys);
        }
        console.groupEnd();
      }
      console.groupEnd();
      
      toast({
        title: "Debug Information",
        description: "Debug data has been logged to the console",
      });
    } catch (error) {
      console.error("Error fetching debug information:", error);
      toast({
        title: "Debug Error",
        description: "Failed to fetch debug information",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-4">Loading content analysis...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-xl font-semibold mb-2">Error Loading Analysis</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadContentAndAnalysis}>Try Again</Button>
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
          <Info className="h-12 w-12 text-muted-foreground mb-4" />
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

  const needsAnalysis = !analysis || contentPage.status === 'not-analyzed';

  const renderAnalysisContent = () => {
    if (needsAnalysis) {
      return (
        <Card className="w-full">
          <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
            <FileText className="h-16 w-16 text-muted-foreground mb-6" />
            <h3 className="text-xl font-semibold mb-3">Content Not Analyzed</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              This content has not been analyzed yet. Analyze it to get insights on readability, keyword usage, and content structure.
            </p>
            <Button 
              onClick={handleAnalyzeContent} 
              disabled={isAnalyzing}
              className="flex items-center"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Analyze Content
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-5 mb-4">
          <TabsTrigger value="readability" className="flex items-center">
            <FileText className="h-4 w-4 mr-2" />
            Readability
          </TabsTrigger>
          <TabsTrigger value="keywords" className="flex items-center">
            <Key className="h-4 w-4 mr-2" />
            Keywords
          </TabsTrigger>
          <TabsTrigger value="structure" className="flex items-center">
            <Layout className="h-4 w-4 mr-2" />
            Structure
          </TabsTrigger>
          <TabsTrigger value="images" className="flex items-center">
            <Image className="h-4 w-4 mr-2" />
            Images
          </TabsTrigger>
          <TabsTrigger value="links" className="flex items-center">
            <Link className="h-4 w-4 mr-2" />
            Links
          </TabsTrigger>
        </TabsList>

        <TabsContent value="readability" className="space-y-4">
          {renderReadabilityAnalysis()}
        </TabsContent>

        <TabsContent value="keywords" className="space-y-4">
          {renderKeywordAnalysis()}
        </TabsContent>

        <TabsContent value="structure" className="space-y-4">
          {renderStructureAnalysis()}
        </TabsContent>

        <TabsContent value="images" className="space-y-4">
          {renderImageAltTextAnalysis()}
        </TabsContent>

        <TabsContent value="links" className="space-y-4">
          {renderInternalLinkingAnalysis()}
        </TabsContent>
      </Tabs>
    );
  };

  const renderReadabilityAnalysis = () => {
    console.log('Rendering readability analysis...');
    console.log('Analysis object:', analysis);
    
    if (!analysis) {
      console.log('No analysis object available');
      return <p>No analysis available. Please analyze the content first.</p>;
    }
    
    console.log('Analysis structure:', Object.keys(analysis));
    
    if (!analysis.readability) {
      console.log('No readability data in analysis');
      return <p>No readability analysis available. The analysis may be incomplete.</p>;
    }
    
    const readability = analysis.readability;
    console.log('Readability analysis data:', readability);
    
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Readability Score
              <Badge variant={getScoreBadgeVariant(readability.readability_score)}>
                {readability.readability_score}/100
              </Badge>
            </CardTitle>
            <CardDescription>
              Analysis of how easy your content is to read and understand
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-1">Reading Level</p>
                <p className="text-muted-foreground">{readability.reading_level || 'Not analyzed'}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Sentence Complexity</p>
                <p className="text-muted-foreground">{readability.sentence_complexity_score || readability.sentence_complexity || 'Not analyzed'}/100</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Vocabulary Level</p>
                <p className="text-muted-foreground">{readability.vocabulary_score || readability.vocabulary_level || 'Not analyzed'}/100</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Passive Voice Usage</p>
                <p className="text-muted-foreground">{readability.passive_voice_percentage || 'Not analyzed'}%</p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium mb-2">Improvement Areas</h4>
              <ul className="space-y-2">
                {readability.recommendations && readability.recommendations.map((recommendation: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-amber-500" />
                    {recommendation}
                  </li>
                ))}
                {readability.improvement_areas && readability.improvement_areas.map((area: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-amber-500" />
                    {area}
                  </li>
                ))}
                {(!readability.recommendations || readability.recommendations.length === 0) && 
                 (!readability.improvement_areas || readability.improvement_areas.length === 0) && (
                  <li className="text-sm text-muted-foreground">No improvement areas identified.</li>
                )}
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">{readability.analysis_summary || 'No summary available'}</p>
          </CardFooter>
        </Card>
      </>
    );
  };

  const renderKeywordAnalysis = () => {
    console.log('Rendering keyword analysis...');
    console.log('Analysis object:', analysis);
    
    if (!analysis) {
      console.log('No analysis object available');
      return <p>No analysis available. Please analyze the content first.</p>;
    }
    
    console.log('Analysis structure:', Object.keys(analysis));
    
    if (!analysis.keyword) {
      console.log('No keyword data in analysis');
      return <p>No keyword analysis available. The analysis may be incomplete.</p>;
    }
    
    const keywordAnalysis = analysis.keyword;
    console.log('Keyword analysis data:', keywordAnalysis);
    
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Keyword Optimization
              <Badge variant={getScoreBadgeVariant(keywordAnalysis.optimization_score)}>
                {keywordAnalysis.optimization_score}/100
              </Badge>
            </CardTitle>
            <CardDescription>
              Analysis of keyword usage and optimization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-1">Optimization Score</p>
                <p className="text-muted-foreground">{keywordAnalysis.optimization_score || 0}/100</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Natural Usage</p>
                <p className="text-muted-foreground">{keywordAnalysis.natural_usage_score || 0}/100</p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium mb-2">Keyword Density</h4>
              <div className="space-y-2">
                {keywordAnalysis.keyword_density && Object.entries(keywordAnalysis.keyword_density).map(([keyword, density]: [string, any]) => (
                  <div key={keyword} className="flex items-center justify-between">
                    <p className="text-sm">{keyword}</p>
                    <Badge variant="outline">{density}%</Badge>
                  </div>
                ))}
                {(!keywordAnalysis.keyword_density || Object.keys(keywordAnalysis.keyword_density).length === 0) && (
                  <p className="text-sm text-muted-foreground">No keyword density data available.</p>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium mb-2">Keyword Placement</h4>
              <div className="grid grid-cols-3 gap-2">
                {keywordAnalysis.keyword_placement && Object.entries(keywordAnalysis.keyword_placement).map(([location, present]: [string, any]) => (
                  <div key={location} className="flex items-center">
                    {present ? (
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                    )}
                    <p className="text-sm capitalize">{location}</p>
                  </div>
                ))}
                {(!keywordAnalysis.keyword_placement || Object.keys(keywordAnalysis.keyword_placement).length === 0) && (
                  <p className="text-sm text-muted-foreground">No keyword placement data available.</p>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium mb-2">Related Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {keywordAnalysis.related_keywords && keywordAnalysis.related_keywords.map((keyword: string, index: number) => (
                  <Badge key={index} variant="secondary">{keyword}</Badge>
                ))}
                {(!keywordAnalysis.related_keywords || keywordAnalysis.related_keywords.length === 0) && (
                  <p className="text-sm text-muted-foreground">No related keywords available.</p>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium mb-2">Recommendations</h4>
              <ul className="space-y-2">
                {keywordAnalysis.recommendations && keywordAnalysis.recommendations.map((recommendation: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-amber-500" />
                    {recommendation}
                  </li>
                ))}
                {(!keywordAnalysis.recommendations || keywordAnalysis.recommendations.length === 0) && 
                 keywordAnalysis.improvement_areas && keywordAnalysis.improvement_areas.map((area: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-amber-500" />
                    {area}
                  </li>
                ))}
                {(!keywordAnalysis.recommendations || keywordAnalysis.recommendations.length === 0) && 
                 (!keywordAnalysis.improvement_areas || keywordAnalysis.improvement_areas.length === 0) && (
                  <li className="text-sm text-muted-foreground">No recommendations available.</li>
                )}
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">{keywordAnalysis.analysis_summary || 'No summary available'}</p>
          </CardFooter>
        </Card>
      </>
    );
  };

  const renderStructureAnalysis = () => {
    console.log('Rendering structure analysis...');
    
    if (!analysis) {
      console.log('No analysis object available');
      return <p>No analysis available. Please analyze the content first.</p>;
    }
    
    if (!analysis.structure) {
      console.log('No structure data in analysis');
      return <p>No structure analysis available. The analysis may be incomplete.</p>;
    }
    
    const structureAnalysis = analysis.structure;
    console.log('Structure analysis data:', structureAnalysis);
    
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Content Structure
              <Badge variant={getScoreBadgeVariant(structureAnalysis.structure_score)}>
                {structureAnalysis.structure_score}/100
              </Badge>
            </CardTitle>
            <CardDescription>
              Analysis of content organization and structure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-1">Formatting Score</p>
                <p className="text-muted-foreground">{structureAnalysis.formatting_score || 0}/100</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Organization Score</p>
                <p className="text-muted-foreground">{structureAnalysis.organization_score || 0}/100</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Intro/Conclusion</p>
                <p className="text-muted-foreground">{structureAnalysis.intro_conclusion_score || 0}/100</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Structure Score</p>
                <p className="text-muted-foreground">{structureAnalysis.structure_score || 0}/100</p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium mb-2">Heading Structure</h4>
              <div className="grid grid-cols-3 gap-2">
                {structureAnalysis.heading_hierarchy && (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-sm uppercase font-mono">H1</p>
                      <Badge variant="outline">{structureAnalysis.heading_hierarchy.h1_count || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm uppercase font-mono">H2</p>
                      <Badge variant="outline">{structureAnalysis.heading_hierarchy.h2_count || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm uppercase font-mono">H3</p>
                      <Badge variant="outline">{structureAnalysis.heading_hierarchy.h3_count || 0}</Badge>
                    </div>
                    <div className="flex items-center justify-between col-span-3">
                      <p className="text-sm">Correct Hierarchy</p>
                      {structureAnalysis.heading_hierarchy.hierarchy_correct ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  </>
                )}
                {!structureAnalysis.heading_hierarchy && (
                  <p className="text-sm text-muted-foreground col-span-3">No heading structure data available.</p>
                )}
              </div>
            </div>
            
            <Separator />
            
            {structureAnalysis.content_gaps && structureAnalysis.content_gaps.length > 0 && (
              <>
                <div>
                  <h4 className="text-sm font-medium mb-2">Content Gaps</h4>
                  <ul className="space-y-2">
                    {structureAnalysis.content_gaps.map((gap: string, index: number) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-start">
                        <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-amber-500" />
                        {gap}
                      </li>
                    ))}
                  </ul>
                </div>
                <Separator />
              </>
            )}
            
            <div>
              <h4 className="text-sm font-medium mb-2">Improvement Areas</h4>
              <ul className="space-y-2">
                {structureAnalysis.recommendations && structureAnalysis.recommendations.map((recommendation: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-amber-500" />
                    {recommendation}
                  </li>
                ))}
                {structureAnalysis.improvement_areas && structureAnalysis.improvement_areas.map((area: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-amber-500" />
                    {area}
                  </li>
                ))}
                {(!structureAnalysis.recommendations || structureAnalysis.recommendations.length === 0) && 
                 (!structureAnalysis.improvement_areas || structureAnalysis.improvement_areas.length === 0) && (
                  <li className="text-sm text-muted-foreground">No improvement areas identified.</li>
                )}
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">{structureAnalysis.analysis_summary || 'No summary available'}</p>
          </CardFooter>
        </Card>
      </>
    );
  };

  const renderImageAltTextAnalysis = () => {
    if (!analysis?.image_alt_text_analysis) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 min-h-[300px]">
            <Image className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Image Alt Text Analysis</h3>
            <p className="text-muted-foreground text-center mb-4">
              No image alt text analysis available for this content.
            </p>
            <Button onClick={handleAnalyzeContent}>Run Analysis</Button>
          </CardContent>
        </Card>
      );
    }

    const imageAnalysis = analysis.image_alt_text_analysis;
    
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Image Alt Text Score
              <Badge variant={getScoreBadgeVariant(imageAnalysis.altTextQualityScore)}>
                {imageAnalysis.altTextQualityScore}/100
              </Badge>
            </CardTitle>
            <CardDescription>
              Analysis of image accessibility and SEO optimization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-1">Total Images</p>
                <p className="text-muted-foreground">{imageAnalysis.totalImages}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Images With Alt Text</p>
                <p className="text-muted-foreground">{imageAnalysis.imagesWithAlt} ({imageAnalysis.totalImages > 0 ? Math.round(imageAnalysis.imagesWithAlt / imageAnalysis.totalImages * 100) : 0}%)</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Descriptive Score</p>
                <p className="text-muted-foreground">{imageAnalysis.descriptiveScore}%</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Keyword Usage</p>
                <p className="text-muted-foreground">{imageAnalysis.keywordUsage}%</p>
              </div>
            </div>
            
            {imageAnalysis.totalImages > 0 && (
              <>
                <Separator />
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Image Analysis</h4>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Image</th>
                          <th className="text-left py-2">Alt Text</th>
                          <th className="text-left py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {imageAnalysis.imgSrcAnalysis.map((img: any, index: number) => (
                          <tr key={index} className="border-b">
                            <td className="py-2">
                              <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded overflow-hidden">
                                <img 
                                  src={img.src} 
                                  alt={img.altText || 'No alt text'} 
                                  className="max-w-full max-h-full object-contain"
                                  onError={(e) => (e.currentTarget.src = '/placeholder-image.svg')}
                                />
                              </div>
                            </td>
                            <td className="py-2">
                              {img.altText ? (
                                <p className="text-sm">{img.altText}</p>
                              ) : (
                                <p className="text-sm text-amber-600">No alt text</p>
                              )}
                              {img.suggestedAltText && (
                                <p className="text-xs text-green-600 mt-1">
                                  Suggested: {img.suggestedAltText}
                                </p>
                              )}
                            </td>
                            <td className="py-2">
                              {img.hasAlt ? (
                                img.isDescriptive ? (
                                  <Badge variant="default">Good</Badge>
                                ) : (
                                  <Badge variant="secondary">Improve</Badge>
                                )
                              ) : (
                                <Badge variant="destructive">Missing</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <Separator />
              </>
            )}
            
            <div>
              <h4 className="text-sm font-medium mb-2">Improvement Areas</h4>
              <ul className="space-y-2">
                {imageAnalysis.improvementSuggestions.map((suggestion: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-amber-500" />
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </>
    );
  };

  const renderInternalLinkingAnalysis = () => {
    if (!analysis?.internal_linking_analysis) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 min-h-[300px]">
            <Link className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Internal Linking Analysis</h3>
            <p className="text-muted-foreground text-center mb-4">
              No internal linking analysis available for this content.
            </p>
            <Button onClick={handleAnalyzeContent}>Run Analysis</Button>
          </CardContent>
        </Card>
      );
    }

    const linkingAnalysis = analysis.internal_linking_analysis;
    
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Internal Linking Score
              <Badge variant={getScoreBadgeVariant(linkingAnalysis.linkDistributionScore)}>
                {linkingAnalysis.linkDistributionScore}/100
              </Badge>
            </CardTitle>
            <CardDescription>
              Analysis of content's internal linking structure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium mb-1">Outgoing Links</p>
                <p className="text-muted-foreground">{linkingAnalysis.outgoingLinks || 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Incoming Links</p>
                <p className="text-muted-foreground">{linkingAnalysis.incomingLinks || 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Broken Links</p>
                <p className="text-muted-foreground">{linkingAnalysis.brokenLinks || 0}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Link Context Quality</p>
                <p className="text-muted-foreground">{linkingAnalysis.linkContextQuality || 'Not analyzed'}</p>
              </div>
            </div>
            
            {linkingAnalysis.linkedPages && linkingAnalysis.linkedPages.length > 0 && (
              <>
                <Separator />
                
                <div>
                  <h4 className="text-sm font-medium mb-2">Linked Pages</h4>
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Page</th>
                          <th className="text-left py-2">Link Type</th>
                          <th className="text-left py-2">Anchor Text</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linkingAnalysis.linkedPages.map((link: any, index: number) => (
                          <tr key={index} className="border-b">
                            <td className="py-2 truncate max-w-[200px]">{link.url}</td>
                            <td className="py-2">{link.type}</td>
                            <td className="py-2 truncate max-w-[200px]">{link.anchorText}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <Separator />
              </>
            )}
            
            <div>
              <h4 className="text-sm font-medium mb-2">Improvement Areas</h4>
              <ul className="space-y-2">
                {linkingAnalysis.improvementSuggestions && linkingAnalysis.improvementSuggestions.map((suggestion: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-amber-500" />
                    {suggestion}
                  </li>
                ))}
                {(!linkingAnalysis.improvementSuggestions || linkingAnalysis.improvementSuggestions.length === 0) && (
                  <li className="text-sm text-muted-foreground">No improvement areas identified.</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </>
    );
  };
  
  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{contentPage?.title || 'Untitled Page'}</h1>
          <p className="text-muted-foreground text-sm">
            {contentPage?.url}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {!needsAnalysis && analysis && (
            <ContentAnalysisPdfButton
              contentPageId={contentPageId}
              contentPage={contentPage}
              analysis={analysis}
              variant="outline"
              size="sm"
            />
          )}
          
          <Button 
            variant="outline" 
            onClick={fetchDebugInfo}
            size="sm"
          >
            Debug
          </Button>
          
          {!needsAnalysis && (
            <Button 
              onClick={handleAnalyzeContent}
              disabled={isAnalyzing}
              className="flex items-center"
              size="sm"
            >
              {isAnalyzing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh Analysis
            </Button>
          )}
          
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack}>
              Back
            </Button>
          )}
        </div>
      </div>
      
      {renderAnalysisContent()}
    </div>
  );
} 