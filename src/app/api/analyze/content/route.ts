import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { ContentAnalyzerService } from '@/lib/services/ContentAnalyzerService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: NextRequest) {
  console.log('Content analysis API endpoint called (POST)');
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log('Unauthorized request - no valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`Authenticated as user: ${session.user.email}`);

    const body = await req.json();
    const { contentId, content, title, targetKeywords } = body;
    console.log(`Analysis request for contentId: ${contentId}, title: ${title}`);

    if (!contentId || !content) {
      console.log('Missing required parameters');
      return NextResponse.json(
        { error: 'Missing required parameters: contentId and content are required' },
        { status: 400 }
      );
    }

    // Create an authenticated Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '' // Use service role key instead of anon key
    );

    // Perform content analysis
    console.log('Calling ContentAnalyzerService.analyzeContent...');
    const analysisResult = await ContentAnalyzerService.analyzeContent(
      contentId,
      content,
      title || 'Untitled Content',
      targetKeywords
    );

    if (!analysisResult) {
      console.log('Content analysis failed');
      return NextResponse.json(
        { error: 'Content analysis failed' },
        { status: 500 }
      );
    }
    
    console.log('Analysis result received:', JSON.stringify(analysisResult, null, 2));

    // Update content page status
    console.log('Updating content page with score and timestamp...');
    await supabase
      .from('content_pages')
      .update({ 
        analyzed_at: new Date().toISOString(),
        seo_score: analysisResult.contentScore 
      })
      .eq('id', contentId);
    console.log('Content page updated successfully');

    // Final response
    const response = { 
      success: true,
      analysis: analysisResult
    };
    console.log('Sending successful API response');
    return NextResponse.json(response);
  } catch (error) {
    console.error('Content analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze content', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  console.log('Content analysis API endpoint called (GET)');
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log('Unauthorized request - no valid session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`Authenticated as user: ${session.user.email}`);

    const { searchParams } = new URL(req.url);
    const contentPageId = searchParams.get('contentPageId');
    const contentId = searchParams.get('contentId');
    const finalContentId = contentPageId || contentId;
    
    console.log(`Fetching analysis for contentId: ${finalContentId} (from ${contentPageId ? 'contentPageId' : 'contentId'})`);

    if (!finalContentId) {
      console.log('Missing required parameter: contentId or contentPageId');
      return NextResponse.json(
        { error: 'Missing required parameter: contentId or contentPageId' },
        { status: 400 }
      );
    }

    // Get content page data
    console.log('Fetching content page data...');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '' // Use service role key
    );
    const { data: contentPage, error: contentError } = await supabase
      .from('content_pages')
      .select('*')
      .eq('id', finalContentId)
      .single();

    if (contentError) {
      console.log('Content page not found:', contentError);
      return NextResponse.json(
        { error: 'Content page not found', details: contentError.message },
        { status: 404 }
      );
    }
    console.log('Content page found:', contentPage);

    // Get content analysis data
    console.log('Fetching content analysis data...');
    const { data: contentAnalyses, error: analysisError } = await supabase
      .from('content_analysis')
      .select('*')
      .eq('content_page_id', finalContentId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (analysisError) {
      console.log('Error fetching content analysis:', analysisError);
      return NextResponse.json(
        { error: 'Failed to fetch content analysis', details: analysisError.message },
        { status: 500 }
      );
    }

    const analysis = contentAnalyses?.[0] || null;
    console.log('Analysis data found:', analysis ? 'Yes' : 'No');
    if (analysis) {
      console.log('Analysis structure:', JSON.stringify({
        id: analysis.id,
        content_page_id: analysis.content_page_id,
        analysis_type: analysis.analysis_type,
        created_at: analysis.created_at,
        result: analysis.result ? Object.keys(analysis.result) : null
      }, null, 2));
    }
    
    const response = {
      success: true,
      contentPage,
      analysis
    };
    console.log('Sending successful API response');
    return NextResponse.json(response);
  } catch (error) {
    console.error('Content analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content analysis', details: (error as Error).message },
      { status: 500 }
    );
  }
} 