import { NextRequest, NextResponse } from 'next/server';
import { LLMModelRepository } from '@/lib/ai/models/repository';
import { createClient } from '@/lib/supabase/client';
import { LiteLLMProvider } from '@/lib/ai/litellm-provider';
import { completion } from 'litellm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Initialize Supabase client
const supabase = createClient();

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
    // Extract the modelId and prompt from the request body
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
    
    const { modelId, prompt, provider, modelName, baseUrl, temperature, maxTokens } = body;
    
    console.log("Test API received request:", { modelId, prompt, provider, modelName });
    
    // Add diagnostic database query
    try {
      console.log("Running diagnostic query to check database connectivity");
      const { count, error: diagError } = await supabase
        .from('llm_models')
        .select('id', { count: 'exact', head: true });
        
      if (diagError) {
        console.error("Database diagnostic failed:", diagError);
      } else {
        console.log("Database diagnostic successful, model count:", count);
      }
    } catch (diagErr) {
      console.error("Exception during database diagnostic:", diagErr);
    }
    
    // Validate inputs
    if (!modelId) {
      console.log("Missing model ID");
      const errorResponse = NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
      return addCorsHeaders(errorResponse);
    }
    
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      console.log("Missing or invalid prompt");
      const errorResponse = NextResponse.json(
        { error: 'A valid prompt is required' },
        { status: 400 }
      );
      return addCorsHeaders(errorResponse);
    }
    
    let model;
    
    try {
      // Try to get the model configuration
      console.log("Fetching model with ID:", modelId);
      try {
        model = await LLMModelRepository.getModelById(modelId);
        console.log("Repository getModelById result:", model ? "Found" : "Not found"); 
      } catch (repoError) {
        console.error("Repository error fetching model:", repoError);
        // Don't throw - continue to fallback options
      }
      
      // If model not found but user supplied provider/model details, use those instead
      if (!model && provider && modelName) {
        console.log("Model not found, but provider and model name provided. Creating temporary model.");
        model = {
          id: modelId,
          name: `Temporary model (${provider}/${modelName})`,
          provider: provider,
          modelName: modelName,
          apiKey: "",  // Will use environment variable
          baseUrl: baseUrl || "",
          temperature: temperature || 0.2,
          maxTokens: maxTokens || 2000,
          costPerToken: 0,
          costPerThousandTokens: 0,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      // Special case for the problematic model
      if (!model && modelId === '97767c8f-76e2-4b3d-870f-4196dbd59473') {
        console.log("Using hardcoded fallback for the specific problematic model");
        model = {
          id: modelId,
          name: "DeepseekR1 70B local (Fallback)",
          provider: 'local',
          modelName: 'DeepseekR1 70B local',
          apiKey: "",  // Will use environment variable
          baseUrl: 'http://localhost:11434/v1',
          temperature: 0.2,
          maxTokens: 2000,
          costPerToken: 0,
          costPerThousandTokens: 0,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      if (!model) {
        console.log("Model not found in database for ID:", modelId);
        const errorResponse = NextResponse.json(
          { error: 'Model not found. You may need to provide provider and modelName parameters.' },
          { status: 404 }
        );
        return addCorsHeaders(errorResponse);
      }
      
      console.log("Found/Created model:", {
        id: model.id,
        name: model.name,
        provider: model.provider,
        modelName: model.modelName,
        // Don't log the full API key for security
        hasApiKey: !!model.apiKey,
        baseUrl: model.baseUrl
      });
  
      // Direct approach using litellm for more control and better debugging
      // Set environment variable for the provider
      if (model.apiKey) {
        if (model.provider === "together") {
          process.env.TOGETHER_API_KEY = model.apiKey;
        } else if (model.provider === "local") {
          // For local models with OpenAI-compatible API, use OPENAI_API_KEY
          process.env.OPENAI_API_KEY = model.apiKey === "EMPTY" ? "" : model.apiKey;
        } else {
          process.env[`${model.provider.toUpperCase()}_API_KEY`] = model.apiKey;
        }
      }
  
      // Construct the model string based on provider
      let modelString = model.modelName;
      if (model.provider === "local") {
        // For local models like Ollama, use the ollama/ prefix
        modelString = `ollama/${model.modelName}`;
        console.log("Using Ollama model with prefix:", modelString);
      } else if (model.provider === "together") {
        // For Together.ai, ensure the model format is correct
        modelString = `together/${model.modelName}`;
      } else if (model.provider !== "openai") {
        modelString = `${model.provider}/${model.modelName}`;
      }
  
      // Set base URL if provided
      if (model.baseUrl) {
        // Clean up base URL - remove trailing spaces or periods
        const cleanedBaseUrl = model.baseUrl.trim().replace(/\.$/, '');
        console.log(`Setting ${model.provider} base URL (original):`, model.baseUrl);
        console.log(`Setting ${model.provider} base URL (cleaned):`, cleanedBaseUrl);
        
        if (model.provider === "together") {
          process.env.TOGETHER_API_BASE = cleanedBaseUrl;
        } else if (model.provider === "local") {
          // For local models, we use the OpenAI API base
          process.env.OPENAI_API_BASE = cleanedBaseUrl;
        } else {
          process.env.OPENAI_API_BASE = cleanedBaseUrl;
        }
      }
  
      console.log("Calling LLM with model string:", modelString);
      
      // For local models, we need to ensure a proper options structure
      const options: any = {
        model: modelString,
        messages: [{ role: "user", content: prompt }],
        temperature: model.temperature,
        max_tokens: model.maxTokens,
      };
      
      // For local models, ensure we're using the correct provider
      if (model.provider === "local") {
        options.api_base = model.baseUrl?.trim().replace(/\.$/, '');
      }
  
      try {
        // For Ollama models, check if model exists first
        if (model.provider === "local" && options.api_base) {
          try {
            // Make a test request to check if the model exists
            console.log("Checking if model exists in Ollama...");
            // Remove the 'ollama/' prefix for the actual check
            const modelNameForCheck = model.modelName.replace('ollama/', '');
            
            // Get the base domain without the "/v1" path
            const baseUrl = options.api_base.replace(/\/v1\/?$/, '');
            console.log(`Making check request to: ${baseUrl}/api/tags`);
            
            const checkResponse = await fetch(`${baseUrl}/api/tags`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            
            if (checkResponse.ok) {
              const models = await checkResponse.json();
              console.log("Available models in Ollama:", models);
              
              // Check if our model is in the list
              let modelExists = models.models?.some((m: any) => 
                m.name === modelNameForCheck || 
                m.name === model.modelName
              );
              
              // If model doesn't exist with exact name, let's check if it exists with common suffixes
              if (!modelExists && models.models) {
                // Find models that start with our requested name (might have size suffixes like :14b)
                const matchingModels = models.models.filter((m: any) => 
                  m.name.startsWith(modelNameForCheck + ':')
                );
                
                if (matchingModels.length > 0) {
                  // Use the first matching model with suffix
                  const exactModelName = matchingModels[0].name;
                  console.log(`Found model with suffix: ${exactModelName} instead of ${modelNameForCheck}`);
                  
                  // Update the model string to use the exact name with suffix
                  modelString = `ollama/${exactModelName}`;
                  console.log("Updated model string to:", modelString);
                  
                  // Set the flag to true since we found a matching model with suffix
                  modelExists = true;
                }
              }
              
              if (!modelExists) {
                return addCorsHeaders(NextResponse.json({
                  error: `Model "${modelNameForCheck}" not found in Ollama. Available models: ${models.models?.map((m: any) => m.name).join(', ') || 'none'}`,
                  details: {
                    availableModels: models.models || [],
                    requestedModel: modelNameForCheck
                  }
                }, { status: 404 }));
              }
            }
          } catch (checkError) {
            console.log("Error checking model availability:", checkError);
            // Continue with the actual request even if check fails
          }
        }

        const result = await completion(options);
        console.log("LLM call successful, got response");
        
        // Return the completion
        const successResponse = NextResponse.json({ 
          completion: result.choices[0].message.content,
          model: model.name,
          usage: {
            totalTokens: result.usage?.total_tokens || 0,
            promptTokens: result.usage?.prompt_tokens || 0,
            completionTokens: result.usage?.completion_tokens || 0,
          }
        });
        return addCorsHeaders(successResponse);
      } catch (llmError: any) {
        console.error("LiteLLM error details:", llmError);
        // Detailed error logging
        console.error("Error type:", typeof llmError);
        console.error("Error message:", llmError?.message);
        console.error("Error status:", llmError?.status);
        console.error("Error response:", llmError?.response);
        
        // Create a more detailed error object
        const errorDetails = {
          message: llmError?.message || "Unknown LiteLLM error",
          status: llmError?.status || 500,
          errorType: llmError?.constructor?.name || typeof llmError,
          modelDetails: {
            provider: model.provider,
            modelName: model.modelName,
            baseUrl: model.baseUrl,
            hasApiKey: !!model.apiKey
          }
        };
        
        const errorResponse = NextResponse.json(
          { 
            error: errorDetails.message,
            details: errorDetails
          },
          { status: errorDetails.status || 500 }
        );
        return addCorsHeaders(errorResponse);
      }
    } catch (dbError: any) {
      console.error("Database error:", dbError);
      const errorResponse = NextResponse.json(
        { 
          error: dbError?.message || 'Database error occurred',
          source: 'database'
        },
        { status: 500 }
      );
      return addCorsHeaders(errorResponse);
    }
    
  } catch (error: any) {
    console.error('General error testing LLM model:', error);
    const errorResponse = NextResponse.json(
      { 
        error: error?.message || 'Unknown error occurred',
        source: 'general',
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
    return addCorsHeaders(errorResponse);
  }
} 