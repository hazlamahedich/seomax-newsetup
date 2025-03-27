"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, BarChart2, Keyboard, FileText, Settings, Code, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { debugSessionInfo } from '@/lib/auth/session-utils';

interface Project {
  id: string;
  name?: string;
  website_name?: string;
  description?: string;
  url?: string;
  website_url?: string;
  created_at: string;
  user_id: string;
}

interface ProjectUIProps {
  children: React.ReactNode;
}

export default function ProjectUI({
  children
}: ProjectUIProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  // Get ID from params (client component, so this is safe)
  const projectId = params?.id as string;
  
  const { getActiveUser } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchAttempted = useRef(false);

  // Check authentication first
  useEffect(() => {
    if (!fetchAttempted.current) {
      fetchAttempted.current = true;
      
      const activeUser = getActiveUser();
      debugSessionInfo('ProjectUI');
      
      if (!activeUser) {
        console.log('[ProjectUI] No authenticated user, redirecting to login');
        router.push('/login');
      }
    }
  }, [getActiveUser, router]);

  // Fetch project data on initial render, but only once
  useEffect(() => {
    // Skip if we've already loaded the project or don't have project ID
    if (project || !projectId) return;
    
    const fetchProject = async () => {
      try {
        setLoading(true);
        console.log('[ProjectUI] Fetching project data for ID:', projectId);
        
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();
          
        if (error) {
          console.error('[ProjectUI] Error fetching project:', error);
          toast.error('Failed to load project details');
          return;
        }
        
        if (data) {
          console.log('[ProjectUI] Project data loaded:', data.website_name || data.name);
          setProject(data);
        }
      } catch (err) {
        console.error('[ProjectUI] Error:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProject();
  }, [projectId, project]);

  // Function to determine if a link is active
  const isActive = (path: string) => {
    const fullPath = `/dashboard/projects/${projectId}${path}`;
    return pathname === fullPath;
  };

  // Show loading UI
  if (loading && !project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="large" message="Loading project..." />
      </div>
    );
  }

  const projectName = project?.name || project?.website_name || 'Project';

  // Show project content with navigation
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
              <h1 className="ml-4 font-medium">{projectName}</h1>
            )}
          </div>
          
          <nav className="flex space-x-1 overflow-x-auto pb-2 relative">
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
      
      {/* Mobile navigation bar */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 md:hidden">
        <div className="bg-black/80 backdrop-blur-sm rounded-full flex space-x-1 p-1">
          <Link
            href={`/dashboard/projects/${projectId}`}
            className={`p-2 rounded-full text-white ${isActive("") ? "bg-white/20" : "hover:bg-white/10"}`}
          >
            <BarChart2 className="h-5 w-5" />
          </Link>
          
          <Link
            href={`/dashboard/projects/${projectId}/keywords`}
            className={`p-2 rounded-full text-white ${isActive("/keywords") ? "bg-white/20" : "hover:bg-white/10"}`}
          >
            <Keyboard className="h-5 w-5" />
          </Link>
          
          <Link
            href={`/dashboard/projects/${projectId}/content`}
            className={`p-2 rounded-full text-white ${isActive("/content") ? "bg-white/20" : "hover:bg-white/10"}`}
          >
            <FileText className="h-5 w-5" />
          </Link>
          
          <Link
            href={`/dashboard/projects/${projectId}/technical-seo`}
            className={`p-2 rounded-full text-white ${isActive("/technical-seo") ? "bg-white/20" : "hover:bg-white/10"}`}
          >
            <Code className="h-5 w-5" />
          </Link>
          
          <Link
            href={`/dashboard/projects/${projectId}/settings`}
            className={`p-2 rounded-full text-white ${isActive("/settings") ? "bg-white/20" : "hover:bg-white/10"}`}
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
} 