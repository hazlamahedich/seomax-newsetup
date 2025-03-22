import React from 'react';
import { Button } from '@/components/ui/button';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { PlusCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CompetitorService } from '@/lib/services/competitor-service';

// Force dynamic rendering to ensure we always have the latest data
export const dynamic = 'force-dynamic';

interface CompetitorAnalysisPageProps {
  params: { id: string };
}

export default async function CompetitorAnalysisPage({ params }: CompetitorAnalysisPageProps) {
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

  // Get competitor content
  const competitorContent = await CompetitorService.getCompetitorContent(params.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{project.name} - Competitor Analysis</h2>
        <Link href={`/dashboard/projects/${params.id}/content/competitors/add`}>
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Competitor URL
          </Button>
        </Link>
      </div>

      {(!competitorContent || competitorContent.length === 0) ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <h3 className="text-lg font-medium mb-2">No competitor URLs added yet</h3>
          <p className="text-muted-foreground mb-4">
            Add competitor URLs to analyze and compare their content to improve your own.
          </p>
          <Link href={`/dashboard/projects/${params.id}/content/competitors/add`}>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Your First Competitor URL
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {competitorContent.map((item) => {
            // Find the latest analysis
            const latestAnalysis = item.competitor_analysis && 
              item.competitor_analysis.length > 0 ? 
              item.competitor_analysis.reduce((latest: any, current: any) => {
                return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
              }, item.competitor_analysis[0]) : null;
              
            return (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium line-clamp-1">
                        <Link 
                          href={`/dashboard/projects/${params.id}/content/competitors/${item.id}`}
                          className="hover:underline"
                        >
                          {new URL(item.url).hostname}
                        </Link>
                      </h3>
                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                    <div className="line-clamp-1 text-sm text-muted-foreground">
                      {item.url}
                    </div>
                    
                    {latestAnalysis ? (
                      <div className="pt-2 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Words:</span>
                          <span className="font-medium">{latestAnalysis.word_count}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Reading Level:</span>
                          <span className="font-medium">{latestAnalysis.reading_level}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Readability:</span>
                          <div className="flex items-center">
                            <div className="w-16 bg-muted rounded-full h-1.5 mr-1.5">
                              <div 
                                className="bg-primary h-1.5 rounded-full" 
                                style={{ width: `${latestAnalysis.readability_score}%` }}
                              ></div>
                            </div>
                            <span className="font-medium text-xs">{latestAnalysis.readability_score}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2">
                        <Badge variant="outline" className="text-muted-foreground">
                          Not analyzed
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/50 p-2 flex justify-center">
                  <Link 
                    href={`/dashboard/projects/${params.id}/content/competitors/${item.id}`}
                    className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
                  >
                    {latestAnalysis ? 'View Analysis' : 'Analyze Now'}
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
} 