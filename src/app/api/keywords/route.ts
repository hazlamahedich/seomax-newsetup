import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import keywordAnalyzer from '@/lib/ai/keyword-analyzer';
import { TrendAnalyzer } from "@/lib/ai/trend-analyzer";

// Create a logger for this API route
const apiLogger = {
  info: (message: string, data?: any) => {
    console.log(`[KeywordsAPI] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[KeywordsAPI] WARNING: ${message}`, data ? data : '');
  },
  error: (message: string, error: any) => {
    console.error(`[KeywordsAPI] ERROR: ${message}`, error);
    console.error(`[KeywordsAPI] Stack:`, error?.stack || 'No stack trace available');
  },
  debug: (message: string, data?: any) => {
    console.log(`[KeywordsAPI:DEBUG] ${message}`, data ? data : '');
  }
};

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  apiLogger.info(`Request started ID:${requestId}`);
  
  try {
    // Verify user is authenticated
    apiLogger.debug(`Verifying authentication for request ID:${requestId}`);
    const session = await getServerSession(authOptions);
    
    // For development environments, allow API access without a session
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev && (!session || !session.user)) {
      apiLogger.warn(`Unauthorized access attempt ID:${requestId}`, { hasSession: !!session });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    apiLogger.debug(`Parsing request body ID:${requestId}`);
    let body;
    try {
      body = await req.json();
      apiLogger.debug(`Successfully parsed request body ID:${requestId}`);
    } catch (parseError) {
      apiLogger.error(`Failed to parse request body ID:${requestId}`, parseError);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    
    const { keyword, industry, action } = body;
    
    // Log request for debugging
    apiLogger.info(`Keyword API request ID:${requestId}:`, { 
      keyword, 
      industry, 
      action,
      userId: session?.user?.email || 'development-user',
      method: req.method,
      url: req.url
    });
    
    // Validate required fields
    if (!keyword) {
      apiLogger.warn(`Missing keyword parameter ID:${requestId}`);
      return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
    }
    
    if (!industry) {
      apiLogger.warn(`Missing industry parameter ID:${requestId}`);
      return NextResponse.json({ error: 'Industry is required' }, { status: 400 });
    }

    let result;
    
    // Perform the requested analysis
    try {
      apiLogger.info(`Starting keyword analysis ID:${requestId} Action:${action || 'research'}`);
      const analysisStartTime = Date.now();
      
      switch (action) {
        case 'analyze-competition':
          apiLogger.debug(`Running competition analysis ID:${requestId}`);
          result = await keywordAnalyzer.analyzeCompetition([keyword], industry);
          break;
        case 'analyze-trends':
          apiLogger.debug(`Running trend analysis ID:${requestId}`);
          result = await keywordAnalyzer.analyzeTrends(keyword, industry);
          break;
        case 'comprehensive':
          apiLogger.debug(`Running comprehensive analysis ID:${requestId}`);
          result = await keywordAnalyzer.getComprehensiveAnalysis(keyword, industry);
          break;
        case 'research':
          apiLogger.debug(`Running keyword research ID:${requestId}`);
          result = await keywordAnalyzer.researchKeyword(keyword, industry);
          break;
        case 'trends':
          apiLogger.debug(`Running trend analysis ID:${requestId}`);
          result = await TrendAnalyzer.analyzeTrends(keyword, industry);
          break;
        default:
          apiLogger.warn(`Invalid action: ${action}`);
          return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
      }
      
      const analysisDuration = Date.now() - analysisStartTime;
      apiLogger.info(`Keyword analysis completed ID:${requestId} Duration:${analysisDuration}ms`);
      
      const response = {
        success: true,
        data: result,
        requestId: requestId,
        timing: {
          duration: Date.now() - startTime,
          analysisDuration
        }
      };
      
      apiLogger.debug(`Sending successful response ID:${requestId}`, {
        responseSize: JSON.stringify(response).length,
        timing: response.timing
      });
      
      return NextResponse.json(response);
    } catch (analysisError: any) {
      const errorDuration = Date.now() - startTime;
      apiLogger.error(`Keyword analysis specific error ID:${requestId} Duration:${errorDuration}ms`, analysisError);
      
      // Check for specific error types and provide appropriate messaging
      const errorMessage = analysisError.message || 'An error occurred during keyword analysis processing';
      let statusCode = 500;
      
      // Handle rate limiting, timeout, or API key errors
      if (errorMessage.includes('API key')) {
        statusCode = 403; // Forbidden
        apiLogger.error(`API key error ID:${requestId}`, { message: errorMessage });
      } else if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        statusCode = 504; // Gateway Timeout 
        apiLogger.error(`Timeout error ID:${requestId}`, { message: errorMessage });
      } else if (errorMessage.includes('rate limit')) {
        statusCode = 429; // Too Many Requests
        apiLogger.error(`Rate limit error ID:${requestId}`, { message: errorMessage });
      } else if (errorMessage.includes('template')) {
        statusCode = 500; // Server Error
        apiLogger.error(`Template error ID:${requestId}`, { message: errorMessage, stack: analysisError.stack });
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          requestId,
          timing: { duration: errorDuration } 
        },
        { status: statusCode }
      );
    }
  } catch (error: any) {
    const errorDuration = Date.now() - startTime;
    apiLogger.error(`Keyword analysis API general error ID:${requestId} Duration:${errorDuration}ms`, error);
    
    return NextResponse.json(
      { 
        error: error.message || 'An error occurred during keyword analysis',
        requestId,
        timing: { duration: errorDuration }
      },
      { status: 500 }
    );
  } finally {
    const totalDuration = Date.now() - startTime;
    apiLogger.info(`Request completed ID:${requestId} Total duration:${totalDuration}ms`);
  }
} 