'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@supabase/supabase-js';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import keywordAnalyzer from '@/lib/ai/keyword-analyzer';

// Create a Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

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

export default function KeywordsPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [keywordRankings, setKeywordRankings] = useState<KeywordRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [selectedKeyword, setSelectedKeyword] = useState('');
  const [keywordInsights, setKeywordInsights] = useState<any | null>(null);

  const projectId = params?.id as string;

  useEffect(() => {
    if (projectId && user) {
      fetchProject();
      fetchKeywordRankings();
    }
  }, [projectId, user]);

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        console.error('Error fetching project:', error);
      } else {
        setProject(data);
      }
    } catch (err) {
      console.error('Error fetching project:', err);
    }
  };

  const fetchKeywordRankings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('keyword_rankings')
        .select('*')
        .eq('project_id', projectId);

      if (error) {
        console.error('Error fetching keyword rankings:', error);
      } else {
        setKeywordRankings(data || []);
      }
    } catch (err) {
      console.error('Error fetching keyword rankings:', err);
    } finally {
      setLoading(false);
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.trim() || !project) return;

    try {
      // First update the project keywords array
      const updatedKeywords = [...(project.keywords || []), newKeyword.trim()];
      
      const { error: updateError } = await supabase
        .from('projects')
        .update({ keywords: updatedKeywords })
        .eq('id', projectId);

      if (updateError) {
        console.error('Error updating project keywords:', updateError);
        return;
      }

      // Then create a keyword ranking entry
      const { error: rankingError } = await supabase
        .from('keyword_rankings')
        .insert([
          {
            project_id: projectId,
            keyword: newKeyword.trim(),
            position: 0, // Will be updated later when rankings are checked
            previous_position: 0,
            change: 0
          }
        ]);

      if (rankingError) {
        console.error('Error adding keyword ranking:', rankingError);
        return;
      }

      // Update local state
      setProject({ ...project, keywords: updatedKeywords });
      setNewKeyword('');
      fetchKeywordRankings(); // Refresh the keyword rankings
    } catch (err) {
      console.error('Error adding keyword:', err);
    }
  };

  const analyzeKeyword = async (keyword: string) => {
    if (!keyword || !project) return;
    
    try {
      setAnalyzing(true);
      setSelectedKeyword(keyword);
      
      // Get website niche from the project name or URL
      const niche = project.website_name.split(' ')[0] || '';
      
      // Get comprehensive analysis using the AI service
      const analysis = await keywordAnalyzer.getComprehensiveAnalysis(
        keyword,
        niche
      );
      
      setKeywordInsights(analysis);
    } catch (err) {
      console.error('Error analyzing keyword:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const getChangeClass = (change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return '↑';
    if (change < 0) return '↓';
    return '-';
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project?.website_name}: Keywords</h1>
          <p className="text-muted-foreground">Track and analyze your target keywords</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/projects/${projectId}`}>
            Back to Project
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Target Keywords</CardTitle>
              <CardDescription>
                Add and track important keywords for your website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex mb-4">
                <Input 
                  type="text" 
                  placeholder="Add a keyword" 
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  className="mr-2"
                  onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                />
                <Button onClick={addKeyword}>Add</Button>
              </div>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {keywordRankings.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No keywords added yet. Add your first keyword to start tracking.
                  </p>
                ) : (
                  keywordRankings.map((ranking, index) => (
                    <motion.div
                      key={ranking.id || index}
                      initial="hidden"
                      animate="visible"
                      variants={fadeInUp}
                      custom={index}
                      className={`p-3 border rounded-md cursor-pointer hover:bg-gray-50 ${selectedKeyword === ranking.keyword ? 'border-primary bg-primary/5' : ''}`}
                      onClick={() => analyzeKeyword(ranking.keyword)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{ranking.keyword}</span>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm">Pos: {ranking.position || 'N/A'}</span>
                          {ranking.change !== 0 && (
                            <span className={`text-xs ${getChangeClass(ranking.change)}`}>
                              {getChangeIcon(ranking.change)} {Math.abs(ranking.change)}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="h-full">
            {!selectedKeyword ? (
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-2">Select a keyword to analyze</h3>
                  <p className="text-muted-foreground">
                    Click on a keyword from the list to get AI-powered insights
                  </p>
                </div>
              </div>
            ) : analyzing ? (
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="inline-block w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3"></div>
                  <h3 className="text-lg font-medium mb-2">Analyzing "{selectedKeyword}"</h3>
                  <p className="text-muted-foreground">
                    Our AI is generating insights for your keyword
                  </p>
                </div>
              </div>
            ) : (
              <>
                <CardHeader>
                  <CardTitle>Keyword Analysis: {selectedKeyword}</CardTitle>
                  <CardDescription>
                    AI-powered insights to help optimize for this keyword
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="overview">
                    <TabsList className="mb-4">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="competition">Competition</TabsTrigger>
                      <TabsTrigger value="content">Content Ideas</TabsTrigger>
                      <TabsTrigger value="trends">Trends</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="overview" className="space-y-4">
                      {keywordInsights?.research && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <Card>
                              <CardHeader className="p-4">
                                <CardTitle className="text-sm">Search Intent</CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 pt-0">
                                <p className="text-base">{keywordInsights.research.main_keyword.search_intent}</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader className="p-4">
                                <CardTitle className="text-sm">Estimated Difficulty</CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 pt-0">
                                <p className="text-base">{keywordInsights.research.main_keyword.estimated_difficulty}</p>
                              </CardContent>
                            </Card>
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-medium mb-3">Related Keywords</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {keywordInsights.research.related_keywords.slice(0, 8).map((kw: any, idx: number) => (
                                <div key={idx} className="border rounded-md p-3">
                                  <div className="font-medium">{kw.keyword}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {kw.search_intent} • Difficulty: {kw.estimated_difficulty}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-medium mb-2">Analysis Summary</h3>
                            <p>{keywordInsights.research.analysis_summary}</p>
                          </div>
                        </>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="competition">
                      {keywordInsights?.competition ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <Card>
                              <CardHeader className="p-4">
                                <CardTitle className="text-sm">Difficulty Score</CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 pt-0">
                                <p className="text-xl font-bold">{keywordInsights.competition.competition_analysis.difficulty_score}/10</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader className="p-4">
                                <CardTitle className="text-sm">Top Competitors</CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 pt-0 text-sm">
                                <ul className="list-disc list-inside">
                                  {keywordInsights.competition.competition_analysis.top_competitors.slice(0, 3).map((comp: string, idx: number) => (
                                    <li key={idx}>{comp}</li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-medium mb-3">Content Gaps</h3>
                            <div className="space-y-2">
                              {keywordInsights.competition.content_gaps.map((gap: any, idx: number) => (
                                <Card key={idx}>
                                  <CardHeader className="p-4">
                                    <CardTitle className="text-base">{gap.topic}</CardTitle>
                                    <CardDescription>Opportunity: {gap.opportunity_level}</CardDescription>
                                  </CardHeader>
                                  <CardContent className="p-4 pt-0">
                                    <div className="text-sm">
                                      <strong>Keywords: </strong>
                                      {gap.suggested_keywords.join(', ')}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-6">
                          <p>Competition analysis is available when you add competitor websites.</p>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="content">
                      {keywordInsights?.research && (
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-lg font-medium mb-3">Content Ideas</h3>
                            <div className="space-y-3">
                              {keywordInsights.research.content_ideas.map((idea: any, idx: number) => (
                                <Card key={idx}>
                                  <CardHeader className="p-4">
                                    <CardTitle className="text-base">{idea.title}</CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-4 pt-0">
                                    <p className="text-sm mb-2">{idea.description}</p>
                                    <div className="flex flex-wrap gap-1">
                                      {idea.target_keywords.map((kw: string, kidx: number) => (
                                        <span key={kidx} className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                                          {kw}
                                        </span>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-medium mb-3">Keyword Clusters</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {keywordInsights.research.keyword_clusters.map((cluster: any, idx: number) => (
                                <Card key={idx}>
                                  <CardHeader className="p-4">
                                    <CardTitle className="text-base">{cluster.cluster_name}</CardTitle>
                                  </CardHeader>
                                  <CardContent className="p-4 pt-0">
                                    <div className="text-sm flex flex-wrap gap-1">
                                      {cluster.keywords.map((kw: string, kidx: number) => (
                                        <span key={kidx} className="inline-block px-2 py-1 bg-gray-100 text-xs rounded-full">
                                          {kw}
                                        </span>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                    
                    <TabsContent value="trends">
                      {keywordInsights?.trends && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                              <CardHeader className="p-4">
                                <CardTitle className="text-sm">Trend Direction</CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 pt-0">
                                <p className="text-base">{keywordInsights.trends.trend_analysis.trend_direction}</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader className="p-4">
                                <CardTitle className="text-sm">Estimated Growth</CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 pt-0">
                                <p className="text-base">{keywordInsights.trends.trend_analysis.estimated_growth}</p>
                              </CardContent>
                            </Card>
                            <Card>
                              <CardHeader className="p-4">
                                <CardTitle className="text-sm">Seasonality</CardTitle>
                              </CardHeader>
                              <CardContent className="p-4 pt-0 text-sm">
                                <ul className="list-disc list-inside">
                                  {keywordInsights.trends.trend_analysis.seasonal_patterns.map((pattern: string, idx: number) => (
                                    <li key={idx}>{pattern}</li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-medium mb-3">Emerging Terms</h3>
                            <div className="flex flex-wrap gap-2">
                              {keywordInsights.trends.emerging_terms.map((term: string, idx: number) => (
                                <span key={idx} className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                                  {term}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-medium mb-3">Industry Shifts</h3>
                            <ul className="list-disc list-inside space-y-1">
                              {keywordInsights.trends.industry_shifts.map((shift: string, idx: number) => (
                                <li key={idx} className="text-sm">{shift}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-medium mb-2">Recommendations</h3>
                            <ul className="list-disc list-inside space-y-1">
                              {keywordInsights.trends.recommendations.map((rec: string, idx: number) => (
                                <li key={idx} className="text-sm">{rec}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
} 