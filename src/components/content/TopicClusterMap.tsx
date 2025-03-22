'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TopicClusterService } from '@/lib/services/content-service';
import { TopicCluster } from '@/lib/types/database.types';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (projectId) {
      loadClusters();
    }
  }, [projectId]);

  useEffect(() => {
    if (clusterId) {
      loadCluster(clusterId);
    }
  }, [clusterId]);

  useEffect(() => {
    if (selectedCluster) {
      drawClusterMap();
    }
  }, [selectedCluster]);

  const loadClusters = async () => {
    try {
      setIsLoading(true);
      const projectClusters = await TopicClusterService.getTopicClusters(projectId);
      setClusters(projectClusters);
    } catch (error) {
      console.error('Error loading topic clusters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCluster = async (id: string) => {
    try {
      setIsLoading(true);
      const cluster = await TopicClusterService.getTopicCluster(id);
      setSelectedCluster(cluster);
    } catch (error) {
      console.error('Error loading topic cluster:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCluster = async () => {
    if (!mainKeyword.trim()) return;

    try {
      setIsLoading(true);
      
      // This would normally call an AI service to generate a topic cluster
      // For now, we'll use a mock structure
      const newCluster = await TopicClusterService.createTopicCluster({
        project_id: projectId,
        main_topic: mainKeyword.trim(),
        subtopics: [
          {
            name: `${mainKeyword} guide`,
            keywords: [`best ${mainKeyword}`, `${mainKeyword} tutorial`],
            content_ideas: [
              `Complete guide to ${mainKeyword}`,
              `How to use ${mainKeyword} effectively`
            ]
          },
          {
            name: `${mainKeyword} examples`,
            keywords: [`${mainKeyword} examples`, `${mainKeyword} case studies`],
            content_ideas: [
              `10 examples of ${mainKeyword} in action`,
              `Case studies: ${mainKeyword} success stories`
            ]
          },
          {
            name: `${mainKeyword} tools`,
            keywords: [`best ${mainKeyword} tools`, `${mainKeyword} software`],
            content_ideas: [
              `Top 5 tools for ${mainKeyword}`,
              `${mainKeyword} software comparison`
            ]
          }
        ]
      });
      
      setClusters(prevClusters => [...prevClusters, newCluster]);
      setSelectedCluster(newCluster);
      setMainKeyword('');
      
      if (onCreateCluster) {
        onCreateCluster(newCluster);
      }
    } catch (error) {
      console.error('Error creating topic cluster:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const drawClusterMap = () => {
    if (!canvasRef.current || !selectedCluster) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Colors
    const mainColor = '#3b82f6'; // blue
    const subColor = '#60a5fa'; // lighter blue
    const lineColor = '#93c5fd'; // even lighter blue
    
    // Calculate positions
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const mainRadius = 80;
    const subRadius = 60;
    const distance = 200;
    
    // Draw main topic
    ctx.beginPath();
    ctx.arc(centerX, centerY, mainRadius, 0, 2 * Math.PI);
    ctx.fillStyle = mainColor;
    ctx.fill();
    
    // Draw main topic text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(selectedCluster.main_topic, centerX, centerY);
    
    // Draw subtopics
    selectedCluster.subtopics.forEach((subtopic, index) => {
      // Calculate position in a circle around the main topic
      const angle = (2 * Math.PI * index) / selectedCluster.subtopics.length;
      const x = centerX + distance * Math.cos(angle);
      const y = centerY + distance * Math.sin(angle);
      
      // Draw line from main to subtopic
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw subtopic circle
      ctx.beginPath();
      ctx.arc(x, y, subRadius, 0, 2 * Math.PI);
      ctx.fillStyle = subColor;
      ctx.fill();
      
      // Draw subtopic text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Split text into multiple lines if too long
      const words = subtopic.name.split(' ');
      let line = '';
      let lines = [];
      let y_offset = 0;
      
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > subRadius * 1.5 && i > 0) {
          lines.push(line);
          line = words[i] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line);
      
      // Draw each line
      lines.forEach((line, i) => {
        ctx.fillText(line.trim(), x, y - 10 + i * 20);
      });
      
      // Draw small indicator for number of keywords
      ctx.font = '12px Arial';
      ctx.fillText(`${subtopic.keywords.length} keywords`, x, y + subRadius + 15);
    });
  };

  return (
    <div className="w-full space-y-4">
      {!selectedCluster && (
        <Card>
          <CardHeader>
            <CardTitle>Create Topic Cluster</CardTitle>
            <CardDescription>
              Generate a topic cluster map based on your main keyword
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mainKeyword">Main Keyword</Label>
                <div className="flex space-x-2">
                  <Input
                    id="mainKeyword"
                    placeholder="e.g., content marketing"
                    value={mainKeyword}
                    onChange={(e) => setMainKeyword(e.target.value)}
                  />
                  <Button 
                    onClick={handleCreateCluster} 
                    disabled={isLoading || !mainKeyword.trim()}
                  >
                    {isLoading ? 'Generating...' : 'Generate Cluster'}
                  </Button>
                </div>
              </div>
              
              {clusters.length > 0 && (
                <div className="space-y-2">
                  <Label>Your Topic Clusters</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clusters.map((cluster) => (
                      <Card 
                        key={cluster.id} 
                        className="cursor-pointer hover:bg-gray-50 transition"
                        onClick={() => setSelectedCluster(cluster)}
                      >
                        <CardContent className="p-4">
                          <h3 className="font-semibold">{cluster.main_topic}</h3>
                          <p className="text-sm text-gray-500">
                            {cluster.subtopics.length} subtopics
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {selectedCluster && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{selectedCluster.main_topic} Topic Cluster</CardTitle>
              <CardDescription>
                {selectedCluster.subtopics.length} subtopics with {
                  selectedCluster.subtopics.reduce((acc, curr) => acc + curr.keywords.length, 0)
                } keywords
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => setSelectedCluster(null)}>
              Back to List
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="w-full h-[500px] border rounded-lg">
                <canvas 
                  ref={canvasRef} 
                  className="w-full h-full"
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Subtopics</h3>
                <div className="space-y-4">
                  {selectedCluster.subtopics.map((subtopic, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <h4 className="font-semibold text-md">{subtopic.name}</h4>
                        
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Keywords:</h5>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {subtopic.keywords.map((keyword, i) => (
                              <span 
                                key={i} 
                                className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="mt-2">
                          <h5 className="text-sm font-medium">Content Ideas:</h5>
                          <ul className="list-disc list-inside text-sm mt-1">
                            {subtopic.content_ideas.map((idea, i) => (
                              <li key={i}>{idea}</li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 