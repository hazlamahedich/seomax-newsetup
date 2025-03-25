import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';
import { LLMModelRepository } from '@/lib/ai/models/repository';

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

export async function POST(request: NextRequest) {
  try {
    // Extract the model details from the request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      const errorResponse = NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
      return addCorsHeaders(errorResponse);
    }
    
    const { model } = body;
    
    if (!model || !model.id) {
      const errorResponse = NextResponse.json(
        { error: 'Valid model with ID is required' },
        { status: 400 }
      );
      return addCorsHeaders(errorResponse);
    }
    
    console.log("Cache API: Caching model:", model.name, model.id);
    
    // Add model to the cache
    LLMModelRepository.cacheModel(model);
    
    // Also try to save/update it in the database if it's not already there
    try {
      const existingModel = await LLMModelRepository.getModelById(model.id);
      if (!existingModel) {
        console.log("Cache API: Model doesn't exist in DB, creating it:", model.id);
        await LLMModelRepository.createModel({
          name: model.name,
          provider: model.provider,
          modelName: model.modelName,
          apiKey: model.apiKey || "",
          baseUrl: model.baseUrl || "",
          temperature: model.temperature || 0.2,
          maxTokens: model.maxTokens || 2000,
          costPerToken: model.costPerToken || 0,
          costPerThousandTokens: model.costPerThousandTokens || 0,
          isDefault: model.isDefault || false,
        });
      }
    } catch (dbError) {
      console.error("Cache API: Error saving model to database:", dbError);
      // Continue anyway since we've cached it in memory
    }
    
    return addCorsHeaders(NextResponse.json({ 
      success: true, 
      message: `Model ${model.name} cached successfully` 
    }));
  } catch (error: any) {
    console.error('Error caching model:', error);
    const errorResponse = NextResponse.json(
      { 
        error: error?.message || 'Unknown error occurred',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
    return addCorsHeaders(errorResponse);
  }
} 