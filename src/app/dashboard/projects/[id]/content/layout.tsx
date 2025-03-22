import React from 'react';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ContentBreadcrumb from './components/ContentBreadcrumb';
import ContentTabNavigation from './components/ContentTabNavigation';

interface LayoutProps {
  children: React.ReactNode;
  params: { id: string };
}

export default async function ContentLayout({ children, params }: LayoutProps) {
  const supabase = createServerClient();
  
  // Check if user is logged in
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  // Get the project to ensure it belongs to the current user
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', session.user.id)
    .single();

  if (!project) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <ContentBreadcrumb projectId={params.id} projectName={project.name} />
      <ContentTabNavigation projectId={params.id} />
      {children}
    </div>
  );
} 