// This is an API route, not a server action

import { NextRequest, NextResponse } from 'next/server';
import { CompetitorAnalysisService } from '@/lib/services/CompetitorAnalysisService';
import { createClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin-client';

/**
 * GET /api/competitive-analysis?projectId=<id>
 * Get all competitors for a project
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    const competitors = await CompetitorAnalysisService.getCompetitors(projectId);
    
    return NextResponse.json({ competitors });
  } catch (error) {
    console.error('Error fetching competitors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch competitors', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/competitive-analysis
 * Add a new competitor or run analysis
 * Body: { projectId: string, url: string, action: 'add' | 'analyze' }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, url, action } = body;
    
    // Validate required parameters
    if (!projectId) {
      console.log('[API] Missing projectId in competitive-analysis request');
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }
    
    // Handle different actions
    if (action === 'add') {
      if (!url) {
        console.log('[API] Missing URL in competitive-analysis add request');
        return NextResponse.json(
          { error: 'URL is required to add a competitor' },
          { status: 400 }
        );
      }
      
      console.log(`[API] Adding competitor: ${url} for project: ${projectId}`);
      
      try {
        // Add the competitor
        const competitor = await CompetitorAnalysisService.addCompetitor(projectId, url);
        
        if (!competitor) {
          console.error('[API] Failed to add competitor: No data returned');
          return NextResponse.json(
            { error: 'Failed to add competitor' },
            { status: 500 }
          );
        }
        
        console.log('[API] Successfully added competitor:', competitor.url);
        
        // Format the competitor for the client
        const formattedCompetitor = {
          id: competitor.id,
          url: competitor.url,
          title: competitor.title,
          name: competitor.title, // Include name for compatibility
          strengths: competitor.strengths || [],
          metrics: competitor.metrics || {},
          keywords: competitor.keywords || []
        };
        
        return NextResponse.json({ 
          success: true, 
          competitor: formattedCompetitor 
        });
      } catch (error) {
        console.error('[API] Error adding competitor:', error);
        
        // Check if it's a database error
        if (error instanceof Error) {
          if (error.message.includes('database') || error.message.includes('supabase')) {
            return NextResponse.json(
              { error: 'Database error adding competitor', details: error.message },
              { status: 500 }
            );
          }
        }
        
        return NextResponse.json(
          { error: 'Failed to add competitor', details: String(error) },
          { status: 500 }
        );
      }
    } else if (action === 'analyze') {
      if (!url) {
        console.log('[API] Missing URL in competitive-analysis analyze request');
        return NextResponse.json(
          { error: 'URL is required to run analysis' },
          { status: 400 }
        );
      }
      
      console.log(`[API] Running competitive analysis for project: ${projectId}, url: ${url}`);
      
      try {
        // Run the analysis
        const analysisResult = await CompetitorAnalysisService.runCompetitiveAnalysis(
          projectId,
          url
        );
        
        console.log('[API] Analysis complete, returning results');
        
        return NextResponse.json({ 
          success: true, 
          analysis: {
            contentGaps: analysisResult.contentGaps || [],
            keywordGaps: analysisResult.keywordGaps || [],
            advantages: analysisResult.advantages || [],
            disadvantages: analysisResult.disadvantages || [],
            strategies: analysisResult.strategies || [],
            competitors: analysisResult.competitors || []
          }
        });
      } catch (error) {
        console.error('[API] Error running competitive analysis:', error);
        
        return NextResponse.json(
          { error: 'Analysis operation failed', details: String(error) },
          { status: 500 }
        );
      }
    } else {
      console.log(`[API] Invalid action in competitive-analysis request: ${action}`);
      return NextResponse.json(
        { error: 'Invalid action. Must be "add" or "analyze"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[API] Error in competitive-analysis POST handler:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
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
    
    const supabase = createAdminClient();
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

/**
 * PATCH /api/competitive-analysis
 * Test URL validation
 * Body: { url: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { url } = body;
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }
    
    console.log(`[API] Testing URL validation for: ${url}`);
    
    const validationResult = await CompetitorAnalysisService.validateUrlStorage(url);
    
    return NextResponse.json({ 
      success: true, 
      validation: validationResult
    });
  } catch (error) {
    console.error('[API] Error in URL validation:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
} 