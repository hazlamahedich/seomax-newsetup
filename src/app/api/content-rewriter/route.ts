import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ContentRewriterService, ContentRewriteParams, RewriteResult } from '@/lib/services/ContentRewriterService';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await req.json();
    const { action, ...params } = data;
    
    switch (action) {
      case 'rewriteContent':
        if (!isValidRewriteParams(params)) {
          return NextResponse.json({ error: 'Invalid rewrite parameters' }, { status: 400 });
        }
        const result = await ContentRewriterService.rewriteContent(params);
        return NextResponse.json({ result });
        
      case 'getContentRewrites':
        if (!params.contentId) {
          return NextResponse.json({ error: 'Content ID is required' }, { status: 400 });
        }
        const rewrites = await ContentRewriterService.getContentRewrites(params.contentId);
        return NextResponse.json({ rewrites });
        
      case 'getProjectRewrites':
        if (!params.projectId) {
          return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }
        const projectRewrites = await ContentRewriterService.getProjectRewrites(
          params.projectId,
          params.limit || 10
        );
        return NextResponse.json({ rewrites: projectRewrites });
        
      case 'deleteRewrite':
        if (!params.rewriteId) {
          return NextResponse.json({ error: 'Rewrite ID is required' }, { status: 400 });
        }
        await ContentRewriterService.deleteRewrite(params.rewriteId);
        return NextResponse.json({ success: true });
        
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in content rewriter API:', error);
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}

function isValidRewriteParams(params: any): params is ContentRewriteParams {
  return (
    typeof params === 'object' &&
    typeof params.projectId === 'string' &&
    typeof params.originalContent === 'string' &&
    Array.isArray(params.targetKeywords) &&
    typeof params.preserveEEAT === 'boolean'
  );
} 