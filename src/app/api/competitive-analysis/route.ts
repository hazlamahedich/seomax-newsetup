import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { CompetitorAnalysisService } from '@/lib/services/CompetitorAnalysisService';

/**
 * GET /api/competitive-analysis?projectId=<id>
 * Get all competitors for a project
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId parameter' }, { status: 400 });
    }
    
    const competitors = await CompetitorAnalysisService.getCompetitors(projectId);
    return NextResponse.json({ competitors });
  } catch (error) {
    console.error('Error in GET /api/competitive-analysis:', error);
    return NextResponse.json({ error: 'Failed to fetch competitors' }, { status: 500 });
  }
}

/**
 * POST /api/competitive-analysis
 * Add a new competitor or run analysis
 * Body: { projectId: string, url: string, action: 'add' | 'analyze' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, url, action } = body;
    
    if (!projectId || !url) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    if (action === 'add') {
      // Add a new competitor
      const competitor = await CompetitorAnalysisService.addCompetitor(projectId, url);
      return NextResponse.json({ success: true, competitor });
    } else if (action === 'analyze') {
      // Run competitive analysis
      const analysis = await CompetitorAnalysisService.runCompetitiveAnalysis(projectId, url);
      return NextResponse.json({ success: true, analysis });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in POST /api/competitive-analysis:', error);
    return NextResponse.json({ error: 'Analysis operation failed' }, { status: 500 });
  }
}

/**
 * DELETE /api/competitive-analysis?id=<id>
 * Delete a competitor
 */
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }
    
    const supabase = createClient();
    const { error } = await supabase
      .from('competitors')
      .delete()
      .eq('id', id);
      
    if (error) {
      throw error;
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/competitive-analysis:', error);
    return NextResponse.json({ error: 'Failed to delete competitor' }, { status: 500 });
  }
} 