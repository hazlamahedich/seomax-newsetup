import { LLMModelRepository } from "@/lib/ai/models/repository";

/**
 * Initializes a default OpenAI GPT-4o model if no models exist yet
 * This is helpful for getting started with LLM management
 */
export async function initializeDefaultModel() {
  try {
    // Check if any models exist
    const models = await LLMModelRepository.getAllModels();
    
    // If models already exist, don't create a default one
    if (models.length > 0) {
      return {
        created: false,
        message: "Models already exist, skipping initialization",
      };
    }
    
    // Create a default OpenAI model
    const model = await LLMModelRepository.createModel({
      name: "OpenAI GPT-4o",
      provider: "openai",
      modelName: "gpt-4o",
      apiKey: process.env.OPENAI_API_KEY || "",
      temperature: 0.2,
      maxTokens: 2000,
      costPerThousandTokens: 10, // $10 per 1K tokens as a placeholder
      isDefault: true,
    });
    
    return {
      created: true,
      model,
      message: "Default OpenAI model initialized successfully",
    };
  } catch (error) {
    console.error("Error initializing default model:", error);
    return {
      created: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to initialize default model",
    };
  }
} 