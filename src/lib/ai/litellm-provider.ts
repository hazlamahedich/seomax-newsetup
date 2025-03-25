import { completion } from 'litellm';
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

// Define model configuration schema
export const LLMConfigSchema = z.object({
  provider: z.enum(["openai", "anthropic", "azure", "groq", "cohere", "together", "custom", "local"]),
  modelName: z.string(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  temperature: z.number().min(0).max(1).default(0.2),
  maxTokens: z.number().positive().default(2000),
  costPerToken: z.number().positive().optional(),
  costPerThousandTokens: z.number().positive().optional(),
});

export type LLMConfig = z.infer<typeof LLMConfigSchema>;

// Metrics tracking for usage and costs
export interface UsageMetrics {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
  timestamp: Date;
  modelName: string;
  provider: string;
  requestId: string;
  userId?: string;
  projectId?: string;
}

// Create a utility logger for the module
const llmLogger = {
  info: (message: string, data?: any) => {
    console.log(`[LiteLLMProvider] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[LiteLLMProvider] WARNING: ${message}`, data ? data : '');
  },
  error: (message: string, error: any) => {
    console.error(`[LiteLLMProvider] ${message}`, error);
    if (error?.stack) {
      console.error(`[LiteLLMProvider] Error stack:`, error.stack);
    }
  },
  debug: (message: string, data?: any) => {
    console.log(`[LiteLLMProvider:DEBUG] ${message}`, data ? data : '');
  }
};

export class LiteLLMProvider {
  private static instance: LiteLLMProvider;
  private activeModels: Map<string, LLMConfig> = new Map();
  private usageMetrics: UsageMetrics[] = [];
  private defaultModel: string | null = null;

  private constructor() {
    // Load configurations from environment or database
    llmLogger.info('Initializing LiteLLM provider instance');
    this.loadConfigurations();
  }

  public static getInstance(): LiteLLMProvider {
    if (!LiteLLMProvider.instance) {
      llmLogger.info('Creating new LiteLLMProvider instance');
      LiteLLMProvider.instance = new LiteLLMProvider();
    }
    return LiteLLMProvider.instance;
  }

  private loadConfigurations() {
    llmLogger.info('Loading LLM configurations');
    
    // Log environment variables (without sensitive values)
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    llmLogger.debug('Environment check', { 
      OPENAI_API_KEY_EXISTS: hasOpenAIKey,
      NODE_ENV: process.env.NODE_ENV,
    });
    
    // Default configuration - use Ollama in development if no OpenAI key
    let defaultConfig: LLMConfig;
    
    if (!hasOpenAIKey && process.env.NODE_ENV === 'development') {
      // Use Ollama as default in development when no OpenAI key
      defaultConfig = {
        provider: "local",
        modelName: "deepseek-r1:14b", // Or other model available in Ollama
        baseUrl: "http://localhost:11434/v1",
        apiKey: "sk-no-key-required",
        temperature: 0.2,
        maxTokens: 2000,
        costPerThousandTokens: 0, // Local models have no API costs
      };
      llmLogger.info('No OpenAI API key found in development - defaulting to local Ollama model');
    } else {
      // Default to OpenAI if API key exists or in production
      defaultConfig = {
        provider: "openai",
        modelName: "gpt-4o",
        apiKey: process.env.OPENAI_API_KEY,
        temperature: 0.2,
        maxTokens: 2000,
        costPerThousandTokens: 10, // $10 per 1K tokens is a placeholder, adjust with actual pricing
      };
    }

    llmLogger.debug('Adding default model configuration', {
      provider: defaultConfig.provider,
      modelName: defaultConfig.modelName,
      hasApiKey: !!defaultConfig.apiKey,
      hasBaseUrl: !!defaultConfig.baseUrl,
      temperature: defaultConfig.temperature,
      maxTokens: defaultConfig.maxTokens
    });
    
    this.addModel("default", defaultConfig);
    this.defaultModel = "default";

    // Add any additional models from environment variables or database
    // This is a placeholder for future implementation
  }

  public addModel(id: string, config: LLMConfig): void {
    this.activeModels.set(id, config);
    if (!this.defaultModel) {
      this.defaultModel = id;
    }
  }

  public removeModel(id: string): boolean {
    if (id === this.defaultModel) {
      return false; // Cannot remove default model
    }
    return this.activeModels.delete(id);
  }

  public getModel(id: string): LLMConfig | undefined {
    return this.activeModels.get(id);
  }

  public listModels(): { id: string; config: LLMConfig }[] {
    return Array.from(this.activeModels.entries()).map(([id, config]) => ({ id, config }));
  }

  public setDefaultModel(id: string): boolean {
    if (this.activeModels.has(id)) {
      this.defaultModel = id;
      return true;
    }
    return false;
  }

  public getDefaultModel(): string | null {
    return this.defaultModel;
  }

  // Create a LangChain compatible model instance
  public getLangChainModel(modelId?: string): ChatOpenAI {
    llmLogger.info(`getLangChainModel called for model ID: ${modelId || this.defaultModel || "default"}`);
    try {
      const configId = modelId || this.defaultModel || "default";
      const config = this.activeModels.get(configId);
      
      if (!config) {
        llmLogger.error(`Model configuration not found for ID: ${configId}`, { availableModels: Array.from(this.activeModels.keys()) });
        // Default to a local Ollama model if config not found
        llmLogger.info('Falling back to Ollama model (config not found)');
        return this.createOllamaLangChainModel();
      }

      llmLogger.debug(`Using model config:`, { 
        provider: config.provider, 
        modelName: config.modelName,
        hasBaseUrl: !!config.baseUrl
      });

      // If already configured to use local provider (Ollama)
      if (config.provider === "local") {
        llmLogger.info(`Using configured local Ollama model: ${config.modelName}`);
        return this.createCustomOllamaModel(config.modelName, config.baseUrl);
      }

      // Check if we have valid authentication for non-local providers
      const apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
        
      if (!apiKey || apiKey.trim() === '') {
        llmLogger.warn(`No API key found for ${config.provider} model, falling back to Ollama`);
        return this.createOllamaLangChainModel();
      }

      try {
        // For regular providers like OpenAI
        llmLogger.debug('Creating ChatOpenAI instance with:', {
          modelName: config.modelName,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          hasApiKey: !!apiKey,
          hasBaseURL: !!config.baseUrl
        });
        
        const chatModel = new ChatOpenAI({
          modelName: config.modelName,
          temperature: config.temperature,
          maxTokens: config.maxTokens,
          openAIApiKey: apiKey,
          configuration: config.baseUrl ? {
            baseURL: config.baseUrl,
          } : undefined
        });
        
        llmLogger.info(`Successfully created ChatOpenAI model: ${config.modelName}`);
        return chatModel;
      } catch (error) {
        llmLogger.error('Error creating ChatOpenAI model:', error);
        // If creating the model fails, try with Ollama as fallback
        llmLogger.info('Falling back to Ollama after ChatOpenAI creation error');
        return this.createOllamaLangChainModel();
      }
    } catch (error) {
      llmLogger.error('getLangChainModel error, using Ollama fallback:', error);
      return this.createOllamaLangChainModel();
    }
  }

  // Create a LangChain compatible model using a specific Ollama model
  private createCustomOllamaModel(modelName: string, baseUrl?: string): ChatOpenAI {
    llmLogger.info(`Creating custom Ollama model: ${modelName}`);
    try {
      // Set environment variables for Ollama
      const ollamaBaseUrl = baseUrl || "http://localhost:11434/v1";
      process.env.OPENAI_API_BASE = ollamaBaseUrl;
      
      llmLogger.debug(`Setting up custom Ollama model`, {
        modelName,
        baseURL: ollamaBaseUrl
      });
      
      const chatModel = new ChatOpenAI({
        modelName: modelName,
        temperature: 0.2,
        maxTokens: 2000,
        openAIApiKey: "sk-no-key-required",
        configuration: {
          baseURL: ollamaBaseUrl,
        }
      });
      
      llmLogger.info(`Successfully created custom Ollama model: ${modelName}`);
      return chatModel;
    } catch (error) {
      llmLogger.error(`Failed to create custom Ollama model ${modelName}:`, error);
      // Fall back to the default Ollama model
      return this.createOllamaLangChainModel();
    }
  }

  // Create a LangChain compatible model using local Ollama with default model
  private createOllamaLangChainModel(): ChatOpenAI {
    llmLogger.info('Creating fallback Ollama LangChain model');
    try {
      // Set environment variables for Ollama
      const ollamaBaseUrl = "http://localhost:11434/v1";
      process.env.OPENAI_API_BASE = ollamaBaseUrl;
      
      // Use a model we know exists in Ollama - adjust based on your installation
      // Try a series of models in case some aren't available
      const models = ["deepseek-coder", "deepseek-r1:14b", "llama3", "llama2"];
      let modelName = models[0]; // Default to first option
      
      llmLogger.debug(`Setting up Ollama fallback model`, {
        modelName,
        baseURL: ollamaBaseUrl
      });
      
      const chatModel = new ChatOpenAI({
        modelName: modelName,
        temperature: 0.2,
        maxTokens: 2000,
        openAIApiKey: "sk-no-key-required",
        configuration: {
          baseURL: ollamaBaseUrl,
        }
      });
      
      llmLogger.info(`Successfully created Ollama fallback model: ${modelName}`);
      return chatModel;
    } catch (error) {
      llmLogger.error('Failed to create Ollama fallback model:', error);
      throw new Error('Could not initialize any LLM model. Please check your configuration and ensure Ollama is running on port 11434.');
    }
  }

  // Call LLM directly via litellm
  public async callLLM(
    prompt: string, 
    modelId?: string,
    options: {
      userId?: string;
      projectId?: string;
    } = {}
  ) {
    const configId = modelId || this.defaultModel || "default";
    const config = this.activeModels.get(configId);
    
    if (!config) {
      throw new Error(`Model configuration not found for ID: ${configId}`);
    }

    try {
      // Set environment variable for the provider
      if (config.apiKey) {
        if (config.provider === "together") {
          process.env.TOGETHER_API_KEY = config.apiKey;
        } else if (config.provider === "local") {
          // For local models with OpenAI-compatible API, use OPENAI_API_KEY
          process.env.OPENAI_API_KEY = config.apiKey === "EMPTY" ? "" : config.apiKey;
        } else {
          process.env[`${config.provider.toUpperCase()}_API_KEY`] = config.apiKey;
        }
      }

      // Construct the model string based on provider
      let modelString = config.modelName;
      if (config.provider === "local") {
        // For local models, use the model name as is
        modelString = config.modelName;
      } else if (config.provider === "together") {
        modelString = `together/${config.modelName}`;
      } else if (config.provider !== "openai") {
        modelString = `${config.provider}/${config.modelName}`;
      }

      // Set base URL if provided
      if (config.baseUrl) {
        if (config.provider === "together") {
          process.env.TOGETHER_API_BASE = config.baseUrl;
        } else if (config.provider === "local") {
          // For local models, we use the OpenAI API base
          process.env.OPENAI_API_BASE = config.baseUrl;
        } else {
          process.env.OPENAI_API_BASE = config.baseUrl;
        }
      }
      
      // For local models, we need to ensure a proper options structure
      const completionOptions: any = {
        model: modelString,
        messages: [{ role: "user", content: prompt }],
        temperature: config.temperature,
        max_tokens: config.maxTokens,
      };
      
      // For local models, ensure we're using the correct API base
      if (config.provider === "local") {
        completionOptions.api_base = config.baseUrl;
      }

      const response = await completion(completionOptions);

      // Record usage
      if (response && response.usage) {
        const requestId = `req_${Date.now()}`;
        this.recordUsage({
          totalTokens: response.usage.total_tokens,
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          estimatedCost: this.calculateCost(response.usage.total_tokens, config),
          modelName: config.modelName,
          provider: config.provider,
          requestId,
          userId: options.userId,
          projectId: options.projectId,
        });
      }

      return response;
    } catch (error) {
      console.error('Error calling LLM:', error);
      throw error;
    }
  }

  private calculateCost(tokens: number, config: LLMConfig): number {
    if (config.costPerToken) {
      return tokens * config.costPerToken;
    }
    
    if (config.costPerThousandTokens) {
      return (tokens / 1000) * config.costPerThousandTokens;
    }
    
    // Default estimation based on common pricing
    const defaultRates: Record<string, number> = {
      "openai": 0.01, // $0.01 per 1K tokens as a placeholder
      "anthropic": 0.015,
      "azure": 0.01,
      "groq": 0.005,
      "cohere": 0.015,
      "together": 0.007,
      "custom": 0.01,
      "local": 0.0, // Local models don't have API costs
    };
    
    return (tokens / 1000) * (defaultRates[config.provider] || 0.01);
  }

  // Track usage metrics
  public recordUsage(metrics: Omit<UsageMetrics, 'timestamp'>): void {
    this.usageMetrics.push({
      ...metrics,
      timestamp: new Date(),
    });
    
    // Here we could also save metrics to database
    this.saveMetricsToDatabase(metrics);
  }

  private async saveMetricsToDatabase(metrics: Omit<UsageMetrics, 'timestamp'>): Promise<void> {
    // Placeholder for database integration
    // This would be implemented with your database solution (e.g., Supabase)
    console.log('Saving metrics to database:', metrics);
  }

  // Get usage statistics
  public getUsageStats(
    startDate?: Date, 
    endDate?: Date, 
    modelId?: string, 
    userId?: string
  ): {
    totalTokens: number;
    totalCost: number;
    requestCount: number;
    usageByModel: Record<string, { tokens: number; cost: number; count: number }>;
  } {
    let filtered = this.usageMetrics;
    
    if (startDate) {
      filtered = filtered.filter(m => m.timestamp >= startDate);
    }
    
    if (endDate) {
      filtered = filtered.filter(m => m.timestamp <= endDate);
    }
    
    if (modelId) {
      filtered = filtered.filter(m => m.modelName === modelId);
    }
    
    if (userId) {
      filtered = filtered.filter(m => m.userId === userId);
    }
    
    const stats = {
      totalTokens: 0,
      totalCost: 0,
      requestCount: filtered.length,
      usageByModel: {} as Record<string, { tokens: number; cost: number; count: number }>,
    };
    
    filtered.forEach(m => {
      stats.totalTokens += m.totalTokens;
      stats.totalCost += m.estimatedCost;
      
      if (!stats.usageByModel[m.modelName]) {
        stats.usageByModel[m.modelName] = { tokens: 0, cost: 0, count: 0 };
      }
      
      stats.usageByModel[m.modelName].tokens += m.totalTokens;
      stats.usageByModel[m.modelName].cost += m.estimatedCost;
      stats.usageByModel[m.modelName].count += 1;
    });
    
    return stats;
  }
}

// Export a singleton instance
export const liteLLMProvider = LiteLLMProvider.getInstance(); 