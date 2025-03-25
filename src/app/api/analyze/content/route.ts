import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { ContentAnalyzerService } from '@/lib/services/ContentAnalyzerService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { contentId, content, title, targetKeywords } = body;

    if (!contentId || !content) {
      return NextResponse.json(
        { error: 'Missing required parameters: contentId and content are required' },
        { status: 400 }
      );
    }

    // Perform content analysis
    const analysisResult = await ContentAnalyzerService.analyzeContent(
      contentId,
      content,
      title || 'Untitled Content',
      targetKeywords
    );

    if (!analysisResult) {
      return NextResponse.json(
        { error: 'Content analysis failed' },
        { status: 500 }
      );
    }

    // Update content page status
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    await supabase
      .from('content_pages')
      .update({ 
        status: 'analyzed',
        last_analyzed_at: new Date().toISOString(),
        content_score: analysisResult.contentScore 
      })
      .eq('id', contentId);

    return NextResponse.json({ 
      success: true,
      analysis: analysisResult
    });
  } catch (error) {
    console.error('Content analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze content', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const contentId = searchParams.get('contentId');

    if (!contentId) {
      return NextResponse.json(
        { error: 'Missing required parameter: contentId' },
        { status: 400 }
      );
    }

    // Get content page data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    const { data: contentPage, error: contentError } = await supabase
      .from('content_pages')
      .select('*')
      .eq('id', contentId)
      .single();

    if (contentError) {
      return NextResponse.json(
        { error: 'Content page not found', details: contentError.message },
        { status: 404 }
      );
    }

    // Get content analysis data
    const { data: contentAnalyses, error: analysisError } = await supabase
      .from('content_analysis')
      .select('*')
      .eq('content_page_id', contentId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (analysisError) {
      return NextResponse.json(
        { error: 'Failed to fetch content analysis', details: analysisError.message },
        { status: 500 }
      );
    }

    const analysis = contentAnalyses?.[0] || null;

    return NextResponse.json({
      success: true,
      contentPage,
      analysis
    });
  } catch (error) {
    console.error('Content analysis API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content analysis', details: (error as Error).message },
      { status: 500 }
    );
  }
} 