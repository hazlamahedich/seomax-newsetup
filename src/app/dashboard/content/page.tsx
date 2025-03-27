'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, FileText, Layers, BarChart2, Book, PenTool, 
  LineChart, PieChart, Lightbulb, Filter, SortAsc, SortDesc, 
  RefreshCw, Plus, Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ContentPagesList } from '@/components/content/ContentPagesList';
import { ContentEditor } from '@/components/content/ContentEditor';
import { TopicClusterMap } from '@/components/content/TopicClusterMap';
import { ContentBriefGenerator } from '@/components/content/ContentBrief';
import { ContentAnalyzer } from '@/components/content/ContentAnalyzer';
import { ContentOptimizer } from '@/components/content/ContentOptimizer';
import { ContentPerformance } from '@/components/content/ContentPerformance';
import { ContentGapAnalysis } from '@/components/content/ContentGapAnalysis';
import { ProjectService } from '@/lib/services/project-service';
import { ContentPageService } from '@/lib/services/content-service';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useSession } from 'next-auth/react';
import { createClient } from '@/lib/supabase/client';

export default function ContentDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdFromUrl = searchParams.get('projectId');
  const { data: session, status } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [contentPages, setContentPages] = useState<any[]>([]);
  const [filteredPages, setFilteredPages] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('content-pages');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isViewingPerformance, setIsViewingPerformance] = useState(false);
  const [isAnalyzingGap, setIsAnalyzingGap] = useState(false);
  const [contentMetrics, setContentMetrics] = useState({
    totalPages: 0,
    analyzedPages: 0,
    averageSeoScore: 0,
    averageReadabilityScore: 0,
    totalWordCount: 0
  });

  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
  }, []);

  // Check authentication status
  useEffect(() => {
    console.log('[ContentDashboard] Checking auth', { 
      mode: process.env.NODE_ENV,
      status,
      hasSession: !!session,
      userId: session?.user?.id,
      email: session?.user?.email
    });

    // Development bypass - only for local testing
    if (process.env.NODE_ENV === 'development') {
      console.log('[ContentDashboard] Development mode: bypassing auth check');
      loadProjects();
      return;
    }

    if (status === 'loading') {
      console.log('[ContentDashboard] Auth status: loading');
      return;
    }
    
    console.log('[ContentDashboard] Auth status:', status);
    
    if (status === 'unauthenticated') {
      console.log('[ContentDashboard] User is not authenticated, redirecting to login');
      router.push('/login');
      return;
    }
    
    // If authenticated, proceed with loading data
    loadProjects();
  }, [status, router, session]);

  useEffect(() => {
    if (selectedProjectId) {
      loadContentPages(selectedProjectId);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (projectIdFromUrl && projects.some(project => project.id === projectIdFromUrl)) {
      setSelectedProjectId(projectIdFromUrl);
    }
  }, [projectIdFromUrl, projects]);

  useEffect(() => {
    filterAndSortPages();
  }, [searchTerm, sortBy, sortOrder, filterStatus, contentPages]);

  const loadProjects = async () => {
    try {
      setLoading(true);

      // Development mode safety check
      if (process.env.NODE_ENV === 'development' && (!session || !session.user)) {
        console.log('[ContentDashboard] No valid session in development mode, using mock data');
        
        // If in development and no session, use mock data
        const mockProjects = [
          { id: 'dev-project-1', website_name: 'Development Project', website_url: 'https://example.com' }
        ];
        setProjects(mockProjects);
        setSelectedProjectId('dev-project-1');
        setLoading(false);
        return;
      }

      // First check if the session is valid
      if (!session || !session.user) {
        console.log('[ContentDashboard] No valid session found when loading projects');
        if (process.env.NODE_ENV === 'production') {
          router.push('/login');
        }
        return;
      }

      const userProjects = await ProjectService.getProjects();
      console.log('[ContentDashboard] Loaded projects:', userProjects.length);
      setProjects(userProjects);
      
      if (projectIdFromUrl && userProjects.some(project => project.id === projectIdFromUrl)) {
        setSelectedProjectId(projectIdFromUrl);
      } else if (userProjects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(userProjects[0].id);
      }
    } catch (error) {
      console.error('[ContentDashboard] Error loading projects:', error);
      
      // Check if error is due to auth
      if (error instanceof Error && (
        error.message.includes('not authenticated') || 
        error.message.includes('JWT') ||
        error.message.includes('session')
      )) {
        console.log('[ContentDashboard] Authentication error, redirecting to login');
        if (process.env.NODE_ENV === 'production') {
          router.push('/login');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loadContentPages = async (projectId: string) => {
    try {
      setLoading(true);
      
      // Development mode safety check
      if (process.env.NODE_ENV === 'development' && (!session || !session.user)) {
        console.log('[ContentDashboard] No valid session in development mode, using mock content pages');
        
        // If in development and no session, use mock data
        const mockPages = [
          { 
            id: 'dev-page-1', 
            title: 'Development Page 1',
            url: 'https://example.com/page1',
            content: 'This is a sample page content for development.',
            status: 'analyzed',
            seo_score: 85,
            readability_score: 78,
            word_count: 1200,
            updated_at: new Date().toISOString()
          },
          { 
            id: 'dev-page-2', 
            title: 'Development Page 2',
            url: 'https://example.com/page2',
            content: 'Another sample page for development testing.',
            status: 'not-analyzed',
            word_count: 950,
            updated_at: new Date().toISOString()
          }
        ];
        
        setContentPages(mockPages);
        
        setContentMetrics({
          totalPages: mockPages.length,
          analyzedPages: 1,
          averageSeoScore: 85,
          averageReadabilityScore: 78,
          totalWordCount: 2150
        });
        
        setLoading(false);
        return;
      }
      
      // Verify session is valid before making the request
      if (!session || !session.user) {
        console.log('[ContentDashboard] No valid session found when loading content pages');
        if (process.env.NODE_ENV === 'production') {
          router.push('/login');
        }
        return;
      }

      // Use supabase service key for RLS bypass if needed
      // You can also use the admin client from your service if needed
      const pages = await ContentPageService.getContentPages(projectId);
      console.log(`[ContentDashboard] Loaded ${pages.length} content pages for project ${projectId}`);
      setContentPages(pages);
      
      // Calculate content metrics
      const analyzed = pages.filter(page => page.status !== 'not-analyzed');
      setContentMetrics({
        totalPages: pages.length,
        analyzedPages: analyzed.length,
        averageSeoScore: analyzed.length > 0 
          ? analyzed.reduce((acc, page) => acc + (page.seo_score || 0), 0) / analyzed.length 
          : 0,
        averageReadabilityScore: analyzed.length > 0 
          ? analyzed.reduce((acc, page) => acc + (page.readability_score || 0), 0) / analyzed.length 
          : 0,
        totalWordCount: pages.reduce((acc, page) => acc + (page.word_count || 0), 0)
      });
    } catch (error) {
      console.error('[ContentDashboard] Error loading content pages:', error);
      
      // Check if error is due to auth
      if (error instanceof Error && (
        error.message.includes('not authenticated') || 
        error.message.includes('JWT') ||
        error.message.includes('session')
      )) {
        console.log('[ContentDashboard] Authentication error, redirecting to login');
        if (process.env.NODE_ENV === 'production') {
          router.push('/login');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortPages = () => {
    let filtered = [...contentPages];
    
    // Apply text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        page => 
          (page.title || '').toLowerCase().includes(term) ||
          (page.url || '').toLowerCase().includes(term) ||
          (page.content || '').toLowerCase().includes(term)
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'analyzed') {
        filtered = filtered.filter(page => page.status !== 'not-analyzed');
      } else if (filterStatus === 'not-analyzed') {
        filtered = filtered.filter(page => page.status === 'not-analyzed');
      } else if (filterStatus === 'high-score') {
        filtered = filtered.filter(page => (page.seo_score || 0) >= 80);
      } else if (filterStatus === 'needs-improvement') {
        filtered = filtered.filter(page => 
          (page.seo_score || 0) < 80 && (page.seo_score || 0) >= 60
        );
      } else if (filterStatus === 'poor-score') {
        filtered = filtered.filter(page => (page.seo_score || 0) < 60);
      }
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = sortBy === 'title' 
        ? (a.title || '').toLowerCase() 
        : sortBy === 'word_count' 
          ? (a.word_count || 0) 
          : sortBy === 'seo_score' 
            ? (a.seo_score || 0) 
            : sortBy === 'readability_score' 
              ? (a.readability_score || 0)
              : new Date(a.updated_at || a.created_at).getTime();
              
      const bValue = sortBy === 'title' 
        ? (b.title || '').toLowerCase() 
        : sortBy === 'word_count' 
          ? (b.word_count || 0) 
          : sortBy === 'seo_score' 
            ? (b.seo_score || 0) 
            : sortBy === 'readability_score' 
              ? (b.readability_score || 0)
              : new Date(b.updated_at || b.created_at).getTime();
      
      return sortOrder === 'asc' 
        ? aValue > bValue ? 1 : -1
        : aValue < bValue ? 1 : -1;
    });
    
    setFilteredPages(filtered);
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    // Reset all states
    setIsEditing(false);
    setSelectedPageId(null);
    setIsAnalyzing(false);
    setIsOptimizing(false);
    setIsViewingPerformance(false);
    setIsAnalyzingGap(false);
    setActiveTab('content-pages');
    
    // Update URL with project ID
    const params = new URLSearchParams(searchParams);
    params.set('projectId', projectId);
    router.push(`/dashboard/content?${params.toString()}`);
  };

  const handleCreatePage = () => {
    setIsEditing(true);
    setSelectedPageId(null);
    resetOtherStates('edit');
  };

  const handleEditPage = (pageId: string) => {
    setSelectedPageId(pageId);
    setIsEditing(true);
    resetOtherStates('edit');
  };

  const handleAnalyzePage = (pageId: string) => {
    setSelectedPageId(pageId);
    setIsAnalyzing(true);
    resetOtherStates('analyze');
  };

  const handleOptimizePage = (pageId: string) => {
    setSelectedPageId(pageId);
    setIsOptimizing(true);
    resetOtherStates('optimize');
  };

  const handleViewPerformance = (pageId: string) => {
    setSelectedPageId(pageId);
    setIsViewingPerformance(true);
    resetOtherStates('performance');
  };

  const handleAnalyzeGap = (pageId: string) => {
    setSelectedPageId(pageId);
    setIsAnalyzingGap(true);
    resetOtherStates('gap');
  };

  const resetOtherStates = (activeState: string) => {
    if (activeState !== 'edit') setIsEditing(false);
    if (activeState !== 'analyze') setIsAnalyzing(false);
    if (activeState !== 'optimize') setIsOptimizing(false);
    if (activeState !== 'performance') setIsViewingPerformance(false);
    if (activeState !== 'gap') setIsAnalyzingGap(false);
  };

  const handleBack = () => {
    if (isEditing || isAnalyzing || isOptimizing || isViewingPerformance || isAnalyzingGap) {
      resetAllStates();
    } else {
      router.push('/dashboard');
    }
  };

  const resetAllStates = () => {
    setIsEditing(false);
    setIsAnalyzing(false);
    setIsOptimizing(false);
    setIsViewingPerformance(false);
    setIsAnalyzingGap(false);
    setSelectedPageId(null);
  };

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  if (loading && !selectedProjectId) {
    return (
      <div className="container mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  const renderPageContent = () => {
    if (!selectedProjectId) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">No Projects Found</h2>
          <p className="mb-4">You need to create a project before you can manage content.</p>
          <Button onClick={() => router.push('/dashboard/new-project')}>Create New Project</Button>
        </div>
      );
    }

    if (isEditing && selectedProjectId) {
      return (
        <div className="space-y-4">
          <Button variant="outline" onClick={handleBack} className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Content Pages
          </Button>
          <ContentEditor 
            projectId={selectedProjectId} 
            pageId={selectedPageId || undefined} 
            onSave={() => {
              resetAllStates();
              loadContentPages(selectedProjectId);
            }}
          />
        </div>
      );
    }

    if (isAnalyzing && selectedPageId) {
      return (
        <div className="space-y-4">
          <ContentAnalyzer 
            contentPageId={selectedPageId} 
            onBack={handleBack} 
          />
        </div>
      );
    }

    if (isOptimizing && selectedPageId) {
      return (
        <div className="space-y-4">
          <ContentOptimizer 
            contentPageId={selectedPageId} 
            onBack={handleBack} 
            onEdit={handleEditPage}
          />
        </div>
      );
    }

    if (isViewingPerformance && selectedPageId) {
      return (
        <div className="space-y-4">
          <ContentPerformance 
            contentPageId={selectedPageId}
            onBack={handleBack}
          />
        </div>
      );
    }

    if (isAnalyzingGap && selectedPageId) {
      return (
        <div className="space-y-4">
          <ContentGapAnalysis 
            contentPageId={selectedPageId}
            onBack={handleBack}
          />
        </div>
      );
    }

    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="flex justify-between items-center">
          <TabsList className="grid grid-cols-4 w-[600px]">
            <TabsTrigger value="content-pages" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Content Pages
            </TabsTrigger>
            <TabsTrigger value="topic-clusters" className="flex items-center">
              <Layers className="h-4 w-4 mr-2" />
              Topic Clusters
            </TabsTrigger>
            <TabsTrigger value="content-briefs" className="flex items-center">
              <Book className="h-4 w-4 mr-2" />
              Content Briefs
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center">
              <BarChart2 className="h-4 w-4 mr-2" />
              Content Analytics
            </TabsTrigger>
          </TabsList>

          <Button variant="outline" onClick={handleBack} className="ml-auto">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <TabsContent value="content-pages" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Content Pages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{contentMetrics.totalPages}</div>
                <p className="text-xs text-muted-foreground mt-2">
                  {contentMetrics.analyzedPages} pages analyzed ({contentMetrics.totalPages > 0 
                    ? Math.round((contentMetrics.analyzedPages / contentMetrics.totalPages) * 100) 
                    : 0}%)
                </p>
                <Progress 
                  value={contentMetrics.totalPages > 0 
                    ? (contentMetrics.analyzedPages / contentMetrics.totalPages) * 100 
                    : 0} 
                  className="h-2 mt-2" 
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average SEO Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {contentMetrics.averageSeoScore.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {contentMetrics.averageSeoScore >= 80 
                    ? 'Good' 
                    : contentMetrics.averageSeoScore >= 60 
                      ? 'Needs Improvement' 
                      : 'Poor'}
                </p>
                <Progress 
                  value={contentMetrics.averageSeoScore} 
                  className={`h-2 mt-2 ${
                    contentMetrics.averageSeoScore >= 80 
                      ? 'bg-green-600' 
                      : contentMetrics.averageSeoScore >= 60 
                        ? 'bg-yellow-600' 
                        : 'bg-red-600'
                  }`}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Readability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {contentMetrics.averageReadabilityScore.toFixed(1)}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {contentMetrics.averageReadabilityScore >= 80 
                    ? 'Easy to Read' 
                    : contentMetrics.averageReadabilityScore >= 60 
                      ? 'Moderate' 
                      : 'Difficult'}
                </p>
                <Progress 
                  value={contentMetrics.averageReadabilityScore} 
                  className={`h-2 mt-2 ${
                    contentMetrics.averageReadabilityScore >= 80 
                      ? 'bg-green-600' 
                      : contentMetrics.averageReadabilityScore >= 60 
                        ? 'bg-yellow-600' 
                        : 'bg-red-600'
                  }`}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Word Count</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {contentMetrics.totalWordCount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {contentMetrics.totalPages > 0 
                    ? `Avg. ${Math.round(contentMetrics.totalWordCount / contentMetrics.totalPages)} words per page` 
                    : 'No content pages yet'}
                </p>
              </CardContent>
            </Card>
          </div>
        
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle>Content Pages</CardTitle>
                <Button onClick={handleCreatePage}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Content Page
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search content pages..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Pages</SelectItem>
                        <SelectItem value="analyzed">Analyzed Only</SelectItem>
                        <SelectItem value="not-analyzed">Not Analyzed</SelectItem>
                        <SelectItem value="high-score">High Score (80+)</SelectItem>
                        <SelectItem value="needs-improvement">Needs Improvement (60-79)</SelectItem>
                        <SelectItem value="poor-score">Poor Score (&lt;60)</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[180px]">
                        {sortOrder === 'asc' ? <SortAsc className="h-4 w-4 mr-2" /> : <SortDesc className="h-4 w-4 mr-2" />}
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="updated_at">Last Updated</SelectItem>
                        <SelectItem value="title">Title</SelectItem>
                        <SelectItem value="word_count">Word Count</SelectItem>
                        <SelectItem value="seo_score">SEO Score</SelectItem>
                        <SelectItem value="readability_score">Readability</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      title={sortOrder === 'asc' ? 'Sort descending' : 'Sort ascending'}
                    >
                      {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => loadContentPages(selectedProjectId!)}
                      title="Refresh content pages"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : (
                  <ContentPagesList
                    projectId={selectedProjectId}
                    contentPages={filteredPages}
                    onCreatePage={handleCreatePage}
                    onEditPage={handleEditPage}
                    onAnalyzePage={handleAnalyzePage}
                    onOptimizePage={handleOptimizePage}
                    onViewPerformance={handleViewPerformance}
                    onAnalyzeGap={handleAnalyzeGap}
                    onPageDeleted={() => loadContentPages(selectedProjectId!)}
                  />
                )}
              </div>
            </CardContent>
            <CardFooter className="border-t py-4">
              <div className="text-xs text-muted-foreground">
                Showing {filteredPages.length} of {contentPages.length} content pages
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="topic-clusters" className="space-y-4">
          <TopicClusterMap projectId={selectedProjectId} />
        </TabsContent>

        <TabsContent value="content-briefs" className="space-y-4">
          <ContentBriefGenerator projectId={selectedProjectId} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Analytics</CardTitle>
              <CardDescription>
                Analyze and track the performance of your content over time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Content Analytics will be implemented here */}
              <div className="flex items-center justify-center h-[400px]">
                <p>Content Analytics Dashboard Coming Soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <div className="container mx-auto p-6">
      {selectedProjectId && (
        <div className="mb-6 pb-4 border-b">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
            <h1 className="text-2xl font-bold">Content Management</h1>
            {projects.length > 0 && (
              <div className="flex-1 w-full md:max-w-xs">
                <Select value={selectedProjectId} onValueChange={handleProjectChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.website_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedProject && (
              <Badge variant="outline" className="hidden md:inline-flex">
                {selectedProject.website_url}
              </Badge>
            )}
          </div>
        </div>
      )}
      {renderPageContent()}
    </div>
  );
} 