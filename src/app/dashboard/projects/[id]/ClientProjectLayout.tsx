'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks';
import { createClient } from '@supabase/supabase-js';
import { ChevronLeft, BarChart2, Keyboard, FileText, Settings, Code, LineChart, Activity } from 'lucide-react';

// Create a Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface Project {
  id: string;
  website_name: string;
  website_url: string;
  created_at: string;
}

interface ClientProjectLayoutProps {
  children: React.ReactNode;
  projectId: string;
}

export function ClientProjectLayout({ children, projectId }: ClientProjectLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('Client Project Layout Rendering - Project ID:', projectId);
  console.log('Current pathname:', pathname);

  const fetchProject = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('Fetching project data for ID:', projectId);
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();
        
      if (error) {
        console.error('Error fetching project:', error);
        router.push('/dashboard');
      } else {
        console.log('Project data fetched successfully:', data);
        setProject(data);
      }
    } catch (err) {
      console.error('Error fetching project:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, user, router]);

  // Redirect if not authenticated
  useEffect(() => {
    console.log('Auth status - User:', !!user, 'Loading:', authLoading);
    if (!authLoading && !user) {
      console.log('User not authenticated, redirecting to login');
      router.push('/login');
    } else if (user) {
      console.log('User authenticated, fetching project');
      fetchProject();
    }
  }, [user, authLoading, router, fetchProject]);

  // Function to determine if a link is active
  const isActive = (path: string) => {
    const fullPath = `/dashboard/projects/${projectId}${path}`;
    const isActivePath = pathname === fullPath;
    console.log(`Checking if path is active: ${fullPath}, result: ${isActivePath}`);
    return isActivePath;
  };

  if (authLoading || loading) {
    console.log('Loading state - Auth loading:', authLoading, 'Content loading:', loading);
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full mb-3 animate-spin"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container py-4">
          <div className="flex items-center mb-4">
            <Link 
              href="/dashboard" 
              className="flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back to Dashboard
            </Link>
            {project && (
              <h1 className="ml-4 font-medium">{project.website_name}</h1>
            )}
          </div>
          
          <nav className="flex space-x-1 relative">
            <Link
              href={`/dashboard/projects/${projectId}`}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("")
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <div className="flex items-center space-x-2">
                <BarChart2 className="h-4 w-4" />
                <span>Overview</span>
              </div>
            </Link>
            
            <Link 
              href={`/dashboard/projects/${projectId}/keywords`}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/keywords")
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Keyboard className="h-4 w-4" />
                <span>Keywords</span>
              </div>
            </Link>
            
            <Link
              href={`/dashboard/projects/${projectId}/content`}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/content")
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Content</span>
              </div>
            </Link>
            
            <Link
              href={`/dashboard/projects/${projectId}/technical-seo`}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/technical-seo")
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Code className="h-4 w-4" />
                <span>Technical SEO</span>
              </div>
            </Link>
            
            <Link
              href={`/dashboard/projects/${projectId}/seo-audit`}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/seo-audit")
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>SEO Audit</span>
              </div>
            </Link>
            
            <Link
              href={`/dashboard/projects/${projectId}/settings`}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive("/settings")
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </div>
            </Link>
          </nav>
        </div>
      </header>
      
      <div className="flex-1 container py-6">
        {children}
      </div>
      
      {/* Direct navigation bar for mobile/fallback navigation */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 md:hidden">
        <div className="bg-black/80 rounded-full flex space-x-1 p-1">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className="p-2 rounded-full text-white hover:bg-white/20"
          >
            <BarChart2 className="h-5 w-5" />
          </Link>
          
          <Link
            href={`/dashboard/projects/${projectId}/keywords`}
            className="p-2 rounded-full text-white hover:bg-white/20"
          >
            <Keyboard className="h-5 w-5" />
          </Link>
          
          <Link
            href={`/dashboard/projects/${projectId}/content`}
            className="p-2 rounded-full text-white hover:bg-white/20"
          >
            <FileText className="h-5 w-5" />
          </Link>
          
          <Link
            href={`/dashboard/projects/${projectId}/technical-seo`}
            className="p-2 rounded-full text-white hover:bg-white/20"
          >
            <Code className="h-5 w-5" />
          </Link>
          
          <Link
            href={`/dashboard/projects/${projectId}/seo-audit`}
            className="p-2 rounded-full text-white hover:bg-white/20"
          >
            <Activity className="h-5 w-5" />
          </Link>
          
          <Link
            href={`/dashboard/projects/${projectId}/settings`}
            className="p-2 rounded-full text-white hover:bg-white/20"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
} 