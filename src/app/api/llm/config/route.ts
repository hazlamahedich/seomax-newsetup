import { NextRequest, NextResponse } from 'next/server';
import { LiteLLMProvider } from '@/lib/ai/litellm-provider';

export async function GET(req: NextRequest) {
  try {
    const llmProvider = LiteLLMProvider.getInstance();
    const defaultModelId = llmProvider.getDefaultModel();
    const models = llmProvider.listModels();
    
    return NextResponse.json({
      success: true,
      defaultModelId,
      models,
      isLocalModel: models.find(model => model.id === defaultModelId)?.config.provider === 'local'
    });
  } catch (error: any) {
    console.error('Error getting LLM configuration:', error);
    return NextResponse.json(
      { error: 'Failed to get LLM configuration', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const llmProvider = LiteLLMProvider.getInstance();
    const body = await req.json();
    const { modelId } = body;
    
    if (!modelId) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }
    
    const success = llmProvider.setDefaultModel(modelId);
    
    if (!success) {
      return NextResponse.json(
        { error: `Model with ID "${modelId}" not found` },
        { status: 404 }
      );
    }
    
    const models = llmProvider.listModels();
    const defaultModelId = llmProvider.getDefaultModel();
    
    return NextResponse.json({
      success: true,
      message: `Default model set to ${modelId}`,
      defaultModelId,
      models,
      isLocalModel: models.find(model => model.id === defaultModelId)?.config.provider === 'local'
    });
  } catch (error: any) {
    console.error('Error updating LLM configuration:', error);
    return NextResponse.json(
      { error: 'Failed to update LLM configuration', details: error.message },
      { status: 500 }
    );
  }
} 