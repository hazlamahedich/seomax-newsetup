'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, FileText, Link as LinkIcon, Search } from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

// Import the content analyzer
import { analyzeContentReadability, analyzeKeywordsInContent } from '@/lib/ai/content-analyzer';

// Create a Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface Project {
  id: string;
  user_id: string;
  website_name: string;
  website_url: string;
  target_keywords: string[];
  competitors: string[];
  created_at: string;
}

interface AnalysisResult {
  readability?: {
    score: number;
    fleschKincaidLevel: string;
    averageSentenceLength: number;
    complexWordPercentage: number;
    recommendations: string[];
  };
  keywords?: {
    mainKeyword: string;
    density: number;
    occurrences: number;
    placement: string;
    related: Array<{ keyword: string; occurrences: number; density: number }>;
    recommendations: string[];
  };
  suggestions?: Array<{
    type: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  error?: string;
}

export default function ContentAnalyzerPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const projectId = params.id;
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  
  const [analysisType, setAnalysisType] = useState<'url' | 'text'>('url');
  const [url, setUrl] = useState('');
  const [content, setContent] = useState('');
  const [targetKeyword, setTargetKeyword] = useState('');
  
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  useEffect(() => {
    if (user) {
      fetchProject();
    }
  }, [user, projectId]);
  
  useEffect(() => {
    if (project && project.target_keywords && project.target_keywords.length > 0) {
      setTargetKeyword(project.target_keywords[0]);
    }
  }, [project]);
  
  const fetchProject = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();
        
      if (error) {
        console.error('Error fetching project:', error);
        router.push('/dashboard');
      } else if (data) {
        setProject(data);
      }
    } catch (err) {
      console.error('Error fetching project:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchUrlContent = async (url: string): Promise<string> => {
    try {
      const response = await fetch(`/api/fetch-content?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.statusText}`);
      }
      const data = await response.json();
      return data.content;
    } catch (error) {
      console.error('Error fetching URL content:', error);
      throw error;
    }
  };
  
  const analyzeContent = async () => {
    if (!targetKeyword) {
      setError('Please select a target keyword for analysis');
      return;
    }
    
    try {
      setError('');
      setAnalyzing(true);
      setAnalysisResult(null);
      
      let contentToAnalyze = '';
      
      if (analysisType === 'url') {
        if (!url) {
          setError('Please enter a valid URL');
          setAnalyzing(false);
          return;
        }
        
        try {
          // In a real implementation, this would fetch content from the URL
          // For now, we'll simulate this with a delay
          await new Promise(resolve => setTimeout(resolve, 1500));
          contentToAnalyze = `This is simulated content for the URL ${url}. In a real implementation, this would be the actual content fetched from the URL. This content would then be analyzed for readability and keyword usage.
          
          The simulated content includes mentions of ${targetKeyword} several times to demonstrate keyword analysis. The ${targetKeyword} appears in headings and paragraphs.
          
          Some SEO best practices for ${targetKeyword} optimization include using the keyword in the title, headings, and naturally throughout the content. Avoid keyword stuffing as it can negatively impact readability and user experience.
          
          This is a longer paragraph to demonstrate readability analysis. It contains multiple sentences with varying lengths and complexity. Some sentences are short. Others are more complex and include multiple clauses, technical terms, or specialized vocabulary that might impact readability scores and make the content more difficult for the average reader to comprehend quickly.`;
        } catch (error) {
          setError('Failed to fetch content from URL');
          setAnalyzing(false);
          return;
        }
      } else {
        if (!content) {
          setError('Please enter content to analyze');
          setAnalyzing(false);
          return;
        }
        contentToAnalyze = content;
      }
      
      // Perform readability analysis
      const readabilityResult = await analyzeContentReadability(contentToAnalyze);
      
      // Perform keyword analysis
      const keywordResult = await analyzeKeywordsInContent(contentToAnalyze, targetKeyword);
      
      setAnalysisResult({
        readability: readabilityResult,
        keywords: keywordResult,
        suggestions: [
          {
            type: 'Readability',
            suggestion: 'Shorten sentences to improve readability',
            priority: 'medium'
          },
          {
            type: 'Keyword Usage',
            suggestion: `Add more instances of "${targetKeyword}" in the first paragraph`,
            priority: 'high'
          },
          {
            type: 'Content Structure',
            suggestion: 'Add more subheadings to break up the content',
            priority: 'low'
          }
        ]
      });
      
    } catch (err) {
      console.error('Error analyzing content:', err);
      setError('An error occurred during analysis');
    } finally {
      setAnalyzing(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content Analyzer</h1>
        <p className="text-muted-foreground">
          Analyze content for SEO optimization and readability
        </p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Analyze Your Content</CardTitle>
          <CardDescription>
            Enter a URL or paste content directly to analyze
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs 
            value={analysisType} 
            onValueChange={(value) => setAnalysisType(value as 'url' | 'text')}
            className="space-y-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url">
                <LinkIcon className="mr-2 h-4 w-4" />
                URL
              </TabsTrigger>
              <TabsTrigger value="text">
                <FileText className="mr-2 h-4 w-4" />
                Text Content
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="url" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">Page URL</Label>
                <Input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/page-to-analyze"
                />
                <p className="text-sm text-muted-foreground">
                  Enter the full URL of the page you want to analyze
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="text" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste your content here for analysis..."
                  className="min-h-[200px]"
                />
                <p className="text-sm text-muted-foreground">
                  Paste the content you want to analyze for SEO and readability
                </p>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="space-y-2">
            <Label htmlFor="targetKeyword">Target Keyword</Label>
            <Select 
              value={targetKeyword} 
              onValueChange={setTargetKeyword}
            >
              <SelectTrigger id="targetKeyword">
                <SelectValue placeholder="Select a target keyword" />
              </SelectTrigger>
              <SelectContent>
                {project?.target_keywords?.map((keyword, index) => (
                  <SelectItem key={index} value={keyword}>
                    {keyword}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Select the primary keyword you want to optimize for
            </p>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            onClick={analyzeContent} 
            disabled={analyzing}
            className="w-full"
          >
            {analyzing ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Analyze Content
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
      {analyzing && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        </div>
      )}
      
      {!analyzing && analysisResult && (
        <div className="space-y-6">
          <Tabs defaultValue="readability" className="space-y-4">
            <TabsList>
              <TabsTrigger value="readability">Readability</TabsTrigger>
              <TabsTrigger value="keywords">Keywords</TabsTrigger>
              <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="readability" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Readability Analysis</CardTitle>
                  <CardDescription>
                    How easy is your content to read and understand
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Readability Score</h3>
                      <p className="text-sm text-muted-foreground">
                        Based on Flesch-Kincaid readability tests
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {analysisResult.readability?.score || 0}/100
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {analysisResult.readability?.fleschKincaidLevel || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <div className="text-sm font-medium text-muted-foreground">
                        Average Sentence Length
                      </div>
                      <div className="mt-1 text-2xl font-semibold">
                        {analysisResult.readability?.averageSentenceLength || 0} words
                      </div>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="text-sm font-medium text-muted-foreground">
                        Complex Word Usage
                      </div>
                      <div className="mt-1 text-2xl font-semibold">
                        {analysisResult.readability?.complexWordPercentage || 0}%
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="mb-3 text-lg font-medium">Recommendations</h3>
                    {analysisResult.readability?.recommendations.map((recommendation, index) => (
                      <div key={index} className="mb-2 flex items-start space-x-2">
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary"></div>
                        <p>{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="keywords" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Keyword Analysis</CardTitle>
                  <CardDescription>
                    How well your content is optimized for your target keyword
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">Main Keyword</h3>
                      <p className="text-sm text-muted-foreground">
                        {analysisResult.keywords?.mainKeyword || targetKeyword}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        {analysisResult.keywords?.density || 0}%
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Density
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <div className="text-sm font-medium text-muted-foreground">
                        Occurrences
                      </div>
                      <div className="mt-1 text-2xl font-semibold">
                        {analysisResult.keywords?.occurrences || 0} times
                      </div>
                    </div>
                    <div className="rounded-lg border p-4">
                      <div className="text-sm font-medium text-muted-foreground">
                        Placement
                      </div>
                      <div className="mt-1 text-xl font-semibold">
                        {analysisResult.keywords?.placement || 'Not found in key elements'}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="mb-3 text-lg font-medium">Related Keywords</h3>
                    <div className="space-y-3">
                      {analysisResult.keywords?.related.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="font-medium">{item.keyword}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.occurrences} times ({item.density}%)
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="mb-3 text-lg font-medium">Recommendations</h3>
                    {analysisResult.keywords?.recommendations.map((recommendation, index) => (
                      <div key={index} className="mb-2 flex items-start space-x-2">
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary"></div>
                        <p>{recommendation}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="suggestions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Content Suggestions</CardTitle>
                  <CardDescription>
                    Actionable recommendations to improve your content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {['high', 'medium', 'low'].map((priority) => {
                    const prioritySuggestions = analysisResult.suggestions?.filter(
                      (s) => s.priority === priority
                    ) || [];
                    
                    if (prioritySuggestions.length === 0) return null;
                    
                    return (
                      <div key={priority} className="space-y-3">
                        <h3 className="font-medium">
                          {priority === 'high' 
                            ? '🔴 High Priority' 
                            : priority === 'medium' 
                              ? '🟠 Medium Priority' 
                              : '🟢 Low Priority'}
                        </h3>
                        {prioritySuggestions.map((suggestion, index) => (
                          <div key={index} className="rounded-lg border p-4">
                            <div className="font-medium text-sm text-muted-foreground mb-1">
                              {suggestion.type}
                            </div>
                            <div>
                              {suggestion.suggestion}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}