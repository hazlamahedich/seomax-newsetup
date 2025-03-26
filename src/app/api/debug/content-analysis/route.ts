import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/server-auth';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const contentPageId = url.searchParams.get('contentPageId');
  
  console.log(`Debug API: Fetching content analysis data for contentPageId: ${contentPageId}`);
  
  if (!contentPageId) {
    return NextResponse.json(
      { error: 'Content page ID is required' },
      { status: 400 }
    );
  }

  try {
    // Get session to check auth
    const supabase = createClient();
    const session = await getSession();

    if (!session?.user) {
      console.log('Debug API: No authenticated user found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch the content page data - modified to handle multiple results
    const { data: contentPages, error: contentPageError } = await supabase
      .from('content_pages')
      .select('*')
      .eq('id', contentPageId);

    if (contentPageError) {
      console.log('Debug API: Error fetching content pages:', contentPageError.message);
      return NextResponse.json(
        { error: `Error fetching content pages: ${contentPageError.message}` },
        { status: 500 }
      );
    }

    if (!contentPages || contentPages.length === 0) {
      console.log('Debug API: Content page not found');
      return NextResponse.json(
        { error: 'Content page not found' },
        { status: 404 }
      );
    }

    // Use the first content page found
    const contentPage = contentPages[0];
    console.log(`Debug API: Found ${contentPages.length} content pages, using first one with ID: ${contentPage.id}`);

    // Fetch analysis data - also handle possibility of multiple results
    const { data: analysisDataList, error: analysisError } = await supabase
      .from('content_analysis')
      .select('*')
      .eq('content_page_id', contentPageId)
      .order('created_at', { ascending: false })
      .limit(5);  // Get the latest 5 analyses for debugging

    if (analysisError) {
      console.log('Debug API: Error fetching analysis data:', analysisError.message);
      return NextResponse.json(
        { error: `Error fetching analysis data: ${analysisError.message}` },
        { status: 500 }
      );
    }

    // Use the most recent analysis if available
    const analysisData = analysisDataList && analysisDataList.length > 0 ? analysisDataList[0] : null;
    
    if (analysisDataList && analysisDataList.length > 0) {
      console.log(`Debug API: Found ${analysisDataList.length} analyses, using the most recent one from ${analysisData?.created_at}`);
    } else {
      console.log('Debug API: No analysis data found for this content page');
    }

    // Return debug information
    const debugInfo = {
      contentPage,
      allContentPages: contentPages,
      analysisCount: analysisDataList ? analysisDataList.length : 0,
      analysisData: analysisData || null,
      allAnalysisData: analysisDataList,
      analysisDataStructure: analysisData ? {
        hasResult: !!analysisData.result,
        resultKeys: analysisData.result ? Object.keys(analysisData.result) : [],
        hasReadabilityAnalysis: analysisData.result?.readability_analysis ? true : false,
        hasKeywordAnalysis: analysisData.result?.keyword_analysis ? true : false,
        hasStructureAnalysis: analysisData.result?.structure_analysis ? true : false,
        readabilityAnalysisKeys: analysisData.result?.readability_analysis ? Object.keys(analysisData.result.readability_analysis) : [],
        keywordAnalysisKeys: analysisData.result?.keyword_analysis ? Object.keys(analysisData.result.keyword_analysis) : [],
        structureAnalysisKeys: analysisData.result?.structure_analysis ? Object.keys(analysisData.result.structure_analysis) : [],
      } : null,
      rawAnalysisResult: analysisData?.result || null,
    };

    console.log('Debug API: Successfully retrieved debug information');
    return NextResponse.json({ success: true, debugInfo });

  } catch (error: any) {
    console.error('Debug API: Unexpected error:', error.message);
    return NextResponse.json(
      { error: `Unexpected error: ${error.message}` },
      { status: 500 }
    );
  }
} 