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
      // Load content page data with analysis
      const data = await ContentPageService.getContentPageWithAnalysis(contentPageId);
      setContentPage(data.page);
      setAnalysis(data.analysis);
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
    if (!analysis?.readability_analysis) {
      return <p>No readability analysis available.</p>;
    }

    const readability = analysis.readability_analysis;
    
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
                <p className="text-muted-foreground">{readability.reading_level}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Sentence Complexity</p>
                <p className="text-muted-foreground">{readability.sentence_complexity}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Vocabulary Level</p>
                <p className="text-muted-foreground">{readability.vocabulary_level}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Passive Voice Usage</p>
                <p className="text-muted-foreground">{readability.passive_voice_percentage}%</p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium mb-2">Improvement Areas</h4>
              <ul className="space-y-2">
                {readability.improvement_areas.map((area: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-amber-500" />
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">{readability.analysis_summary}</p>
          </CardFooter>
        </Card>
      </>
    );
  };

  const renderKeywordAnalysis = () => {
    if (!analysis?.keyword_analysis) {
      return <p>No keyword analysis available.</p>;
    }

    const keywordAnalysis = analysis.keyword_analysis;
    
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
            <div>
              <h4 className="text-sm font-medium mb-2">Keyword Density</h4>
              <div className="space-y-2">
                {Object.entries(keywordAnalysis.keyword_density).map(([keyword, density]: [string, any]) => (
                  <div key={keyword} className="flex items-center justify-between">
                    <p className="text-sm">{keyword}</p>
                    <Badge variant="outline">{density}%</Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium mb-2">Keyword Placement</h4>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(keywordAnalysis.keyword_placement).map(([location, present]: [string, any]) => (
                  <div key={location} className="flex items-center">
                    {present ? (
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                    )}
                    <p className="text-sm capitalize">{location}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium mb-2">Related Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {keywordAnalysis.related_keywords.map((keyword: string, index: number) => (
                  <Badge key={index} variant="secondary">{keyword}</Badge>
                ))}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium mb-2">Recommendations</h4>
              <ul className="space-y-2">
                {keywordAnalysis.recommendations.map((recommendation: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-amber-500" />
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">{keywordAnalysis.analysis_summary}</p>
          </CardFooter>
        </Card>
      </>
    );
  };

  const renderStructureAnalysis = () => {
    if (!analysis?.structure_analysis) {
      return <p>No structure analysis available.</p>;
    }

    const structureAnalysis = analysis.structure_analysis;
    
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
                <p className="text-sm font-medium mb-1">Headings Used</p>
                <p className="text-muted-foreground">{structureAnalysis.heading_count}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Paragraph Count</p>
                <p className="text-muted-foreground">{structureAnalysis.paragraph_count}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Avg. Paragraph Length</p>
                <p className="text-muted-foreground">{structureAnalysis.avg_paragraph_length} words</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">List Elements</p>
                <p className="text-muted-foreground">{structureAnalysis.list_count || 0}</p>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium mb-2">Heading Structure</h4>
              <div className="space-y-2">
                {structureAnalysis.heading_structure.map((heading: any, index: number) => (
                  <div key={index} className="flex items-start">
                    <Badge variant="outline" className="mr-2 mt-0.5">{heading.level}</Badge>
                    <p className="text-sm">{heading.text}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium mb-2">Structure Improvements</h4>
              <ul className="space-y-2">
                {structureAnalysis.improvements.map((improvement: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start">
                    <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-amber-500" />
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">{structureAnalysis.analysis_summary}</p>
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
                        {imageAnalysis.imgSrcAnalysis.map((img, index) => (
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
                                  <Badge variant="success">Good</Badge>
                                ) : (
                                  <Badge variant="warning">Improve</Badge>
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
                {imageAnalysis.improvementSuggestions.map((suggestion, index) => (
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
                        {linkingAnalysis.linkedPages.map((link, index) => (
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
                {linkingAnalysis.improvementSuggestions.map((suggestion, index) => (
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
  
  const getScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{contentPage.title || 'Untitled Page'}</h1>
          <p className="text-muted-foreground text-sm">
            {contentPage.url}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {!needsAnalysis && (
            <Button 
              variant="outline"
              size="sm"
              onClick={handleAnalyzeContent}
              disabled={isAnalyzing}
              className="flex items-center"
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