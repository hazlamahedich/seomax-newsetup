import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import keywordAnalyzer from '@/lib/ai/keyword-analyzer';

export async function POST(req: NextRequest) {
  try {
    // Verify user is authenticated
    const session = await getServerSession(authOptions);
    
    // For development environments, allow API access without a session
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev && (!session || !session.user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await req.json();
    const { keyword, industry, action } = body;
    
    // Log request for debugging
    console.log('Keyword API request:', { keyword, industry, action });
    
    // Validate required fields
    if (!keyword) {
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }
    
    if (!industry) {
      return NextResponse.json({ error: 'Industry is required' }, { status: 400 });
    }

    let result;
    
    // Perform the requested analysis
    switch (action) {
      case 'analyze-competition':
        result = await keywordAnalyzer.analyzeCompetition([keyword], industry);
        break;
      case 'analyze-trends':
        result = await keywordAnalyzer.analyzeTrends(keyword, industry);
        break;
      case 'comprehensive':
        result = await keywordAnalyzer.getComprehensiveAnalysis(keyword, industry);
        break;
      case 'research':
      default:
        result = await keywordAnalyzer.researchKeyword(keyword, industry);
        break;
    }
    
    // Log success for debugging
    console.log('Keyword analysis completed successfully');
    
    return NextResponse.json({ success: true, data: result });
    
  } catch (error: any) {
    console.error('Keyword analysis API error:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during keyword analysis' },
      { status: 500 }
    );
  }
} 