import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/server-auth';
import { ContentAnalyzer } from '@/lib/ai/content-analyzer';
import { LiteLLMProvider } from '@/lib/ai/litellm-provider';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { logger } from "@/lib/utils/logger";

// Add a standardized logger at the top
function logAPIDebug(message: string, data?: any) {
  console.log(`[ContentAnalysisAPI:DEBUG] ${message}`, data ? data : '');
}

function logAPIInfo(message: string, data?: any) {
  console.log(`[ContentAnalysisAPI:INFO] ${message}`, data ? data : '');
}

function logAPIError(message: string, error: any) {
  console.error(`[ContentAnalysisAPI:ERROR] ${message}`, error);
  if (error?.stack) {
    console.error(`[ContentAnalysisAPI:ERROR] Stack trace:`, error.stack);
  }
}

// Create a regular client
const supabase = createClient();

// Create a service role client for admin operations
const serviceRoleClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
) : null;

// Helper function to get the appropriate client
function getClient(useServiceRole = false) {
  return (useServiceRole && serviceRoleClient) ? serviceRoleClient : supabase;
}

// Create a namespace for logging
const logNamespace = "ContentAnalysisAPI";
const log = {
  info: (message: string, data?: any) => logger.info(`[${logNamespace}:INFO] ${message}`, data),
  debug: (message: string, data?: any) => logger.debug(`[${logNamespace}:DEBUG] ${message}`, data),
  error: (message: string, data?: any) => logger.error(`[${logNamespace}:ERROR] ${message}`, data)
};

export async function GET(req: NextRequest) {
  try {
    // Get session to check auth
    const { searchParams } = new URL(req.url);
    const contentPageId = searchParams.get('contentPageId');
    const skipAuth = searchParams.get('skipAuth') === 'true';
    
    let client = createClient();
    const session = await getSession();
    
    console.log(`GET Content Analysis - Session check: ${session ? 'Session found' : 'No session found'}, skipAuth: ${skipAuth}`);

    if (!session?.user && !skipAuth) {
      console.log('Content analysis API: No authenticated user found');
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'Please login to access this resource',
          tip: 'Add skipAuth=true to the query parameters to bypass auth for debugging'
        },
        { status: 401 }
      );
    }

    if (!contentPageId) {
      return NextResponse.json(
        { error: 'Content page ID is required' },
        { status: 400 }
      );
    }
    
    // Use direct client if skipping auth
    if (skipAuth) {
      console.log('Using direct Supabase client with service role for debugging (service role enabled)');
      
      // Check the actual URL and key (masking most of the key for security)
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const maskedKey = serviceRoleKey ? 
        `${serviceRoleKey.substring(0, 5)}...${serviceRoleKey.substring(serviceRoleKey.length - 5)}` : 
        'undefined';
      
      console.log(`Supabase URL: ${url}`);
      console.log(`Service role key (masked): ${maskedKey}`);
      
      // Check if the key looks like a valid JWT token (should start with "ey")
      if (!serviceRoleKey || !serviceRoleKey.startsWith('ey')) {
        console.error('Warning: SUPABASE_SERVICE_ROLE_KEY appears invalid');
      }
      
      // Create client with service role
      client = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // Additional debug: test with a simple query
      console.log('Running test query to verify database connection...');
      client
        .from('content_pages')
        .select('count(*)', { count: 'exact', head: true })
        .then(({ count, error }) => {
          if (error) {
            console.error('Test query failed:', error.message);
          } else {
            console.log(`Test query succeeded: ${count} total content pages found`);
          }
        });
    } else {
      console.log('Using standard Supabase client (no service role)');
    }
    
    // Fetch content page first to verify it exists
    console.log(`Fetching content page with ID: ${contentPageId}`);
    const { data: contentPage, error: contentPageError } = await client
      .from('content_pages')
      .select('id, project_id, url, title, content, readability_score, seo_score, analyzed_at')
      .eq('id', contentPageId)
      .maybeSingle();
      
    if (contentPageError) {
      console.log('Content analysis API: Error fetching content page:', contentPageError.message);
      return NextResponse.json(
        { error: `Error fetching content page: ${contentPageError.message}` },
        { status: 500 }
      );
    }

    if (!contentPage) {
      console.log(`Content analysis API: Content page not found for ID: ${contentPageId}`);
      
      // Debug output - check if this ID exists in the database
      console.log(`Debug: Checking if content page ID: ${contentPageId} exists with count query`);
      const { count, error: countError } = await client
        .from('content_pages')
        .select('*', { count: 'exact', head: true })
        .eq('id', contentPageId);
        
      if (countError) {
        console.log('Error checking content page count:', countError.message);
      } else {
        console.log(`Debug: Content page count for ID ${contentPageId}: ${count}`);
      }
      
      return NextResponse.json(
        { 
          error: 'Content page not found', 
          contentPageId,
          debug: { count: count || 0 }
        },
        { status: 404 }
      );
    }
    
    console.log(`Content page found: ${contentPage.title}, project_id: ${contentPage.project_id}`);
    
    // Fetch all analyses for the content page
    console.log(`Fetching analyses for content page ID: ${contentPageId}`);
    const { data: analyses, error: analysesError } = await client
      .from('content_analysis')
      .select('analysis_type, result, created_at')
      .eq('page_id', contentPageId)
      .order('created_at', { ascending: false });

    if (analysesError) {
      console.log('Content analysis API: Error fetching analyses:', analysesError.message);
      return NextResponse.json(
        { error: `Error fetching analyses: ${analysesError.message}` },
        { status: 500 }
      );
    }

    // Group analyses by type
    const analysisResults: Record<string, any> = {};
    analyses?.forEach(analysis => {
      if (!analysisResults[analysis.analysis_type] || 
          new Date(analysis.created_at) > new Date(analysisResults[analysis.analysis_type].created_at)) {
        analysisResults[analysis.analysis_type] = analysis;
      }
    });
    
    // Fetch content suggestions if they exist
    console.log(`Fetching content suggestions for content page ID: ${contentPageId}`);
    const { data: suggestions, error: suggestionsError } = await client
      .from('content_suggestions')
      .select('suggestion_type, original_text, suggested_text, reason, implemented, created_at')
      .eq('page_id', contentPageId)
      .order('created_at', { ascending: false });

    if (suggestionsError) {
      console.log('Content analysis API: Error fetching suggestions:', suggestionsError.message);
      return NextResponse.json(
        { error: `Error fetching suggestions: ${suggestionsError.message}` },
        { status: 500 }
      );
    }

    // Format the result
    console.log('Content analysis API: Successfully fetched data, returning results');
    return NextResponse.json({
      contentPage,
      analysis: {
        readability: analysisResults.readability?.result || null,
        keyword: analysisResults.keyword?.result || null,
        structure: analysisResults.structure?.result || null,
        suggestions: analysisResults.suggestions?.result || null
      },
      suggestions: suggestions || [],
      analyzed: contentPage.analyzed_at !== null,
      mostRecentAnalysis: analyses && analyses.length > 0 ? analyses[0].created_at : null
    });
    
  } catch (error: any) {
    console.error('Content analysis API: Error fetching analysis:', error);
    return NextResponse.json(
      { 
        error: `Error fetching content analysis: ${error.message}`,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";
    
    log.info(`Session check: ${session ? "Session found" : "No session"}, skipAuth: ${skipAuth}`);
    
    if (!session && !skipAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Use the service role client for database operations
    const client = getClient(true);
    log.info("Using direct Supabase client with service role for debugging (service role enabled)");
    log.debug("Supabase URL: " + process.env.NEXT_PUBLIC_SUPABASE_URL);
    log.debug("Service role key (masked): " + (process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 5) + "..." + process.env.SUPABASE_SERVICE_ROLE_KEY.substring(process.env.SUPABASE_SERVICE_ROLE_KEY.length - 5) : "Not available"));
    
    // Test the database connection
    log.info("Running test query to verify database connection...");
    try {
      await client.from('projects').select('id').limit(1);
      log.info("Test query successful!");
    } catch (error: any) {
      log.error("Test query failed", { message: error.message || '' });
      // Continue execution - we'll try to handle the request anyway
    }

    // Parse the request
    const requestData = await req.json();
    const { contentPageId, action } = requestData;

    // Validate the input
    if (!contentPageId && action !== "test") {
      return NextResponse.json({ error: "Content ID is required" }, { status: 400 });
    }

    // Process based on the action
    switch (action) {
      case "analyze": {
        if (!contentPageId) {
          return NextResponse.json({ error: "Content ID is required for analysis" }, { status: 400 });
        }

        log.info(`Analyzing content page with ID: ${contentPageId}`);

        // Fetch the content page
        const { data: contentPage, error } = await client
          .from('content_pages')
          .select('*')
          .eq('id', contentPageId)
          .maybeSingle();

        if (error) {
          log.error(`Error fetching content page: ${error.message}`);
          return NextResponse.json({ error: `Failed to fetch content page: ${error.message}` }, { status: 500 });
        }

        if (!contentPage) {
          return NextResponse.json({ error: "Content page not found" }, { status: 404 });
        }

        log.info(`Content page found, details: {
  title: '${contentPage.title}',
  project_id: '${contentPage.project_id}',
  url: '${contentPage.url}',
  contentLength: ${contentPage.content?.length || 0}
}`);

        // Initialize the analyzer
        log.info("Initializing LiteLLM provider and ContentAnalyzer");
        const llmProvider = LiteLLMProvider.getInstance();
        const model = await llmProvider.getLangChainModel();
        const analyzer = new ContentAnalyzer();
        await analyzer.initialize();

        // Perform the analysis
        const analysisResult = await analyzer.analyzeContent(
          contentPage.content,
          requestData.targetKeywords || []
        );

        // Store the analysis result in the database
        try {
          // Use the ContentAnalyzer's built-in storeAnalysisResults method
          const storeResult = await analyzer.storeAnalysisResults(
            contentPageId,
            analysisResult,
            client
          );
          
          if (!storeResult.success) {
            log.error(`Error saving analysis: ${storeResult.errors.join(', ')}`);
            return NextResponse.json(
              { 
                warning: `Analysis completed but had errors saving: ${storeResult.errors.join(', ')}`,
                result: analysisResult 
              }, 
              { status: 200 }
            );
          }
          
          return NextResponse.json({ 
            message: "Analysis completed and saved successfully",
            result: analysisResult
          });
        } catch (saveError: any) {
          log.error(`Error saving analysis: ${saveError.message}`);
          return NextResponse.json(
            { 
              warning: `Analysis completed but could not be saved: ${saveError.message}`,
              result: analysisResult 
            }, 
            { status: 200 }
          );
        }
      }

      case "test": {
        const { prompt } = requestData;
        
        if (!prompt) {
          return NextResponse.json({ error: "Prompt is required for testing" }, { status: 400 });
        }

        log.info("Running test prompt");
        
        // Initialize with LangChain model
        const llmProvider = LiteLLMProvider.getInstance();
        const model = await llmProvider.getLangChainModel();
        const analyzer = new ContentAnalyzer();
        await analyzer.initialize();
        
        // Run the test
        const result = await analyzer.testPrompt(prompt);
        
        return NextResponse.json({ result });
      }

      case "get": {
        log.info(`Fetching analyses for content page ID: ${contentPageId}`);
        
        // Get the analyses for this content page
        const { data: analyses, error: analysesError } = await client
          .from('content_analysis')
          .select('*')
          .eq('page_id', contentPageId);
          
        if (analysesError) {
          log.error(`Error fetching analyses: ${analysesError.message}`);
          return NextResponse.json({ error: `Failed to fetch analyses: ${analysesError.message}` }, { status: 500 });
        }
        
        log.info(`Fetching content suggestions for content page ID: ${contentPageId}`);
        
        // Get the content suggestions for this content page
        const { data: suggestions, error: suggestionsError } = await client
          .from('content_analysis')
          .select('*')
          .eq('page_id', contentPageId)
          .eq('analysis_type', 'suggestions');
          
        if (suggestionsError) {
          log.error(`Error fetching suggestions: ${suggestionsError.message}`);
          // Continue without suggestions
        }
        
        log.info('Content analysis API: Successfully fetched data, returning results');
        
        return NextResponse.json({ 
          analyses: analyses || [],
          suggestions: suggestions?.length ? suggestions[0].result : []
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: any) {
    log.error(`Unexpected error in API route: ${error.message}`);
    console.error('API route error stack:', error.stack);
    return NextResponse.json({ error: `Internal server error: ${error.message}` }, { status: 500 });
  }
} 