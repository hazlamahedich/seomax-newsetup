import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CompetitorService } from '@/lib/services/competitor-service';

// Force dynamic rendering to ensure we always have the latest data
export const dynamic = 'force-dynamic';

interface AddCompetitorPageProps {
  params: { id: string };
}

export default async function AddCompetitorPage({ params }: AddCompetitorPageProps) {
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

  async function addCompetitorUrl(formData: FormData) {
    'use server';

    const url = formData.get('url') as string;
    const supabase = createServerClient();

    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      redirect('/login');
    }

    await CompetitorService.createCompetitorContent(params.id, url, session.user.id);

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
          <h2 className="text-2xl font-bold">Add Competitor URL</h2>
        </div>
      </div>

      <div className="rounded-lg border p-6 max-w-2xl">
        <form action={addCompetitorUrl} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="url" className="text-sm font-medium">
              Competitor URL
            </label>
            <Input
              id="url"
              name="url"
              type="url"
              required
              placeholder="https://competitor.com/page-url"
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Enter the full URL of the competitor's content page you want to analyze
            </p>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Link href={`/dashboard/projects/${params.id}/content/competitors`}>
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit">Add Competitor URL</Button>
          </div>
        </form>
      </div>
    </div>
  );
} 