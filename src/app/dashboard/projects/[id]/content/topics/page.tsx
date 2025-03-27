import React from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PlusCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TopicClustersPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const supabase = createClient();
  
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

  // Get topic clusters for this project
  const { data: topicClusters } = await supabase
    .from('topic_clusters')
    .select('*')
    .eq('project_id', params.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name} - Topic Clusters</h1>
          <p className="text-muted-foreground">
            Organize your content strategy with topic clusters
          </p>
        </div>
        
        <Button>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create Topic Cluster
        </Button>
      </div>

      {/* Display empty state if no clusters */}
      {(!topicClusters || topicClusters.length === 0) && (
        <div className="flex flex-col items-center justify-center bg-muted/40 border border-dashed rounded-lg p-12 text-center">
          <h3 className="text-lg font-medium mb-2">No topic clusters yet</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            Create your first topic cluster to organize your content around key themes and improve your site's SEO structure.
          </p>
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            Create Your First Topic Cluster
          </Button>
        </div>
      )}
    </div>
  );
} 