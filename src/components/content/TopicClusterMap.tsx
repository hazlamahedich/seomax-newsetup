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
  const [hoveredSubtopic, setHoveredSubtopic] = useState<number | null>(null);
  const [selectedSubtopic, setSelectedSubtopic] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const subtopicPositionsRef = useRef<Array<{index: number, x: number, y: number, radius: number}>>([]);
  
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
      
      // Add resize event listener to redraw the map when window size changes
      const handleResize = () => {
        drawClusterMap();
      };
      
      window.addEventListener('resize', handleResize);
      
      // Clean up event listener
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [selectedCluster, hoveredSubtopic]);

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
    if (!canvasRef.current || !selectedCluster) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get computed colors from CSS variables using DOM
    const computeColor = (variable: string, opacity = 1) => {
      // Create a temporary element
      const el = document.createElement('div');
      // Set the background color using the CSS variable
      el.style.color = `hsl(var(${variable}))`;
      // Add to DOM temporarily to compute style
      document.body.appendChild(el);
      // Get computed color (will be in RGB format)
      const computedColor = window.getComputedStyle(el).color;
      // Remove element
      document.body.removeChild(el);
      
      // Extract RGB values from computed color
      const rgbMatch = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)/);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);
        const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;
        // Return RGBA with our opacity applied
        return `rgba(${r}, ${g}, ${b}, ${opacity * a})`;
      }
      
      // Fallback colors in case something goes wrong
      const fallbacks: Record<string, string> = {
        '--primary': 'rgba(0, 112, 243, ' + opacity + ')', // blue
        '--background': 'rgba(255, 255, 255, ' + opacity + ')', // white
        '--foreground': 'rgba(24, 24, 27, ' + opacity + ')', // dark gray
        '--primary-foreground': 'rgba(255, 255, 255, ' + opacity + ')', // white
        '--card': 'rgba(255, 255, 255, ' + opacity + ')', // white
        '--border': 'rgba(230, 230, 230, ' + opacity + ')', // light gray
        '--muted-foreground': 'rgba(115, 115, 115, ' + opacity + ')' // mid gray
      };
      
      // Return fallback color or a default
      return fallbacks[variable] || `rgba(0, 0, 0, ${opacity})`;
    };

    // Set canvas dimensions to match its display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas with background color
    ctx.fillStyle = computeColor('--background');
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Constants for drawing
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const mainCircleRadius = Math.min(canvas.width, canvas.height) * 0.15;
    const subCircleRadius = mainCircleRadius * 0.6;
    const distanceFromCenter = Math.min(canvas.width, canvas.height) * 0.35;

    // Draw main topic node with glow effect
    ctx.save();
    ctx.shadowColor = computeColor('--primary', 0.5);
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(centerX, centerY, mainCircleRadius, 0, Math.PI * 2);
    ctx.fillStyle = computeColor('--primary');
    ctx.fill();
    ctx.restore();

    // Main circle border
    ctx.beginPath();
    ctx.arc(centerX, centerY, mainCircleRadius, 0, Math.PI * 2);
    ctx.strokeStyle = computeColor('--border');
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw main topic text
    ctx.font = 'bold 14px sans-serif';
    ctx.fillStyle = computeColor('--primary-foreground');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Word wrap for main topic
    const mainTopic = selectedCluster.main_topic || selectedCluster.main_keyword;
    const words = mainTopic.split(' ');
    let line = '';
    let lines = [];
    const maxWidth = mainCircleRadius * 1.5;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        lines.push(line);
        line = words[i] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    
    // Draw wrapped text
    const lineHeight = 18;
    let startY = centerY - ((lines.length - 1) * lineHeight) / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], centerX, startY);
      startY += lineHeight;
    }

    // Calculate positions for subtopics around the circle
    const subtopics = selectedCluster.subtopics || [];
    const angleStep = (Math.PI * 2) / subtopics.length;

    // Reset subtopic positions
    subtopicPositionsRef.current = [];

    // Draw subtopics
    subtopics.forEach((subtopic, index) => {
      const angle = index * angleStep;
      const x = centerX + Math.cos(angle) * distanceFromCenter;
      const y = centerY + Math.sin(angle) * distanceFromCenter;

      // Store position for hover detection
      subtopicPositionsRef.current.push({
        index,
        x,
        y,
        radius: subCircleRadius
      });

      // Draw connection line with gradient
      const gradient = ctx.createLinearGradient(
        centerX + Math.cos(angle) * mainCircleRadius,
        centerY + Math.sin(angle) * mainCircleRadius,
        x - Math.cos(angle) * subCircleRadius,
        y - Math.sin(angle) * subCircleRadius
      );
      gradient.addColorStop(0, computeColor('--primary', 0.5));
      gradient.addColorStop(1, computeColor('--muted-foreground', 0.3));

      ctx.beginPath();
      ctx.moveTo(
        centerX + Math.cos(angle) * mainCircleRadius,
        centerY + Math.sin(angle) * mainCircleRadius
      );
      ctx.lineTo(
        x - Math.cos(angle) * subCircleRadius,
        y - Math.sin(angle) * subCircleRadius
      );
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw subtopic circle with hover effect
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, subCircleRadius, 0, Math.PI * 2);
      
      // Apply hover effect if this is the hovered subtopic
      if (hoveredSubtopic === index) {
        ctx.shadowColor = computeColor('--primary', 0.5);
        ctx.shadowBlur = 15;
        ctx.fillStyle = computeColor('--primary');
      } else {
        ctx.fillStyle = computeColor('--card');
      }
      
      ctx.fill();
      ctx.restore();

      // Subtopic circle border
      ctx.beginPath();
      ctx.arc(x, y, subCircleRadius, 0, Math.PI * 2);
      ctx.strokeStyle = hoveredSubtopic === index 
        ? computeColor('--primary')
        : computeColor('--border');
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw subtopic text
      ctx.fillStyle = hoveredSubtopic === index 
        ? computeColor('--primary-foreground')
        : computeColor('--foreground');
      ctx.font = hoveredSubtopic === index ? 'bold 12px sans-serif' : '12px sans-serif';
      
      // Word wrap for subtopics
      const subtopicWords = subtopic.name.split(' ');
      let subtopicLine = '';
      let subtopicLines = [];
      const maxSubWidth = subCircleRadius * 1.5;
      
      for (let i = 0; i < subtopicWords.length; i++) {
        const testLine = subtopicLine + subtopicWords[i] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxSubWidth && i > 0) {
          subtopicLines.push(subtopicLine);
          subtopicLine = subtopicWords[i] + ' ';
        } else {
          subtopicLine = testLine;
        }
      }
      subtopicLines.push(subtopicLine);
      
      // Draw wrapped subtopic text
      const subLineHeight = 16;
      let subStartY = y - ((subtopicLines.length - 1) * subLineHeight) / 2;
      for (let i = 0; i < subtopicLines.length; i++) {
        ctx.fillText(subtopicLines[i], x, subStartY);
        subStartY += subLineHeight;
      }
    });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !selectedCluster) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if mouse is over any subtopic
    let hovering = false;
    subtopicPositionsRef.current.forEach(subtopic => {
      const distance = Math.sqrt(
        Math.pow(x - subtopic.x, 2) + Math.pow(y - subtopic.y, 2)
      );
      
      if (distance <= subtopic.radius) {
        setHoveredSubtopic(subtopic.index);
        hovering = true;
        canvasRef.current!.style.cursor = 'pointer';
      }
    });
    
    if (!hovering) {
      setHoveredSubtopic(null);
      canvasRef.current.style.cursor = 'default';
    }
  };

  const handleCanvasMouseLeave = () => {
    setHoveredSubtopic(null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !selectedCluster) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if any subtopic was clicked
    let clicked = false;
    subtopicPositionsRef.current.forEach(subtopic => {
      const distance = Math.sqrt(
        Math.pow(x - subtopic.x, 2) + Math.pow(y - subtopic.y, 2)
      );
      
      if (distance <= subtopic.radius) {
        // Show details for this subtopic
        setSelectedSubtopic(subtopic.index);
        clicked = true;
      }
    });
    
    // If clicked outside any subtopic, deselect
    if (!clicked) {
      setSelectedSubtopic(null);
    }
  };

  const handleSelectCluster = (cluster: TopicCluster) => {
    setSelectedCluster(cluster);
    setSelectedSubtopic(null); // Reset selected subtopic when changing clusters
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
                      onClick={() => handleSelectCluster(cluster)}
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
                    onMouseMove={handleCanvasMouseMove}
                    onMouseLeave={handleCanvasMouseLeave}
                    onClick={handleCanvasClick}
                  />
                </div>
                
                {selectedSubtopic !== null && selectedCluster.subtopics && selectedCluster.subtopics[selectedSubtopic] && (
                  <div className="mt-4 p-4 border rounded-md bg-muted/10">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-lg">
                        {selectedCluster.subtopics[selectedSubtopic].name}
                      </h4>
                      <button 
                        onClick={() => setSelectedSubtopic(null)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-2">
                      <h5 className="font-medium text-sm">Keywords</h5>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {selectedCluster.subtopics[selectedSubtopic].keywords.map((keyword, i) => (
                          <span 
                            key={i} 
                            className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-3">
                      <h5 className="font-medium text-sm">Content Ideas</h5>
                      <ul className="mt-1 space-y-1 text-sm">
                        {selectedCluster.subtopics[selectedSubtopic].content_ideas.map((idea, i) => (
                          <li key={i} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{idea}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                
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