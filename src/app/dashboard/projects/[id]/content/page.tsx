import React from 'react';
import { Button } from '@/components/ui/button';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PlusCircle, ExternalLink, BarChart2, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ContentPageService } from '@/lib/services/content-service';

export const dynamic = 'force-dynamic';

export default async function ContentPagesPage({ 
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

  // Get content pages for this project
  const contentPages = await ContentPageService.getContentPages(params.id);

  // Function to render status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'analyzed':
        return <Badge className="bg-green-500">Analyzed</Badge>;
      case 'optimized':
        return <Badge className="bg-blue-500">Optimized</Badge>;
      case 'analyzing':
        return <Badge className="bg-yellow-500">Analyzing</Badge>;
      default:
        return <Badge variant="outline">Not Analyzed</Badge>;
    }
  };

  // Function to get score color
  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name} - Content Pages</h1>
          <p className="text-muted-foreground">
            Monitor and optimize your content performance
          </p>
        </div>
        
        <Button asChild>
          <Link href={`/dashboard/projects/${params.id}/content/add`}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Content Page
          </Link>
        </Button>
      </div>

      {contentPages.length === 0 ? (
        <div className="flex flex-col items-center justify-center bg-muted/40 border border-dashed rounded-lg p-12 text-center">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No content pages yet</h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            Add your first content page to start analyzing and optimizing your website's content.
          </p>
          <Button asChild>
            <Link href={`/dashboard/projects/${params.id}/content/add`}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Your First Content Page
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {contentPages.map((page) => (
            <Card key={page.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="line-clamp-1">{page.title || 'Untitled Page'}</CardTitle>
                    <CardDescription className="line-clamp-1">{page.url}</CardDescription>
                  </div>
                  {getStatusBadge(page.status)}
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Content Score</span>
                    <span className={`font-medium ${getScoreColor(page.content_score)}`}>
                      {page.content_score ? `${page.content_score}/100` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Word Count</span>
                    <span className="text-sm text-muted-foreground">{page.word_count || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Analyzed</span>
                    <span className="text-sm text-muted-foreground">
                      {page.last_analyzed_at 
                        ? new Date(page.last_analyzed_at).toLocaleDateString() 
                        : 'Never'}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between pt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={page.url} target="_blank">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/projects/${params.id}/content/${page.id}/analysis`}>
                    <BarChart2 className="h-4 w-4 mr-1" />
                    Analytics
                  </Link>
                </Button>
                <Button variant="default" size="sm" asChild>
                  <Link href={`/dashboard/projects/${params.id}/content/${page.id}`}>
                    Details
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 