'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@supabase/supabase-js';
import { ChevronLeft, BarChart2, Keyboard, FileText, Settings, Code } from 'lucide-react';

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

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: {
    id: string;
  };
}

export default function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const projectId = params.id;
  const pathname = usePathname();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      fetchProject();
    }
  }, [user, authLoading, router, projectId]);

  const fetchProject = async () => {
    if (!user) return;
    
    try {
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
        setProject(data);
      }
    } catch (err) {
      console.error('Error fetching project:', err);
    } finally {
      setLoading(false);
    }
  };

  // Function to determine if a link is active
  const isActive = (path: string) => {
    return pathname === `/dashboard/projects/${params.id}${path}`;
  };

  if (authLoading || loading) {
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
          
          <nav className="flex space-x-1">
            <Link
              href={`/dashboard/projects/${params.id}`}
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
              href={`/dashboard/projects/${params.id}/keywords`}
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
              href={`/dashboard/projects/${params.id}/content`}
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
              href={`/dashboard/projects/${params.id}/technical-seo`}
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
              href={`/dashboard/projects/${params.id}/settings`}
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
    </div>
  );
} 