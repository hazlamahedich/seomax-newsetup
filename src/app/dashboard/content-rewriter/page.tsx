'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ReloadIcon, ArrowRightIcon, CheckCircleIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ContentRewriteFormProps {
  projectId: string;
  onSuccess: (result: any) => void;
}

const ContentRewriterPage = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('rewrite');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [rewriteResult, setRewriteResult] = useState<any | null>(null);
  
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
  
  // Get recent rewrites if a project is selected
  const { data: recentRewrites, isLoading: rewritesLoading } = useQuery({
    queryKey: ['rewrites', selectedProject],
    queryFn: async () => {
      const res = await fetch('/api/content-rewriter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getProjectRewrites',
          projectId: selectedProject,
          limit: 5
        })
      });
      if (!res.ok) throw new Error('Failed to fetch recent rewrites');
      const data = await res.json();
      return data.rewrites;
    },
    enabled: !!selectedProject,
  });
  
  // Select first project by default when projects load
  if (projects?.length && !selectedProject) {
    setSelectedProject(projects[0].id);
  }
  
  const handleRewriteSuccess = (result: any) => {
    setRewriteResult(result);
    setActiveTab('result');
    toast({
      title: 'Content rewritten successfully',
      description: 'Your content has been optimized for SEO while preserving E-E-A-T signals.',
      variant: 'default',
    });
  };
  
  return (
    <DashboardShell>
      <DashboardHeader
        heading="AI Content Rewriter"
        text="Rewrite content to improve SEO while maintaining E-E-A-T signals"
      />
      
      <div className="grid gap-6">
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Project</h2>
          </div>
          <div className="grid gap-4">
            {projectsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="grid gap-2">
                {projects?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {projects.map((project: any) => (
                      <Button
                        key={project.id}
                        variant={selectedProject === project.id ? 'default' : 'outline'}
                        onClick={() => setSelectedProject(project.id)}
                        className="max-w-[200px] truncate"
                      >
                        {project.name}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
                    <div className="grid gap-1">
                      <h3 className="text-sm font-medium">No projects found</h3>
                      <p className="text-sm text-muted-foreground">
                        Create a project to start rewriting content.
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="rewrite">Rewrite Content</TabsTrigger>
              <TabsTrigger value="result" disabled={!rewriteResult}>Results</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            
            <TabsContent value="rewrite" className="space-y-4">
              <ContentRewriteForm 
                projectId={selectedProject}
                onSuccess={handleRewriteSuccess}
              />
            </TabsContent>
            
            <TabsContent value="result" className="space-y-4">
              {rewriteResult ? (
                <RewriteResultView result={rewriteResult} />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>No Result</CardTitle>
                    <CardDescription>
                      Submit content for rewriting to see results here.
                    </CardDescription>
                  </CardHeader>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Rewrites</CardTitle>
                  <CardDescription>
                    View your recent content rewrites.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {rewritesLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ) : recentRewrites?.length ? (
                    <div className="grid gap-4">
                      {recentRewrites.map((rewrite: any) => (
                        <div 
                          key={rewrite.id} 
                          className="flex flex-col gap-2 rounded-lg border p-4"
                          onClick={() => {
                            setRewriteResult(rewrite);
                            setActiveTab('result');
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">
                                {new Date(rewrite.created_at).toLocaleDateString()}
                              </Badge>
                              <Badge 
                                variant="secondary" 
                                className={cn(
                                  "font-medium",
                                  rewrite.readability_score >= 80 ? "bg-green-100 text-green-800" :
                                  rewrite.readability_score >= 60 ? "bg-yellow-100 text-yellow-800" :
                                  "bg-red-100 text-red-800"
                                )}
                              >
                                Readability: {rewrite.readability_score}
                              </Badge>
                            </div>
                            <Button variant="ghost" size="icon">
                              <ChevronRightIcon className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {rewrite.rewritten_content.substring(0, 150)}...
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No rewrites found for this project.
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

const ContentRewriteForm = ({ projectId, onSuccess }: ContentRewriteFormProps) => {
  const { toast } = useToast();
  const [originalContent, setOriginalContent] = useState('');
  const [targetKeywords, setTargetKeywords] = useState('');
  const [preserveEEAT, setPreserveEEAT] = useState(true);
  
  const rewriteMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/content-rewriter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rewriteContent',
          ...data
        })
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to rewrite content');
      }
      
      return await res.json();
    },
    onSuccess: (data) => {
      onSuccess(data.result);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!originalContent.trim()) {
      toast({
        title: 'Missing content',
        description: 'Please enter content to rewrite',
        variant: 'destructive',
      });
      return;
    }
    
    const keywords = targetKeywords
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);
    
    rewriteMutation.mutate({
      projectId,
      originalContent,
      targetKeywords: keywords,
      preserveEEAT
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Rewrite Content</CardTitle>
          <CardDescription>
            Enter your content and target keywords for SEO optimization while preserving E-E-A-T signals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">Original Content</Label>
            <Textarea
              id="content"
              placeholder="Enter the content you want to rewrite..."
              className="min-h-[200px]"
              value={originalContent}
              onChange={(e) => setOriginalContent(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Character count: {originalContent.length}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="keywords">Target Keywords</Label>
            <Input
              id="keywords"
              placeholder="Enter keywords separated by commas"
              value={targetKeywords}
              onChange={(e) => setTargetKeywords(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple keywords with commas (e.g., SEO optimization, content marketing)
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="preserve-eeat"
              checked={preserveEEAT}
              onCheckedChange={setPreserveEEAT}
            />
            <Label htmlFor="preserve-eeat">Preserve E-E-A-T signals</Label>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            disabled={rewriteMutation.isPending || !originalContent.trim()}
            className="w-full sm:w-auto"
          >
            {rewriteMutation.isPending ? (
              <>
                <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                Rewriting...
              </>
            ) : (
              <>
                Rewrite Content
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

interface RewriteResultViewProps {
  result: any;
}

const RewriteResultView = ({ result }: RewriteResultViewProps) => {
  const readabilityColor = 
    result.readability_score >= 80 ? "text-green-600" :
    result.readability_score >= 60 ? "text-yellow-600" :
    "text-red-600";
  
  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Rewritten Content</CardTitle>
          <CardDescription>
            Your content has been optimized for SEO while preserving E-E-A-T signals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px] w-full rounded-md border p-4">
            <p className="whitespace-pre-wrap">{result.rewritten_content}</p>
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex flex-col items-start space-y-4">
          <div className="grid w-full gap-2">
            <div className="flex items-center justify-between">
              <Label>Readability Score</Label>
              <span className={cn("font-medium", readabilityColor)}>
                {result.readability_score}
              </span>
            </div>
            <Progress 
              value={result.readability_score} 
              className={cn(
                result.readability_score >= 80 ? "bg-green-200" :
                result.readability_score >= 60 ? "bg-yellow-200" :
                "bg-red-200"
              )}
            />
          </div>
          
          <div className="w-full">
            <Label className="mb-2 block">E-E-A-T Signals</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.entries(result.eeat_signals).map(([key, value]: [string, any]) => (
                <div key={key} className="flex flex-col items-center rounded-md border p-2">
                  <span className="text-xs text-muted-foreground capitalize">
                    {key.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-medium">
                    {value.score}/10
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="w-full">
            <Label className="mb-2 block">Keyword Usage</Label>
            <div className="space-y-2">
              {Object.entries(result.keyword_usage).map(([keyword, data]: [string, any]) => (
                <div key={keyword} className="flex items-center justify-between rounded-md border p-2">
                  <span className="font-medium">{keyword}</span>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-muted-foreground">Before:</span>
                      <span className="text-sm">{data.before}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-muted-foreground">After:</span>
                      <span className="text-sm font-medium">{data.after}</span>
                    </div>
                    {data.after > data.before ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-500" />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardFooter>
      </Card>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => window.print()}>
          Print Content
        </Button>
        <Button 
          onClick={() => {
            navigator.clipboard.writeText(result.rewritten_content);
            toast({
              title: 'Copied to clipboard',
              description: 'The rewritten content has been copied to your clipboard.',
              variant: 'default',
            });
          }}
        >
          Copy to Clipboard
        </Button>
      </div>
    </div>
  );
};

export default ContentRewriterPage; 