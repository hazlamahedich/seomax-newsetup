'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, Search, Plus, CheckCircle, XCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContentPageService } from '@/lib/services/content-service';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';

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

// Mock content gaps based on competitor analysis
const mockContentGaps = [
  { topic: 'Mobile-first indexing', relevance: 'high', competitorsCovering: 2, description: 'Strategies for optimizing for mobile-first indexing' },
  { topic: 'Voice search optimization', relevance: 'medium', competitorsCovering: 1, description: 'Techniques for optimizing content for voice searches' },
  { topic: 'Core Web Vitals', relevance: 'high', competitorsCovering: 3, description: 'Performance metrics that affect search rankings' },
  { topic: 'E-A-T principles', relevance: 'high', competitorsCovering: 2, description: 'Expertise, Authoritativeness, and Trustworthiness factors' },
  { topic: 'Internal linking strategies', relevance: 'medium', competitorsCovering: 2, description: 'Strategic internal linking for SEO benefits' },
  { topic: 'International SEO', relevance: 'low', competitorsCovering: 1, description: 'Optimizing content for multiple countries/languages' }
];

// Mock missing keywords based on competitor analysis
const mockMissingKeywords = [
  { keyword: 'mobile-first indexing', volume: 1800, difficulty: 45, competitorRank: 4 },
  { keyword: 'core web vitals optimization', volume: 2200, difficulty: 62, competitorRank: 3 },
  { keyword: 'e-a-t seo principles', volume: 1500, difficulty: 38, competitorRank: 5 },
  { keyword: 'voice search optimization', volume: 1200, difficulty: 55, competitorRank: 7 },
  { keyword: 'international seo guide', volume: 900, difficulty: 48, competitorRank: 8 }
];

export function ContentGapAnalysis({ contentPageId, onBack }: ContentGapAnalysisProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [contentPage, setContentPage] = useState<any>(null);
  const [competitors, setCompetitors] = useState(mockCompetitors);
  const [contentGaps, setContentGaps] = useState(mockContentGaps);
  const [missingKeywords, setMissingKeywords] = useState(mockMissingKeywords);
  const [activeTab, setActiveTab] = useState('competitors');
  const [error, setError] = useState<string | null>(null);
  const [searchUrl, setSearchUrl] = useState('');
  const [isSearching, setIsSearching] = useState(false);

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
      
      // In a real implementation, you would fetch actual competitor data
      // For this demo, we're using mock data
      setIsLoading(false);
    } catch (err) {
      setError('Failed to load content data');
      console.error('Error loading content:', err);
      setIsLoading(false);
    }
  };

  const handleAddCompetitor = () => {
    if (!searchUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a competitor URL to analyze.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSearching(true);
    
    // Simulate API call to analyze competitor
    setTimeout(() => {
      // In a real implementation, this would be an API call
      // to analyze the competitor content
      
      // For this demo, we'll just add a mock competitor
      const newCompetitor = {
        id: `comp${competitors.length + 1}`,
        url: searchUrl,
        title: `Competitor Content ${competitors.length + 1}`,
        keyPoints: [
          'Sample key point 1',
          'Sample key point 2',
          'Sample key point 3'
        ],
        keywords: ['sample keyword 1', 'sample keyword 2', 'sample keyword 3'],
        wordCount: Math.floor(1500 + Math.random() * 2000),
        readabilityScore: Math.floor(70 + Math.random() * 20),
        keywordDensity: 1 + Math.random()
      };
      
      setCompetitors([...competitors, newCompetitor]);
      setSearchUrl('');
      setIsSearching(false);
      
      toast({
        title: "Competitor Added",
        description: "The competitor content has been analyzed and added.",
      });
      
      // In a real implementation, you would also update the gaps and keywords
      // based on the new competitor analysis
    }, 1500);
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
              className="flex items-center"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="content-gaps">Content Gaps</TabsTrigger>
          <TabsTrigger value="keywords">Missing Keywords</TabsTrigger>
        </TabsList>
        
        <TabsContent value="competitors">
          <div className="space-y-4">
            {competitors.map(competitor => (
              <Card key={competitor.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{competitor.title}</CardTitle>
                  <CardDescription className="truncate">
                    <a href={competitor.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      {competitor.url}
                    </a>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-1">Word Count</p>
                      <p className="text-muted-foreground">{competitor.wordCount.toLocaleString()} words</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Readability Score</p>
                      <p className="text-muted-foreground">{competitor.readabilityScore}/100</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Keyword Density</p>
                      <p className="text-muted-foreground">{competitor.keywordDensity.toFixed(1)}%</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Key Points</h4>
                    <ul className="space-y-1">
                      {competitor.keyPoints.map((point, index) => (
                        <li key={index} className="text-sm text-muted-foreground">
                          • {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {competitor.keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary">{keyword}</Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="content-gaps">
          <Card>
            <CardHeader>
              <CardTitle>Content Gap Analysis</CardTitle>
              <CardDescription>
                Topics covered by competitors that are missing from your content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contentGaps.map((gap, index) => (
                  <div key={index} className="p-4 border rounded-md space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{gap.topic}</h3>
                      <Badge className={
                        gap.relevance === 'high' ? 'bg-red-500' : 
                        gap.relevance === 'medium' ? 'bg-amber-500' : 
                        'bg-blue-500'
                      }>
                        {gap.relevance.charAt(0).toUpperCase() + gap.relevance.slice(1)} Relevance
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{gap.description}</p>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <span>Covered by {gap.competitorsCovering} competitor{gap.competitorsCovering !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="keywords">
          <Card>
            <CardHeader>
              <CardTitle>Missing Keywords</CardTitle>
              <CardDescription>
                Keywords used by competitors that are missing from your content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 px-4 text-left font-medium">Keyword</th>
                      <th className="py-2 px-4 text-left font-medium">Search Volume</th>
                      <th className="py-2 px-4 text-left font-medium">Difficulty</th>
                      <th className="py-2 px-4 text-left font-medium">Competitor Rank</th>
                      <th className="py-2 px-4 text-left font-medium">Present in Content</th>
                    </tr>
                  </thead>
                  <tbody>
                    {missingKeywords.map((keyword, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3 px-4">{keyword.keyword}</td>
                        <td className="py-3 px-4">{keyword.volume.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <Badge className={
                            keyword.difficulty > 60 ? 'bg-red-500' : 
                            keyword.difficulty > 40 ? 'bg-amber-500' : 
                            'bg-green-500'
                          }>
                            {keyword.difficulty}/100
                          </Badge>
                        </td>
                        <td className="py-3 px-4">{keyword.competitorRank}</td>
                        <td className="py-3 px-4">
                          <div className="flex justify-center">
                            <XCircle className="h-5 w-5 text-red-500" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full">
                Add Selected Keywords to Content Brief
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 