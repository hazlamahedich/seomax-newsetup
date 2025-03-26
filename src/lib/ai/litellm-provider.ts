import { Message } from 'ai';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessageLike } from '@langchain/core/messages';
import { LLMModel, LLMModelSchema } from './models/usage';
import { LLMModelRepository } from './models/repository';

// Export schema for use in UI components
export const LLMConfigSchema = LLMModelSchema;

interface LiteLLMConfig {
  modelName: string;
  apiKey: string | undefined;
  baseUrl: string | undefined;
  temperature: number;
  maxTokens: number;
}

interface StreamResponse {
  stream: ReadableStream;
}

interface LangChainStreamResult {
  stream: ReadableStream;
  callbacks: any[];
}

export class LiteLLMProvider {
  private static instance: LiteLLMProvider;
  private defaultConfig: LiteLLMConfig;
  private activeModels: Map<string, LLMModel>;
  private initialized: boolean = false;

  private constructor() {
    // Initialize with safe defaults - will be overridden by loadConfigurations
    this.defaultConfig = {
      modelName: 'dummy-model',  // Will be replaced on first use
      temperature: 0.7,
      maxTokens: 2000,
      apiKey: undefined,
      baseUrl: undefined,
    };
    this.activeModels = new Map();
  }

  public static getInstance(): LiteLLMProvider {
    if (!LiteLLMProvider.instance) {
      LiteLLMProvider.instance = new LiteLLMProvider();
    }
    return LiteLLMProvider.instance;
  }

  private async loadConfigurations(): Promise<void> {
    // Skip if already initialized
    if (this.initialized) {
      console.log('LiteLLMProvider: Already initialized, skipping loadConfigurations');
      return;
    }

    try {
      // First try to load models from the database
      console.log('LiteLLMProvider: Loading models from database...');
      let models = await LLMModelRepository.getAllModels();
      
      // If no models found with regular client, try with service role
      if (models.length === 0) {
        console.log('LiteLLMProvider: No models found with regular client, trying with service role');
        models = await LLMModelRepository.getAllModels(true);
      }
      
      console.log(`LiteLLMProvider: Loaded ${models.length} models from database`);
      
      if (models.length > 0) {
        // Add all models to active models
        let foundDefault = false;
        models.forEach(model => {
          if (model.id) {
            this.activeModels.set(model.id, model);
            console.log(`LiteLLMProvider: Added model to active models: ${model.name}, isDefault: ${model.isDefault}, baseUrl: ${model.baseUrl}`);
            
            // If this is the default model, update defaultConfig
            if (model.isDefault) {
              foundDefault = true;
              console.log(`LiteLLMProvider: Setting default model to: ${model.name}`);
              console.log(`LiteLLMProvider: Default model details - modelName: ${model.modelName}, baseUrl: ${model.baseUrl}, provider: ${model.provider}`);
              
              this.defaultConfig = {
                modelName: model.modelName,
                apiKey: model.apiKey || undefined,
                baseUrl: model.baseUrl || undefined,
                temperature: model.temperature || 0.7,
                maxTokens: model.maxTokens || 2000,
              };
              console.log('LiteLLMProvider: Default config set:', this.defaultConfig);
            }
          }
        });

        // If we found models but no default, use the first model
        if (!foundDefault && models.length > 0 && models[0].id) {
          const firstModel = models[0];
          console.log(`LiteLLMProvider: No default model found, using first model: ${firstModel.name}`);
          this.defaultConfig = {
            modelName: firstModel.modelName,
            apiKey: firstModel.apiKey || undefined,
            baseUrl: firstModel.baseUrl || undefined,
            temperature: firstModel.temperature || 0.7,
            maxTokens: firstModel.maxTokens || 2000,
          };
          console.log('LiteLLMProvider: Default config set to first model:', this.defaultConfig);
        }
        
        this.initialized = true;
        console.log('LiteLLMProvider: Loaded configurations from database');
        return;
      }
      
      // If no models found in the database, try to fetch the default model directly
      console.log('LiteLLMProvider: No models found in database, trying to fetch default model directly');
      this.defaultConfig = await this.fetchDefaultModelFromDB();
      console.log('LiteLLMProvider: Default config set from fetchDefaultModelFromDB:', this.defaultConfig);
      this.initialized = true;
      return;
      
    } catch (error) {
      console.error('LiteLLMProvider: Error loading configurations from database:', error);
      console.error('LiteLLMProvider: Error details:', error instanceof Error ? error.message : 'Unknown error');
      console.error('LiteLLMProvider: Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
      
      // If there was an error, try to fetch the default model directly
      console.log('LiteLLMProvider: Error occurred, trying to fetch default model directly');
      this.defaultConfig = await this.fetchDefaultModelFromDB();
      console.log('LiteLLMProvider: Default config set from fetchDefaultModelFromDB after error:', this.defaultConfig);
      this.initialized = true;
      return;
    }

    // This code should no longer be reached, but keeping as a last fallback
    console.log('LiteLLMProvider: All attempts to load configurations failed, setting up fallback configuration');
    // If no models in database or error occurred, set up default configuration
    const openAiKey = process.env.OPENAI_API_KEY;
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    const defaultModel = process.env.DEFAULT_OLLAMA_MODEL || 'llama3.2';
    
    console.log(`LiteLLMProvider: Using environment variables - defaultModel: ${defaultModel}, ollamaBaseUrl: ${ollamaBaseUrl}, hasOpenAiKey: ${!!openAiKey}`);
    
    if (openAiKey) {
      this.defaultConfig = {
        modelName: 'gpt-3.5-turbo',
        apiKey: openAiKey,
        baseUrl: undefined,
        temperature: 0.7,
        maxTokens: 2000,
      };
      console.log('LiteLLMProvider: Set default config to OpenAI');
    } else if (process.env.NODE_ENV === 'development') {
      this.defaultConfig = {
        modelName: defaultModel,
        baseUrl: ollamaBaseUrl,
        apiKey: undefined,
        temperature: 0.7,
        maxTokens: 2000,
      };
      console.log(`LiteLLMProvider: Set default config to local model: ${defaultModel} at ${ollamaBaseUrl}`);
    }

    // Try to create a default model in the database using service role
    try {
      console.log('LiteLLMProvider: Creating default model in database using service role');
      const defaultModelConfig = await LLMModelRepository.createModel({
        name: 'Default Model',
        provider: openAiKey ? 'openai' : 'local',
        modelName: this.defaultConfig.modelName,
        apiKey: this.defaultConfig.apiKey || null,
        baseUrl: this.defaultConfig.baseUrl || null,
        temperature: this.defaultConfig.temperature,
        maxTokens: this.defaultConfig.maxTokens,
        costPerToken: 0,
        costPerThousandTokens: 0,
        isDefault: true,
      }, true); // Use service role

      if (defaultModelConfig && defaultModelConfig.id) {
        this.activeModels.set(defaultModelConfig.id, defaultModelConfig);
        console.log(`LiteLLMProvider: Created and added default model to active models: ${defaultModelConfig.name}`);
      }
    } catch (error) {
      console.error('LiteLLMProvider: Error creating default model in database:', error);
    }

    this.initialized = true;
    console.log('LiteLLMProvider: Initialization completed with fallback configuration');
  }

  public async setDefaultModel(id: string): Promise<boolean> {
    const model = await LLMModelRepository.getModelById(id);
    if (!model) {
      console.error('LiteLLMProvider: Model not found for ID:', id);
      return false;
    }

    try {
      const updatedModel = await LLMModelRepository.updateModel(id, {
        ...model,
        isDefault: true,
      });

      if (updatedModel) {
        this.defaultConfig = {
          modelName: updatedModel.modelName,
          apiKey: updatedModel.apiKey || undefined,
          baseUrl: updatedModel.baseUrl || undefined,
          temperature: updatedModel.temperature || 0.7,
          maxTokens: updatedModel.maxTokens || 2000,
        };
        return true;
      }
    } catch (error) {
      console.error('LiteLLMProvider: Error setting default model:', error);
    }

    return false;
  }

  private async createOllamaLangChainModel(config: LiteLLMConfig): Promise<ChatOpenAI> {
    // Clean the baseUrl - make sure it has no spaces, ending periods, etc.
    let cleanBaseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    
    console.log(`createOllamaLangChainModel: Original baseUrl: "${cleanBaseUrl}"`);
    
    // Clean up the URL - remove trailing spaces, extra dots, fix common issues
    cleanBaseUrl = cleanBaseUrl.trim();
    
    // If it ends with /v1. (and possibly a space) fix it
    if (cleanBaseUrl.match(/\/v1\.?\s*$/)) {
      cleanBaseUrl = cleanBaseUrl.replace(/\/v1\.?\s*$/, '/v1');
    }
    
    // DO NOT remove /v1 suffix as it may be needed for the API
    // Only cleanup trailing spaces or dots
    cleanBaseUrl = cleanBaseUrl.replace(/[\s.]+$/, '');
    
    console.log(`createOllamaLangChainModel: Cleaned baseUrl to: "${cleanBaseUrl}"`);

    // For local LLMs like Ollama, we need to provide a dummy API key
    // to satisfy the ChatOpenAI constructor which requires an API key
    const dummyApiKey = "dummy-key-for-local-llm";
    
    return new ChatOpenAI({
      modelName: config.modelName,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      streaming: true,
      openAIApiKey: dummyApiKey, // Add dummy API key
      configuration: {
        baseURL: cleanBaseUrl,
      },
    });
  }

  private async createOpenAILangChainModel(config: LiteLLMConfig): Promise<ChatOpenAI> {
    if (!config.apiKey) {
      throw new Error('API key is required for OpenAI models');
    }

    return new ChatOpenAI({
      modelName: config.modelName,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      streaming: true,
      openAIApiKey: config.apiKey,
    });
  }

  public async getLangChainModel(modelId?: string): Promise<ChatOpenAI> {
    console.log("getLangChainModel: Starting to load configurations");
    await this.loadConfigurations();
    console.log("getLangChainModel: Configurations loaded, defaultConfig:", this.defaultConfig);
    console.log("getLangChainModel: Initialized status:", this.initialized);
    console.log("getLangChainModel: Number of active models:", this.activeModels.size);

    // Log all models in cache for debugging
    console.log("getLangChainModel: Active models:");
    this.activeModels.forEach((model, id) => {
      console.log(`  - ${id}: ${model.name} (${model.modelName}), isDefault: ${model.isDefault}, provider: ${model.provider}, baseUrl: ${model.baseUrl}`);
    });

    let config = this.defaultConfig;

    if (modelId) {
      console.log("getLangChainModel: Specific model requested with ID:", modelId);
      let model = await LLMModelRepository.getModelById(modelId);
      
      // If not found with regular client, try with service role
      if (!model) {
        console.log("getLangChainModel: Model not found with regular client, trying with service role");
        model = await LLMModelRepository.getModelById(modelId, true);
      }
      
      if (model) {
        console.log("getLangChainModel: Found specific model:", model.name);
        config = {
          modelName: model.modelName,
          apiKey: model.apiKey || undefined,
          baseUrl: model.baseUrl || undefined,
          temperature: model.temperature || 0.7,
          maxTokens: model.maxTokens || 2000,
        };
      } else {
        console.warn('LiteLLMProvider: Model not found, using default config');
      }
    }

    console.log("getLangChainModel: Final config to use:", {
      modelName: config.modelName,
      baseUrl: config.baseUrl,
      hasApiKey: !!config.apiKey
    });

    if (config.apiKey) {
      console.log("getLangChainModel: Creating OpenAI model");
      return this.createOpenAILangChainModel(config);
    } else {
      console.log("getLangChainModel: Creating Ollama model with URL:", config.baseUrl);
      return this.createOllamaLangChainModel(config);
    }
  }

  /**
   * Get the current default model configuration
   */
  public async getDefaultModelConfig(): Promise<LiteLLMConfig> {
    await this.loadConfigurations();
    return this.defaultConfig;
  }

  /**
   * Helper method to fetch the default model from the database with fallback
   */
  private async fetchDefaultModelFromDB(): Promise<LiteLLMConfig> {
    try {
      console.log('LiteLLMProvider.fetchDefaultModelFromDB: Attempting to get default model from database');
      
      // Try to get the default model from the database first
      let defaultModel = await LLMModelRepository.getDefaultModel();
      
      // If not found with regular client, try with service role
      if (!defaultModel) {
        console.log('LiteLLMProvider.fetchDefaultModelFromDB: Default model not found with regular client, trying with service role');
        defaultModel = await LLMModelRepository.getDefaultModel(true);
      }
      
      if (defaultModel) {
        console.log(`LiteLLMProvider.fetchDefaultModelFromDB: Found default model in database: ${defaultModel.name}`);
        const config: LiteLLMConfig = {
          modelName: defaultModel.modelName,
          apiKey: defaultModel.apiKey || undefined,
          baseUrl: defaultModel.baseUrl || undefined,
          temperature: defaultModel.temperature || 0.7,
          maxTokens: defaultModel.maxTokens || 2000,
        };
        
        return config;
      }
      
      console.log('LiteLLMProvider.fetchDefaultModelFromDB: No default model found in database, using environment variables');
    } catch (error) {
      console.error('LiteLLMProvider.fetchDefaultModelFromDB: Error getting default model:', error);
    }
    
    // If no default model in database or error, use environment variables
    const openAiKey = process.env.OPENAI_API_KEY;
    if (openAiKey) {
      const config: LiteLLMConfig = {
        modelName: 'gpt-3.5-turbo',
        apiKey: openAiKey,
        baseUrl: undefined,
        temperature: 0.7,
        maxTokens: 2000,
      };
      return config;
    }
    
    // If no OpenAI key, fall back to Ollama
    const config: LiteLLMConfig = {
      modelName: process.env.DEFAULT_OLLAMA_MODEL || 'llama3.2',
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      apiKey: undefined,
      temperature: 0.7,
      maxTokens: 2000,
    };
    
    return config;
  }

  /**
   * List all active models
   */
  public async listModels(): Promise<Array<{ id: string, name: string }>> {
    await this.loadConfigurations();
    const modelList: Array<{ id: string, name: string }> = [];
    
    this.activeModels.forEach((model, id) => {
      modelList.push({
        id,
        name: model.name || model.modelName
      });
    });
    
    return modelList;
  }

  public async callLLM(
    messages: Message[],
    modelId?: string
  ): Promise<StreamResponse> {
    const model = await this.getLangChainModel(modelId);
    const { stream, callbacks } = await this.createLangChainStream();
    
    model
      .call(messages.map(msg => ({ role: msg.role, content: msg.content })) as BaseMessageLike[], {}, callbacks)
      .catch(console.error);

    return { stream };
  }

  private async createLangChainStream(): Promise<LangChainStreamResult> {
    const { createParser } = await import('eventsource-parser');
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    
    let streamController: ReadableStreamController<any>;
    const stream = new ReadableStream({
      start(controller) {
        streamController = controller;
      },
    });

    const callbacks = [{
      handleLLMNewToken(token: string) {
        streamController.enqueue(encoder.encode(`data: ${token}\n\n`));
      },
      handleLLMEnd() {
        streamController.close();
      },
      handleLLMError(error: Error) {
        console.error('LiteLLMProvider: Stream error:', error);
        streamController.error(error);
      },
    }];

    return { stream, callbacks };
  }
} 