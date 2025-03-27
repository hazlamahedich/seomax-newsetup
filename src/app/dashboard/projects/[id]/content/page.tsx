'use client';

import { useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, FileText, CheckCircle, AlertTriangle, Globe } from 'lucide-react';
import { ContentAnalyzer, ReadabilityAnalysis, KeywordAnalysis, ContentSuggestion } from '@/lib/ai/content-analyzer';
import ClientAuthCheck from '@/components/providers/ClientAuthCheck';

// Create a Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface AnalysisResult {
  readability: {
    score: number;
    grade: string;
    analysis: string;
    suggestions: string[];
  };
  seo: {
    score: number;
    keywords: Array<{ keyword: string; count: number; density: string }>;
    suggestions: string[];
  };
  suggestions: Array<{
    type: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export default function ContentPage({ params }: { params: { id: string } }) {
  const { supabaseUser, getActiveUser } = useAuth();
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [activeTab, setActiveTab] = useState('url');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const contentAnalyzer = new ContentAnalyzer();

  const analyzeContent = async () => {
    const activeUser = getActiveUser();
    if (!activeUser) return;
    
    try {
      setAnalyzing(true);
      
      let contentToAnalyze = '';
      let fetchedTitle = '';
      
      // If URL analysis, fetch the content first
      if (activeTab === 'url' && url) {
        const response = await fetch(`/api/fetch-content?url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        contentToAnalyze = data.content;
        fetchedTitle = data.title;
      } else if (activeTab === 'text' && text) {
        contentToAnalyze = text;
      } else {
        throw new Error('No content to analyze');
      }
      
      // Analyze the content
      const readabilityAnalysis = await contentAnalyzer.analyzeReadability(contentToAnalyze);
      const keywordAnalysis = await contentAnalyzer.analyzeKeywordUsage(contentToAnalyze, []);
      const contentSuggestions = await contentAnalyzer.generateSuggestions(contentToAnalyze, [], {
        readability: readabilityAnalysis,
        keyword: keywordAnalysis
      });
      
      // Map the API responses to our simplified UI model
      setAnalysisResult({
        readability: {
          score: readabilityAnalysis.readability_score,
          grade: readabilityAnalysis.reading_level,
          analysis: readabilityAnalysis.analysis_summary,
          suggestions: readabilityAnalysis.improvement_areas,
        },
        seo: {
          score: keywordAnalysis.optimization_score,
          keywords: Object.entries(keywordAnalysis.keyword_density).slice(0, 5).map(([term, count]) => ({
            keyword: term,
            count: count as number,
            density: `${((count as number) * 100).toFixed(1)}%`
          })),
          suggestions: keywordAnalysis.recommendations,
        },
        suggestions: contentSuggestions.map(s => ({
          type: s.suggestion_type,
          suggestion: s.suggested_text,
          priority: (s.reason.toLowerCase().includes('critical') ? 'high' : 
                    s.reason.toLowerCase().includes('important') ? 'medium' : 'low') as 'high' | 'medium' | 'low',
        })),
      });
      
      // Save the analysis to the database
      if (params.id) {
        await supabase.from('content_analyses').insert({
          project_id: params.id,
          user_id: activeUser.id,
          content_type: activeTab === 'url' ? 'url' : 'text',
          url: activeTab === 'url' ? url : null,
          title: activeTab === 'url' ? fetchedTitle : 'Custom text analysis',
          content: contentToAnalyze.substring(0, 500) + '...',
          readability_score: readabilityAnalysis.readability_score,
          seo_score: keywordAnalysis.optimization_score,
          created_at: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.error('Error analyzing content:', err);
      alert(`Error analyzing content: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const getReadabilityColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const getSeoColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  const renderPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'low':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
  };

  return (
    <ClientAuthCheck projectId={params.id}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Content Analysis</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Analyze Content</CardTitle>
            <CardDescription>
              Enter a URL or paste text to analyze content for readability and SEO
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="url">URL</TabsTrigger>
                <TabsTrigger value="text">Text</TabsTrigger>
              </TabsList>
              
              <TabsContent value="url" className="space-y-4">
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Input
                      placeholder="https://example.com/page"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                  </div>
                  <Button onClick={analyzeContent} disabled={!url || analyzing}>
                    {analyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Globe className="mr-2 h-4 w-4" />
                        Analyze URL
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="text" className="space-y-4">
                <Textarea
                  placeholder="Paste your content here..."
                  className="min-h-[200px]"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
                <Button onClick={analyzeContent} disabled={!text || analyzing}>
                  {analyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Analyze Text
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {analysisResult && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">Readability Score</CardTitle>
                  <CardDescription>Based on ease of reading and comprehension</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={`text-4xl font-bold ${getReadabilityColor(analysisResult.readability.score)}`}>
                    {analysisResult.readability.score}/100
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Grade Level: {analysisResult.readability.grade}
                  </p>
                  <p className="mt-4 text-sm">{analysisResult.readability.analysis}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-medium">SEO Score</CardTitle>
                  <CardDescription>Based on keyword usage and content structure</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={`text-4xl font-bold ${getSeoColor(analysisResult.seo.score)}`}>
                    {analysisResult.seo.score}/100
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Top Keywords:</p>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.seo.keywords.slice(0, 5).map((kw, index) => (
                        <div key={index} className="bg-muted px-2 py-1 rounded-md text-xs">
                          {kw.keyword} ({kw.density})
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Content Improvement Suggestions</CardTitle>
                <CardDescription>
                  Tips to improve your content for better readability and SEO performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysisResult.suggestions.map((suggestion, index) => (
                    <div key={index} className="flex gap-3 pb-3 border-b last:border-0 last:pb-0">
                      {renderPriorityIcon(suggestion.priority)}
                      <div>
                        <p className="font-medium">{suggestion.type}</p>
                        <p className="text-sm text-muted-foreground">{suggestion.suggestion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Readability Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysisResult.readability.suggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-start gap-2 pb-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <p className="text-sm">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>SEO Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analysisResult.seo.suggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-start gap-2 pb-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <p className="text-sm">{suggestion}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ClientAuthCheck>
  );
}