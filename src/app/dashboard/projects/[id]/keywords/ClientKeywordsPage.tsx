'use client';

// Debugging log for page import
console.log('ClientKeywordsPage Module Loaded');

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks';
import keywordAnalyzer from '@/lib/ai/keyword-analyzer';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { 
  Search, 
  TrendingUp, 
  TrendingDown,
  FileText, 
  ArrowUp, 
  ArrowDown, 
  Minus,
  BarChart3,
  AlertTriangle,
  Loader2
} from 'lucide-react';

// Additional debug logging for module initialization
console.log('ClientKeywordsPage Module: Supabase client created');

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Keywords page error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 border border-red-500 rounded-md">
          <h2 className="text-xl font-bold text-red-500 mb-4">Something went wrong</h2>
          <details className="whitespace-pre-wrap text-sm">
            <summary>Error details</summary>
            <pre>{this.state.error && JSON.stringify(this.state.error, null, 2)}</pre>
            <pre>{this.state.errorInfo?.componentStack}</pre>
          </details>
          <button
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface Project {
  id: string;
  website_name: string;
  website_url: string;
  keywords: string[];
  competitors: string[];
}

interface KeywordRanking {
  id: string;
  keyword: string;
  position: number;
  previous_position: number;
  change: number;
  date_checked: string;
}

interface ClientKeywordsPageProps {
  projectId: string;
}

export function ClientKeywordsPage({ projectId }: ClientKeywordsPageProps) {
  // Debug before any hooks are called
  console.log('ClientKeywordsPage component initializing with projectId:', projectId);
  
  const router = useRouter();
  const { getActiveUser } = useAuth();
  const activeUser = getActiveUser();
  console.log('Keywords Page - Auth loaded, user present:', !!activeUser);
  
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [keywordRankings, setKeywordRankings] = useState<KeywordRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedKeyword, setSelectedKeyword] = useState('');
  const [keywordInsights, setKeywordInsights] = useState<any | null>(null);
  const [updatingRankings, setUpdatingRankings] = useState(false);
  const [addingKeyword, setAddingKeyword] = useState(false);
  const [trendInsights, setTrendInsights] = useState<any>(null);
  const [analyzingTrends, setAnalyzingTrends] = useState(false);
  const [selectedKeywordForTrends, setSelectedKeywordForTrends] = useState<string>("");

  console.log('Keywords Page - User authenticated:', !!activeUser);

  // Fetch project details on component mount
  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchKeywords();
    }
  }, [projectId]);

  // Fetch project details
  const fetchProject = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (error) {
        console.error('Error fetching project:', error);
        toast({
          title: 'Error',
          description: 'Failed to load project details. Please try again later.',
          variant: 'destructive',
        });
      } else {
        setProject(data);
      }
    } catch (err) {
      console.error('Error fetching project:', err);
      toast({
        title: 'Unexpected error',
        description: 'An unexpected error occurred while loading project details.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch keywords for this project
  const fetchKeywords = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('keyword_rankings')
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true });
      
      if (error) {
        console.error('Error fetching keywords:', error);
        toast({
          title: 'Error',
          description: 'Failed to load keywords. Please try again later.',
          variant: 'destructive',
        });
      } else {
        setKeywordRankings(data || []);
      }
    } catch (err) {
      console.error('Error fetching keywords:', err);
      toast({
        title: 'Unexpected error',
        description: 'An unexpected error occurred while loading keywords.',
        variant: 'destructive',
      });
      setKeywordRankings([]);
    } finally {
      setLoading(false);
    }
  };

  // Add new keyword
  const addKeyword = async () => {
    if (!newKeyword.trim()) return;
    
    try {
      setAddingKeyword(true);
      
      // Generate a random position between 5 and 50 for demo purposes
      // In a real application, this would come from actual ranking data
      const position = Math.floor(Math.random() * 45) + 5;
      
      const { data, error } = await supabase
        .from('keyword_rankings')
        .insert([
          {
            keyword: newKeyword,
            position: position,
            previous_position: position + Math.floor(Math.random() * 10) - 5, // Random previous position
            change: Math.floor(Math.random() * 10) - 5, // Random change
            date_checked: new Date().toISOString(),
            project_id: projectId
          }
        ])
        .select();
      
      if (error) {
        throw new Error('Failed to add keyword');
      }
      
      toast({
        title: 'Keyword added',
        description: `Added "${newKeyword}" to tracking`,
      });
      
      setNewKeyword('');
      
      // Refresh keywords list
      fetchKeywords();
      
    } catch (err: any) {
      console.error('Error adding keyword:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to add keyword',
        variant: 'destructive',
      });
    } finally {
      setAddingKeyword(false);
    }
  };

  // Analyze keyword
  const analyzeKeyword = async (keyword: string) => {
    try {
      setAnalyzing(true);
      setSelectedKeyword(keyword);
      
      // Get the project details for the industry context
      if (!project) {
        throw new Error('Project details not available');
      }
      
      // Using the website name as a simple industry identifier
      const industry = project.website_name;
      
      // Call the API endpoint instead of directly using the keyword analyzer
      const response = await fetch('/api/keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          industry,
          action: 'research'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze keyword');
      }
      
      const data = await response.json();
      setKeywordInsights(data.data);
      
      toast({
        title: 'Keyword analyzed',
        description: `Analysis complete for "${keyword}"`,
      });
      
    } catch (err: any) {
      console.error('Error analyzing keyword:', err);
      toast({
        title: 'Analysis failed',
        description: err.message || 'Failed to analyze keyword',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // Update keyword rankings
  const updateRankings = async () => {
    try {
      setUpdatingRankings(true);
      
      // In a real application, this would call a service to fetch current rankings
      // For demo purposes, we're just simulating random changes
      
      const updatedRankings = keywordRankings.map(keyword => {
        const previousPosition = keyword.position;
        const change = Math.floor(Math.random() * 11) - 5; // Random change between -5 and +5
        return {
          ...keyword,
          previous_position: previousPosition,
          position: Math.max(1, previousPosition - change), // Ensure position doesn't go below 1
          change: change,
          date_checked: new Date().toISOString()
        };
      });
      
      // Update all rankings in one batch
      const { error } = await supabase
        .from('keyword_rankings')
        .upsert(updatedRankings);
      
      if (error) {
        throw new Error('Failed to update rankings');
      }
      
      // Refresh keywords list
      fetchKeywords();
      
      toast({
        title: 'Rankings updated',
        description: 'Keyword positions have been updated',
      });
      
    } catch (err: any) {
      console.error('Error updating rankings:', err);
      toast({
        title: 'Update failed',
        description: err.message || 'Failed to update rankings',
        variant: 'destructive',
      });
    } finally {
      setUpdatingRankings(false);
    }
  };

  // Delete keyword
  const deleteKeyword = async (keywordId: string) => {
    try {
      const { error } = await supabase
        .from('keyword_rankings')
        .delete()
        .eq('id', keywordId);
      
      if (error) {
        throw new Error('Failed to delete keyword');
      }
      
      // Refresh keywords list
      fetchKeywords();
      
      toast({
        title: 'Keyword deleted',
        description: 'Keyword has been removed from tracking',
      });
      
    } catch (err: any) {
      console.error('Error deleting keyword:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to delete keyword',
        variant: 'destructive',
      });
    }
  };

  // Calculate average position
  const calculateAveragePosition = () => {
    if (keywordRankings.length === 0) return 0;
    const sum = keywordRankings.reduce((acc, kw) => acc + kw.position, 0);
    return (sum / keywordRankings.length).toFixed(1);
  };

  // Analyze trends
  const analyzeTrends = async (keyword: string) => {
    try {
      setAnalyzingTrends(true);
      setSelectedKeywordForTrends(keyword);
      
      // Get the project details for the industry context
      if (!project) {
        throw new Error('Project details not available');
      }
      
      // Using the website name as a simple industry identifier
      const industry = project.website_name;
      
      // Call the API endpoint
      const response = await fetch('/api/keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          industry,
          action: 'trends'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze trends');
      }
      
      const data = await response.json();
      setTrendInsights(data.data);
      
      toast({
        title: 'Trend analysis complete',
        description: `Trend analysis for "${keyword}" is ready`,
      });
      
    } catch (err: any) {
      console.error('Error analyzing trends:', err);
      toast({
        title: 'Trend analysis failed',
        description: err.message || 'Failed to analyze trends',
        variant: 'destructive',
      });
    } finally {
      setAnalyzingTrends(false);
    }
  };
  
  return (
    <ErrorBoundary>
      <div className="p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col space-y-6">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-1">
                  {loading ? 'Loading...' : project?.website_name || 'Project Keywords'}
                </h1>
                {project && (
                  <p className="text-muted-foreground">
                    {project.website_url}
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={updateRankings} 
                  disabled={updatingRankings || loading}
                >
                  {updatingRankings ? 'Updating...' : 'Update Rankings'}
                </Button>
                <Button onClick={() => router.push(`/dashboard/projects/${projectId}`)}>
                  Back to Project
                </Button>
              </div>
            </div>
            
            {/* Stats cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Keywords Tracked</CardTitle>
                  <Search className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{keywordRankings.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {keywordRankings.length === 0 ? 'No keywords yet' : `${keywordRankings.filter(k => k.position <= 10).length} in top 10`}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Position</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{calculateAveragePosition()}</div>
                  <p className="text-xs text-muted-foreground">
                    {keywordRankings.length === 0 ? 'No data available' : 'Current average'}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Visibility Trend</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {keywordRankings.length === 0 ? 'N/A' : 
                      keywordRankings.reduce((acc, kw) => acc + kw.change, 0) > 0 ? 
                        'Improving' : 
                        keywordRankings.reduce((acc, kw) => acc + kw.change, 0) < 0 ? 
                          'Declining' : 
                          'Stable'
                    }
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Based on recent changes
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Add keyword */}
            <Card>
              <CardHeader>
                <CardTitle>Add Keyword</CardTitle>
                <CardDescription>
                  Track a new keyword for this project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter keyword to track..."
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    disabled={addingKeyword}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newKeyword.trim()) {
                        addKeyword();
                      }
                    }}
                  />
                  <Button 
                    onClick={addKeyword} 
                    disabled={!newKeyword.trim() || addingKeyword}
                  >
                    {addingKeyword ? 'Adding...' : 'Add Keyword'}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Tabs for different views */}
            <Tabs defaultValue="rankings" className="space-y-4">
              <TabsList>
                <TabsTrigger value="rankings">Rankings</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
              </TabsList>
              
              {/* Rankings tab */}
              <TabsContent value="rankings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Keyword Rankings</CardTitle>
                    <CardDescription>Current positions for tracked keywords</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="py-6 text-center">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p>Loading keywords...</p>
                      </div>
                    ) : keywordRankings.length === 0 ? (
                      <div className="py-10 text-center border border-dashed rounded-md">
                        <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                        <h3 className="text-lg font-medium mb-1">No keywords tracked yet</h3>
                        <p className="text-muted-foreground mb-4">Add your first keyword to start tracking its position</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {keywordRankings.map((keyword) => (
                          <div key={keyword.id} className="flex items-center justify-between border-b pb-3">
                            <div className="space-y-1">
                              <p className="text-sm font-medium leading-none">
                                {keyword.keyword}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Position {keyword.position}
                              </p>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className={`flex items-center ${
                                keyword.change > 0 
                                  ? 'text-green-500' 
                                  : keyword.change < 0 
                                    ? 'text-red-500' 
                                    : 'text-gray-500'
                              }`}>
                                {keyword.change > 0 
                                  ? <ArrowUp className="h-4 w-4 mr-1" /> 
                                  : keyword.change < 0 
                                    ? <ArrowDown className="h-4 w-4 mr-1" /> 
                                    : <Minus className="h-4 w-4 mr-1" />}
                                <span>{Math.abs(keyword.change)}</span>
                              </div>
                              <div className="flex space-x-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => analyzeKeyword(keyword.keyword)}
                                  disabled={analyzing && selectedKeyword === keyword.keyword}
                                >
                                  {analyzing && selectedKeyword === keyword.keyword ? 'Analyzing...' : 'Analyze'}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => deleteKeyword(keyword.id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Analysis tab */}
              <TabsContent value="analysis">
                <Card>
                  <CardHeader>
                    <CardTitle>Keyword Analysis</CardTitle>
                    <CardDescription>
                      {selectedKeyword 
                        ? `Detailed insights for "${selectedKeyword}"` 
                        : 'Select a keyword to analyze from the Rankings tab'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analyzing ? (
                      <div className="py-10 text-center">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p>Analyzing keyword data...</p>
                      </div>
                    ) : !selectedKeyword || !keywordInsights ? (
                      <div className="py-10 text-center border border-dashed rounded-md">
                        <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                        <h3 className="text-lg font-medium mb-1">No analysis available</h3>
                        <p className="text-muted-foreground">Select a keyword from the Rankings tab and click "Analyze"</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-medium mb-2">Related Keywords</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {keywordInsights.relatedKeywords?.slice(0, 6).map((kw: any, i: number) => (
                              <div key={i} className="border rounded-md p-3">
                                <p className="font-medium">{kw.keyword}</p>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                  <span>Volume: {kw.searchVolume}</span>
                                  <span>Difficulty: {kw.difficulty}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-medium mb-2">Content Ideas</h3>
                          <div className="space-y-2">
                            {keywordInsights.contentIdeas?.slice(0, 3).map((idea: any, i: number) => (
                              <div key={i} className="border rounded-md p-3">
                                <p className="font-medium">{idea.title}</p>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                  <span>Format: {idea.format}</span>
                                  <span>Relevance: {idea.topicRelevance}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-medium mb-2">Strategy</h3>
                          <Card className="bg-muted/50">
                            <CardContent className="pt-4">
                              <p>{keywordInsights.recommendedStrategy}</p>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Trends tab */}
              <TabsContent value="trends">
                <Card>
                  <CardHeader>
                    <CardTitle>Keyword Trends</CardTitle>
                    <CardDescription>Historical performance and predictions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!selectedKeyword ? (
                      <div className="py-10 text-center border border-dashed rounded-md">
                        <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                        <h3 className="text-lg font-medium mb-1">Select a keyword first</h3>
                        <p className="text-muted-foreground mb-4">
                          Choose a keyword from the list to analyze its trends
                        </p>
                      </div>
                    ) : analyzingTrends ? (
                      <div className="py-10 text-center">
                        <Loader2 className="h-10 w-10 text-muted-foreground mx-auto mb-3 animate-spin" />
                        <h3 className="text-lg font-medium mb-1">Analyzing trends</h3>
                        <p className="text-muted-foreground">
                          This may take a moment...
                        </p>
                      </div>
                    ) : trendInsights ? (
                      <div className="space-y-6">
                        {/* Data Source Indicator */}
                        <div className="text-right text-sm text-muted-foreground">
                          <span className="inline-flex items-center">
                            <span className={`w-2 h-2 rounded-full mr-2 ${trendInsights.dataSource === 'api' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                            Data Source: {trendInsights.dataSource === 'api' ? 'External API' : 'AI Analysis'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="border rounded-md p-4">
                            <h3 className="font-medium mb-2">Trend Direction</h3>
                            <div className="flex items-center">
                              {trendInsights.trendDirection === 'Increasing' ? (
                                <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
                              ) : trendInsights.trendDirection === 'Decreasing' ? (
                                <TrendingDown className="h-5 w-5 text-red-500 mr-2" />
                              ) : (
                                <Minus className="h-5 w-5 text-amber-500 mr-2" />
                              )}
                              <span>{trendInsights.trendDirection}</span>
                            </div>
                          </div>
                          <div className="border rounded-md p-4">
                            <h3 className="font-medium mb-2">Seasonality</h3>
                            <p>{trendInsights.seasonality}</p>
                          </div>
                        </div>
                        
                        <div className="border rounded-md p-4">
                          <h3 className="font-medium mb-3">Competitive Pressure</h3>
                          <p>{trendInsights.competitivePressure}</p>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-medium mb-3">Future Projections</h3>
                          <div className="space-y-3">
                            <div className="border rounded-md p-4">
                              <h4 className="font-medium mb-1">Short-term (1-3 months)</h4>
                              <p>{trendInsights.futureProjections.shortTerm}</p>
                            </div>
                            <div className="border rounded-md p-4">
                              <h4 className="font-medium mb-1">Long-term (6-12 months)</h4>
                              <p>{trendInsights.futureProjections.longTerm}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-medium mb-3">Action Recommendations</h3>
                          <Card className="bg-muted/50">
                            <CardContent className="pt-4">
                              <p>{trendInsights.actionRecommendations}</p>
                            </CardContent>
                          </Card>
                        </div>
                        
                        {/* Historical Data Visualization */}
                        {trendInsights.historicalData && trendInsights.historicalData.length > 0 && (
                          <div>
                            <h3 className="text-lg font-medium mb-3">Historical Data</h3>
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr className="bg-muted/50">
                                    <th className="p-2 text-left">Month</th>
                                    <th className="p-2 text-left">Position</th>
                                    <th className="p-2 text-left">Search Volume</th>
                                    <th className="p-2 text-left">Competition</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {trendInsights.historicalData.map((data: any, i: number) => (
                                    <tr key={i} className="border-b">
                                      <td className="p-2">{data.month}</td>
                                      <td className="p-2">{data.position}</td>
                                      <td className="p-2">{data.searchVolume}</td>
                                      <td className="p-2">{data.competition}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        
                        {/* Add button to re-analyze trends */}
                        <div className="flex justify-end">
                          <Button onClick={() => analyzeTrends(selectedKeyword)}>
                            Re-analyze Trends
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-10 text-center border border-dashed rounded-md">
                        <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                        <h3 className="text-lg font-medium mb-1">Trend analysis available</h3>
                        <p className="text-muted-foreground mb-4">
                          Analyze trends for "{selectedKeyword}"
                        </p>
                        <Button onClick={() => analyzeTrends(selectedKeyword)}>
                          Analyze Trends
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      </div>
    </ErrorBoundary>
  );
} 