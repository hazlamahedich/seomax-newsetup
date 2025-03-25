'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { LineChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, ComposedChart } from 'recharts';
import { cn } from '@/lib/utils';

// Types for the recommendations form
interface RecommendationFormData {
  description: string;
  impact: string;
  effort: string;
  category: string;
}

interface ForecastFormProps {
  projectId: string;
  siteId: string;
  onSuccess: (result: any) => void;
}

interface ForecastChartProps {
  data: any[];
}

const SEOForecastingPage = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('generate');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [forecastResult, setForecastResult] = useState<any | null>(null);
  
  // Get user projects
  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch projects');
      const data = await res.json();
      return data.projects;
    },
    enabled: !!session,
  });
  
  // Get sites for selected project
  const { data: sites, isLoading: sitesLoading } = useQuery({
    queryKey: ['sites', selectedProject],
    queryFn: async () => {
      const res = await fetch(`/api/sites?projectId=${selectedProject}`);
      if (!res.ok) throw new Error('Failed to fetch sites');
      const data = await res.json();
      return data.sites;
    },
    enabled: !!selectedProject,
  });
  
  // Get forecasts for selected project
  const { data: forecasts, isLoading: forecastsLoading } = useQuery({
    queryKey: ['forecasts', selectedProject],
    queryFn: async () => {
      const res = await fetch('/api/seo-forecasting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getProjectForecasts',
          projectId: selectedProject
        })
      });
      if (!res.ok) throw new Error('Failed to fetch forecasts');
      const data = await res.json();
      return data.forecasts;
    },
    enabled: !!selectedProject,
  });
  
  // Get site metrics for selected site
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['metrics', selectedSite],
    queryFn: async () => {
      const res = await fetch('/api/seo-forecasting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getSiteMetrics',
          siteId: selectedSite
        })
      });
      if (!res.ok) throw new Error('Failed to fetch site metrics');
      const data = await res.json();
      return data.metrics;
    },
    enabled: !!selectedSite,
  });
  
  // Select first project by default when projects load
  useEffect(() => {
    if (projects?.length && !selectedProject) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject]);
  
  // Select first site by default when sites load
  useEffect(() => {
    if (sites?.length && !selectedSite) {
      setSelectedSite(sites[0].id);
    }
  }, [sites, selectedSite]);
  
  const handleForecastSuccess = (result: any) => {
    setForecastResult(result);
    setActiveTab('result');
    toast({
      title: 'Forecast generated successfully',
      description: 'Your SEO forecast has been created with projections for the next 12 months.',
      variant: 'default',
    });
  };
  
  return (
    <DashboardShell>
      <DashboardHeader
        heading="SEO ROI Forecasting"
        text="Project traffic and conversion gains from implementing SEO recommendations"
      />
      
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <h2 className="text-lg font-medium">Project</h2>
            <div className="grid gap-2">
              {projectsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {projects?.length ? (
                    projects.map((project: any) => (
                      <Button
                        key={project.id}
                        variant={selectedProject === project.id ? 'default' : 'outline'}
                        onClick={() => {
                          setSelectedProject(project.id);
                          setSelectedSite(null);
                        }}
                        className="max-w-[200px] truncate"
                      >
                        {project.name}
                      </Button>
                    ))
                  ) : (
                    <div className="flex items-center justify-between rounded-lg border border-dashed p-4 w-full">
                      <div className="grid gap-1">
                        <h3 className="text-sm font-medium">No projects found</h3>
                        <p className="text-sm text-muted-foreground">
                          Create a project to start forecasting.
                        </p>
                      </div>
                      <Button onClick={() => router.push('/dashboard/projects/new')}>
                        Create Project
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {selectedProject && (
            <div className="grid gap-2">
              <h2 className="text-lg font-medium">Site</h2>
              <div className="grid gap-2">
                {sitesLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {sites?.length ? (
                      sites.map((site: any) => (
                        <Button
                          key={site.id}
                          variant={selectedSite === site.id ? 'default' : 'outline'}
                          onClick={() => setSelectedSite(site.id)}
                          className="max-w-[200px] truncate"
                        >
                          {site.domain}
                        </Button>
                      ))
                    ) : (
                      <div className="flex items-center justify-between rounded-lg border border-dashed p-4 w-full">
                        <div className="grid gap-1">
                          <h3 className="text-sm font-medium">No sites found</h3>
                          <p className="text-sm text-muted-foreground">
                            Add a site to this project to start forecasting.
                          </p>
                        </div>
                        <Button onClick={() => router.push(`/dashboard/projects/${selectedProject}/sites/new`)}>
                          Add Site
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {selectedProject && selectedSite && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="generate">Generate Forecast</TabsTrigger>
              <TabsTrigger value="result" disabled={!forecastResult}>Results</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="generate" className="space-y-4">
              {metrics?.length > 0 ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Historical Metrics</CardTitle>
                      <CardDescription>
                        Site performance over the last {metrics.length} months
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart
                            data={metrics}
                            margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis yAxisId="left" />
                            <YAxis yAxisId="right" orientation="right" />
                            <Tooltip />
                            <Legend />
                            <Bar yAxisId="left" dataKey="traffic" fill="#8884d8" name="Traffic" />
                            <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#82ca9d" name="Conversions" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <ForecastForm 
                    projectId={selectedProject}
                    siteId={selectedSite}
                    onSuccess={handleForecastSuccess}
                  />
                </>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>No Historical Data</CardTitle>
                    <CardDescription>
                      No historical metrics found for this site. We'll use industry benchmarks for forecasting.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ForecastForm 
                      projectId={selectedProject}
                      siteId={selectedSite}
                      onSuccess={handleForecastSuccess}
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="result" className="space-y-4">
              {forecastResult ? (
                <ForecastResultView forecast={forecastResult} />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>No Forecast</CardTitle>
                    <CardDescription>
                      Generate a forecast to see results here.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Past Forecasts</CardTitle>
                  <CardDescription>
                    View your previous SEO forecasts for this project.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {forecastsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : forecasts?.length ? (
                    <div className="grid gap-4">
                      {forecasts.map((forecast: any) => (
                        <div 
                          key={forecast.id} 
                          className="flex flex-col gap-2 rounded-lg border p-4 cursor-pointer hover:bg-slate-50"
                          onClick={() => {
                            setForecastResult(forecast);
                            setActiveTab('result');
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {new Date(forecast.created_at).toLocaleDateString()}
                              </Badge>
                              <Badge variant="secondary">
                                {forecast.recommendations.length} Recommendations
                              </Badge>
                              <Badge 
                                className={cn(
                                  "font-medium",
                                  parseFloat(forecast.roi.roiPercentage) >= 100 ? "bg-green-100 text-green-800" :
                                  parseFloat(forecast.roi.roiPercentage) >= 50 ? "bg-blue-100 text-blue-800" :
                                  "bg-yellow-100 text-yellow-800"
                                )}
                              >
                                ROI: {parseFloat(forecast.roi.roiPercentage).toFixed(0)}%
                              </Badge>
                            </div>
                          </div>
                          <div className="mt-2">
                            <div className="flex justify-between text-sm">
                              <span>Traffic Increase: +{parseFloat(forecast.roi.trafficIncrease).toFixed(0)}%</span>
                              <span>Revenue Increase: +{parseFloat(forecast.roi.revenueIncrease).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No forecasts found for this project.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardShell>
  );
};

const ForecastForm = ({ projectId, siteId, onSuccess }: ForecastFormProps) => {
  const { toast } = useToast();
  const [recommendations, setRecommendations] = useState<RecommendationFormData[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRecommendation, setNewRecommendation] = useState<RecommendationFormData>({
    description: '',
    impact: 'medium',
    effort: 'medium',
    category: 'technical'
  });
  
  const forecastMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/seo-forecasting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateForecast',
          ...data
        })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate forecast');
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      onSuccess(data.forecast);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  const handleAddRecommendation = () => {
    if (!newRecommendation.description.trim()) {
      toast({
        title: 'Invalid recommendation',
        description: 'Description is required',
        variant: 'destructive',
      });
      return;
    }
    
    setRecommendations([...recommendations, newRecommendation]);
    setNewRecommendation({
      description: '',
      impact: 'medium',
      effort: 'medium',
      category: 'technical'
    });
    setShowAddDialog(false);
  };
  
  const handleRemoveRecommendation = (index: number) => {
    const updatedRecommendations = [...recommendations];
    updatedRecommendations.splice(index, 1);
    setRecommendations(updatedRecommendations);
  };
  
  const handleGenerateForecast = () => {
    if (recommendations.length === 0) {
      toast({
        title: 'No recommendations',
        description: 'Add at least one recommendation to generate a forecast',
        variant: 'destructive',
      });
      return;
    }
    
    forecastMutation.mutate({
      projectId,
      siteId,
      recommendations,
    });
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate SEO Forecast</CardTitle>
        <CardDescription>
          Add your SEO recommendations to generate an ROI forecast
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-md font-medium">SEO Recommendations</h3>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">Add Recommendation</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add SEO Recommendation</DialogTitle>
                  <DialogDescription>
                    Enter the details of your SEO recommendation below.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the SEO recommendation"
                      value={newRecommendation.description}
                      onChange={(e) => setNewRecommendation({
                        ...newRecommendation,
                        description: e.target.value
                      })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="impact">Impact</Label>
                      <Select
                        value={newRecommendation.impact}
                        onValueChange={(value) => setNewRecommendation({
                          ...newRecommendation,
                          impact: value
                        })}
                      >
                        <SelectTrigger id="impact">
                          <SelectValue placeholder="Select impact" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="effort">Effort</Label>
                      <Select
                        value={newRecommendation.effort}
                        onValueChange={(value) => setNewRecommendation({
                          ...newRecommendation,
                          effort: value
                        })}
                      >
                        <SelectTrigger id="effort">
                          <SelectValue placeholder="Select effort" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newRecommendation.category}
                      onValueChange={(value) => setNewRecommendation({
                        ...newRecommendation,
                        category: value
                      })}
                    >
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technical SEO</SelectItem>
                        <SelectItem value="content">Content</SelectItem>
                        <SelectItem value="onpage">On-Page SEO</SelectItem>
                        <SelectItem value="offpage">Off-Page SEO</SelectItem>
                        <SelectItem value="local">Local SEO</SelectItem>
                        <SelectItem value="user-experience">User Experience</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                  <Button onClick={handleAddRecommendation}>Add Recommendation</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          
          {recommendations.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed p-8">
              <div className="grid gap-1 text-center">
                <h3 className="text-sm font-medium">No recommendations added</h3>
                <p className="text-sm text-muted-foreground">
                  Add SEO recommendations to generate a forecast.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {recommendations.map((rec, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="grid gap-1">
                    <p className="font-medium">{rec.description}</p>
                    <div className="flex gap-2">
                      <Badge 
                        className={cn(
                          rec.impact === 'high' ? "bg-green-100 text-green-800" :
                          rec.impact === 'medium' ? "bg-blue-100 text-blue-800" :
                          "bg-yellow-100 text-yellow-800"
                        )}
                      >
                        Impact: {rec.impact}
                      </Badge>
                      <Badge 
                        className={cn(
                          rec.effort === 'low' ? "bg-green-100 text-green-800" :
                          rec.effort === 'medium' ? "bg-blue-100 text-blue-800" :
                          "bg-yellow-100 text-yellow-800"
                        )}
                      >
                        Effort: {rec.effort}
                      </Badge>
                      <Badge variant="outline">{rec.category}</Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRecommendation(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleGenerateForecast}
          disabled={recommendations.length === 0 || forecastMutation.isPending}
          className="w-full sm:w-auto"
        >
          {forecastMutation.isPending ? "Generating Forecast..." : "Generate Forecast"}
        </Button>
      </CardFooter>
    </Card>
  );
};

const ForecastResultView = ({ forecast }: { forecast: any }) => {
  const formatPercent = (value: number) => `${value.toFixed(0)}%`;
  
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Forecast Overview</CardTitle>
          <CardDescription>
            Projected SEO performance over the next 12 months
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex flex-col rounded-lg border p-4">
              <span className="text-sm text-muted-foreground">Traffic Increase</span>
              <span className="text-2xl font-bold text-green-600">+{formatPercent(forecast.roi.trafficIncrease)}</span>
            </div>
            <div className="flex flex-col rounded-lg border p-4">
              <span className="text-sm text-muted-foreground">Conversion Increase</span>
              <span className="text-2xl font-bold text-blue-600">+{formatPercent(forecast.roi.conversionIncrease)}</span>
            </div>
            <div className="flex flex-col rounded-lg border p-4">
              <span className="text-sm text-muted-foreground">ROI</span>
              <span className="text-2xl font-bold text-violet-600">+{formatPercent(forecast.roi.roiPercentage)}</span>
            </div>
          </div>
          
          <div className="mt-6 h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={forecast.projectedMetrics}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="traffic" stroke="#8884d8" name="Traffic" />
                <Line type="monotone" dataKey="conversions" stroke="#82ca9d" name="Conversions" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Implementation Plan</CardTitle>
            <CardDescription>
              Prioritized tasks for implementing the recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {forecast.implementationPlan.timeline && (
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium mb-2">Timeline</h3>
                  <p>{forecast.implementationPlan.timeline}</p>
                </div>
              )}
              
              <div className="space-y-2">
                <h3 className="font-medium">Prioritized Tasks</h3>
                {forecast.implementationPlan.prioritizedTasks.map((task: any, index: number) => (
                  <div key={index} className="rounded-lg border p-4">
                    <div className="flex justify-between">
                      <h4 className="font-medium">{task.task}</h4>
                      <Badge variant="outline">{task.timeline}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Impact: {task.impact}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Key Assumptions</CardTitle>
            <CardDescription>
              Assumptions made in generating this forecast
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-2">
              {forecast.assumptions.map((assumption: string, index: number) => (
                <li key={index}>{assumption}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => window.print()}>
          Export as PDF
        </Button>
        <Button>
          Implement Recommendations
        </Button>
      </div>
    </div>
  );
};

export default SEOForecastingPage; 