import { NextRequest, NextResponse } from 'next/server';
import { LLMModelRepository } from '@/lib/ai/models/repository';
import { createSupabaseClient } from '@/lib/supabase/client';

// Initialize Supabase client
const supabase = createSupabaseClient();

// Add headers function for enabling CORS
const addCorsHeaders = (response: NextResponse) => {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
};

// Handle CORS preflight requests
export async function OPTIONS() {
  return addCorsHeaders(NextResponse.json({}, { status: 200 }));
}

// Common handler for both GET and POST
async function handleRequest(request: NextRequest) {
  try {
    // Get modelId from either query params (GET) or request body (POST)
    let modelId: string | null = null;
    
    if (request.method === 'POST') {
      try {
        const body = await request.json();
        modelId = body.modelId;
      } catch (error) {
        console.error("Error parsing request body:", error);
      }
    } else {
      // For GET requests
      modelId = request.nextUrl.searchParams.get('modelId');
    }
    
    if (!modelId) {
      return addCorsHeaders(NextResponse.json(
        { error: 'Model ID parameter is required' },
        { status: 400 }
      ));
    }
    
    // Try to get the model directly from the repository
    const repoModel = await LLMModelRepository.getModelById(modelId);
    
    // Run a diagnostic database query
    let connectionStatus = 'unknown';
    let modelCount = 0;
    let availableModelIds: string[] = [];
    
    try {
      console.log("Running diagnostic query to check database connectivity");
      // Fix for Supabase REST API - use count: 'exact' parameter instead of count(*)
      const { count, error: diagError } = await supabase
        .from('llm_models')
        .select('id', { count: 'exact', head: true });
      
      if (diagError) {
        console.error("Database diagnostic failed:", diagError);
        connectionStatus = 'error';
      } else {
        connectionStatus = 'connected';
        modelCount = count || 0;
      }
    } catch (diagErr) {
      console.error("Exception during database diagnostic:", diagErr);
      connectionStatus = 'exception';
    }
    
    // Fetch all models to see what's available
    try {
      const allModels = await LLMModelRepository.getAllModels();
      availableModelIds = allModels.filter(m => m.id).map(m => m.id as string);
    } catch (error) {
      console.error("Error fetching all models:", error);
    }
    
    // Check if model exists in cache
    let cacheStatus = 'unknown';
    
    // @ts-ignore - Accessing private property for debugging
    if (LLMModelRepository._debugOnlyCheckCache && typeof LLMModelRepository._debugOnlyCheckCache === 'function') {
      // @ts-ignore
      cacheStatus = LLMModelRepository._debugOnlyCheckCache(modelId) ? 'cached' : 'not_cached';
    }
    
    return addCorsHeaders(NextResponse.json({
      modelId,
      modelFound: !!repoModel,
      modelDetails: repoModel ? {
        id: repoModel.id,
        name: repoModel.name,
        provider: repoModel.provider,
        modelName: repoModel.modelName,
        baseUrl: repoModel.baseUrl,
        hasApiKey: !!repoModel.apiKey,
        temperature: repoModel.temperature,
        maxTokens: repoModel.maxTokens,
      } : null,
      dbDiagnostics: {
        connectionStatus,
        modelCount,
        availableModelIds,
        modelInList: availableModelIds.includes(modelId),
      },
      cacheStatus,
      timestamp: new Date().toISOString(),
    }));
  } catch (error: any) {
    console.error('Error in debug endpoint:', error);
    return addCorsHeaders(NextResponse.json(
      { 
        error: error?.message || 'Unknown error occurred',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    ));
  }
}

// Handle GET requests
export async function GET(request: NextRequest) {
  return handleRequest(request);
}

// Handle POST requests
export async function POST(request: NextRequest) {
  return handleRequest(request);
} 