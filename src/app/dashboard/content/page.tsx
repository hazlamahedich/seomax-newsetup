'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronLeft, FileText, Layers, BarChart2, Book, PenTool, LineChart, PieChart, Lightbulb } from 'lucide-react';
import { ContentPagesList } from '@/components/content/ContentPagesList';
import { ContentEditor } from '@/components/content/ContentEditor';
import { TopicClusterMap } from '@/components/content/TopicClusterMap';
import { ContentBriefGenerator } from '@/components/content/ContentBrief';
import { ContentAnalyzer } from '@/components/content/ContentAnalyzer';
import { ContentOptimizer } from '@/components/content/ContentOptimizer';
import { ContentPerformance } from '@/components/content/ContentPerformance';
import { ContentGapAnalysis } from '@/components/content/ContentGapAnalysis';
import { ProjectService } from '@/lib/services/project-service';

export default function ContentDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdFromUrl = searchParams.get('projectId');
  
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('content-pages');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isViewingPerformance, setIsViewingPerformance] = useState(false);
  const [isAnalyzingGap, setIsAnalyzingGap] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    // If a project ID is provided in the URL and it exists in our projects list, select it
    if (projectIdFromUrl && projects.some(project => project.id === projectIdFromUrl)) {
      setSelectedProjectId(projectIdFromUrl);
    }
  }, [projectIdFromUrl, projects]);

  const loadProjects = async () => {
    try {
      const userProjects = await ProjectService.getProjects();
      setProjects(userProjects);
      
      // If there's a project ID in the URL, prioritize that
      if (projectIdFromUrl && userProjects.some(project => project.id === projectIdFromUrl)) {
        setSelectedProjectId(projectIdFromUrl);
      } 
      // Otherwise, if there are projects, select the first one
      else if (userProjects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(userProjects[0].id);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
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
          <TabsList>
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

          <Button variant="outline" onClick={handleBack}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <TabsContent value="content-pages" className="space-y-4">
          <ContentPagesList
            projectId={selectedProjectId}
            onCreatePage={handleCreatePage}
            onEditPage={handleEditPage}
            onAnalyzePage={handleAnalyzePage}
            onOptimizePage={handleOptimizePage}
            onViewPerformance={handleViewPerformance}
            onAnalyzeGap={handleAnalyzeGap}
          />
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
              <CardDescription>Performance metrics for your content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <LineChart className="h-4 w-4 mr-2 text-blue-500" />
                      Performance Tracking
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Track your content performance over time with detailed metrics.
                    </p>
                    <Button className="w-full" size="sm" variant="outline">View All</Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <PieChart className="h-4 w-4 mr-2 text-purple-500" />
                      Content Gap Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Identify missing topics by analyzing competitor content.
                    </p>
                    <Button className="w-full" size="sm" variant="outline">View All</Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Lightbulb className="h-4 w-4 mr-2 text-amber-500" />
                      Optimization Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Get AI-powered suggestions to improve your content.
                    </p>
                    <Button className="w-full" size="sm" variant="outline">View All</Button>
                  </CardContent>
                </Card>
              </div>
              
              <p className="text-center text-sm text-muted-foreground">
                Select a content page from the Content Pages tab to access detailed analytics
                and optimization features.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Content Optimization</h1>
        <p className="text-gray-500">
          Create, analyze, and optimize your content with AI-powered recommendations
        </p>
      </div>

      {selectedProjectId && projects.length > 0 && !isEditing && !isAnalyzing && !isOptimizing && !isViewingPerformance && !isAnalyzingGap && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {projects.map((project) => (
                <Button
                  key={project.id}
                  variant={project.id === selectedProjectId ? 'default' : 'outline'}
                  onClick={() => handleProjectChange(project.id)}
                >
                  {project.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {renderPageContent()}
    </div>
  );
} 