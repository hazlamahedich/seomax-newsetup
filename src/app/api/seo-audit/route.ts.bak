import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const auditRequestSchema = z.object({
  projectId: z.string(),
  reportName: z.string(),
  url: z.string().url(),
  options: z.object({
    seoBasics: z.boolean().optional(),
    contentQuality: z.boolean().optional(),
    performance: z.boolean().optional(),
    technicalSEO: z.boolean().optional(),
    mobileUsability: z.boolean().optional(),
    security: z.boolean().optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  
  // Get user session for auth check
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    // Parse and validate request
    const body = await request.json();
    const { projectId, reportName, url, options } = auditRequestSchema.parse(body);
    
    // Check if user has access to the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }
    
    // Create placeholder report (mock implementation)
    // In a real implementation, this would start an async process to analyze the URL
    const { data: report, error } = await supabase
      .from('seo_audit_reports')
      .insert({
        project_id: projectId,
        name: reportName,
        url: url,
        status: 'pending',
        overall_score: 0,
        overall_grade: 'N/A',
        user_id: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating SEO audit report:', error);
      return NextResponse.json(
        { error: 'Failed to create SEO audit report' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      report: {
        id: report.id,
        name: report.name,
        url: report.url,
        status: report.status,
        projectId: report.project_id,
        createdAt: report.created_at,
        updatedAt: report.updated_at
      }
    });
    
  } catch (error) {
    console.error('Error processing SEO audit request:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  
  // Get user session for auth check
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Get projectId from query params
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  
  if (!projectId) {
    return NextResponse.json(
      { error: 'Project ID is required' },
      { status: 400 }
    );
  }
  
  try {
    // Check if user has access to the project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    
    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }
    
    // Get reports for the project
    const { data: reports, error } = await supabase
      .from('seo_audit_reports')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching SEO audit reports:', error);
      return NextResponse.json(
        { error: 'Failed to fetch SEO audit reports' },
        { status: 500 }
      );
    }
    
    // Map database results to API response format
    const formattedReports = reports ? reports.map(report => ({
      id: report.id,
      name: report.name,
      url: report.url,
      status: report.status,
      overallScore: report.overall_score || 0,
      overallGrade: report.overall_grade || 'N/A',
      pdfUrl: report.pdf_url,
      createdAt: report.created_at,
      updatedAt: report.updated_at
    })) : [];
    
    return NextResponse.json({ 
      success: true, 
      reports: formattedReports
    });
    
  } catch (error) {
    console.error('Error fetching SEO audit reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 