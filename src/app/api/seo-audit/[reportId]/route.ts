import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { reportId: string } }
) {
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
    const { reportId } = params;
    
    // Get report details
    const { data: report, error } = await supabase
      .from('seo_audit_reports')
      .select(`
        *,
        projects:project_id (id, name)
      `)
      .eq('id', reportId)
      .single();
    
    if (error || !report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }
    
    // Check if user has access to the project
    if (report.projects.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }
    
    // Format the response
    const formattedReport = {
      id: report.id,
      name: report.name,
      url: report.url,
      status: report.status,
      projectId: report.project_id,
      projectName: report.projects.name,
      overallScore: report.overall_score || 0,
      overallGrade: report.overall_grade || 'N/A',
      categories: report.categories || [],
      issues: report.issues || [],
      recommendations: report.recommendations || [],
      createdAt: report.created_at,
      updatedAt: report.updated_at,
      pdfUrl: report.pdf_url || null,
    };
    
    return NextResponse.json({
      success: true,
      report: formattedReport
    });
    
  } catch (error) {
    console.error('Error fetching SEO audit report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 