'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Loader2, AlertCircle, Search, Plus, CheckCircle, XCircle, 
  TrendingUp, TrendingDown, BarChart, RefreshCw, ChevronsUpDown, 
  Copy, CheckCheck, ClipboardList, BookOpen, Globe, BarChart2, Book, Link,
  Trash2, ExternalLink
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContentPageService } from '@/lib/services/content-service';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { ContentGap, CompetitiveAdvantage, CompetitiveStrategy, CompetitorKeyword } from '@/lib/services/CompetitorAnalysisService';
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
  const [filteredContentGaps, setFilteredContentGaps] = useState<ContentGap[]>([]);
  const [missingKeywords, setMissingKeywords] = useState<CompetitorKeyword[]>([]);
  const [filteredKeywords, setFilteredKeywords] = useState<CompetitorKeyword[]>([]);
  const [advantages, setAdvantages] = useState<CompetitiveAdvantage[]>([]);
  const [disadvantages, setDisadvantages] = useState<CompetitiveAdvantage[]>([]);
  const [strategies, setStrategies] = useState<CompetitiveStrategy[]>([]);
  const [activeTab, setActiveTab] = useState('competitors');
  const [error, setError] = useState<string | null>(null);
  const [searchUrl, setSearchUrl] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [contentGapFilter, setContentGapFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [keywordFilter, setKeywordFilter] = useState<'all' | 'not-in-title' | 'not-in-headings' | 'high-volume'>('all');
  const [expandedGaps, setExpandedGaps] = useState<Record<number, boolean>>({});
  const [expandedKeywords, setExpandedKeywords] = useState<Record<number, boolean>>({});
  const [expandedCompetitors, setExpandedCompetitors] = useState<Record<string, boolean>>({});
  const [competitorFilter, setCompetitorFilter] = useState<'all' | 'high-wordcount' | 'high-readability'>('all');
  const [filteredCompetitors, setFilteredCompetitors] = useState<any[]>([]);

  useEffect(() => {
    loadContentData();
  }, [contentPageId]);

  useEffect(() => {
    // Filter content gaps based on selected filter
    if (contentGaps.length > 0) {
      if (contentGapFilter === 'all') {
        setFilteredContentGaps(contentGaps);
      } else {
        setFilteredContentGaps(contentGaps.filter(gap => gap.relevance === contentGapFilter));
      }
    }
  }, [contentGaps, contentGapFilter]);

  useEffect(() => {
    // Filter keywords based on selected filter
    if (missingKeywords.length > 0) {
      if (keywordFilter === 'all') {
        setFilteredKeywords(missingKeywords);
      } else if (keywordFilter === 'not-in-title') {
        setFilteredKeywords(missingKeywords.filter(kw => !kw.inTitle));
      } else if (keywordFilter === 'not-in-headings') {
        setFilteredKeywords(missingKeywords.filter(kw => !kw.inHeadings));
      } else if (keywordFilter === 'high-volume') {
        setFilteredKeywords(missingKeywords.filter(kw => (kw.volume || 0) > 5000));
      }
    }
  }, [missingKeywords, keywordFilter]);

  useEffect(() => {
    if (competitors.length > 0) {
      if (competitorFilter === 'all') {
        setFilteredCompetitors(competitors);
      } else if (competitorFilter === 'high-wordcount') {
        setFilteredCompetitors(competitors.filter(comp => comp.wordCount > 2500));
      } else if (competitorFilter === 'high-readability') {
        setFilteredCompetitors(competitors.filter(comp => comp.readabilityScore > 80));
      }
    }
  }, [competitors, competitorFilter]);

  const loadContentData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Load content page data
      const page = await ContentPageService.getContentPage(contentPageId);
      setContentPage(page);
      
      // Load project ID
      const projectId = page.project_id;
      
      // Load competitors using the API
      const response = await fetch(`/api/competitive-analysis?projectId=${projectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to load competitors');
      }
      
      if (result.competitors && result.competitors.length > 0) {
        setCompetitors(result.competitors.map((comp: any) => ({
          id: comp.id || '',
          url: comp.url,
          title: comp.title,
          keyPoints: comp.strengths || [],
          keywords: comp.keywords?.map((k: { keyword: string }) => k.keyword) || [],
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
      console.log(`Running competitive analysis for project ${projectId}, url: ${url}`);
      
      // Use the API endpoint instead of direct service call
      const response = await fetch('/api/competitive-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          url,
          action: 'analyze'
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error('API error response:', result);
        throw new Error(result.error || result.message || 'Failed to run analysis');
      }
      
      const analysis = result.analysis;
      
      if (!analysis) {
        console.error('No analysis data in response:', result);
        throw new Error('No analysis data returned from API');
      }
      
      console.log('Analysis completed successfully:', analysis);
      
      // Update state with results
      setContentGaps(analysis.contentGaps || []);
      setMissingKeywords(analysis.keywordGaps || []);
      setAdvantages(analysis.advantages || []);
      setDisadvantages(analysis.disadvantages || []);
      setStrategies(analysis.strategies || []);
      setFilteredContentGaps(analysis.contentGaps || []);
      setFilteredKeywords(analysis.keywordGaps || []);

      // If competitors data is included in the analysis, update the competitors state
      if (analysis.competitors && analysis.competitors.length > 0) {
        console.log('Updating competitors with latest metrics:', analysis.competitors);
        const updatedCompetitors = analysis.competitors.map((comp: any) => ({
          id: comp.id || '',
          url: comp.url,
          title: comp.title || comp.name || comp.url,
          keyPoints: comp.strengths || [],
          keywords: Array.isArray(comp.keywords) 
            ? (typeof comp.keywords[0] === 'string' 
                ? comp.keywords 
                : comp.keywords.map((k: any) => 
                    typeof k === 'string' ? k : k.keyword || ''))
            : [],
          wordCount: comp.metrics?.wordCount || 0,
          readabilityScore: comp.metrics?.readabilityScore || 0,
          keywordDensity: comp.metrics?.keywordDensity || 0
        }));
        setCompetitors(updatedCompetitors);
      }
      
      // Auto switch to the gaps tab after analysis
      setActiveTab('gaps');
      
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
      console.log(`Adding competitor URL: ${searchUrl}`);
      
      // Use the API endpoint instead of direct service call
      const projectId = contentPage.project_id;
      const response = await fetch('/api/competitive-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          url: searchUrl,
          action: 'add'
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        console.error('API error response:', result);
        throw new Error(result.error || result.message || 'Failed to add competitor');
      }
      
      const newCompetitor = result.competitor;
      
      if (!newCompetitor) {
        console.error('No competitor data in response:', result);
        throw new Error("API returned success but no competitor data");
      }
      
      console.log('Received competitor data:', newCompetitor);
      
      // Add to the UI list - handle both name/title variations
      setCompetitors([...competitors, {
        id: newCompetitor.id || '',
        url: newCompetitor.url,
        title: newCompetitor.name || newCompetitor.title || searchUrl,
        keyPoints: newCompetitor.strengths || [],
        keywords: newCompetitor.keywords?.map((k: { keyword: string }) => k.keyword) || [],
        wordCount: newCompetitor.metrics?.wordCount || 0,
        readabilityScore: newCompetitor.metrics?.readabilityScore || 0,
        keywordDensity: newCompetitor.metrics?.keywordDensity || 0
      }]);
      
      setSearchUrl('');
      
      toast({
        title: "Competitor Added",
        description: "The competitor content has been added for analysis.",
      });
      
      // Re-run the analysis with the new competitor
      await runCompetitiveAnalysis(projectId, contentPage.url);
    } catch (error) {
      console.error('Error adding competitor:', error);
      toast({
        title: "Failed to Add Competitor",
        description: error instanceof Error ? error.message : "There was an error adding the competitor for analysis.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const toggleGapExpansion = useCallback((index: number) => {
    setExpandedGaps((prev) => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const toggleKeywordExpansion = useCallback((index: number) => {
    setExpandedKeywords((prev) => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const toggleCompetitorExpansion = useCallback((id: string) => {
    setExpandedCompetitors((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

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
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              if (contentPage && contentPage.project_id) {
                setIsAnalyzing(true);
                runCompetitiveAnalysis(contentPage.project_id, contentPage.url)
                  .catch(error => {
                    console.error('Error refreshing analysis:', error);
                    toast({
                      title: "Refresh Failed",
                      description: "Failed to refresh competitor analysis.",
                      variant: "destructive"
                    });
                  });
              }
            }}
            disabled={isAnalyzing || competitors.length === 0}
            size="sm"
            className="flex items-center"
          >
            {isAnalyzing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh Analysis
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
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Competitor Content Analysis</h3>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Sort by word count (high to low)
                        const sorted = [...filteredCompetitors].sort((a, b) => b.wordCount - a.wordCount);
                        setFilteredCompetitors(sorted);
                      }}
                    >
                      Sort by Length
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Sort by readability (high to low)
                        const sorted = [...filteredCompetitors].sort((a, b) => b.readabilityScore - a.readabilityScore);
                        setFilteredCompetitors(sorted);
                      }}
                    >
                      Sort by Readability
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge 
                    variant={competitorFilter === 'all' ? 'secondary' : 'outline'} 
                    className="cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => setCompetitorFilter('all')}
                  >
                    All Competitors
                  </Badge>
                  <Badge 
                    variant={competitorFilter === 'high-wordcount' ? 'secondary' : 'outline'} 
                    className="cursor-pointer hover:bg-secondary/20 transition-colors"
                    onClick={() => setCompetitorFilter('high-wordcount')}
                  >
                    Long-Form Content
                  </Badge>
                  <Badge 
                    variant={competitorFilter === 'high-readability' ? 'secondary' : 'outline'} 
                    className="cursor-pointer hover:bg-secondary/20 transition-colors"
                    onClick={() => setCompetitorFilter('high-readability')}
                  >
                    High Readability
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCompetitors.map((competitor) => {
                  const isExpanded = expandedCompetitors[competitor.id] || false;
                  const readabilityColor = 
                    competitor.readabilityScore > 90 ? 'text-green-600' :
                    competitor.readabilityScore > 70 ? 'text-amber-600' :
                    'text-red-600';
                    
                  const wordCountLevel = 
                    competitor.wordCount > 3000 ? 'high' :
                    competitor.wordCount > 1500 ? 'medium' :
                    'low';
                  
                  return (
                    <Card key={competitor.id} className="overflow-hidden hover:shadow-md transition-shadow border-t-4 border-t-primary/70 dark:bg-background/30">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-base group flex items-center cursor-pointer" onClick={() => toggleCompetitorExpansion(competitor.id)}>
                              <span className="mr-2">{competitor.title}</span>
                              <ChevronsUpDown className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </CardTitle>
                            <CardDescription className="truncate flex items-center mt-1">
                              <Globe className="h-3.5 w-3.5 mr-1.5 text-muted-foreground/70" />
                              <a 
                                href={competitor.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:underline truncate"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {competitor.url}
                              </a>
                            </CardDescription>
                          </div>
                          <a 
                            href={competitor.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded-full hover:bg-muted transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </a>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pb-3">
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground mb-1 flex items-center">
                              <Book className="h-3.5 w-3.5 mr-1.5" />
                              Word Count
                            </span>
                            <div className="flex items-center">
                              <div className="bg-muted dark:bg-muted/40 h-2 rounded-full flex-1 mr-2">
                                <div 
                                  className={`h-full rounded-full ${
                                    wordCountLevel === 'high' ? 'bg-blue-500 dark:bg-blue-400' :
                                    wordCountLevel === 'medium' ? 'bg-blue-400 dark:bg-blue-500/70' :
                                    'bg-blue-300 dark:bg-blue-600/50'
                                  }`}
                                  style={{ 
                                    width: `${Math.min(100, (competitor.wordCount / 5000) * 100)}%` 
                                  }}
                                />
                              </div>
                              <span className="font-medium text-sm">{competitor.wordCount.toLocaleString()}</span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground mb-1 flex items-center">
                              <BarChart2 className="h-3.5 w-3.5 mr-1.5" />
                              Readability
                            </span>
                            <div className="flex items-center">
                              <div className="bg-muted dark:bg-muted/40 h-2 rounded-full flex-1 mr-2">
                                <div 
                                  className={`h-full rounded-full ${
                                    competitor.readabilityScore > 90 ? 'bg-green-500 dark:bg-green-400' :
                                    competitor.readabilityScore > 70 ? 'bg-amber-500 dark:bg-amber-400' :
                                    'bg-red-500 dark:bg-red-400'
                                  }`}
                                  style={{ width: `${competitor.readabilityScore}%` }}
                                />
                              </div>
                              <span className={`font-medium text-sm ${
                                competitor.readabilityScore > 90 ? 'text-green-600 dark:text-green-400' :
                                competitor.readabilityScore > 70 ? 'text-amber-600 dark:text-amber-400' :
                                'text-red-600 dark:text-red-400'
                              }`}>
                                {competitor.readabilityScore}/100
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground mb-1 flex items-center">
                              <Search className="h-3.5 w-3.5 mr-1.5" />
                              Keyword Density
                            </span>
                            <div className="flex items-center">
                              <div className="bg-muted dark:bg-muted/40 h-2 rounded-full flex-1 mr-2">
                                <div 
                                  className={`h-full rounded-full ${
                                    competitor.keywordDensity > 2 ? 'bg-green-500 dark:bg-green-400' :
                                    competitor.keywordDensity > 1 ? 'bg-amber-500 dark:bg-amber-400' :
                                    'bg-blue-400 dark:bg-blue-500/70'
                                  }`}
                                  style={{ width: `${Math.min(100, competitor.keywordDensity * 25)}%` }}
                                />
                              </div>
                              <span className="font-medium text-sm">{competitor.keywordDensity.toFixed(2)}%</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                          {isExpanded && (
                            <>
                              <Separator className="my-4" />
                              
                              {competitor.keyPoints && competitor.keyPoints.length > 0 && (
                                <div className="mb-4">
                                  <h4 className="text-sm font-medium mb-3 flex items-center">
                                    <CheckCircle className="h-4 w-4 mr-2 text-green-500 dark:text-green-400" />
                                    Key Content Strengths
                                  </h4>
                                  <ul className="grid grid-cols-1 gap-2">
                                    {competitor.keyPoints.map((point: string, index: number) => (
                                      <li key={index} className="flex items-start group">
                                        <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                                          <span className="text-green-700 dark:text-green-400 text-xs">{index + 1}</span>
                                        </div>
                                        <span className="text-sm">{point}</span>
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-6 w-6 p-0 ml-auto opacity-0 group-hover:opacity-100 rounded-full"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(point);
                                            toast({
                                              title: "Copied",
                                              description: "Content strength copied to clipboard",
                                            });
                                          }}
                                        >
                                          <Copy className="h-3 w-3" />
                                        </Button>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {competitor.keywords && competitor.keywords.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-medium mb-3 flex items-center">
                                    <Search className="h-4 w-4 mr-2 text-blue-500 dark:text-blue-400" />
                                    Target Keywords
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {competitor.keywords.map((keyword: string, index: number) => (
                                      <Badge 
                                        key={index} 
                                        variant="secondary"
                                        className="cursor-pointer group flex items-center hover:bg-secondary/80 dark:hover:bg-secondary/60"
                                        onClick={() => {
                                          navigator.clipboard.writeText(keyword);
                                          toast({
                                            title: "Keyword Copied",
                                            description: `"${keyword}" copied to clipboard`,
                                          });
                                        }}
                                      >
                                        {keyword}
                                        <Copy className="h-3 w-3 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        
                        <div className={`flex mt-4 ${isExpanded ? 'justify-between' : 'justify-end'} items-center`}>
                          {isExpanded && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCompetitorExpansion(competitor.id);
                              }}
                            >
                              Show Less
                            </Button>
                          )}
                          
                          <div className="flex space-x-2">
                            {!isExpanded && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleCompetitorExpansion(competitor.id);
                                }}
                              >
                                Show Details
                              </Button>
                            )}
                            
                            <Button 
                              variant="default" 
                              size="sm"
                              className="text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(competitor.url, '_blank');
                              }}
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                              Visit
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {filteredCompetitors.length === 0 && competitors.length > 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Matching Competitors</h3>
                    <p className="text-muted-foreground mb-4">
                      Try changing your filter to see more competitor content.
                    </p>
                    <Button variant="outline" onClick={() => setCompetitorFilter('all')}>
                      Show All Competitors
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              {competitors.length > 0 && (
                <div className="mt-8 p-4 bg-muted dark:bg-muted/20 rounded-lg">
                  <h3 className="font-medium mb-2">Competitor Analysis Summary</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Analyzing {competitors.length} competitor pages with a total of{' '}
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {competitors.reduce((sum, comp) => sum + comp.wordCount, 0).toLocaleString()}
                    </span> words. 
                    <span className="ml-1">
                      Average readability score:{' '}
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {(competitors.reduce((sum, comp) => sum + comp.readabilityScore, 0) / competitors.length).toFixed(1)}/100
                      </span>
                    </span>
                    {competitorFilter !== 'all' && (
                      <span className="ml-1 bg-background dark:bg-background/60 px-2 py-0.5 rounded-md inline-block mt-1">
                        Currently showing <span className="font-medium">{filteredCompetitors.length}</span> filtered competitors.
                      </span>
                    )}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-background dark:bg-background/40 rounded-md p-3 shadow-sm dark:shadow-md dark:shadow-black/10">
                      <p className="text-sm font-medium">Longest Content</p>
                      <p className="text-xl font-bold">
                        {Math.max(...competitors.map(comp => comp.wordCount)).toLocaleString()}
                        <span className="text-sm text-muted-foreground font-normal"> words</span>
                      </p>
                    </div>
                    <div className="bg-background dark:bg-background/40 rounded-md p-3 shadow-sm dark:shadow-md dark:shadow-black/10">
                      <p className="text-sm font-medium">Most Readable</p>
                      <p className="text-xl font-bold">
                        {Math.max(...competitors.map(comp => comp.readabilityScore))}
                        <span className="text-sm text-muted-foreground font-normal">/100</span>
                      </p>
                    </div>
                    <div className="bg-background dark:bg-background/40 rounded-md p-3 shadow-sm dark:shadow-md dark:shadow-black/10">
                      <p className="text-sm font-medium">Unique Keywords</p>
                      <p className="text-xl font-bold">
                        {new Set(competitors.flatMap(comp => comp.keywords || [])).size}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
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
                        <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-full">
                          <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400" />
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">{advantage.area}</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            {advantage.description}
                          </p>
                          
                          {advantage.competitorComparison && (
                            <div className="bg-muted dark:bg-muted/20 p-3 rounded-md text-sm">
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
                        <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-full">
                          <TrendingDown className="h-4 w-4 text-red-500 dark:text-red-400" />
                        </div>
                        <div>
                          <h4 className="font-medium mb-1">{disadvantage.area}</h4>
                          <p className="text-sm text-muted-foreground mb-4">
                            {disadvantage.description}
                          </p>
                          
                          {disadvantage.competitorComparison && (
                            <div className="bg-muted dark:bg-muted/20 p-3 rounded-md text-sm">
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
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Content Gap Opportunities</h3>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Sort by relevance (high to low)
                        const sorted = [...filteredContentGaps].sort((a, b) => {
                          const relevanceOrder = { high: 0, medium: 1, low: 2 };
                          return relevanceOrder[a.relevance as keyof typeof relevanceOrder] - 
                                 relevanceOrder[b.relevance as keyof typeof relevanceOrder];
                        });
                        setFilteredContentGaps(sorted);
                      }}
                    >
                      Sort by Relevance
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Sort by competitors covering (high to low)
                        const sorted = [...filteredContentGaps].sort((a, b) => b.competitorsCovering - a.competitorsCovering);
                        setFilteredContentGaps(sorted);
                      }}
                    >
                      Sort by Popularity
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge 
                    variant={contentGapFilter === 'all' ? 'secondary' : 'outline'} 
                    className="cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => setContentGapFilter('all')}
                  >
                    All
                  </Badge>
                  <Badge 
                    variant={contentGapFilter === 'high' ? 'secondary' : 'outline'} 
                    className="cursor-pointer hover:bg-secondary/20 transition-colors"
                    onClick={() => setContentGapFilter('high')}
                  >
                    High Relevance
                  </Badge>
                  <Badge 
                    variant={contentGapFilter === 'medium' ? 'secondary' : 'outline'} 
                    className="cursor-pointer hover:bg-secondary/20 transition-colors"
                    onClick={() => setContentGapFilter('medium')}
                  >
                    Medium Relevance
                  </Badge>
                  <Badge 
                    variant={contentGapFilter === 'low' ? 'secondary' : 'outline'} 
                    className="cursor-pointer hover:bg-secondary/20 transition-colors"
                    onClick={() => setContentGapFilter('low')}
                  >
                    Low Relevance
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredContentGaps.map((gap, index) => {
                  const relevanceColor = 
                    gap.relevance === 'high' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30' :
                    gap.relevance === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30' :
                    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30';
                    
                  const relevanceIcon = 
                    gap.relevance === 'high' ? '🔥' :
                    gap.relevance === 'medium' ? '⚡' : '💡';
                    
                  const isExpanded = expandedGaps[index] || false;
                    
                  return (
                    <Card 
                      key={index} 
                      className={`border-l-4 ${
                        gap.relevance === 'high' ? 'border-l-red-500 dark:border-l-red-400/70' :
                        gap.relevance === 'medium' ? 'border-l-amber-500 dark:border-l-amber-400/70' : 
                        'border-l-blue-500 dark:border-l-blue-400/70'
                      } transition-all hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/10 dark:bg-background/30 relative overflow-hidden`}
                    >
                      <div 
                        className={`absolute inset-0 bg-gradient-to-r from-transparent ${
                          gap.relevance === 'high' ? 'to-red-50/30 dark:to-red-900/10' :
                          gap.relevance === 'medium' ? 'to-amber-50/30 dark:to-amber-900/10' : 
                          'to-blue-50/30 dark:to-blue-900/10'
                        } pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300`} 
                      />
                      
                      <CardContent className="p-5 relative">
                        <div className="flex items-start">
                          <div className={`flex items-center justify-center h-10 w-10 rounded-full mt-1 mr-4 ${relevanceColor}`}>
                            <span role="img" aria-label="relevance icon" className="text-lg">
                              {relevanceIcon}
                            </span>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-medium text-lg flex items-center cursor-pointer group" onClick={() => toggleGapExpansion(index)}>
                                {gap.topic}
                                <ChevronsUpDown className="h-4 w-4 ml-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </h4>
                              <Badge variant={
                                gap.relevance === 'high' ? 'destructive' : 
                                gap.relevance === 'medium' ? 'default' : 'outline'
                              }>
                                {gap.relevance.charAt(0).toUpperCase() + gap.relevance.slice(1)} Relevance
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-3">
                              {gap.description}
                            </p>
                            
                            <div className="mt-4">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-muted-foreground">
                                  Competitor Coverage
                                </span>
                                <span className="text-sm font-medium">
                                  {gap.competitorsCovering} of {competitors.length} competitors
                                </span>
                              </div>
                              <div className="relative h-2 rounded-full bg-muted dark:bg-muted/40 overflow-hidden">
                                <div 
                                  className={`absolute top-0 left-0 h-full rounded-full ${
                                    gap.competitorsCovering / Math.max(1, competitors.length) > 0.7 ? 'bg-red-500 dark:bg-red-400' :
                                    gap.competitorsCovering / Math.max(1, competitors.length) > 0.4 ? 'bg-amber-500 dark:bg-amber-400' :
                                    'bg-blue-500 dark:bg-blue-400'
                                  }`}
                                  style={{ width: `${(gap.competitorsCovering / Math.max(1, competitors.length)) * 100}%` }}
                                />
                              </div>
                            </div>
                            
                            <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'mt-4 max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                              {isExpanded && (
                                <>
                                  <Separator className="my-4" />
                                  
                                  <div className="bg-muted/50 dark:bg-muted/20 rounded-md p-3 text-sm relative mt-2 group">
                                    <div className="absolute top-0 right-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-7 w-7 p-0 rounded-full"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(gap.suggestedImplementation);
                                          toast({
                                            title: "Copied to clipboard",
                                            description: "Implementation guidance has been copied.",
                                          });
                                        }}
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                    
                                    <p className="font-medium mb-1">Implementation Guidance:</p>
                                    <p>{gap.suggestedImplementation}</p>
                                  </div>
                                  
                                  <div className="mt-4 grid grid-cols-2 gap-2">
                                    <div className="p-2 rounded-md bg-muted/30 dark:bg-muted/20 cursor-pointer hover:bg-muted dark:hover:bg-muted/40 transition-colors text-sm flex items-center" onClick={(e) => {
                                      e.stopPropagation();
                                      navigator.clipboard.writeText(gap.topic);
                                      toast({
                                        title: "Topic Copied",
                                        description: `"${gap.topic}" has been copied to clipboard.`,
                                      });
                                    }}>
                                      <Copy className="h-3.5 w-3.5 mr-2" />
                                      <span>Copy Topic</span>
                                    </div>
                                    
                                    <div className="p-2 rounded-md bg-muted/30 dark:bg-muted/20 cursor-pointer hover:bg-muted dark:hover:bg-muted/40 transition-colors text-sm flex items-center" onClick={(e) => {
                                      e.stopPropagation();
                                      // Add to tasks functionality
                                      toast({
                                        title: "Added to Tasks",
                                        description: `"${gap.topic}" has been added to your tasks.`,
                                        action: (
                                          <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-white">
                                            <CheckCheck className="h-4 w-4" />
                                          </div>
                                        ),
                                      });
                                    }}>
                                      <ClipboardList className="h-3.5 w-3.5 mr-2" />
                                      <span>Add to Tasks</span>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                            
                            <div className={`flex mt-4 ${isExpanded ? 'justify-between' : 'justify-end'} items-center`}>
                              {isExpanded && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleGapExpansion(index);
                                  }}
                                >
                                  Show Less
                                </Button>
                              )}
                              
                              <div className="flex space-x-2">
                                {!isExpanded && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleGapExpansion(index);
                                    }}
                                  >
                                    Show Details
                                  </Button>
                                )}
                                
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  className="text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toast({
                                      title: "Implementation Plan",
                                      description: "Detailed implementation plan for this topic is being generated.",
                                    });
                                  }}
                                >
                                  <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                                  Get Plan
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {filteredContentGaps.length === 0 && contentGaps.length > 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Matching Content Gaps</h3>
                    <p className="text-muted-foreground mb-4">
                      Try changing your filter to see more content gap opportunities.
                    </p>
                    <Button variant="outline" onClick={() => setContentGapFilter('all')}>
                      Show All Gaps
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              {contentGaps.length > 0 && (
                <div className="mt-8 p-4 bg-muted dark:bg-muted/20 rounded-lg">
                  <h3 className="font-medium mb-2">Content Gap Analysis Summary</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Found {contentGaps.length} content gaps across your competitors. 
                    <span className="ml-1">
                      <span className="font-medium text-red-600 dark:text-red-400">{contentGaps.filter(g => g.relevance === 'high').length}</span> high priority,{' '}
                      <span className="font-medium text-amber-600 dark:text-amber-400">{contentGaps.filter(g => g.relevance === 'medium').length}</span> medium priority,{' '}
                      and <span className="font-medium text-blue-600 dark:text-blue-400">{contentGaps.filter(g => g.relevance === 'low').length}</span> low priority items.
                    </span>
                    {contentGapFilter !== 'all' && (
                      <span className="ml-1 bg-background dark:bg-background/60 px-2 py-0.5 rounded-md inline-block mt-1">
                        Currently showing <span className="font-medium">{filteredContentGaps.length}</span> {contentGapFilter} priority items.
                      </span>
                    )}
                  </p>
                  <div className="flex justify-end">
                    <Button onClick={() => {
                      // Generate report functionality
                      toast({
                        title: "Generating Report",
                        description: "Your content gap analysis report is being prepared.",
                      });
                    }}>
                      Generate Report
                    </Button>
                  </div>
                </div>
              )}
            </>
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
            <>
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Keyword Opportunities</h3>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Sort by search volume
                        const sorted = [...filteredKeywords].sort((a, b) => (b.volume || 0) - (a.volume || 0));
                        setFilteredKeywords(sorted);
                      }}
                    >
                      Sort by Volume
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Sort by difficulty (easy to hard)
                        const sorted = [...filteredKeywords].sort((a, b) => (a.difficulty || 0) - (b.difficulty || 0));
                        setFilteredKeywords(sorted);
                      }}
                    >
                      Sort by Difficulty
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge 
                    variant={keywordFilter === 'all' ? 'secondary' : 'outline'} 
                    className="cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => setKeywordFilter('all')}
                  >
                    All Keywords
                  </Badge>
                  <Badge 
                    variant={keywordFilter === 'not-in-title' ? 'secondary' : 'outline'} 
                    className="cursor-pointer hover:bg-secondary/20 transition-colors"
                    onClick={() => setKeywordFilter('not-in-title')}
                  >
                    Not in Title
                  </Badge>
                  <Badge 
                    variant={keywordFilter === 'not-in-headings' ? 'secondary' : 'outline'} 
                    className="cursor-pointer hover:bg-secondary/20 transition-colors"
                    onClick={() => setKeywordFilter('not-in-headings')}
                  >
                    Not in Headings
                  </Badge>
                  <Badge 
                    variant={keywordFilter === 'high-volume' ? 'secondary' : 'outline'} 
                    className="cursor-pointer hover:bg-secondary/20 transition-colors"
                    onClick={() => setKeywordFilter('high-volume')}
                  >
                    High Volume
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredKeywords.map((keyword, index) => {
                  // Determine difficulty level color and label
                  const difficultyColor = 
                    (keyword.difficulty || 0) > 70 ? 'text-red-600 dark:text-red-400' :
                    (keyword.difficulty || 0) > 40 ? 'text-amber-600 dark:text-amber-400' :
                    'text-green-600 dark:text-green-400';
                    
                  const difficultyLabel = 
                    (keyword.difficulty || 0) > 70 ? 'Difficult' :
                    (keyword.difficulty || 0) > 40 ? 'Moderate' :
                    'Easy';
                    
                  // Determine volume significance
                  const volumeLevel = 
                    (keyword.volume || 0) > 5000 ? 'high' :
                    (keyword.volume || 0) > 1000 ? 'medium' :
                    'low';
                    
                  const volumeIcon = 
                    volumeLevel === 'high' ? '📈' :
                    volumeLevel === 'medium' ? '📊' :
                    '📉';
                    
                  const isExpanded = expandedKeywords[index] || false;
                    
                  return (
                    <Card 
                      key={index} 
                      className={`transition-all hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/10 dark:bg-background/30 ${
                        !keyword.inTitle && !keyword.inHeadings ? 'border-amber-300 dark:border-amber-500/50' : ''
                      }`}
                    >
                      <CardContent className="p-5">
                        <div 
                          className="flex items-start justify-between mb-3 cursor-pointer" 
                          onClick={() => toggleKeywordExpansion(index)}
                        >
                          <h4 className="font-medium text-lg flex-1 truncate mr-2 group flex items-center">
                            {keyword.keyword}
                            <ChevronsUpDown className="h-4 w-4 ml-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </h4>
                          <div className="flex flex-shrink-0 items-center gap-1">
                            <span role="img" aria-label="volume" className="text-base">
                              {volumeIcon}
                            </span>
                            <Badge 
                              variant={volumeLevel === 'high' ? 'default' : 'outline'}
                              className={volumeLevel === 'high' ? '' : 'text-muted-foreground'}
                            >
                              {(keyword.volume || 0).toLocaleString()}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className={`transition-all duration-300 ease-in-out ${isExpanded ? 'mt-4 max-h-96 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                          {isExpanded && (
                            <>
                              <Separator className="my-4" />
                              
                              <div className="bg-muted/30 dark:bg-muted/20 p-3 rounded-md">
                                <h5 className="text-sm font-medium mb-2">Implementation Ideas</h5>
                                <ul className="text-sm space-y-2">
                                  <li className="flex items-start">
                                    <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mr-2 mt-0.5">
                                      <span className="text-green-700 dark:text-green-400 text-xs">1</span>
                                    </div>
                                    <span>Add "{keyword.keyword}" to your page title</span>
                                  </li>
                                  <li className="flex items-start">
                                    <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mr-2 mt-0.5">
                                      <span className="text-green-700 dark:text-green-400 text-xs">2</span>
                                    </div>
                                    <span>Include in H2 or H3 headings</span>
                                  </li>
                                  <li className="flex items-start">
                                    <div className="h-5 w-5 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mr-2 mt-0.5">
                                      <span className="text-green-700 dark:text-green-400 text-xs">3</span>
                                    </div>
                                    <span>Use naturally in content paragraphs</span>
                                  </li>
                                </ul>
                              </div>
                              
                              <div className="mt-4 grid grid-cols-2 gap-2">
                                <div className="p-2 rounded-md bg-muted/30 dark:bg-muted/20 cursor-pointer hover:bg-muted dark:hover:bg-muted/40 transition-colors text-xs flex items-center" onClick={(e) => {
                                  e.stopPropagation();
                                  // Copy keyword action
                                  navigator.clipboard.writeText(keyword.keyword);
                                  toast({
                                    title: "Keyword Copied",
                                    description: `"${keyword.keyword}" has been copied to clipboard.`,
                                  });
                                }}>
                                  <Copy className="h-3 w-3 mr-1.5" />
                                  <span>Copy Keyword</span>
                                </div>
                                
                                <div className="p-2 rounded-md bg-muted/30 dark:bg-muted/20 cursor-pointer hover:bg-muted dark:hover:bg-muted/40 transition-colors text-xs flex items-center" onClick={(e) => {
                                  e.stopPropagation();
                                  // Research action
                                  toast({
                                    title: "Keyword Research",
                                    description: "Detailed keyword research is being prepared.",
                                  });
                                }}>
                                  <Search className="h-3 w-3 mr-1.5" />
                                  <span>Research</span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                        
                        <div className={`flex mt-4 ${isExpanded ? 'justify-between' : 'justify-end'} items-center`}>
                          {isExpanded && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleKeywordExpansion(index);
                              }}
                            >
                              Show Less
                            </Button>
                          )}
                          
                          <div className="flex space-x-2">
                            {!isExpanded && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleKeywordExpansion(index);
                                }}
                              >
                                Show Ideas
                              </Button>
                            )}
                            
                            <Button 
                              variant="default" 
                              size="sm"
                              className="text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                toast({
                                  title: "Content Suggestions",
                                  description: `Generating content suggestions for "${keyword.keyword}"`,
                                });
                              }}
                            >
                              Get Suggestions
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {filteredKeywords.length === 0 && missingKeywords.length > 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Matching Keywords</h3>
                    <p className="text-muted-foreground mb-4">
                      Try changing your filter to see more keyword opportunities.
                    </p>
                    <Button variant="outline" onClick={() => setKeywordFilter('all')}>
                      Show All Keywords
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              {missingKeywords.length > 0 && (
                <div className="mt-8 p-4 bg-muted dark:bg-muted/20 rounded-lg">
                  <h3 className="font-medium mb-2">Keywords Gap Summary</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Found {missingKeywords.length} keyword opportunities from competitor content.
                    <span className="ml-1">
                      <span className="font-medium text-blue-600 dark:text-blue-400">{missingKeywords.filter(k => (k.volume || 0) > 5000).length}</span> high volume,{' '}
                      <span className="font-medium text-amber-600 dark:text-amber-400">{missingKeywords.filter(k => !k.inTitle && !k.inHeadings).length}</span> completely missing from your content.
                    </span>
                    {keywordFilter !== 'all' && (
                      <span className="ml-1 bg-background dark:bg-background/60 px-2 py-0.5 rounded-md inline-block mt-1">
                        Currently showing <span className="font-medium">{filteredKeywords.length}</span> filtered keywords.
                      </span>
                    )}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-background dark:bg-background/40 rounded-md p-3 shadow-sm dark:shadow-md dark:shadow-black/10">
                      <p className="text-sm font-medium">Total Monthly Search Volume</p>
                      <p className="text-xl font-bold">
                        {missingKeywords.reduce((sum, k) => sum + (k.volume || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-background dark:bg-background/40 rounded-md p-3 shadow-sm dark:shadow-md dark:shadow-black/10">
                      <p className="text-sm font-medium">Average Keyword Difficulty</p>
                      <p className="text-xl font-bold">
                        {(missingKeywords.reduce((sum, k) => sum + (k.difficulty || 0), 0) / missingKeywords.length || 0).toFixed(1)}/100
                      </p>
                    </div>
                    <div className="bg-background dark:bg-background/40 rounded-md p-3 shadow-sm dark:shadow-md dark:shadow-black/10">
                      <p className="text-sm font-medium">Keywords Not In Content</p>
                      <p className="text-xl font-bold">
                        {missingKeywords.filter(k => !k.inTitle && !k.inHeadings && (k.density || 0) < 0.1).length} 
                        <span className="text-sm text-muted-foreground font-normal"> of {missingKeywords.length}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button onClick={() => {
                      // Generate report functionality
                      toast({
                        title: "Generating Keyword Plan",
                        description: "Your keyword optimization plan is being prepared.",
                      });
                    }}>
                      Generate Keyword Plan
                    </Button>
                  </div>
                </div>
              )}
            </>
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
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-full">
                              <BarChart className="h-4 w-4 text-blue-500 dark:text-blue-400" />
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
                              
                              <div className="bg-muted dark:bg-muted/20 p-3 rounded-md text-sm">
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
                            <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-full">
                              <BarChart className="h-4 w-4 text-purple-500 dark:text-purple-400" />
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
                              
                              <div className="bg-muted dark:bg-muted/20 p-3 rounded-md text-sm">
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
                            <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-full">
                              <BarChart className="h-4 w-4 text-green-500 dark:text-green-400" />
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
                              
                              <div className="bg-muted dark:bg-muted/20 p-3 rounded-md text-sm">
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