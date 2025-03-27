import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
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
        projects:project_id (id, name, user_id)
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
    
    // Mock PDF generation process
    // In a real implementation, you would:
    // 1. Generate PDF using a library like Puppeteer or a service like API2PDF
    // 2. Upload the PDF to storage
    // 3. Update the report with the PDF URL
    
    // For now, we'll simulate this process
    const fileName = `seo-report-${report.id}-${uuidv4()}.pdf`;
    const pdfUrl = `/api/seo-audit/${reportId}/pdf/download`;
    
    // Update the report with the PDF URL
    const { error: updateError } = await supabase
      .from('seo_audit_reports')
      .update({
        pdf_url: pdfUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId);
    
    if (updateError) {
      console.error('Error updating report with PDF URL:', updateError);
      return NextResponse.json(
        { error: 'Failed to generate PDF report' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'PDF report generated successfully',
      pdfUrl
    });
    
  } catch (error) {
    console.error('Error generating PDF report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
        projects:project_id (id, name, user_id)
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
    
    // Check if PDF exists
    if (!report.pdf_url) {
      return NextResponse.json(
        { error: 'PDF report not available' },
        { status: 404 }
      );
    }
    
    // In a real implementation, you would fetch the PDF from storage
    // and return it with the correct content type
    
    // For now, we'll return a mock response
    return NextResponse.json({
      success: true,
      message: 'PDF download endpoint (mock)',
      reportId,
      reportName: report.name,
      pdfUrl: report.pdf_url
    });
    
  } catch (error) {
    console.error('Error fetching PDF report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 