import { NextRequest, NextResponse } from 'next/server';
import { LocalSEOService } from '@/lib/services/LocalSEOService';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { siteId, url, html, otherPages } = body;
    
    if (!siteId || !url || !html) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Run local SEO analysis
    const result = await LocalSEOService.analyzeLocalSEO(
      siteId,
      url,
      html,
      otherPages || []
    );
    
    // Return the analysis result
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error in local SEO analysis:', error);
    
    return NextResponse.json(
      { error: 'Failed to analyze local SEO' },
      { status: 500 }
    );
  }
} 