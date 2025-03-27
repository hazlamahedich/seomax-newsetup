import React from 'react';
import { Button } from '@/components/ui/button';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompetitorService } from '@/lib/services/competitor-service';

// Force dynamic rendering to ensure we always have the latest data
export const dynamic = 'force-dynamic';

interface CompetitorDetailPageProps {
  params: { id: string; competitorId: string };
}

export default async function CompetitorDetailPage({ params }: CompetitorDetailPageProps) {
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

  // Get the competitor content with analysis
  const result = await CompetitorService.getCompetitorContentWithAnalysis(params.competitorId);
  
  if (!result || !result.competitorContent) {
    redirect(`/dashboard/projects/${params.id}/content/competitors`);
  }
  
  const { competitorContent, latestAnalysis } = result;

  async function analyzeCompetitor() {
    'use server';
    
    const supabase = createServerClient();
    
    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      redirect('/login');
    }
    
    await CompetitorService.analyzeCompetitorContent(params.competitorId, session.user.id);
    
    redirect(`/dashboard/projects/${params.id}/content/competitors/${params.competitorId}`);
  }
  
  async function deleteCompetitor() {
    'use server';
    
    const supabase = createServerClient();
    
    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      redirect('/login');
    }
    
    await CompetitorService.deleteCompetitorContent(params.competitorId, params.id);
    
    redirect(`/dashboard/projects/${params.id}/content/competitors`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Link 
            href={`/dashboard/projects/${params.id}/content/competitors`} 
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h2 className="text-2xl font-bold">Competitor Analysis</h2>
        </div>
        <form action={deleteCompetitor}>
          <Button variant="destructive" size="sm" type="submit">
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <a 
              href={competitorContent.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-600 hover:underline"
            >
              {competitorContent.url}
            </a>
            {!latestAnalysis && (
              <form action={analyzeCompetitor}>
                <Button type="submit">Analyze Content</Button>
              </form>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!latestAnalysis ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>This competitor content has not been analyzed yet.</p>
              <p>Click the "Analyze Content" button to start the analysis.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Word Count</h3>
                  <p className="text-2xl font-bold">{latestAnalysis.word_count}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Reading Level</h3>
                  <p className="text-lg font-medium">{latestAnalysis.reading_level}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Keyword Density</h3>
                  <p className="text-lg font-medium">{latestAnalysis.keyword_density.toFixed(2)}%</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Content Structure</h3>
                  {latestAnalysis.content_structure && (
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {Object.entries(JSON.parse(latestAnalysis.content_structure)).map(([key, value]) => (
                        <div key={key} className="bg-muted p-2 rounded">
                          <p className="text-xs text-muted-foreground capitalize">{key}</p>
                          <p className="text-lg font-medium">{value as number}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Readability Score</h3>
                  <div className="flex items-center mt-1">
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div 
                        className="bg-primary h-2.5 rounded-full" 
                        style={{ width: `${latestAnalysis.readability_score}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 font-medium">{latestAnalysis.readability_score}</span>
                  </div>
                </div>
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground">
                    Last analyzed: {new Date(latestAnalysis.created_at).toLocaleDateString()}
                  </p>
                  <form action={analyzeCompetitor} className="mt-2">
                    <Button type="submit" variant="outline" size="sm">
                      Refresh Analysis
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 