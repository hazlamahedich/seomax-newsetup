'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowRight, 
  BarChart3, 
  ExternalLink, 
  FileText, 
  Link2, 
  Search, 
  Share2, 
  Zap,
  Lightbulb,
  Globe
} from "lucide-react";

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
  created_at: string;
}

interface KeywordRanking {
  id: string;
  keyword: string;
  position: number;
  previous_position: number;
  change: number;
  date_checked: string;
}

interface SeoRecommendation {
  id: string;
  issue_type: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'resolved';
}

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [keywordRankings, setKeywordRankings] = useState<KeywordRanking[]>([]);
  const [recommendations, setRecommendations] = useState<SeoRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageLoaded, setPageLoaded] = useState(false);

  // Demo metrics
  const [seoScore, setSeoScore] = useState(67);
  const [trafficData, setTrafficData] = useState({
    organic: 892,
    direct: 356,
    referral: 213,
    social: 157,
    paid: 78
  });

  const projectId = params?.id as string;

  useEffect(() => {
    if (projectId && user) {
      fetchProjectData();
    }
  }, [projectId, user]);

  // Set page as loaded after initial data fetch
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setPageLoaded(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      
      // Fetch project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (projectError) {
        console.error('Error fetching project:', projectError);
        return;
      }
      
      // Fetch keyword rankings
      const { data: keywordsData, error: keywordsError } = await supabase
        .from('keyword_rankings')
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true });
        
      if (keywordsError) {
        console.error('Error fetching keywords:', keywordsError);
      }
      
      // Fetch SEO recommendations
      const { data: recommendationsData, error: recommendationsError } = await supabase
        .from('seo_recommendations')
        .select('*')
        .eq('project_id', projectId)
        .order('priority', { ascending: false });
        
      if (recommendationsError) {
        console.error('Error fetching recommendations:', recommendationsError);
      }
      
      // Update state with fetched data
      setProject(projectData);
      setKeywordRankings(keywordsData || []);
      setRecommendations(recommendationsData || []);
      
      // Calculate SEO score based on recommendations and rankings
      if (recommendationsData) {
        calculateSeoScore(recommendationsData, keywordsData || []);
      }
      
    } catch (err) {
      console.error('Error fetching project data:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateSeoScore = (recommendations: SeoRecommendation[], keywords: KeywordRanking[]) => {
    // Base score
    let score = 70;
    
    // Deduct points for high priority issues
    const highPriorityCount = recommendations.filter(r => r.priority === 'high' && r.status !== 'resolved').length;
    score -= highPriorityCount * 5;
    
    // Deduct less for medium priority issues
    const mediumPriorityCount = recommendations.filter(r => r.priority === 'medium' && r.status !== 'resolved').length;
    score -= mediumPriorityCount * 2;
    
    // Give small boost for keywords ranking in top 10
    const topRankingKeywords = keywords.filter(k => k.position > 0 && k.position <= 10).length;
    score += topRankingKeywords * 2;
    
    // Ensure score stays within bounds
    score = Math.max(0, Math.min(100, score));
    
    setSeoScore(score);
  };

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4 }
    }
  };
  
  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project?.website_name}</h1>
          <p className="text-muted-foreground">
            {project?.website_url} · Added on {new Date(project?.created_at || '').toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={project?.website_url || ''} target="_blank" rel="noopener noreferrer">
              <Globe className="mr-2 h-4 w-4" />
              Visit Site
            </Link>
          </Button>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">SEO Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{seoScore}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {recommendations?.length || 0} recommendations
            </p>
            <div className="mt-3 h-2 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  seoScore > 70 ? 'bg-green-500' : 
                  seoScore > 50 ? 'bg-blue-500' : 
                  seoScore > 30 ? 'bg-amber-500' : 
                  'bg-red-500'
                }`}
                style={{ width: `${seoScore}%` }}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rankings Monitor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex">
              <div className="text-2xl font-bold mr-2">{keywordRankings?.length || 0}</div>
              <div className="flex flex-col justify-center">
                <span className="text-xs text-muted-foreground">keywords</span>
                <span className="text-xs text-green-500">
                  {keywordRankings?.filter(k => k.position <= 10).length || 0} in top 10
                </span>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-5 gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full ${
                    i < 3 ? 'bg-green-500' :
                    i < 7 ? 'bg-amber-500/50' :
                    'bg-muted'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Visitors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">648</div>
            <p className="text-xs text-green-500 mt-1">
              +12% from last month
            </p>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {[20, 40, 30, 25, 45, 35, 55].map((height, i) => (
                <div key={i} className="bg-primary/10 rounded-sm flex items-end h-8">
                  <div 
                    className="bg-primary rounded-sm w-full"
                    style={{ height: `${height}%` }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    
      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="keywords">
            <Search className="mr-2 h-4 w-4" />
            Keywords
          </TabsTrigger>
          <TabsTrigger value="content">
            <FileText className="mr-2 h-4 w-4" />
            Content
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <Lightbulb className="mr-2 h-4 w-4" />
            Recommendations
          </TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <motion.div 
            className="grid gap-6 md:grid-cols-2"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={fadeIn}>
              <Card>
                <CardHeader>
                  <CardTitle>Traffic Sources</CardTitle>
                  <CardDescription>
                    Breakdown of traffic by source
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {Object.entries(trafficData).map(([source, value]) => (
                      <div key={source} className="flex items-center">
                        <div className="w-36 font-medium capitalize">{source}</div>
                        <div className="flex-1">
                          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div 
                              className={
                                source === 'organic' ? 'bg-green-500' :
                                source === 'direct' ? 'bg-blue-500' :
                                source === 'referral' ? 'bg-purple-500' :
                                source === 'social' ? 'bg-pink-500' :
                                'bg-orange-500'
                              }
                              style={{ 
                                width: `${(value / (trafficData.organic + trafficData.direct + trafficData.referral + trafficData.social + trafficData.paid)) * 100}%`,
                                height: '100%'
                              }}
                            />
                          </div>
                        </div>
                        <div className="w-16 text-right">{value}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={fadeIn}>
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                  <CardDescription>
                    Key website performance indicators
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium">Page Speed Score</div>
                        <div className="text-muted-foreground text-xs">Mobile</div>
                      </div>
                      <div className="text-2xl font-bold">76/100</div>
                    </div>
                    <div className="h-[1px] bg-gray-100" />
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium">Core Web Vitals</div>
                        <div className="text-muted-foreground text-xs">Pass rate</div>
                      </div>
                      <div className="text-2xl font-bold">67%</div>
                    </div>
                    <div className="h-[1px] bg-gray-100" />
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium">Indexed Pages</div>
                        <div className="text-muted-foreground text-xs">Google Search Console</div>
                      </div>
                      <div className="text-2xl font-bold">42</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            
            <motion.div variants={fadeIn} className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Key Actions</CardTitle>
                  <CardDescription>
                    Recommended next steps to improve your SEO
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Button variant="outline" className="h-auto py-4 px-4 justify-start" asChild>
                      <Link href={`/dashboard/projects/${projectId}/keywords`}>
                        <div className="flex flex-col items-start text-left">
                          <div className="flex items-center mb-2">
                            <Search className="mr-2 h-5 w-5 text-primary" />
                            <span className="font-medium">Keyword Research</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Find new keyword opportunities and analyze your current rankings
                          </p>
                        </div>
                      </Link>
                    </Button>
                    
                    <Button variant="outline" className="h-auto py-4 px-4 justify-start">
                      <div className="flex flex-col items-start text-left">
                        <div className="flex items-center mb-2">
                          <FileText className="mr-2 h-5 w-5 text-primary" />
                          <span className="font-medium">Content Analysis</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Optimize your content with AI-powered recommendations
                        </p>
                      </div>
                    </Button>
                    
                    <Button variant="outline" className="h-auto py-4 px-4 justify-start">
                      <div className="flex flex-col items-start text-left">
                        <div className="flex items-center mb-2">
                          <Link2 className="mr-2 h-5 w-5 text-primary" />
                          <span className="font-medium">Backlink Analysis</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Track your backlinks and find new opportunities
                        </p>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </TabsContent>
        
        <TabsContent value="keywords">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Keyword Rankings</CardTitle>
                  <CardDescription>
                    Track your performance for target keywords
                  </CardDescription>
                </div>
                <Button asChild>
                  <Link href={`/dashboard/projects/${projectId}/keywords`}>
                    View All <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {keywordRankings.length === 0 ? (
                <div className="text-center py-8">
                  <Search className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                  <h3 className="mt-4 text-lg font-medium">No keywords added yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Start tracking your target keywords to see your rankings
                  </p>
                  <Button className="mt-4" asChild>
                    <Link href={`/dashboard/projects/${projectId}/keywords`}>
                      <Search className="mr-2 h-4 w-4" /> Add Keywords
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="pb-2 text-left font-medium">Keyword</th>
                        <th className="pb-2 text-right font-medium">Position</th>
                        <th className="pb-2 text-right font-medium">Change</th>
                        <th className="pb-2 text-right font-medium">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keywordRankings.slice(0, 5).map((ranking) => (
                        <tr key={ranking.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3 text-left">{ranking.keyword}</td>
                          <td className="py-3 text-right">
                            {ranking.position > 0 ? ranking.position : 'N/A'}
                          </td>
                          <td className="py-3 text-right">
                            {ranking.change > 0 ? (
                              <span className="text-green-500">↑{ranking.change}</span>
                            ) : ranking.change < 0 ? (
                              <span className="text-red-500">↓{Math.abs(ranking.change)}</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 text-right text-muted-foreground text-sm">
                            {new Date(ranking.date_checked).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="content" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Analysis</CardTitle>
              <CardDescription>
                Analyze and optimize your content for better search rankings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Use our AI-powered content analyzer to improve your content's SEO performance. 
                  Analyze keyword usage, readability, and get actionable recommendations.
                </p>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="flex flex-col">
                    <span className="text-lg font-medium">Content Optimizer</span>
                    <span className="text-sm text-muted-foreground">
                      AI-powered content optimization for better rankings
                    </span>
                  </div>
                  <Button asChild>
                    <Link href={`/dashboard/projects/${projectId}/content`}>
                      <FileText className="mr-2 h-4 w-4" />
                      Analyze Content
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle>SEO Recommendations</CardTitle>
              <CardDescription>
                Issues and opportunities to improve your SEO
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recommendations.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                  <h3 className="mt-4 text-lg font-medium">No recommendations yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Run a site audit to get personalized recommendations
                  </p>
                  <Button className="mt-4">
                    Run Site Audit
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendations.slice(0, 5).map((recommendation) => (
                    <div key={recommendation.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center">
                            <span 
                              className={`inline-block w-2 h-2 rounded-full mr-2 ${
                                recommendation.priority === 'high' ? 'bg-red-500' :
                                recommendation.priority === 'medium' ? 'bg-amber-500' :
                                'bg-blue-500'
                              }`}
                            />
                            <span className="font-medium">{recommendation.issue_type}</span>
                            <span 
                              className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                                recommendation.status === 'open' ? 'bg-gray-100 text-gray-800' :
                                recommendation.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }`}
                            >
                              {recommendation.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="mt-2 text-sm">{recommendation.description}</p>
                        </div>
                        <Button variant="outline" size="sm">Fix</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="competitors">
          <Card>
            <CardHeader>
              <CardTitle>Competitor Analysis</CardTitle>
              <CardDescription>
                Track and compare your performance against competitors
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(!project?.competitors || project.competitors.length === 0) ? (
                <div className="text-center py-8">
                  <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                  <h3 className="mt-4 text-lg font-medium">No competitors added yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Add competitor websites to compare your performance
                  </p>
                  <Button className="mt-4">
                    <Share2 className="mr-2 h-4 w-4" /> Add Competitors
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {project.competitors.map((competitor, index) => (
                    <div key={index} className="flex items-center justify-between border rounded-lg p-4">
                      <div>
                        <div className="font-medium">{competitor}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Domain Authority: 42 • Ranking Keywords: 1,245
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Analyze
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 