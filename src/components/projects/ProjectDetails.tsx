import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/providers/auth-provider';
import { checkIsAdminFromStorage, getSessionFromStorage } from '@/lib/auth/session-utils';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

interface ProjectDetailsProps {
  project: {
    id: string;
    name: string;
    description?: string;
    url?: string;
    created_at?: string;
    updated_at?: string;
    user_id?: string;
    [key: string]: any;
  } | null;
}

export default function ProjectDetails({ project: initialProject }: ProjectDetailsProps) {
  const { supabaseUser, isAdmin: checkIsAdmin } = useAuth();
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;
  const [project, setProject] = useState(initialProject);
  const [loading, setLoading] = useState(!initialProject);
  const fetchStarted = useRef(false);

  // Fetch project data if not provided
  useEffect(() => {
    // Skip if we already have a project or already started fetch
    if (initialProject || fetchStarted.current) {
      return;
    }

    // Mark that we've started a fetch
    fetchStarted.current = true;
    console.log('[ProjectDetails] Starting project fetch for ID:', projectId);

    // Check if we have a user before fetching
    const activeUser = supabaseUser || getSessionFromStorage().user;
    const userIsAdmin = checkIsAdmin?.() || checkIsAdminFromStorage();

    if (!activeUser) {
      console.error('[ProjectDetails] No authenticated user found');
      return;
    }

    // Fetch project data
    const fetchProject = async () => {
      try {
        if (!projectId) return;
        
        setLoading(true);
        
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();
          
        if (error) {
          console.error('[ProjectDetails] Error fetching project:', error);
          toast.error('Failed to load project details');
          return;
        }
        
        if (!data) {
          console.error('[ProjectDetails] Project not found');
          toast.error('Project not found');
          return;
        }
        
        // Check ownership with string comparison
        const ownerId = String(data.user_id);
        const userId = String(activeUser.id || '');
        const isOwner = ownerId === userId;
        
        if (isOwner || userIsAdmin) {
          console.log('[ProjectDetails] User has access to project');
          setProject(data);
        } else {
          console.log('[ProjectDetails] User does not have access to project');
          toast.error('You do not have access to this project');
          setTimeout(() => router.push('/dashboard'), 500);
        }
      } catch (err) {
        console.error('[ProjectDetails] Error:', err);
        toast.error('Error loading project');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProject();
  }, [initialProject, projectId, router, supabaseUser, checkIsAdmin]);

  if (loading || !project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="large" message="Loading project details..." />
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{project.name || project.website_name}</h1>
        <p className="text-muted-foreground mt-2">
          {project.description || 'No description provided'}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>Basic information about this project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Project ID</h3>
                <p className="text-sm text-muted-foreground">{project.id}</p>
              </div>
              {(project.url || project.website_url) && (
                <div>
                  <h3 className="font-medium">Website URL</h3>
                  <p className="text-sm text-muted-foreground break-all">
                    <a href={project.url || project.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {project.url || project.website_url}
                    </a>
                  </p>
                </div>
              )}
              <div>
                <h3 className="font-medium">Created</h3>
                <p className="text-sm text-muted-foreground">{formatDate(project.created_at)}</p>
              </div>
              <div>
                <h3 className="font-medium">Last Updated</h3>
                <p className="text-sm text-muted-foreground">{formatDate(project.updated_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Analysis & Metrics</CardTitle>
            <CardDescription>SEO scores and analytics for this project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground">No analysis data available yet.</p>
              <p className="text-muted-foreground mt-2">Run an SEO audit to start analyzing this project.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 