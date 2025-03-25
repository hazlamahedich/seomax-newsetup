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

export class LiteLLMProvider {
  private static instance: LiteLLMProvider;
  private activeModels: Map<string, LLMConfig> = new Map();
  private usageMetrics: UsageMetrics[] = [];
  private defaultModel: string | null = null;

  private constructor() {
    // Load configurations from environment or database
    this.loadConfigurations();
  }

  public static getInstance(): LiteLLMProvider {
    if (!LiteLLMProvider.instance) {
      LiteLLMProvider.instance = new LiteLLMProvider();
    }
    return LiteLLMProvider.instance;
  }

  private loadConfigurations() {
    // Default to OpenAI if no configuration exists
    const defaultConfig: LLMConfig = {
      provider: "openai",
      modelName: "gpt-4o",
      apiKey: process.env.OPENAI_API_KEY,
      temperature: 0.2,
      maxTokens: 2000,
      costPerThousandTokens: 10, // $10 per 1K tokens is a placeholder, adjust with actual pricing
    };

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
    const configId = modelId || this.defaultModel || "default";
    const config = this.activeModels.get(configId);
    
    if (!config) {
      throw new Error(`Model configuration not found for ID: ${configId}`);
    }

    return new ChatOpenAI({
      modelName: config.modelName,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      openAIApiKey: config.apiKey || process.env.OPENAI_API_KEY,
      configuration: {
        baseURL: config.baseUrl,
      }
    });
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