import React from 'react';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// This client component import is needed for the client-side functionality
import { SEOAuditReportListClient } from '@/components/seo-audit/SEOAuditReportListClient';

export default async function SEOAuditPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient();
  
  // Get the project and verify access
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single();
  
  if (projectError || !project) {
    redirect('/dashboard/projects');
  }
  
  // Get the user for access control
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">SEO Audit Reports</h1>
      </div>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Available Reports</CardTitle>
                <CardDescription>View and manage your SEO audit reports</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <SEOAuditReportListClient projectId={params.id} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 