import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, Clock, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { ContentPageService } from '@/lib/services/content-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Define the types for the analysis data
interface AnalysisRecord {
  id: string;
  page_id: string;
  analysis_type: string;
  result: any;
  created_at: string;
}

interface ContentSuggestion {
  id: string;
  type: string;
  suggestion: string;
  implemented: boolean;
}

export const dynamic = 'force-dynamic';

export default async function ContentAnalysisPage({ 
  params 
}: { 
  params: { id: string; contentId: string } 
}) {
  const supabase = createClient();
  
  // Check if user is logged in
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Get the project to ensure it belongs to the current user
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', session.user.id)
    .single();

  if (!project) {
    redirect('/dashboard');
  }

  // Get content page details
  const { data: contentPage } = await supabase
    .from('content_pages')
    .select('*')
    .eq('id', params.contentId)
    .eq('project_id', params.id)
    .single();

  if (!contentPage) {
    redirect(`/dashboard/projects/${params.id}/content`);
  }

  // Get the latest content analysis
  const { data: contentAnalyses } = await supabase
    .from('content_analysis')
    .select('*')
    .eq('page_id', params.contentId)
    .order('created_at', { ascending: false });

  console.log('Content analyses count:', contentAnalyses?.length);

  // Extract specific analysis types
  const readabilityAnalysis = contentAnalyses?.find(a => a.analysis_type === 'readability')?.result;
  const keywordAnalysis = contentAnalyses?.find(a => a.analysis_type === 'keyword')?.result;
  const structureAnalysis = contentAnalyses?.find(a => a.analysis_type === 'structure')?.result;
  const suggestionsAnalysis = contentAnalyses?.find(a => a.analysis_type === 'suggestions')?.result || [];
  const comprehensiveAnalysis = contentAnalyses?.find(a => a.analysis_type === 'comprehensive')?.result;

  console.log('Found analyses:', { 
    readability: !!readabilityAnalysis, 
    keyword: !!keywordAnalysis, 
    structure: !!structureAnalysis,
    suggestions: Array.isArray(suggestionsAnalysis) ? suggestionsAnalysis.length : 'not an array'
  });

  // Mock data for suggestions if needed
  const mockSuggestions = [
    {
      id: '1',
      type: 'keyword',
      suggestion: 'Add the primary keyword "SEO optimization" to your H1 tag',
      implemented: false
    },
    {
      id: '2',
      type: 'readability',
      suggestion: 'Break down the third paragraph into shorter sentences for easier reading',
      implemented: true
    },
    {
      id: '3',
      type: 'structure',
      suggestion: 'Add a clear call-to-action at the end of the article',
      implemented: false
    },
    {
      id: '4',
      type: 'structure',
      suggestion: 'Add a section about mobile optimization which is missing from the content',
      implemented: false
    },
    {
      id: '5',
      type: 'keyword',
      suggestion: 'Include more semantically related terms like "search engine visibility"',
      implemented: false
    },
    {
      id: '6',
      type: 'readability',
      suggestion: 'Replace technical jargon like "algorithmic parameters" with simpler alternatives',
      implemented: true
    }
  ];

  // Convert the suggestions from our analysis format to the ContentSuggestion format
  const allSuggestions: ContentSuggestion[] = Array.isArray(suggestionsAnalysis) 
    ? suggestionsAnalysis.map((s: any, index) => ({
        id: `suggestion-${index}`,
        type: s.suggestion_type?.toLowerCase() || 'general',
        suggestion: s.suggested_text || '',
        implemented: false
      }))
    : mockSuggestions;

  // Mock data for analysis summary if needed
  const mockAnalysisSummary = {
    wordCount: 1250,
    headingCount: {
      h1: 1,
      h2: 4,
      h3: 6
    },
    paragraphCount: 12,
    linkCount: {
      internal: 3,
      external: 5
    },
    imageCount: 2,
    readingTime: '5 minutes',
    topKeywords: [
      { keyword: 'content marketing', count: 12 },
      { keyword: 'SEO', count: 8 },
      { keyword: 'optimization', count: 7 },
      { keyword: 'strategy', count: 5 }
    ]
  };

  // Function to determine status badge style
  const getStatusBadge = (type: string) => {
    switch(type) {
      case 'keyword':
        return <Badge className="bg-blue-500">Keyword</Badge>;
      case 'readability':
        return <Badge className="bg-purple-500">Readability</Badge>;
      case 'structure':
        return <Badge className="bg-orange-500">Structure</Badge>;
      default:
        return <Badge>General</Badge>;
    }
  };

  // Calculate implementation status - actual implementation would handle the implemented flag
  const implementedCount = allSuggestions.filter(s => s.implemented).length;
  const implementationPercentage = Math.round((implementedCount / allSuggestions.length) * 100) || 0;

  // Get overall score from the comprehensive analysis or readability score as fallback
  const overallScore = comprehensiveAnalysis?.content_score || 
                       readabilityAnalysis?.readability_score || 
                       keywordAnalysis?.optimization_score || 
                       structureAnalysis?.structure_score || 
                       75;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href={`/dashboard/projects/${params.id}/content/${params.contentId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Content Analysis</h1>
          </div>
          <p className="text-muted-foreground">
            {contentPage.title}{' '}
            <Link href={contentPage.url} className="hover:underline text-blue-500" target="_blank">
              ({contentPage.url})
            </Link>
          </p>
        </div>
        
        <form action={async () => {
          'use server';
          
          // Trigger content analysis
          await ContentPageService.analyzeContentPage(params.contentId);
          
          // Redirect to the same page to refresh the data
          redirect(`/dashboard/projects/${params.id}/content/${params.contentId}/analysis`);
        }}>
          <Button type="submit">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Re-analyze Content
          </Button>
        </form>
      </div>

      {contentPage.status === 'analyzing' ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 border border-dashed rounded-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <h3 className="text-lg font-medium">Analyzing content...</h3>
          <p className="text-muted-foreground text-center max-w-md">
            We're analyzing your content to provide you with actionable insights. This may take a few moments.
          </p>
        </div>
      ) : contentPage.status === 'not-analyzed' ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 border border-dashed rounded-lg">
          <h3 className="text-lg font-medium">Content not analyzed yet</h3>
          <p className="text-muted-foreground text-center max-w-md">
            This content has not been analyzed yet. Click the "Analyze Content" button to get insights.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Analytics overview */}
          <div className="lg:col-span-2 space-y-6">
            {/* Score Section */}
            <Card>
              <CardHeader>
                <CardTitle>Content Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="relative h-24 w-24">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-3xl font-bold">{overallScore}</span>
                      </div>
                      {/* Circle progress indicator */}
                      <svg className="h-24 w-24 transform -rotate-90" viewBox="0 0 100 100">
                        <circle 
                          cx="50" cy="50" r="45" 
                          fill="none" 
                          stroke="#e2e8f0" 
                          strokeWidth="10"
                        />
                        <circle 
                          cx="50" cy="50" r="45" 
                          fill="none" 
                          stroke={overallScore >= 80 ? "#10b981" : overallScore >= 60 ? "#f59e0b" : "#ef4444"} 
                          strokeWidth="10"
                          strokeDasharray="283"
                          strokeDashoffset={283 - (283 * overallScore) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Overall score</p>
                      <p className="text-sm text-muted-foreground">Last analyzed: {
                        contentPage.last_analyzed_at 
                          ? new Date(contentPage.last_analyzed_at).toLocaleDateString('en-US', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })
                          : 'Not analyzed yet'
                      }</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Implementation</span>
                        <Badge>{implementationPercentage}%</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {implementedCount} of {allSuggestions.length} suggestions implemented
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="border rounded-md p-3 text-center">
                    <p className="text-sm text-muted-foreground">Word Count</p>
                    <p className="text-xl font-semibold">{contentPage.word_count || readabilityAnalysis?.word_count || mockAnalysisSummary.wordCount}</p>
                  </div>
                  <div className="border rounded-md p-3 text-center">
                    <p className="text-sm text-muted-foreground">Reading Time</p>
                    <p className="text-xl font-semibold">{readabilityAnalysis?.reading_time || mockAnalysisSummary.readingTime}</p>
                  </div>
                  <div className="border rounded-md p-3 text-center">
                    <p className="text-sm text-muted-foreground">Readability</p>
                    <p className="text-xl font-semibold">{readabilityAnalysis?.reading_level || "Middle school"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Content Structure Tabs */}
            <Tabs defaultValue="structure">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="structure">Content Structure</TabsTrigger>
                <TabsTrigger value="keywords">Top Keywords</TabsTrigger>
                <TabsTrigger value="links">Links & Media</TabsTrigger>
              </TabsList>
              
              <TabsContent value="structure" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-6">
                      {/* Headings */}
                      <div>
                        <h3 className="text-sm font-medium mb-3">Heading Structure</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">H1 Tags</span>
                            <Badge variant="outline">{mockAnalysisSummary.headingCount.h1}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">H2 Tags</span>
                            <Badge variant="outline">{mockAnalysisSummary.headingCount.h2}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">H3 Tags</span>
                            <Badge variant="outline">{mockAnalysisSummary.headingCount.h3}</Badge>
                          </div>
                        </div>
                      </div>
                      
                      {/* Content Distribution */}
                      <div>
                        <h3 className="text-sm font-medium mb-3">Content Analysis</h3>
                        <div className="flex flex-col gap-3">
                          <div>
                            <p className="text-sm mb-1">Paragraphs per section</p>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: '70%' }}></div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">2-3 paragraphs per section (Good)</p>
                          </div>
                          <div>
                            <p className="text-sm mb-1">Content depth</p>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div className="bg-green-500 h-2.5 rounded-full" style={{ width: '85%' }}></div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Comprehensive coverage (Excellent)</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="keywords" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium mb-3">Keyword Distribution</h3>
                      
                      <div className="space-y-3">
                        {/* Use real keyword data if available, otherwise fall back to mock data */}
                        {keywordAnalysis?.related_keywords 
                          ? keywordAnalysis.related_keywords.map((keyword, index) => (
                              <div key={index} className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm">{keyword}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-500 h-2 rounded-full" 
                                    style={{ width: `${Math.min(((10 - index) / 10) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            ))
                          : mockAnalysisSummary.topKeywords.map((keyword, index) => (
                              <div key={index} className="space-y-1">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm">{keyword.keyword}</span>
                                  <span className="text-xs text-muted-foreground">{keyword.count} mentions</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-500 h-2 rounded-full" 
                                    style={{ width: `${Math.min((keyword.count / 12) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            ))
                        }
                      </div>
                      
                      <div className="pt-4">
                        <h3 className="text-sm font-medium mb-3">Keyword Placement</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {keywordAnalysis?.keyword_placement ? (
                            <>
                              <div className="flex items-center gap-2">
                                <div className={`h-3 w-3 rounded-full ${keywordAnalysis.keyword_placement.title ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-sm">Title</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`h-3 w-3 rounded-full ${keywordAnalysis.keyword_placement.headings ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-sm">H1 Heading</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`h-3 w-3 rounded-full ${keywordAnalysis.keyword_placement.intro ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-sm">First Paragraph</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`h-3 w-3 rounded-full ${keywordAnalysis.keyword_placement.conclusion ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-sm">Conclusion</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2">
                                <div className={`h-3 w-3 rounded-full ${true ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-sm">Title</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`h-3 w-3 rounded-full ${true ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-sm">H1 Heading</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`h-3 w-3 rounded-full ${true ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-sm">First Paragraph</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={`h-3 w-3 rounded-full ${false ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-sm">Meta Description</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="links" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-6">
                      {/* Links */}
                      <div>
                        <h3 className="text-sm font-medium mb-3">Links</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Internal Links</span>
                            <Badge variant="outline">{mockAnalysisSummary.linkCount.internal}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">External Links</span>
                            <Badge variant="outline">{mockAnalysisSummary.linkCount.external}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Total Links</span>
                            <Badge variant="outline">
                              {mockAnalysisSummary.linkCount.internal + mockAnalysisSummary.linkCount.external}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {/* Media */}
                      <div>
                        <h3 className="text-sm font-medium mb-3">Media</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Images</span>
                            <Badge variant="outline">{mockAnalysisSummary.imageCount}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Images with Alt Text</span>
                            <Badge variant="outline">{mockAnalysisSummary.imageCount - 1}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm">Videos</span>
                            <Badge variant="outline">0</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          {/* Right column - Improvement suggestions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Action Items</CardTitle>
                  <Badge>{allSuggestions.filter(s => !s.implemented).length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {allSuggestions.filter(s => !s.implemented).map((suggestion, index) => (
                    <div key={suggestion.id} className="flex gap-3 pb-3 border-b last:border-0">
                      <div className="mt-0.5 text-muted-foreground">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getStatusBadge(suggestion.type)}
                        </div>
                        <p className="text-sm">{suggestion.suggestion}</p>
                        <form action={async () => {
                          'use server';
                          
                          // In a real implementation, we would update the suggestion status
                          // This is just a placeholder since we're using mock data
                          // If we have real suggestions with IDs, we would update them in the database
                          /*
                          if (suggestionsAnalysis.length > 0) {
                            // Real implementation would update the suggestion in the database
                            await ContentPageService.updateContentSuggestion(suggestion.id, true);
                          }
                          */
                          
                          // Redirect to the same page to refresh the data
                          redirect(`/dashboard/projects/${params.id}/content/${params.contentId}/analysis`);
                        }}>
                          <Button variant="outline" size="sm" type="submit" className="mt-1">
                            Mark as Implemented
                          </Button>
                        </form>
                      </div>
                    </div>
                  ))}
                  
                  {allSuggestions.filter(s => !s.implemented).length === 0 && (
                    <div className="text-center py-6">
                      <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
                      <p className="text-muted-foreground">All suggestions implemented! 🎉</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {implementedCount > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Implemented</CardTitle>
                    <Badge variant="outline">{implementedCount}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allSuggestions.filter(s => s.implemented).map((suggestion) => (
                      <div key={suggestion.id} className="flex gap-3 pb-3 border-b last:border-0">
                        <div className="mt-0.5 text-green-500">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(suggestion.type)}
                          </div>
                          <p className="text-sm">{suggestion.suggestion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 