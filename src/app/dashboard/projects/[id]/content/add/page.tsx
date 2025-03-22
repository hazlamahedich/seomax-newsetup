import React from 'react';
import { Button } from '@/components/ui/button';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ContentPageService } from '@/lib/services/content-service';

export const dynamic = 'force-dynamic';

export default async function AddContentPage({ 
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

  async function addContentPage(formData: FormData) {
    'use server';
    
    const title = formData.get('title') as string;
    const url = formData.get('url') as string;
    
    if (!title || !url) {
      return;
    }
    
    try {
      // Create a new content page
      await ContentPageService.createContentPage({
        project_id: params.id,
        url,
        title,
        content: null,
        word_count: null,
        readability_score: null,
        seo_score: null,
        status: 'not-analyzed',
        last_analyzed_at: null,
        content_score: null
      });
      
      // Redirect back to content pages
      redirect(`/dashboard/projects/${params.id}/content`);
    } catch (error) {
      console.error('Error adding content page:', error);
      // In a real app, you'd handle this error better
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/projects/${params.id}/content`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Add Content Page</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Page Details</CardTitle>
          <CardDescription>
            Add a webpage from your site to analyze its content and get improvement suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addContentPage} className="space-y-6">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Page Title</Label>
                <Input 
                  id="title" 
                  name="title" 
                  placeholder="Homepage" 
                  required 
                />
                <p className="text-sm text-muted-foreground">
                  Enter a descriptive title for this page.
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="url">Page URL</Label>
                <Input 
                  id="url" 
                  name="url" 
                  placeholder="https://example.com/page" 
                  type="url"
                  required 
                />
                <p className="text-sm text-muted-foreground">
                  Enter the full URL of the page you want to analyze.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" asChild>
                <Link href={`/dashboard/projects/${params.id}/content`}>
                  Cancel
                </Link>
              </Button>
              <Button type="submit">
                Add & Analyze Page
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 