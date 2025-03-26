import { createClient } from '@supabase/supabase-js';
import { LLMModel } from './types';
import { LLMUsage, UsageStatsResponse } from './usage';

// Initialize regular Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Initialize service role client for admin operations
const serviceRoleClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY
) : null;

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const modelCache = new Map<string, { model: LLMModel; timestamp: number }>();

export const LLMModelRepository = {
  // Debug-only method to check if a model is in the cache
  isModelCached(id: string): boolean {
    const cached = modelCache.get(id);
    return !!(cached && (Date.now() - cached.timestamp) < CACHE_TTL);
  },

  // Add a model to the cache directly (useful for bypassing database issues)
  cacheModel(model: LLMModel): void {
    if (!model.id) {
      console.error("Repository: Cannot cache model without ID");
      return;
    }
    
    // Create a deep copy of the model to ensure it doesn't get affected by later changes
    const modelCopy = JSON.parse(JSON.stringify(model));
    console.log("Repository: Manually caching model:", modelCopy.name, "with id:", modelCopy.id);
    modelCache.set(modelCopy.id, { model: modelCopy, timestamp: Date.now() });
  },

  // Helper method to get the appropriate client
  getClient(useServiceRole = false) {
    // Use service role client if requested and available, otherwise fall back to regular client
    return (useServiceRole && serviceRoleClient) ? serviceRoleClient : supabase;
  },

  // Create a new LLM model configuration
  async createModel(model: Omit<LLMModel, 'id' | 'createdAt' | 'updatedAt'>, useServiceRole = false): Promise<LLMModel | null> {
    try {
      const client = this.getClient(useServiceRole);
      
      // If this model is set as default, unset any existing default models
      if (model.isDefault) {
        await client
          .from('llm_models')
          .update({ is_default: false })
          .eq('is_default', true);
      }
  
      const { data, error } = await client
        .from('llm_models')
        .insert({
          name: model.name,
          provider: model.provider,
          model_name: model.modelName,
          api_key: model.apiKey,
          base_url: model.baseUrl,
          temperature: model.temperature,
          max_tokens: model.maxTokens,
          cost_per_token: model.costPerToken,
          cost_per_thousand_tokens: model.costPerThousandTokens,
          is_default: model.isDefault,
        })
        .select()
        .single();
  
      if (error) {
        console.error('Error creating LLM model:', error);
        return null;
      }
  
      const newModel = {
        id: data.id,
        name: data.name,
        provider: data.provider,
        modelName: data.model_name,
        apiKey: data.api_key,
        baseUrl: data.base_url,
        temperature: data.temperature,
        maxTokens: data.max_tokens,
        costPerToken: data.cost_per_token,
        costPerThousandTokens: data.cost_per_thousand_tokens,
        isDefault: data.is_default,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
      
      // Update cache
      modelCache.set(newModel.id, { model: newModel, timestamp: Date.now() });
      
      return newModel;
    } catch (error) {
      console.error('Error in createModel:', error);
      return null;
    }
  },

  // Get all LLM model configurations
  async getAllModels(useServiceRole = false): Promise<LLMModel[]> {
    try {
      // Try with the requested client first
      const client = this.getClient(useServiceRole);
      
      const { data, error } = await client
        .from('llm_models')
        .select('*')
        .order('created_at', { ascending: false });
  
      if (error) {
        console.error('Error fetching LLM models:', error);
        
        // If we're not already using service role and have it available, try with service role
        if (!useServiceRole && serviceRoleClient) {
          console.log('Repository: Retrying with service role client');
          return this.getAllModels(true);
        }
        
        return [];
      }
  
      const models = data.map(record => ({
        id: record.id,
        name: record.name,
        provider: record.provider,
        modelName: record.model_name,
        apiKey: record.api_key,
        baseUrl: record.base_url,
        temperature: record.temperature,
        maxTokens: record.max_tokens,
        costPerToken: record.cost_per_token,
        costPerThousandTokens: record.cost_per_thousand_tokens,
        isDefault: record.is_default,
        createdAt: new Date(record.created_at),
        updatedAt: new Date(record.updated_at),
      }));
      
      // Update cache for all models
      models.forEach(model => {
        modelCache.set(model.id, { model, timestamp: Date.now() });
      });
      
      return models;
    } catch (error) {
      console.error('Error in getAllModels:', error);
      return [];
    }
  },

  // Get a specific LLM model by ID
  async getModelById(id: string, useServiceRole = false): Promise<LLMModel | null> {
    try {
      console.log("Repository: Fetching model by ID:", id);
      
      if (!id) {
        console.error("Repository: Invalid model ID (empty)");
        return null;
      }
      
      // Check cache first
      const cached = modelCache.get(id);
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log("Repository: Using cached model:", cached.model.name);
        return cached.model;
      }
      
      const client = this.getClient(useServiceRole);
      
      const { data, error } = await client
        .from('llm_models')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Repository: Error fetching model:', error);
        
        // If we're not already using service role and have it available, try with service role
        if (!useServiceRole && serviceRoleClient) {
          console.log('Repository: Retrying with service role client');
          return this.getModelById(id, true);
        }
        
        return null;
      }

      const model = {
        id: data.id,
        name: data.name,
        provider: data.provider,
        modelName: data.model_name,
        apiKey: data.api_key,
        baseUrl: data.base_url,
        temperature: data.temperature,
        maxTokens: data.max_tokens,
        costPerToken: data.cost_per_token,
        costPerThousandTokens: data.cost_per_thousand_tokens,
        isDefault: data.is_default,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
      
      // Update cache
      modelCache.set(id, { model, timestamp: Date.now() });
      
      return model;
    } catch (error) {
      console.error('Repository: Error in getModelById:', error);
      return null;
    }
  },

  // Get the default LLM model
  async getDefaultModel(useServiceRole = false): Promise<LLMModel | null> {
    try {
      console.log("Repository: Fetching default model");
      
      // First, try to find cached default model to avoid database query
      let cachedDefaultModel: LLMModel | null = null;
      
      // Check if any cached model is the default
      for (const [_, cached] of modelCache.entries()) {
        if (cached.model.isDefault && (Date.now() - cached.timestamp) < CACHE_TTL) {
          cachedDefaultModel = cached.model;
          break;
        }
      }
      
      if (cachedDefaultModel) {
        console.log("Repository: Using cached default model:", cachedDefaultModel.name);
        return cachedDefaultModel;
      }
      
      const client = this.getClient(useServiceRole);
      
      const { data, error } = await client
        .from('llm_models')
        .select('*')
        .eq('is_default', true)
        .single();
    
      if (error) {
        console.error('Repository: Error fetching default model:', error);
        
        // If we're not already using service role and have it available, try with service role
        if (!useServiceRole && serviceRoleClient) {
          console.log('Repository: Retrying with service role client');
          return this.getDefaultModel(true);
        }
        
        return null;
      }
      
      const model = {
        id: data.id,
        name: data.name,
        provider: data.provider,
        modelName: data.model_name,
        apiKey: data.api_key,
        baseUrl: data.base_url,
        temperature: data.temperature,
        maxTokens: data.max_tokens,
        costPerToken: data.cost_per_token,
        costPerThousandTokens: data.cost_per_thousand_tokens,
        isDefault: data.is_default,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
      
      // Update cache
      modelCache.set(model.id, { model, timestamp: Date.now() });
      
      return model;
    } catch (error) {
      console.error('Repository: Error in getDefaultModel:', error);
      return null;
    }
  },

  // Update an existing LLM model
  async updateModel(id: string, updates: Partial<Omit<LLMModel, 'id' | 'createdAt' | 'updatedAt'>>, useServiceRole = false): Promise<LLMModel | null> {
    try {
      const client = this.getClient(useServiceRole);
      
      // If setting this as default, unset any existing default models
      if (updates.isDefault) {
        await client
          .from('llm_models')
          .update({ is_default: false })
          .eq('is_default', true);
      }
  
      const { data, error } = await client
        .from('llm_models')
        .update({
          name: updates.name,
          provider: updates.provider,
          model_name: updates.modelName,
          api_key: updates.apiKey,
          base_url: updates.baseUrl,
          temperature: updates.temperature,
          max_tokens: updates.maxTokens,
          cost_per_token: updates.costPerToken,
          cost_per_thousand_tokens: updates.costPerThousandTokens,
          is_default: updates.isDefault,
        })
        .eq('id', id)
        .select()
        .single();
  
      if (error) {
        console.error('Error updating LLM model:', error);
        
        // If we're not already using service role and have it available, try with service role
        if (!useServiceRole && serviceRoleClient) {
          console.log('Repository: Retrying with service role client');
          return this.updateModel(id, updates, true);
        }
        
        return null;
      }
  
      const updatedModel = {
        id: data.id,
        name: data.name,
        provider: data.provider,
        modelName: data.model_name,
        apiKey: data.api_key,
        baseUrl: data.base_url,
        temperature: data.temperature,
        maxTokens: data.max_tokens,
        costPerToken: data.cost_per_token,
        costPerThousandTokens: data.cost_per_thousand_tokens,
        isDefault: data.is_default,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
      
      // Update cache
      modelCache.set(updatedModel.id, { model: updatedModel, timestamp: Date.now() });
      
      return updatedModel;
    } catch (error) {
      console.error('Error in updateModel:', error);
      return null;
    }
  },

  // Delete an LLM model
  async deleteModel(id: string, useServiceRole = false): Promise<boolean> {
    try {
      const client = this.getClient(useServiceRole);
      
      const { error } = await client
        .from('llm_models')
        .delete()
        .eq('id', id);
  
      if (error) {
        console.error('Error deleting LLM model:', error);
        
        // If we're not already using service role and have it available, try with service role
        if (!useServiceRole && serviceRoleClient) {
          console.log('Repository: Retrying with service role client');
          return this.deleteModel(id, true);
        }
        
        return false;
      }
  
      // Remove from cache
      modelCache.delete(id);
      
      return true;
    } catch (error) {
      console.error('Error in deleteModel:', error);
      return false;
    }
  }
};

export const LLMUsageRepository = {
  // Record LLM usage metrics
  async recordUsage(usage: Omit<LLMUsage, 'id' | 'createdAt'>): Promise<string | null> {
    const { data, error } = await supabase
      .from('llm_usage')
      .insert({
        total_tokens: usage.totalTokens,
        prompt_tokens: usage.promptTokens,
        completion_tokens: usage.completionTokens,
        estimated_cost: usage.estimatedCost,
        model_name: usage.modelName,
        provider: usage.provider,
        request_id: usage.requestId,
        user_id: usage.userId,
        project_id: usage.projectId,
        metadata: usage.metadata,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error recording LLM usage:', error);
      return null;
    }

    return data.id;
  },

  // Get usage statistics for a date range
  async getUsageStats(
    startDate: Date,
    endDate: Date,
    userId?: string,
    modelName?: string,
    provider?: string
  ): Promise<UsageStatsResponse> {
    try {
      // Skip RPC call and directly use the query method
      console.log('Using direct query instead of RPC for LLM usage stats');
      return this.getUsageStatsDirectQuery(startDate, endDate, userId, modelName, provider);
      
      /* Original RPC implementation commented out
      // Use the Supabase function to get usage stats
      const { data, error } = await supabase
        .rpc('get_llm_usage_stats', {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          user_id_param: userId,
          model_name_param: modelName,
          provider_param: provider,
        });

      if (error) {
        console.error('Error fetching LLM usage stats via RPC:', error);
        // Try a direct query instead
        return this.getUsageStatsDirectQuery(startDate, endDate, userId, modelName, provider);
      }

      // Calculate overall totals
      let totalTokens = 0;
      let totalCost = 0;
      let requestCount = 0;
      const usageByModel: Record<string, { tokens: number; cost: number; count: number }> = {};
      const dailyUsage: { date: string; tokens: number; cost: number; count: number }[] = [];

      // Group by date for daily usage
      const dateMap = new Map<string, { tokens: number; cost: number; count: number }>();

      data.forEach((record: any) => {
        totalTokens += Number(record.total_tokens);
        totalCost += Number(record.total_cost);
        requestCount += Number(record.request_count);

        // Add to model-specific stats
        if (!usageByModel[record.model_name]) {
          usageByModel[record.model_name] = { tokens: 0, cost: 0, count: 0 };
        }
        usageByModel[record.model_name].tokens += Number(record.total_tokens);
        usageByModel[record.model_name].cost += Number(record.total_cost);
        usageByModel[record.model_name].count += Number(record.request_count);

        // Add to daily usage
        const dateStr = record.date.toISOString().split('T')[0];
        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, { tokens: 0, cost: 0, count: 0 });
        }
        const dayStats = dateMap.get(dateStr)!;
        dayStats.tokens += Number(record.total_tokens);
        dayStats.cost += Number(record.total_cost);
        dayStats.count += Number(record.request_count);
      });

      // Convert date map to array for daily usage
      for (const [date, stats] of dateMap.entries()) {
        dailyUsage.push({
          date,
          tokens: stats.tokens,
          cost: stats.cost,
          count: stats.count,
        });
      }

      // Sort daily usage by date
      dailyUsage.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return {
        totalTokens,
        totalCost,
        requestCount,
        usageByModel,
        dailyUsage,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      };
      */
    } catch (error) {
      console.error('Error in getUsageStats:', error);
      return {
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
        usageByModel: {},
        dailyUsage: [],
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      };
    }
  },

  // Fallback method that directly queries the llm_usage table
  async getUsageStatsDirectQuery(
    startDate: Date,
    endDate: Date,
    userId?: string,
    modelName?: string,
    provider?: string
  ): Promise<UsageStatsResponse> {
    try {
      // Build query with filters
      let query = supabase
        .from('llm_usage')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (userId) {
        query = query.eq('user_id', userId);
      }
      if (modelName) {
        query = query.eq('model_name', modelName);
      }
      if (provider) {
        query = query.eq('provider', provider);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error in direct query for usage stats:', error);
        return {
          totalTokens: 0,
          totalCost: 0,
          requestCount: 0,
          usageByModel: {},
          dailyUsage: [],
          dateRange: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
        };
      }

      // Process data
      let totalTokens = 0;
      let totalCost = 0;
      const requestCount = data.length;
      const usageByModel: Record<string, { tokens: number; cost: number; count: number }> = {};
      
      // Group by date
      const dateMap = new Map<string, { tokens: number; cost: number; count: number }>();

      data.forEach(record => {
        totalTokens += record.total_tokens;
        totalCost += record.estimated_cost;

        // Model-specific stats
        if (!usageByModel[record.model_name]) {
          usageByModel[record.model_name] = { tokens: 0, cost: 0, count: 0 };
        }
        usageByModel[record.model_name].tokens += record.total_tokens;
        usageByModel[record.model_name].cost += record.estimated_cost;
        usageByModel[record.model_name].count += 1;

        // Daily usage
        const dateStr = new Date(record.created_at).toISOString().split('T')[0];
        if (!dateMap.has(dateStr)) {
          dateMap.set(dateStr, { tokens: 0, cost: 0, count: 0 });
        }
        const dayStats = dateMap.get(dateStr)!;
        dayStats.tokens += record.total_tokens;
        dayStats.cost += record.estimated_cost;
        dayStats.count += 1;
      });

      // Convert to array for output
      const dailyUsage = Array.from(dateMap.entries()).map(([date, stats]) => ({
        date,
        tokens: stats.tokens,
        cost: stats.cost,
        count: stats.count,
      }));

      // Sort by date
      dailyUsage.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return {
        totalTokens,
        totalCost,
        requestCount,
        usageByModel,
        dailyUsage,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      };
    } catch (error) {
      console.error('Error in getUsageStatsDirectQuery:', error);
      return {
        totalTokens: 0,
        totalCost: 0,
        requestCount: 0,
        usageByModel: {},
        dailyUsage: [],
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      };
    }
  },
}; 