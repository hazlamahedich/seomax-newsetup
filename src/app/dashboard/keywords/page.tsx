'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, TrendingUp, FileText, ListFilter } from 'lucide-react';
import { useExtendedAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import keywordAnalyzer from '@/lib/ai/keyword-analyzer';

interface Project {
  id: string;
  website_name: string;
  website_url: string;
  created_at: string;
  keywords: string[];
}

interface KeywordRanking {
  id: string;
  keyword: string;
  position: number;
  previous_position: number;
  change: number;
  date_checked: string;
  project_id: string;
}

export default function KeywordsPage() {
  const { supabaseUser: user, getActiveUser, refreshAuth, synchronizeSupabaseSession } = useExtendedAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [keywords, setKeywords] = useState<KeywordRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [addingKeyword, setAddingKeyword] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Fetch projects and keywords when user is available
  useEffect(() => {
    const initializeData = async () => {
      try {
        // Try to synchronize sessions first
        await synchronizeSupabaseSession();
        
        const activeUser = getActiveUser();
        
        if (!activeUser) {
          console.warn('No active user found, trying to refresh authentication');
          // Try refreshing authentication
          const refreshedUser = await refreshAuth();
          
          if (refreshedUser) {
            console.log('Authentication refreshed successfully, fetching projects');
            await fetchProjects(refreshedUser);
          } else {
            console.error('Failed to get active user after refresh');
            // Handle missing user appropriately
            toast({
              title: 'Session Expired',
              description: 'Your session has expired. Please sign in again to continue.',
              variant: 'destructive',
            });
            
            // Optionally redirect to login page
            // router.push('/login');
          }
        } else {
          console.log('Active user found, fetching projects');
          await fetchProjects(activeUser);
        }
      } catch (error) {
        console.error('Error initializing keyword page data:', error);
        toast({
          title: 'Authentication Problem',
          description: 'We encountered a problem with your session. Please try refreshing the page or signing in again.',
          variant: 'destructive',
        });
      }
    };
    
    initializeData();
  }, [getActiveUser, refreshAuth, synchronizeSupabaseSession, toast, router]);
  
  useEffect(() => {
    if (selectedProject) {
      fetchKeywords(selectedProject);
    }
  }, [selectedProject, synchronizeSupabaseSession]);
  
  const fetchProjects = async (activeUser: any) => {
    if (!activeUser) {
      console.error('Error fetching projects: No active user found');
      toast({
        title: 'Authentication Error',
        description: 'No user account detected. Please sign in again.',
        variant: 'destructive',
      });
      return;
    }

    // Validate the user ID is a valid non-empty UUID
    if (!activeUser.id || typeof activeUser.id !== 'string' || !activeUser.id.trim()) {
      console.error('Error fetching projects: Invalid user ID:', activeUser.id);
      toast({
        title: 'Authentication Error',
        description: 'User ID is invalid. Please sign in again.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setLoading(true);
      
      console.log('Fetching projects for user:', activeUser.id);
      
      // Ensure Supabase client has the latest session
      await synchronizeSupabaseSession();
      
      // Create new query with proper type checking and error handling
      let projectsQuery = supabase.from('projects').select('*');
      
      if (!activeUser.email?.endsWith('@seomax.com')) {
        console.log('Fetching projects for non-admin user, filtering by user_id:', activeUser.id);
        projectsQuery = projectsQuery.eq('user_id', activeUser.id);
      } else {
        console.log('Fetching all projects for admin user');
      }
      
      const { data, error, status } = await projectsQuery.order('created_at', { ascending: false });
        
      if (error) {
        const errorMessage = `Error fetching projects: ${error.message} (${status})`;
        console.error(errorMessage, error);
        toast({
          title: 'Database Error',
          description: 'Failed to load your projects. Please try refreshing.',
          variant: 'destructive',
        });
      } else {
        console.log(`Fetched ${data?.length || 0} projects successfully`);
        setProjects(data || []);
        // Set the first project as selected if available
        if (data && data.length > 0 && !selectedProject) {
          setSelectedProject(data[0].id);
        } else if (data && data.length === 0) {
          console.log('No projects found for user');
          toast({
            title: 'No Projects Found',
            description: 'Create your first project to get started.',
          });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : (typeof err === 'object' && err !== null) 
          ? JSON.stringify(err) 
          : 'Unknown error';
      
      console.error('Error fetching projects:', errorMessage);
      toast({
        title: 'Unexpected error',
        description: 'An unexpected error occurred while loading your projects.',
        variant: 'destructive',
      });
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchKeywords = async (projectId: string) => {
    try {
      setLoading(true);
      
      console.log(`Fetching keywords for project: ${projectId}`);
      
      // Ensure Supabase client has the latest session
      await synchronizeSupabaseSession();
      
      const { data, error, status } = await supabase
        .from('keyword_rankings')
        .select('*')
        .eq('project_id', projectId)
        .order('position', { ascending: true });
        
      if (error) {
        const errorMessage = `Error fetching keywords: ${error.message} (${status})`;
        console.error(errorMessage, error);
        toast({
          title: 'Database Error',
          description: 'Failed to load keywords. Please try refreshing.',
          variant: 'destructive',
        });
        setKeywords([]);
      } else {
        console.log(`Fetched ${data?.length || 0} keywords successfully`);
        setKeywords(data || []);
        
        if (data && data.length === 0) {
          console.log('No keywords found for this project');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : (typeof err === 'object' && err !== null) 
          ? JSON.stringify(err) 
          : 'Unknown error';
      
      console.error('Error fetching keywords:', errorMessage);
      toast({
        title: 'Unexpected error',
        description: 'An unexpected error occurred while loading keywords.',
        variant: 'destructive',
      });
      setKeywords([]);
    } finally {
      setLoading(false);
    }
  };
  
  const addKeyword = async () => {
    if (!newKeyword.trim() || !selectedProject) return;
    
    try {
      setAddingKeyword(true);
      
      // Get the project details for the website URL
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('website_url, website_name')
        .eq('id', selectedProject)
        .single();
      
      if (projectError) {
        throw new Error('Could not fetch project details');
      }
      
      // Generate a random position between 5 and 50 for demo purposes
      // In a real application, this would come from actual ranking data
      const position = Math.floor(Math.random() * 45) + 5;
      
      const { data, error } = await supabase
        .from('keyword_rankings')
        .insert([
          {
            keyword: newKeyword,
            position: position,
            previous_position: position + Math.floor(Math.random() * 10) - 5, // Random previous position
            change: Math.floor(Math.random() * 10) - 5, // Random change
            date_checked: new Date().toISOString(),
            project_id: selectedProject
          }
        ])
        .select();
        
      if (error) {
        throw new Error('Failed to add keyword');
      }
      
      toast({
        title: 'Keyword added',
        description: `Added "${newKeyword}" to tracking`,
      });
      
      setNewKeyword('');
      
      // Refresh keywords list
      fetchKeywords(selectedProject);
      
    } catch (err: any) {
      console.error('Error adding keyword:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to add keyword',
        variant: 'destructive',
      });
    } finally {
      setAddingKeyword(false);
    }
  };
  
  const analyzeKeyword = async (keyword: string) => {
    if (!selectedProject) return;
    
    try {
      setAnalyzing(true);
      
      // Get the project details for the industry context
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('website_url, website_name')
        .eq('id', selectedProject)
        .single();
      
      if (projectError) {
        throw new Error('Could not fetch project details');
      }
      
      // Using the website name as a simple industry identifier
      const industry = projectData.website_name;
      
      // Call the API endpoint instead of directly using the keyword analyzer
      const response = await fetch('/api/keywords', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keyword,
          industry,
          action: 'research'
        }),
      });
      
      if (!response.ok) {
        // Check if the response is JSON before trying to parse it
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to analyze keyword');
        } else {
          // If not JSON, use text or status
          const errorText = await response.text();
          throw new Error(`Server error (${response.status}): ${
            errorText.length > 100 ? 'Internal server error' : errorText
          }`);
        }
      }
      
      const data = await response.json();
      
      toast({
        title: 'Keyword analyzed',
        description: `Analysis complete for "${keyword}"`,
      });
      
      // Here you would typically save the analysis results
      // For demo purposes, we're just showing a toast
      
    } catch (err: any) {
      console.error('Error analyzing keyword:', err);
      toast({
        title: 'Analysis failed',
        description: err.message || 'Failed to analyze keyword',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };
  
  const activeUser = getActiveUser();
  if (!activeUser) {
    return (
      <div className="flex min-h-screen items-center justify-center p-24">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading user information...</h1>
          <p>Please wait while we retrieve your information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Keywords</h1>
          <div className="flex space-x-2">
            <select 
              className="border rounded-md px-3 py-2 text-sm"
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value)}
              disabled={projects.length === 0}
            >
              {projects.length === 0 ? (
                <option value="">No projects found</option>
              ) : (
                projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.website_name}
                  </option>
                ))
              )}
            </select>
            
            <Button
              onClick={() => router.push('/dashboard/projects/new')}
              variant="outline"
            >
              Add New Project
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Keyword</CardTitle>
              <CardDescription>
                Track a new keyword for your selected project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter keyword to track..."
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  disabled={!selectedProject || addingKeyword}
                />
                <Button 
                  onClick={addKeyword} 
                  disabled={!newKeyword.trim() || !selectedProject || addingKeyword}
                >
                  {addingKeyword ? 'Adding...' : 'Add Keyword'}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Tabs defaultValue="rankings">
            <TabsList>
              <TabsTrigger value="rankings">Rankings</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
            </TabsList>
            
            <TabsContent value="rankings">
              <Card>
                <CardHeader>
                  <CardTitle>Keyword Rankings</CardTitle>
                  <CardDescription>Current positions for tracked keywords</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="py-6 text-center">Loading keywords...</div>
                  ) : keywords.length === 0 ? (
                    <div className="py-6 text-center">
                      <p className="text-muted-foreground">No keywords tracked yet</p>
                      <p className="text-sm mt-1">Add your first keyword above</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {keywords.map((keyword) => (
                        <div key={keyword.id} className="flex items-center justify-between border-b pb-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium leading-none">
                              {keyword.keyword}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Position {keyword.position}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className={`flex items-center ${
                              keyword.change > 0 
                                ? 'text-green-500' 
                                : keyword.change < 0 
                                  ? 'text-red-500' 
                                  : 'text-gray-500'
                            }`}>
                              {keyword.change > 0 
                                ? '↑' 
                                : keyword.change < 0 
                                  ? '↓' 
                                  : '−'}
                              <span className="ml-1">{Math.abs(keyword.change)}</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => analyzeKeyword(keyword.keyword)}
                              disabled={analyzing}
                            >
                              Analyze
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="analysis">
              <Card>
                <CardHeader>
                  <CardTitle>Keyword Analysis</CardTitle>
                  <CardDescription>Detailed insights for your keywords</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="py-6 text-center">
                    <p className="text-muted-foreground">Select a keyword from the Rankings tab and click "Analyze"</p>
                    <p className="text-sm mt-1">Or add a new keyword to analyze</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="trends">
              <Card>
                <CardHeader>
                  <CardTitle>Keyword Trends</CardTitle>
                  <CardDescription>Historical performance of your keywords</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="py-6 text-center">
                    <p className="text-muted-foreground">Trend data will be available after tracking keywords for some time</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 