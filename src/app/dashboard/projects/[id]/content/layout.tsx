import React from 'react';
import { createClient } from '@/lib/supabase/server-admin';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ContentBreadcrumb from './components/ContentBreadcrumb';
import ContentTabNavigation from './components/ContentTabNavigation';
import { createClient as createRegularClient } from '@/lib/supabase/server';

interface LayoutProps {
  children: React.ReactNode;
  params: { id: string };
}

export default async function ContentLayout({ children, params }: LayoutProps) {
  // First check authentication using regular client
  const regularClient = createRegularClient();
  const { data: { session } } = await regularClient.auth.getSession();
  
  if (!session) {
    // If not authenticated, redirect to login
    return redirect('/login');
  }
  
  // Now get the project using admin client to bypass RLS
  try {
    const adminClient = createClient();
    const { data: project } = await adminClient
      .from('projects')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!project) {
      // If project doesn't exist, redirect to dashboard
      console.log('Project not found with ID:', params.id);
      return redirect('/dashboard');
    }

    // Check if project belongs to current user
    if (project.user_id !== session.user.id) {
      console.log('User does not have access to this project:', params.id);
      return redirect('/dashboard');
    }

    // Project exists and user has access - render the content
    return (
      <div className="space-y-6">
        <ContentBreadcrumb projectId={params.id} projectName={project.name || project.website_name || 'Project'} />
        <ContentTabNavigation projectId={params.id} />
        {children}
      </div>
    );
  } catch (error) {
    console.error('Error in content layout:', error);
    return redirect('/dashboard');
  }
} 