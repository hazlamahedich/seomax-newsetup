import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
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

// Create a namespace for logging
const logNamespace = "ContentAnalysisAPI";
const log = {
  info: (message: string, data?: any) => logger.info(`[${logNamespace}:INFO] ${message}`, data),
  debug: (message: string, data?: any) => logger.debug(`[${logNamespace}:DEBUG] ${message}`, data),
  error: (message: string, data?: any) => logger.error(`[${logNamespace}:ERROR] ${message}`, data)
};

export async function GET(request: NextRequest) {
  try {
    // Get the contentPageId from the URL
    const url = new URL(request.url);
    const contentPageId = url.searchParams.get('contentPageId');
    const skipAuth = url.searchParams.get('skipAuth') === 'true';
    
    // Check if authenticated, unless skipAuth is true
    if (!skipAuth) {
      const session = await getServerSession(authOptions);
      if (!session) {
        console.log('[Content Analysis API] Unauthorized access attempt');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }
    
    if (!contentPageId) {
      return NextResponse.json(
        { error: 'Missing contentPageId parameter' },
        { status: 400 }
      );
    }
    
    console.log(`[Content Analysis API] Getting content page and analysis for ID: ${contentPageId}`);
    
    try {
      // Try with regular client first
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
      
      // Get the content page
      const { data: contentPage, error: contentError } = await supabase
        .from('content_pages')
        .select('*')
        .eq('id', contentPageId)
        .single();
      
      if (contentError) {
        console.log('Regular client error, trying admin client:', contentError);
        // Fall back to admin client
        const adminClient = createAdminClient();
        
        // Get the content page
        const { data: adminContentPage, error: adminContentError } = await adminClient
          .from('content_pages')
          .select('*')
          .eq('id', contentPageId)
          .single();
          
        if (adminContentError) {
          throw new Error(`Admin client error: ${adminContentError.message}`);
        }
        
        // Get the analysis
        const { data: analysisData, error: analysisError } = await adminClient
          .from('content_analysis')
          .select('*')
          .eq('content_page_id', contentPageId)
          .maybeSingle();
          
        if (analysisError) {
          throw new Error(`Admin client error for analysis: ${analysisError.message}`);
        }
        
        console.log(`[Content Analysis API] Successfully retrieved data with admin client`);
        return NextResponse.json({
          contentPage: adminContentPage,
          analysis: analysisData
        });
      }
      
      // Get the analysis
      const { data: analysisData, error: analysisError } = await supabase
        .from('content_analysis')
        .select('*')
        .eq('content_page_id', contentPageId)
        .maybeSingle();
      
      if (analysisError) {
        throw new Error(`Error getting analysis: ${analysisError.message}`);
      }
      
      console.log(`[Content Analysis API] Successfully retrieved data with regular client`);
      return NextResponse.json({
        contentPage,
        analysis: analysisData
      });
    } catch (error) {
      console.error('[Content Analysis API] Error getting content and analysis:', error);
      return NextResponse.json(
        { error: 'Error retrieving content data', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Content Analysis API] Unhandled error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contentPageId, skipAuth = false, action } = body;
    
    // Check if authenticated, unless skipAuth is true
    if (!skipAuth) {
      const session = await getServerSession(authOptions);
      if (!session) {
        console.log('[Content Analysis API] Unauthorized POST attempt');
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }
    
    if (!contentPageId) {
      return NextResponse.json(
        { error: 'Missing contentPageId parameter' },
        { status: 400 }
      );
    }
    
    if (action === 'analyze') {
      try {
        // Try with admin client directly for analysis operations
        console.log(`[Content Analysis API] Starting analysis for content page ID: ${contentPageId}`);
        
        const adminClient = createAdminClient();
        
        // Update the content page status to "analyzing"
        const { error: updateError } = await adminClient
          .from('content_pages')
          .update({ status: 'analyzing' })
          .eq('id', contentPageId);
          
        if (updateError) {
          throw new Error(`Error updating content page status: ${updateError.message}`);
        }
        
        // Simulate analysis process (in a real implementation, this would call AI services, etc.)
        // For demo purposes, we'll just update with some mock data after a short delay
        setTimeout(async () => {
          try {
            // Generate mock analysis results
            const readabilityScore = Math.floor(Math.random() * 40) + 60; // 60-100
            const seoScore = Math.floor(Math.random() * 40) + 60; // 60-100
            
            // Update the content page with analysis results
            const { error: resultError } = await adminClient
              .from('content_pages')
              .update({ 
                status: 'analyzed',
                readability_score: readabilityScore,
                seo_score: seoScore,
                last_analyzed_at: new Date().toISOString()
              })
              .eq('id', contentPageId);
              
            if (resultError) {
              console.error(`Error updating analysis results: ${resultError.message}`);
              return;
            }
            
            // Create or update content analysis record
            const analysisResult = {
              content_page_id: contentPageId,
              readability_analysis: {
                score: readabilityScore,
                averageSentenceLength: Math.floor(Math.random() * 15) + 10,
                averageWordLength: Math.floor(Math.random() * 2) + 4,
                passiveVoiceCount: Math.floor(Math.random() * 10),
                complexWordCount: Math.floor(Math.random() * 20),
                readingTime: Math.floor(Math.random() * 5) + 2,
                suggestions: [
                  "Use shorter sentences for better readability",
                  "Reduce passive voice to make content more engaging",
                  "Use simple language when possible"
                ]
              },
              keyword_analysis: {
                primaryKeyword: {
                  keyword: "SEO",
                  density: 1.5,
                  count: 15,
                  positions: [1, 45, 120]
                },
                secondaryKeywords: [
                  {
                    keyword: "content",
                    density: 2.0,
                    count: 20
                  },
                  {
                    keyword: "optimization",
                    density: 1.0,
                    count: 10
                  }
                ],
                missingKeywords: ["digital marketing", "backlinks"],
                suggestions: [
                  "Add more variations of your primary keyword",
                  "Include missing keywords in headings",
                  "Add relevant LSI keywords"
                ]
              },
              structure_analysis: {
                headingStructure: {
                  h1Count: 1,
                  h2Count: 3,
                  h3Count: 5,
                  h4Count: 2,
                  h5Count: 0,
                  h6Count: 0
                },
                paragraphCount: 12,
                listCount: 3,
                imageCount: 2,
                linkCount: {
                  internal: 3,
                  external: 5
                },
                suggestions: [
                  "Add more subheadings to improve structure",
                  "Consider adding more images for visual appeal",
                  "Break up long paragraphs for better readability"
                ]
              },
              overall_score: (readabilityScore + seoScore) / 2
            };
            
            // Check if analysis already exists
            const { data: existingAnalysis, error: checkError } = await adminClient
              .from('content_analysis')
              .select('id')
              .eq('content_page_id', contentPageId)
              .maybeSingle();
              
            if (checkError) {
              console.error(`Error checking existing analysis: ${checkError.message}`);
              return;
            }
            
            if (existingAnalysis) {
              // Update existing analysis
              const { error: updateAnalysisError } = await adminClient
                .from('content_analysis')
                .update(analysisResult)
                .eq('id', existingAnalysis.id);
                
              if (updateAnalysisError) {
                console.error(`Error updating analysis: ${updateAnalysisError.message}`);
              } else {
                console.log(`Successfully updated analysis for content page ${contentPageId}`);
              }
            } else {
              // Create new analysis
              const { error: insertAnalysisError } = await adminClient
                .from('content_analysis')
                .insert([analysisResult]);
                
              if (insertAnalysisError) {
                console.error(`Error creating analysis: ${insertAnalysisError.message}`);
              } else {
                console.log(`Successfully created analysis for content page ${contentPageId}`);
              }
            }
          } catch (innerError) {
            console.error(`Error in background analysis task: ${innerError}`);
          }
        }, 3000); // 3 second delay to simulate processing time
        
        return NextResponse.json({ success: true, message: 'Analysis started' });
      } catch (error) {
        console.error('Error starting analysis:', error);
        return NextResponse.json(
          { error: 'Error starting analysis', details: error instanceof Error ? error.message : String(error) },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[Content Analysis API] Unhandled error in POST:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 