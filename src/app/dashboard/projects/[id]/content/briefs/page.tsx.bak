import React from 'react';
import { Button } from '@/components/ui/button';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FileText, PlusCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ContentBriefsPage({ 
  params 
}: { 
  params: { id: string } 
}) {
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

  // Get content briefs for this project
  const { data: contentBriefs } = await supabase
    .from('content_briefs')
    .select('*')
    .eq('project_id', params.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name} - Content Briefs</h1>
          <p className="text-muted-foreground">
            Create AI-powered content briefs to guide your content creation
          </p>
        </div>
        
        <Button>
          <PlusCircle className="h-4 w-4 mr-2" />
          Generate Content Brief
        </Button>
      </div>

      {/* Display empty state if no briefs */}
      {(!contentBriefs || contentBriefs.length === 0) && (
        <div className="flex flex-col items-center justify-center bg-muted/40 border border-dashed rounded-lg p-12 text-center">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No content briefs yet</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            Generate your first content brief to create SEO-optimized content that ranks well and engages your audience.
          </p>
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            Generate Your First Brief
          </Button>
        </div>
      )}
    </div>
  );
} 