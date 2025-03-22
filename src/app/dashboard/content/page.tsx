'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronLeft, FileText, Layers, BarChart2, Book, PenTool } from 'lucide-react';
import { ContentPagesList } from '@/components/content/ContentPagesList';
import { ContentEditor } from '@/components/content/ContentEditor';
import { TopicClusterMap } from '@/components/content/TopicClusterMap';
import { ContentBriefGenerator } from '@/components/content/ContentBrief';
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
    // Reset other states
    setIsEditing(false);
    setSelectedPageId(null);
    setIsAnalyzing(false);
    setActiveTab('content-pages');
  };

  const handleCreatePage = () => {
    setIsEditing(true);
    setSelectedPageId(null);
  };

  const handleEditPage = (pageId: string) => {
    setSelectedPageId(pageId);
    setIsEditing(true);
  };

  const handleAnalyzePage = (pageId: string) => {
    setSelectedPageId(pageId);
    setIsAnalyzing(true);
  };

  const handleBack = () => {
    if (isEditing || isAnalyzing) {
      setIsEditing(false);
      setIsAnalyzing(false);
      setSelectedPageId(null);
    } else {
      router.push('/dashboard');
    }
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

    if (isEditing) {
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
              setIsEditing(false);
              setSelectedPageId(null);
            }}
          />
        </div>
      );
    }

    if (isAnalyzing) {
      return (
        <div className="space-y-4">
          <Button variant="outline" onClick={handleBack} className="mb-4">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Content Pages
          </Button>
          {/* Placeholder for ContentAnalyzer component */}
          <Card>
            <CardHeader>
              <CardTitle>Content Analysis</CardTitle>
              <CardDescription>Detailed analysis of your content</CardDescription>
            </CardHeader>
            <CardContent>
              <p>This is a placeholder for the content analysis component.</p>
            </CardContent>
          </Card>
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
            <CardContent className="h-[400px] flex items-center justify-center">
              <div className="text-center space-y-2">
                <PenTool className="h-12 w-12 mx-auto text-gray-400" />
                <h3 className="text-lg font-medium">Content Analytics Coming Soon</h3>
                <p className="text-sm text-gray-500 max-w-md">
                  In a future update, this section will provide detailed analytics on your content performance,
                  including traffic, engagement metrics, and conversion rates.
                </p>
              </div>
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

      {selectedProjectId && projects.length > 0 && !isEditing && !isAnalyzing && (
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