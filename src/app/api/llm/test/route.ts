import { NextRequest, NextResponse } from 'next/server';
import { LLMModelRepository } from '@/lib/ai/models/repository';
import { createSupabaseClient } from '@/lib/supabase/client';
import { LiteLLMProvider } from '@/lib/ai/litellm-provider';

// Initialize Supabase client
const supabase = createSupabaseClient();

export async function POST(request: NextRequest) {
  try {
    // Extract the modelId and prompt from the request body
    const body = await request.json();
    const { modelId, prompt } = body;
    
    // Validate inputs
    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }
    
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json(
        { error: 'A valid prompt is required' },
        { status: 400 }
      );
    }
    
    // Get the model configuration
    const model = await LLMModelRepository.getModelById(modelId);
    if (!model) {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      );
    }
    
    // Get instance of LiteLLMProvider
    const provider = LiteLLMProvider.getInstance();
    
    // Add the model configuration temporarily for this request
    provider.addModel("test_model", {
      provider: model.provider,
      modelName: model.modelName,
      apiKey: model.apiKey,
      baseUrl: model.baseUrl,
      temperature: model.temperature,
      maxTokens: model.maxTokens,
    });
    
    // Get user session for usage tracking
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    
    // Call the model
    const result = await provider.callLLM(prompt, "test_model", {
      userId,
      projectId: "test",
    });
    
    // Return the completion
    return NextResponse.json({ 
      completion: result.choices[0].message.content,
      model: model.name,
      usage: {
        totalTokens: result.usage?.total_tokens,
        promptTokens: result.usage?.prompt_tokens,
        completionTokens: result.usage?.completion_tokens,
      }
    });
    
  } catch (error) {
    console.error('Error testing LLM model:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
} 