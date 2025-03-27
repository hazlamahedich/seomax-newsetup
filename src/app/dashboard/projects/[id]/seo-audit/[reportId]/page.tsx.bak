import React from 'react';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { SEOAuditDashboard } from '@/components/seo-audit/SEOAuditDashboard';

export default async function SEOAuditReportPage({ 
  params 
}: { 
  params: { id: string; reportId: string } 
}) {
  const supabase = createServerClient();
  
  // Get the user for access control
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  // Get the project and verify access
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single();
  
  if (projectError || !project) {
    redirect('/dashboard/projects');
  }
  
  // Get the report - this is server-side, but we'll show a client component
  // that will also fetch the report data to ensure it's up-to-date
  const { data: report, error: reportError } = await supabase
    .from('seo_audit_reports')
    .select('*')
    .eq('id', params.reportId)
    .eq('project_id', params.id)
    .single();
  
  if (reportError || !report) {
    notFound();
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{report.name}</h1>
          <p className="text-muted-foreground">
            {report.url}
          </p>
        </div>
      </div>
      
      {/* Client component wrapper for the SEO audit report dashboard */}
      <SEOAuditDashboard reportId={params.reportId} />
    </div>
  );
} 