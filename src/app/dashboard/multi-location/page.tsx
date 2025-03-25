import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LocationManager } from '@/components/multi-location/LocationManager';

export const metadata: Metadata = {
  title: 'Multi-location SEO Management | SEOMax',
  description: 'Manage and optimize SEO across multiple business locations from a single dashboard.',
};

interface MultiLocationPageProps {
  searchParams: {
    projectId?: string;
    siteId?: string;
  };
}

export default async function MultiLocationPage({ searchParams }: MultiLocationPageProps) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login');
  }

  // Get project from query params or get the first project
  let projectId = searchParams.projectId;
  let siteId = searchParams.siteId;

  if (!projectId || !siteId) {
    const supabase = createClient('server', process.env.NEXT_PUBLIC_SUPABASE_URL || '');
    
    // Get the user's first project if not specified
    if (!projectId) {
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (projects && projects.length > 0) {
        projectId = projects[0].id;
      }
    }
    
    // Get the first site for this project if not specified
    if (projectId && !siteId) {
      const { data: sites } = await supabase
        .from('site_crawls')
        .select('id')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (sites && sites.length > 0) {
        siteId = sites[0].id;
      }
    }
    
    // If we still don't have both projectId and siteId, redirect to projects
    if (!projectId || !siteId) {
      redirect('/dashboard/projects');
    }
    
    // Redirect to include the IDs in the URL for better sharing/bookmarking
    redirect(`/dashboard/multi-location?projectId=${projectId}&siteId=${siteId}`);
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Multi-location SEO Management</h1>
      <p className="text-gray-500 mb-8">
        Manage and optimize SEO across all your business locations from a single dashboard.
        Add your business locations, analyze their local SEO performance, and get consolidated reports.
      </p>
      
      <LocationManager projectId={projectId} siteId={siteId} />
    </div>
  );
} 