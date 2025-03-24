'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, Search, Plus, CheckCircle, XCircle, TrendingUp, TrendingDown, BarChart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContentPageService } from '@/lib/services/content-service';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { CompetitorAnalysisService, ContentGap, CompetitiveAdvantage, CompetitiveStrategy, CompetitorKeyword } from '@/lib/services/CompetitorAnalysisService';
import { Progress } from '@/components/ui/progress';

interface ContentGapAnalysisProps {
  contentPageId: string;
  onBack?: () => void;
}

// Mock competitor data - in a real app, this would come from your competitor analysis service
const mockCompetitors = [
  {
    id: 'comp1',
    url: 'https://competitor1.com/best-seo-practices',
    title: 'Complete Guide to SEO Best Practices in 2023',
    keyPoints: [
      'Mobile-first indexing strategies',
      'Voice search optimization',
      'E-A-T principles for content credibility',
      'Core Web Vitals optimization',
      'Featured snippet targeting'
    ],
    keywords: ['seo best practices', 'mobile-first indexing', 'voice search', 'e-a-t principles', 'core web vitals', 'featured snippets'],
    wordCount: 3200,
    readabilityScore: 85,
    keywordDensity: 1.8
  },
  {
    id: 'comp2',
    url: 'https://competitor2.com/seo-guide',
    title: 'The Ultimate SEO Guide for Beginners and Pros',
    keyPoints: [
      'Keyword research fundamentals',
      'On-page optimization techniques',
      'Link building strategies',
      'Technical SEO audit process',
      'International SEO considerations'
    ],
    keywords: ['seo guide', 'keyword research', 'on-page optimization', 'link building', 'technical seo', 'international seo'],
    wordCount: 4100,
    readabilityScore: 78,
    keywordDensity: 2.1
  },
  {
    id: 'comp3',
    url: 'https://competitor3.com/content-optimization',
    title: 'Content Optimization Strategies That Drive Traffic',
    keyPoints: [
      'Content structure for readability',
      'Semantic keyword usage',
      'Internal linking strategies',
      'Content freshness signals',
      'User engagement metrics'
    ],
    keywords: ['content optimization', 'content structure', 'semantic keywords', 'internal linking', 'content freshness', 'user engagement'],
    wordCount: 2800,
    readabilityScore: 92,
    keywordDensity: 1.6
  }
];

// Update mock data to match the ContentGap interface
const mockContentGaps: ContentGap[] = [
  {
    topic: "Mobile Optimization",
    relevance: "high",
    competitorsCovering: 4,
    description: "Competitors are discussing the importance of mobile-first design for SEO rankings.",
    suggestedImplementation: "Add a section on mobile optimization best practices and responsive design techniques." 
  },
  {
    topic: "Voice Search Optimization",
    relevance: "medium",
    competitorsCovering: 3,
    description: "Competitors are covering how to optimize content for voice search queries.",
    suggestedImplementation: "Include conversational phrases and question-based headings that match voice search patterns."
  },
  {
    topic: "Local SEO Factors",
    relevance: "low",
    competitorsCovering: 2,
    description: "Some competitors discuss how local SEO affects search visibility.",
    suggestedImplementation: "Add a short section about local SEO best practices if relevant to your audience."
  }
];

// Update mock data to match the CompetitorKeyword interface
const mockMissingKeywords: CompetitorKeyword[] = [
  {
    keyword: "content optimization",
    volume: 5400,
    difficulty: 68,
    density: 1.2,
    inTitle: false,
    inHeadings: false
  },
  {
    keyword: "seo best practices",
    volume: 9200,
    difficulty: 72,
    density: 0,
    inTitle: false,
    inHeadings: true
  },
  {
    keyword: "keyword research",
    volume: 12500,
    difficulty: 45,
    density: 0.3,
    inTitle: false,
    inHeadings: false
  }
];

export function ContentGapAnalysis({ contentPageId, onBack }: ContentGapAnalysisProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [contentPage, setContentPage] = useState<any>(null);
  const [competitors, setCompetitors] = useState(mockCompetitors);
  const [contentGaps, setContentGaps] = useState<ContentGap[]>([]);
  const [missingKeywords, setMissingKeywords] = useState<CompetitorKeyword[]>([]);
  const [advantages, setAdvantages] = useState<CompetitiveAdvantage[]>([]);
  const [disadvantages, setDisadvantages] = useState<CompetitiveAdvantage[]>([]);
  const [strategies, setStrategies] = useState<CompetitiveStrategy[]>([]);
  const [activeTab, setActiveTab] = useState('competitors');
  const [error, setError] = useState<string | null>(null);
  const [searchUrl, setSearchUrl] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    loadContentData();
  }, [contentPageId]);

  const loadContentData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Load content page data
      const page = await ContentPageService.getContentPage(contentPageId);
      setContentPage(page);
      
      // Load project ID
      const projectId = page.project_id;
      
      // Load competitors
      const competitorsData = await CompetitorAnalysisService.getCompetitors(projectId);
      if (competitorsData && competitorsData.length > 0) {
        setCompetitors(competitorsData.map(comp => ({
          id: comp.id || '',
          url: comp.url,
          title: comp.title,
          keyPoints: comp.strengths || [],
          keywords: comp.keywords?.map(k => k.keyword) || [],
          wordCount: comp.metrics?.wordCount || 0,
          readabilityScore: comp.metrics?.readabilityScore || 0,
          keywordDensity: comp.metrics?.keywordDensity || 0
        })));
        
        // Run competitive analysis if we have competitors
        await runCompetitiveAnalysis(projectId, page.url);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading content:', err);
      setError('Failed to load content data');
      setIsLoading(false);
    }
  };

  const runCompetitiveAnalysis = async (projectId: string, url: string) => {
    setIsAnalyzing(true);
    try {
      const result = await CompetitorAnalysisService.runCompetitiveAnalysis(projectId, url);
      
      // Update state with results
      setContentGaps(result.contentGaps);
      setMissingKeywords(result.keywordGaps);
      setAdvantages(result.advantages);
      setDisadvantages(result.disadvantages);
      setStrategies(result.strategies);
      
      // Show success message
      toast({
        title: "Analysis Complete",
        description: "Competitive analysis has been completed successfully.",
      });
    } catch (error) {
      console.error('Error analyzing competitors:', error);
      // Fall back to mock data
      setContentGaps(mockContentGaps);
      setMissingKeywords(mockMissingKeywords);
      
      toast({
        title: "Analysis Issue",
        description: "Using sample data due to analysis limitations.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddCompetitor = async () => {
    if (!searchUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a competitor URL to analyze.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSearching(true);
    
    try {
      // Add the competitor using the service
      const projectId = contentPage.project_id;
      const newCompetitor = await CompetitorAnalysisService.addCompetitor(projectId, searchUrl);
      
      if (newCompetitor) {
        // Add to the UI list
        setCompetitors([...competitors, {
          id: newCompetitor.id || '',
          url: newCompetitor.url,
          title: newCompetitor.title,
          keyPoints: [],
          keywords: [],
          wordCount: newCompetitor.contentLength || 0,
          readabilityScore: 0,
          keywordDensity: 0
        }]);
        
        setSearchUrl('');
        
        toast({
          title: "Competitor Added",
          description: "The competitor content has been added for analysis.",
        });
        
        // Re-run the analysis with the new competitor
        await runCompetitiveAnalysis(projectId, contentPage.url);
      } else {
        throw new Error("Failed to add competitor");
      }
    } catch (error) {
      console.error('Error adding competitor:', error);
      toast({
        title: "Failed to Add Competitor",
        description: "There was an error adding the competitor for analysis.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-4">Loading content gap analysis...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-xl font-semibold mb-2">Error Loading Data</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadContentData}>Try Again</Button>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Gap Analysis</h1>
          <p className="text-muted-foreground text-sm">
            {contentPage.title || 'Untitled Page'}
          </p>
        </div>
        
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Add Competitor URL</CardTitle>
          <CardDescription>
            Enter a competitor URL to analyze and compare with your content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              placeholder="https://competitor.com/page"
              value={searchUrl}
              onChange={(e) => setSearchUrl(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleAddCompetitor} 
              disabled={isSearching || !searchUrl.trim()}
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Competitor
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {isAnalyzing && (
        <Card>
          <CardContent className="flex items-center justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-4" />
            <div>
              <p className="font-medium">Running Competitive Analysis</p>
              <p className="text-sm text-muted-foreground">This may take a few moments...</p>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="advantages">Advantages</TabsTrigger>
          <TabsTrigger value="gaps">Content Gaps</TabsTrigger>
          <TabsTrigger value="keywords">Missing Keywords</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
        </TabsList>
        
        {/* Competitors Tab */}
        <TabsContent value="competitors" className="space-y-4 mt-6">
          {competitors.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Competitors Added</h3>
                <p className="text-muted-foreground mb-4">
                  Add competitor URLs to analyze and compare with your content.
                </p>
              </CardContent>
            </Card>
          ) : (
            competitors.map((competitor) => (
              <Card key={competitor.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    <a 
                      href={competitor.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {competitor.title}
                    </a>
                  </CardTitle>
                  <CardDescription className="truncate">
                    {competitor.url}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">Word Count</span>
                      <span className="text-lg font-medium">{competitor.wordCount.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">Readability</span>
                      <span className="text-lg font-medium">{competitor.readabilityScore}/100</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm text-muted-foreground">Keyword Density</span>
                      <span className="text-lg font-medium">{competitor.keywordDensity.toFixed(2)}%</span>
                    </div>
                  </div>
                  
                  {competitor.keyPoints && competitor.keyPoints.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Key Points</h4>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        {competitor.keyPoints.slice(0, 3).map((point, index) => (
                          <li key={index}>{point}</li>
                        ))}
                        {competitor.keyPoints.length > 3 && (
                          <li className="text-muted-foreground">
                            +{competitor.keyPoints.length - 3} more points
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                  
                  {competitor.keywords && competitor.keywords.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium mb-2">Target Keywords</h4>
                      <div className="flex flex-wrap gap-2">
                        {competitor.keywords.slice(0, 5).map((keyword, index) => (
                          <Badge key={index} variant="secondary">
                            {keyword}
                          </Badge>
                        ))}
                        {competitor.keywords.length > 5 && (
                          <Badge variant="outline">
                            +{competitor.keywords.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        
        {/* Advantages Tab */}
        <TabsContent value="advantages" className="space-y-4 mt-6">
          {advantages.length === 0 && disadvantages.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Competitive Analysis</h3>
                <p className="text-muted-foreground mb-4">
                  Add competitors and run analysis to see your advantages and disadvantages.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <h3 className="text-lg font-medium">Competitive Advantages</h3>
              {advantages.length === 0 ? (
                <p className="text-muted-foreground">No clear advantages identified.</p>
              ) : (
                advantages.map((advantage, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="bg-green-50 p-2 rounded-full">
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">{advantage.area}</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            {advantage.description}
                          </p>
                          
                          {advantage.competitorComparison && (
                            <div className="bg-muted p-3 rounded-md text-sm">
                              <p className="font-medium mb-1">Comparison:</p>
                              <ul className="space-y-1">
                                {Object.entries(advantage.competitorComparison).map(([key, value]) => (
                                  <li key={key}>
                                    <span className="text-muted-foreground">{key}:</span> {value}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
              
              <h3 className="text-lg font-medium mt-8">Competitive Disadvantages</h3>
              {disadvantages.length === 0 ? (
                <p className="text-muted-foreground">No significant disadvantages identified.</p>
              ) : (
                disadvantages.map((disadvantage, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="bg-red-50 p-2 rounded-full">
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">{disadvantage.area}</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            {disadvantage.description}
                          </p>
                          
                          {disadvantage.competitorComparison && (
                            <div className="bg-muted p-3 rounded-md text-sm">
                              <p className="font-medium mb-1">Comparison:</p>
                              <ul className="space-y-1">
                                {Object.entries(disadvantage.competitorComparison).map(([key, value]) => (
                                  <li key={key}>
                                    <span className="text-muted-foreground">{key}:</span> {value}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </>
          )}
        </TabsContent>
        
        {/* Content Gaps Tab */}
        <TabsContent value="gaps" className="space-y-4 mt-6">
          {contentGaps.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Content Gaps Identified</h3>
                <p className="text-muted-foreground mb-4">
                  Add competitors to identify content gaps and opportunities.
                </p>
              </CardContent>
            </Card>
          ) : (
            contentGaps.map((gap, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{gap.topic}</h4>
                    <Badge variant={gap.relevance === 'high' ? 'destructive' : gap.relevance === 'medium' ? 'default' : 'outline'}>
                      {gap.relevance.charAt(0).toUpperCase() + gap.relevance.slice(1)} Relevance
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    {gap.description}
                  </p>
                  
                  <div className="bg-muted p-3 rounded-md text-sm">
                    <p className="font-medium mb-2">Implementation Guidance:</p>
                    <p>{gap.suggestedImplementation}</p>
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-1">
                      {gap.competitorsCovering} out of {competitors.length} competitors cover this topic
                    </p>
                    <Progress 
                      value={(gap.competitorsCovering / Math.max(1, competitors.length)) * 100} 
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        
        {/* Missing Keywords Tab */}
        <TabsContent value="keywords" className="space-y-4 mt-6">
          {missingKeywords.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Missing Keywords Identified</h3>
                <p className="text-muted-foreground mb-4">
                  Add competitors to identify keyword gaps and opportunities.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {missingKeywords.map((keyword, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <h4 className="font-medium text-lg mb-2">{keyword.keyword}</h4>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Monthly Volume</p>
                          <p className="font-medium">{(keyword.volume || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Difficulty</p>
                          <p className="font-medium">{keyword.difficulty || "Unknown"}/100</p>
                        </div>
                      </div>
                      
                      {keyword.inTitle === false && keyword.inHeadings === false && (
                        <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm mt-4">
                          <p>This keyword is completely missing from your content.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
        
        {/* Strategies Tab */}
        <TabsContent value="strategies" className="space-y-4 mt-6">
          {strategies.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Strategies Available</h3>
                <p className="text-muted-foreground mb-4">
                  Add competitors and run analysis to get strategic recommendations.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Quick Wins</h3>
                <div className="space-y-4">
                  {strategies
                    .filter(s => s.timeFrame === 'quick')
                    .map((strategy, index) => (
                      <Card key={index}>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="bg-blue-50 p-2 rounded-full">
                              <BarChart className="h-4 w-4 text-blue-500" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{strategy.title}</h4>
                                <Badge variant={
                                  strategy.priority === 'high' ? 'destructive' : 
                                  strategy.priority === 'medium' ? 'default' : 'outline'
                                }>
                                  {strategy.priority} priority
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-4">
                                {strategy.description}
                              </p>
                              
                              <div className="bg-muted p-3 rounded-md text-sm">
                                <p className="font-medium mb-1">Implementation:</p>
                                <p>{strategy.implementation}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Medium-Term Strategies</h3>
                <div className="space-y-4">
                  {strategies
                    .filter(s => s.timeFrame === 'medium')
                    .map((strategy, index) => (
                      <Card key={index}>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="bg-purple-50 p-2 rounded-full">
                              <BarChart className="h-4 w-4 text-purple-500" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{strategy.title}</h4>
                                <Badge variant={
                                  strategy.priority === 'high' ? 'destructive' : 
                                  strategy.priority === 'medium' ? 'default' : 'outline'
                                }>
                                  {strategy.priority} priority
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-4">
                                {strategy.description}
                              </p>
                              
                              <div className="bg-muted p-3 rounded-md text-sm">
                                <p className="font-medium mb-1">Implementation:</p>
                                <p>{strategy.implementation}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-2">Long-Term Strategies</h3>
                <div className="space-y-4">
                  {strategies
                    .filter(s => s.timeFrame === 'long-term')
                    .map((strategy, index) => (
                      <Card key={index}>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="bg-green-50 p-2 rounded-full">
                              <BarChart className="h-4 w-4 text-green-500" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium">{strategy.title}</h4>
                                <Badge variant={
                                  strategy.priority === 'high' ? 'destructive' : 
                                  strategy.priority === 'medium' ? 'default' : 'outline'
                                }>
                                  {strategy.priority} priority
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-4">
                                {strategy.description}
                              </p>
                              
                              <div className="bg-muted p-3 rounded-md text-sm">
                                <p className="font-medium mb-1">Implementation:</p>
                                <p>{strategy.implementation}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  
                  {strategies.filter(s => s.timeFrame === 'long-term').length === 0 && (
                    <p className="text-muted-foreground">No long-term strategies identified at this time.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 