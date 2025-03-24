import { createSupabaseClient } from '@/lib/supabase/client';
import { LLMModel, LLMUsage, UsageStatsResponse } from './usage';

// Initialize Supabase client
const supabase = createSupabaseClient();

export const LLMModelRepository = {
  // Create a new LLM model configuration
  async createModel(model: Omit<LLMModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<LLMModel | null> {
    // If this model is set as default, unset any existing default models
    if (model.isDefault) {
      await supabase
        .from('llm_models')
        .update({ is_default: false })
        .eq('is_default', true);
    }

    const { data, error } = await supabase
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

    return {
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
  },

  // Get all LLM model configurations
  async getAllModels(): Promise<LLMModel[]> {
    const { data, error } = await supabase
      .from('llm_models')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching LLM models:', error);
      return [];
    }

    return data.map(record => ({
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
  },

  // Get a specific LLM model by ID
  async getModelById(id: string): Promise<LLMModel | null> {
    const { data, error } = await supabase
      .from('llm_models')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Error fetching LLM model by ID:', error);
      return null;
    }

    return {
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
  },

  // Get the default LLM model
  async getDefaultModel(): Promise<LLMModel | null> {
    const { data, error } = await supabase
      .from('llm_models')
      .select('*')
      .eq('is_default', true)
      .single();

    if (error || !data) {
      console.error('Error fetching default LLM model:', error);
      return null;
    }

    return {
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
  },

  // Update an existing LLM model
  async updateModel(id: string, updates: Partial<LLMModel>): Promise<LLMModel | null> {
    // If setting this model as default, unset any existing default models
    if (updates.isDefault) {
      await supabase
        .from('llm_models')
        .update({ is_default: false })
        .not('id', 'eq', id)
        .eq('is_default', true);
    }

    const updateData: Record<string, any> = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.provider) updateData.provider = updates.provider;
    if (updates.modelName) updateData.model_name = updates.modelName;
    if (updates.apiKey !== undefined) updateData.api_key = updates.apiKey;
    if (updates.baseUrl !== undefined) updateData.base_url = updates.baseUrl;
    if (updates.temperature !== undefined) updateData.temperature = updates.temperature;
    if (updates.maxTokens !== undefined) updateData.max_tokens = updates.maxTokens;
    if (updates.costPerToken !== undefined) updateData.cost_per_token = updates.costPerToken;
    if (updates.costPerThousandTokens !== undefined) updateData.cost_per_thousand_tokens = updates.costPerThousandTokens;
    if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;
    
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('llm_models')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating LLM model:', error);
      return null;
    }

    return {
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
  },

  // Delete an LLM model
  async deleteModel(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('llm_models')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting LLM model:', error);
      return false;
    }

    return true;
  },
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