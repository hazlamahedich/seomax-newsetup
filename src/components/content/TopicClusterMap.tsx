'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { browserClient } from '@/lib/supabase/browser-client';
import { useProjectAccess } from '@/hooks/useProjectAccess';
import { ensureProjectExists } from '@/lib/auth/project-helper';

// Define our own BaseTopicCluster interface based on actual DB schema
interface BaseTopicCluster {
  id: string;
  project_id: string;
  name: string;
  main_keyword: string;
  related_keywords?: string[] | null;
  created_at: string;
}

// Extended TopicCluster interface with properties needed for visualization
interface TopicCluster extends BaseTopicCluster {
  main_topic: string; // Main topic name for visualization
  subtopics: Array<{
    name: string;
    keywords: string[];
    content_ideas: string[];
  }>;
}

interface TopicClusterMapProps {
  projectId: string;
  clusterId?: string;
  onCreateCluster?: (cluster: TopicCluster) => void;
}

export function TopicClusterMap({ projectId, clusterId, onCreateCluster }: TopicClusterMapProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<TopicCluster | null>(null);
  const [clusters, setClusters] = useState<TopicCluster[]>([]);
  const [mainKeyword, setMainKeyword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Use our custom hook to verify project access
  const projectAccess = useProjectAccess({ projectId });

  useEffect(() => {
    // Set any errors from project access
    if (projectAccess.error) {
      setError(projectAccess.error);
    } else if (projectAccess.hasAccess) {
      loadClusters();
    }
  }, [projectAccess.hasAccess, projectAccess.error]);

  useEffect(() => {
    if (clusterId && projectAccess.hasAccess) {
      loadCluster(clusterId);
    }
  }, [clusterId, projectAccess.hasAccess]);

  useEffect(() => {
    if (selectedCluster) {
      drawClusterMap();
    }
  }, [selectedCluster]);

  const loadClusters = async () => {
    if (!projectAccess.hasAccess) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Use the API route
      const response = await fetch(`/api/content/topic-clusters?projectId=${projectId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error loading topic clusters:', errorData);
        throw new Error(`Failed to load topic clusters: ${errorData.error || response.statusText}`);
      }
      
      const projectClusters = await response.json();
      
      if (!projectClusters || projectClusters.length === 0) {
        setClusters([]);
        return;
      }
      
      // Transform each cluster to include visualization properties
      const extendedClusters: TopicCluster[] = projectClusters.map((cluster: BaseTopicCluster) => ({
        ...cluster,
        main_topic: cluster.name || cluster.main_keyword,
        subtopics: generateSubtopicsFromCluster(cluster)
      }));
      
      setClusters(extendedClusters);
    } catch (error) {
      console.error('Error loading topic clusters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCluster = async (id: string) => {
    try {
      setIsLoading(true);
      
      // Use the API route
      const response = await fetch(`/api/content/topic-clusters?clusterId=${id}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error loading topic cluster:', errorData);
        throw new Error(`Failed to load topic cluster: ${errorData.error || response.statusText}`);
      }
      
      const clusterData = await response.json();
      
      if (!clusterData) {
        console.error('No cluster data found for id:', id);
        return;
      }
      
      // Transform the cluster data to include the properties needed for visualization
      const extendedCluster: TopicCluster = {
        ...clusterData,
        main_topic: clusterData.name || clusterData.main_keyword,
        subtopics: generateSubtopicsFromCluster(clusterData)
      };
      
      setSelectedCluster(extendedCluster);
    } catch (error) {
      console.error('Error loading topic cluster:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCluster = async () => {
    if (!mainKeyword.trim()) return;
    
    // Make sure we have project access
    if (!projectAccess.hasAccess) {
      if (!projectAccess.projectExists) {
        try {
          console.log('Project does not exist, attempting to create it');
          setIsLoading(true);
          
          // Try to create the project first
          await ensureProjectExists(
            projectId, 
            projectAccess.userId || 'unknown-user', 
            `Auto-created project for topic clusters`
          );
          
          console.log('Project created, verifying access');
          await projectAccess.verifyAccess();
          
          if (!projectAccess.hasAccess) {
            setError('Created project but still unable to access it. Please refresh.');
            return;
          }
        } catch (err) {
          console.error('Failed to create project:', err);
          setError('Failed to create project. Please try again.');
          return;
        } finally {
          setIsLoading(false);
        }
      } else {
        await projectAccess.verifyAccess();
        if (!projectAccess.hasAccess) {
          return;
        }
      }
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const requestBody = {
        projectId,
        name: mainKeyword.trim(),
        mainKeyword: mainKeyword.trim(),
        related_keywords: [
          `${mainKeyword} guide`,
          `${mainKeyword} examples`,
          `${mainKeyword} tools`
        ]
      };
      
      console.log('Creating topic cluster with request:', requestBody);
      
      // Use the API route instead of direct database access
      const response = await fetch('/api/content/topic-clusters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error creating topic cluster:', errorData);
        setError(`Failed to create topic cluster: ${errorData.error || response.statusText}${errorData.details ? ` - ${errorData.details}` : ''}`);
        throw new Error(`Failed to create topic cluster: ${errorData.error || response.statusText}`);
      }
      
      const newCluster = await response.json();
      
      // Transform the cluster for visualization
      const extendedCluster: TopicCluster = {
        ...newCluster,
        main_topic: newCluster.name || newCluster.main_keyword,
        subtopics: generateSubtopicsFromCluster(newCluster)
      };
      
      setClusters(prevClusters => [...prevClusters, extendedCluster]);
      setSelectedCluster(extendedCluster);
      setMainKeyword('');
      
      if (onCreateCluster) {
        onCreateCluster(extendedCluster);
      }
    } catch (error) {
      console.error('Error creating topic cluster:', error);
      if (!error) {
        setError('Unknown error creating topic cluster');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const generateSubtopicsFromCluster = (cluster: BaseTopicCluster) => {
    // Create subtopics from related keywords if available
    if (cluster.related_keywords && Array.isArray(cluster.related_keywords)) {
      return cluster.related_keywords.map(keyword => ({
        name: keyword,
        keywords: [keyword, `best ${keyword}`, `${keyword} tips`],
        content_ideas: [`How to use ${keyword}`, `Guide to ${keyword}`, `${keyword} examples`]
      }));
    }
    
    // Generate some default subtopics if no related keywords
    const mainKeyword = cluster.main_keyword || cluster.name;
    return [
      {
        name: `${mainKeyword} guide`,
        keywords: [`${mainKeyword} tutorial`, `${mainKeyword} how-to`, `learn ${mainKeyword}`],
        content_ideas: [`Beginner's guide to ${mainKeyword}`, `${mainKeyword} tutorial for beginners`]
      },
      {
        name: `${mainKeyword} examples`,
        keywords: [`${mainKeyword} case studies`, `${mainKeyword} samples`, `${mainKeyword} templates`],
        content_ideas: [`10 examples of ${mainKeyword}`, `${mainKeyword} case studies`]
      },
      {
        name: `${mainKeyword} tools`,
        keywords: [`best ${mainKeyword} tools`, `${mainKeyword} software`, `${mainKeyword} apps`],
        content_ideas: [`Top 5 tools for ${mainKeyword}`, `Essential ${mainKeyword} resources`]
      }
    ];
  };

  const drawClusterMap = () => {
    // Canvas drawing logic for topic cluster visualization would go here
    // For now we'll just console log
    console.log('Drawing cluster map for:', selectedCluster?.main_topic);
  };

  // Show loading state
  if (projectAccess.isLoading || isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Topic Cluster Map</CardTitle>
          <CardDescription>Loading content...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error || projectAccess.error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Topic Cluster Map</CardTitle>
          <CardDescription>An error occurred</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error || projectAccess.error}
              {!projectAccess.projectExists && projectAccess.hasAccess === false && (
                <div className="mt-2">
                  <Button
                    onClick={async () => {
                      try {
                        setIsLoading(true);
                        await ensureProjectExists(
                          projectId, 
                          projectAccess.userId || 'unknown-user', 
                          `Auto-created project for topic clusters`
                        );
                        await projectAccess.verifyAccess();
                      } catch (err) {
                        console.error('Failed to create project:', err);
                        setError('Failed to create project. Please try again.');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                  >
                    Create Project
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Topic Cluster Map</CardTitle>
        <CardDescription>Create and visualize your content clusters</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <Label htmlFor="mainKeyword">Main Keyword</Label>
          <div className="flex mt-1">
            <Input
              id="mainKeyword"
              placeholder="Enter your main topic keyword"
              value={mainKeyword}
              onChange={(e) => setMainKeyword(e.target.value)}
              className="flex-1 mr-2"
            />
            <Button onClick={handleCreateCluster} disabled={!mainKeyword.trim()}>
              Create Cluster
            </Button>
          </div>
        </div>

        {clusters.length === 0 ? (
          <div className="text-center p-6 border rounded-lg bg-muted/20">
            <p className="text-muted-foreground">
              No topic clusters found. Create your first cluster above.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">Your Topic Clusters</h3>
              <ul className="space-y-1">
                {clusters.map((cluster) => (
                  <li key={cluster.id}>
                    <button
                      className={`w-full text-left px-3 py-2 rounded ${
                        selectedCluster?.id === cluster.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedCluster(cluster)}
                    >
                      {cluster.main_topic}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {selectedCluster && (
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">Topic Map: {selectedCluster.main_topic}</h3>
                <div className="aspect-video bg-muted/20 rounded-md flex items-center justify-center">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-full"
                  />
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedCluster.subtopics.map((subtopic, i) => (
                    <div key={i} className="border rounded-md p-3">
                      <h4 className="font-medium">{subtopic.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Keywords: {subtopic.keywords.join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 