'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  FileText, 
  Globe, 
  Plus, 
  Search, 
  Zap,
  Loader2
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { debugSessionInfo } from '@/lib/auth/session-utils';

interface Project {
  id: string;
  website_name: string;
  website_url: string;
  created_at: string;
  keywords: string[];
}

export default function DashboardPage() {
  const { supabaseUser: user, isAdmin, getActiveUser } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const authCheckRun = useRef(false);

  // SEO metrics (sample data)
  const [seoScore, setSeoScore] = useState(78);
  const [keywordRankings, setKeywordRankings] = useState([
    { keyword: 'digital marketing', position: 12, change: 3 },
    { keyword: 'seo services', position: 8, change: -1 },
    { keyword: 'content strategy', position: 15, change: 5 },
    { keyword: 'local seo', position: 6, change: 2 },
  ]);
  const [trafficData, setTrafficData] = useState({ 
    organic: 1245, 
    direct: 876, 
    referral: 432 
  });
  
  // Enhanced debug logging - but do it only once
  useEffect(() => {
    if (authCheckRun.current) return;
    authCheckRun.current = true;
    
    // Use the debug utility
    debugSessionInfo('Dashboard');
    
    // Check for active user
    const activeUser = getActiveUser();
    
    if (activeUser) {
      console.log('[Dashboard] Active user found:', activeUser.email);
    } else {
      console.log('[Dashboard] No active user from auth hook');
    }
  }, [getActiveUser]);
  
  // Fetch projects when user is available
  useEffect(() => {
    const activeUser = getActiveUser();
    if (activeUser) {
      console.log('[Dashboard] Fetching projects for user:', activeUser.email);
      fetchProjects(activeUser);
    }
  }, [getActiveUser]);
  
  // Set page as loaded after initial data fetch
  useEffect(() => {
    if (!loading) {
      // Small delay to ensure smooth animation sequence
      const timer = setTimeout(() => {
        setPageLoaded(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [loading]);
  
  // Add debounce for user interactions
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setInteractive(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const fetchProjects = async (activeUser: any) => {
    if (!activeUser) return;
    
    try {
      setLoading(true);
      
      // First check if the projects table exists by querying a single row
      const { data: checkData, error: checkError } = await supabase
        .from('projects')
        .select('id')
        .limit(1);
      
      if (checkError) {
        // If there's an error with the table, show a more helpful message
        console.error('Error accessing projects table:', checkError);
        toast({
          title: 'Database error',
          description: 'Unable to access projects data. The projects table may not be properly set up.',
          variant: 'destructive',
        });
        setProjects([]);
        return;
      }
      
      // If the table check passed, fetch projects
      // Use admin status to determine which projects to fetch
      let projectsQuery = supabase.from('projects').select('*');
      
      // Only filter by user_id if not admin
      const userIsAdmin = isAdmin?.() || activeUser.email?.endsWith('@seomax.com');
      
      if (!userIsAdmin) {
        projectsQuery = projectsQuery.eq('user_id', activeUser.id);
      } else {
        console.log('[Dashboard] Admin user detected. Fetching all projects.');
      }
      
      const { data, error } = await projectsQuery.order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching projects:', error);
        toast({
          title: 'Error',
          description: 'Failed to load your projects. Please try again later.',
          variant: 'destructive',
        });
      } else {
        setProjects(data || []);
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      toast({
        title: 'Unexpected error',
        description: 'An unexpected error occurred while loading your projects.',
        variant: 'destructive',
      });
      // Always set projects to empty array on error to prevent UI issues
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4 }
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

  // Show loading spinner while data is loading
  if (loading && !interactive) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight">
              Dashboard
              {isAdmin() && <span className="ml-2 text-blue-500 text-sm">(Admin)</span>}
            </h1>
            <Button asChild>
              <Link href="/dashboard/projects/new">
                <Plus className="mr-2 h-4 w-4" /> New Project
              </Link>
            </Button>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SEO Score</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{seoScore}/100</div>
                <p className="text-xs text-muted-foreground">
                  +2% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Organic Traffic</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{trafficData.organic}</div>
                <p className="text-xs text-muted-foreground">
                  +12% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Keywords Tracked</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{keywordRankings.length}</div>
                <p className="text-xs text-muted-foreground">
                  Averaging position 10.3
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projects.length}</div>
                <p className="text-xs text-muted-foreground">
                  Across {projects.length} websites
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Your Projects</CardTitle>
                <CardDescription>
                  Websites and content currently being tracked
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Globe className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-medium">No projects yet</h3>
                    <p className="mb-4 max-w-md text-sm text-muted-foreground">
                      Add your first website to start tracking keywords and optimizing your content.
                    </p>
                    <Button asChild>
                      <Link href="/dashboard/projects/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Project
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {projects.map(project => (
                      <div 
                        key={project.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="space-y-1">
                          <h3 className="font-medium">{project.website_name}</h3>
                          <p className="text-sm text-muted-foreground">{project.website_url}</p>
                        </div>
                        <Button variant="outline" asChild>
                          <Link href={`/dashboard/projects/${project.id}`}>
                            View Dashboard
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Keyword Rankings</CardTitle>
                <CardDescription>
                  Top keywords and their positions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {keywordRankings.map((keyword, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {keyword.keyword}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Position {keyword.position}
                        </p>
                      </div>
                      <div className={`flex items-center ${keyword.change > 0 ? 'text-green-500' : keyword.change < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {keyword.change > 0 ? '↑' : keyword.change < 0 ? '↓' : '−'}
                        <span className="ml-1">{Math.abs(keyword.change)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
} 