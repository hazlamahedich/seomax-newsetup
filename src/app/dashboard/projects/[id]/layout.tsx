'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@supabase/supabase-js';
import { BarChart, FileText, Globe, Home, LayoutDashboard, Search, Settings, ArrowLeft, LineChart } from 'lucide-react';
import { ReactNode } from 'react';

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
  children: ReactNode;
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

  const isActive = (path: string) => {
    if (path === '/dashboard/projects/' + projectId) {
      return pathname === path;
    }
    return pathname.startsWith(path);
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
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="container flex h-14 items-center">
          <Link
            href="/dashboard"
            className="flex items-center mr-6 text-sm font-medium transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <nav className="flex items-center space-x-4 lg:space-x-6 mx-6">
            <Link
              href={`/dashboard/projects/${projectId}`}
              className={`flex items-center text-sm font-medium transition-colors hover:text-primary ${
                isActive(`/dashboard/projects/${projectId}`) && !isActive(`/dashboard/projects/${projectId}/keywords`) && !isActive(`/dashboard/projects/${projectId}/content`) && !isActive(`/dashboard/projects/${projectId}/settings`)
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <Home className="h-4 w-4 mr-2" />
              Overview
            </Link>
            <Link
              href={`/dashboard/projects/${projectId}/keywords`}
              className={`flex items-center text-sm font-medium transition-colors hover:text-primary ${
                isActive(`/dashboard/projects/${projectId}/keywords`)
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <Search className="h-4 w-4 mr-2" />
              Keywords
            </Link>
            <Link
              href={`/dashboard/projects/${projectId}/content`}
              className={`flex items-center text-sm font-medium transition-colors hover:text-primary ${
                isActive(`/dashboard/projects/${projectId}/content`)
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <FileText className="h-4 w-4 mr-2" />
              Content
            </Link>
            <Link
              href={`/dashboard/projects/${projectId}/settings`}
              className={`flex items-center text-sm font-medium transition-colors hover:text-primary ${
                isActive(`/dashboard/projects/${projectId}/settings`)
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 container py-6">
        {children}
      </main>
    </div>
  );
} 