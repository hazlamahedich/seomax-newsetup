'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TopicClusterService } from '@/lib/services/content-service';
import { TopicCluster as BaseTopicCluster } from '@/lib/types/database.types';

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
      
      // Transform each cluster to include visualization properties
      const extendedClusters: TopicCluster[] = projectClusters.map(cluster => ({
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
      const clusterData = await TopicClusterService.getTopicCluster(id);
      
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

    try {
      setIsLoading(true);
      
      // This would normally call an AI service to generate a topic cluster
      // For now, we'll use a mock structure
      const newCluster = await TopicClusterService.createTopicCluster({
        project_id: projectId,
        name: mainKeyword.trim(),
        main_keyword: mainKeyword.trim(),
        related_topics: [
          `${mainKeyword} guide`,
          `${mainKeyword} examples`,
          `${mainKeyword} tools`
        ]
      });
      
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
    canvas.height = 600; // Fixed height for better visualization
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Colors
    const mainColor = '#3b82f6'; // blue for main topic
    const subColor = '#60a5fa'; // lighter blue for subtopics
    const keywordColor = '#93c5fd'; // even lighter blue for keywords
    const lineColor = '#dbeafe'; // very light blue for connections
    const textColor = '#1e3a8a'; // dark blue for text
    const shadowColor = 'rgba(0, 0, 0, 0.1)';
    
    // Calculate positions
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const mainRadius = 100;
    const subRadius = 80;
    const keywordRadius = 40;
    const subTopicDistance = 250;
    
    // Draw shadow for main topic
    ctx.beginPath();
    ctx.arc(centerX + 5, centerY + 5, mainRadius, 0, 2 * Math.PI);
    ctx.fillStyle = shadowColor;
    ctx.fill();
    
    // Draw main topic
    ctx.beginPath();
    ctx.arc(centerX, centerY, mainRadius, 0, 2 * Math.PI);
    ctx.fillStyle = mainColor;
    ctx.fill();
    
    // Add fancy gradient to main topic
    const gradient = ctx.createRadialGradient(
      centerX - mainRadius/3, centerY - mainRadius/3, 0,
      centerX, centerY, mainRadius
    );
    gradient.addColorStop(0, '#60a5fa');
    gradient.addColorStop(1, '#3b82f6');
    ctx.beginPath();
    ctx.arc(centerX, centerY, mainRadius, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw main topic text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Handle long text by splitting it
    const mainTopicText = selectedCluster.main_topic;
    const words = mainTopicText.split(' ');
    let line = '';
    let lines = [];
    
    // Split text into lines that fit
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > mainRadius * 1.5 && i > 0) {
        lines.push(line);
        line = words[i] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);
    
    // Draw each line
    lines.forEach((line, index) => {
      const lineOffset = (index - (lines.length - 1) / 2) * 24;
      ctx.fillText(line.trim(), centerX, centerY + lineOffset);
    });
    
    // Draw subtopics
    selectedCluster.subtopics.forEach((subtopic, index) => {
      // Calculate position in a circle around the main topic
      const totalSubtopics = selectedCluster.subtopics.length;
      const angle = (Math.PI * 2 * index) / totalSubtopics - Math.PI / 2;
      const x = centerX + subTopicDistance * Math.cos(angle);
      const y = centerY + subTopicDistance * Math.sin(angle);
      
      // Draw connection line from main to subtopic with curved path
      ctx.beginPath();
      const midX = centerX + (x - centerX) / 2;
      const midY = centerY + (y - centerY) / 2;
      
      // Add a slight curve to the connection line
      const curveOffset = 30;
      const curveX = midX + curveOffset * Math.cos(angle + Math.PI/2);
      const curveY = midY + curveOffset * Math.sin(angle + Math.PI/2);
      
      ctx.moveTo(centerX, centerY);
      ctx.quadraticCurveTo(curveX, curveY, x, y);
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Draw shadow for subtopic
      ctx.beginPath();
      ctx.arc(x + 5, y + 5, subRadius, 0, 2 * Math.PI);
      ctx.fillStyle = shadowColor;
      ctx.fill();
      
      // Draw subtopic with gradient
      const subGradient = ctx.createRadialGradient(
        x - subRadius/3, y - subRadius/3, 0,
        x, y, subRadius
      );
      subGradient.addColorStop(0, '#93c5fd');
      subGradient.addColorStop(1, '#60a5fa');
      ctx.beginPath();
      ctx.arc(x, y, subRadius, 0, 2 * Math.PI);
      ctx.fillStyle = subGradient;
      ctx.fill();
      
      // Draw subtopic text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Arial';
      
      // Split subtopic name into lines
      const subWords = subtopic.name.split(' ');
      let subLine = '';
      let subLines = [];
      
      for (let i = 0; i < subWords.length; i++) {
        const testLine = subLine + subWords[i] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > subRadius * 1.5 && i > 0) {
          subLines.push(subLine);
          subLine = subWords[i] + ' ';
        } else {
          subLine = testLine;
        }
      }
      subLines.push(subLine);
      
      // Draw each line
      subLines.forEach((line, i) => {
        const lineOffset = (i - (subLines.length - 1) / 2) * 20;
        ctx.fillText(line.trim(), x, y + lineOffset);
      });
      
      // Draw small indicator for number of keywords
      ctx.font = '13px Arial';
      ctx.fillStyle = 'white';
      ctx.fillText(`${subtopic.keywords.length} keywords`, x, y + subRadius - 18);
      
      // Draw small indicator for number of content ideas
      ctx.fillText(`${subtopic.content_ideas.length} content ideas`, x, y + subRadius - 2);
      
      // Draw keywords around subtopic for important ones (limit to 3)
      const displayKeywords = subtopic.keywords.slice(0, 3);
      displayKeywords.forEach((keyword, kIndex) => {
        // Calculate keyword position
        const keywordAngle = (Math.PI * 2 * kIndex) / displayKeywords.length;
        const keywordDistance = subRadius + 60;
        const kx = x + keywordDistance * Math.cos(keywordAngle);
        const ky = y + keywordDistance * Math.sin(keywordAngle);
        
        // Draw keyword bubble
        ctx.beginPath();
        ctx.arc(kx, ky, keywordRadius, 0, 2 * Math.PI);
        ctx.fillStyle = keywordColor;
        ctx.fill();
        
        // Draw keyword text
        ctx.fillStyle = textColor;
        ctx.font = '12px Arial';
        
        // Handle long keywords
        const keywordWords = keyword.split(' ');
        let keywordLine = '';
        let keywordLines = [];
        
        for (let i = 0; i < keywordWords.length; i++) {
          const testLine = keywordLine + keywordWords[i] + ' ';
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
          
          if (testWidth > keywordRadius * 1.5 && i > 0) {
            keywordLines.push(keywordLine);
            keywordLine = keywordWords[i] + ' ';
          } else {
            keywordLine = testLine;
          }
        }
        keywordLines.push(keywordLine);
        
        // Draw each keyword line
        keywordLines.forEach((line, i) => {
          const lineOffset = (i - (keywordLines.length - 1) / 2) * 16;
          ctx.fillText(line.trim(), kx, ky + lineOffset);
        });
        
        // Draw connection line from subtopic to keyword
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(kx, ky);
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    });
  };

  // Helper function to generate subtopics from cluster data
  const generateSubtopicsFromCluster = (cluster: BaseTopicCluster) => {
    // If related_topics is available, use it to generate subtopics
    if (cluster.related_topics && cluster.related_topics.length > 0) {
      return cluster.related_topics.map(topic => ({
        name: topic,
        keywords: [topic, `${topic} guide`, `${topic} examples`],
        content_ideas: [`Complete guide to ${topic}`, `Best practices for ${topic}`]
      }));
    }
    
    // If no related topics, create default subtopics based on main keyword
    return [
      {
        name: `${cluster.main_keyword} guide`,
        keywords: [`best ${cluster.main_keyword}`, `${cluster.main_keyword} tutorial`],
        content_ideas: [
          `Complete guide to ${cluster.main_keyword}`,
          `How to use ${cluster.main_keyword} effectively`
        ]
      },
      {
        name: `${cluster.main_keyword} examples`,
        keywords: [`${cluster.main_keyword} examples`, `${cluster.main_keyword} case studies`],
        content_ideas: [
          `10 examples of ${cluster.main_keyword} in action`,
          `Case studies: ${cluster.main_keyword} success stories`
        ]
      },
      {
        name: `${cluster.main_keyword} tools`,
        keywords: [`best ${cluster.main_keyword} tools`, `${cluster.main_keyword} software`],
        content_ideas: [
          `Top 5 tools for ${cluster.main_keyword}`,
          `${cluster.main_keyword} software comparison`
        ]
      }
    ];
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