import { z } from "zod";

// Define LLM model configuration schema
export const LLMModelSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  provider: z.enum(["openai", "anthropic", "azure", "groq", "cohere", "together", "custom", "local"]),
  modelName: z.string().min(1),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  temperature: z.number().min(0).max(1).default(0.2),
  maxTokens: z.number().positive().default(2000),
  costPerToken: z.number().positive().optional(),
  costPerThousandTokens: z.number().positive().optional(),
  isDefault: z.boolean().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type LLMModel = z.infer<typeof LLMModelSchema>;

// Define LLM usage schema
export const LLMUsageSchema = z.object({
  id: z.string().uuid().optional(),
  totalTokens: z.number().nonnegative(),
  promptTokens: z.number().nonnegative(),
  completionTokens: z.number().nonnegative(),
  estimatedCost: z.number().nonnegative(),
  modelName: z.string(),
  provider: z.string(),
  requestId: z.string(),
  userId: z.string().optional(),
  projectId: z.string().optional(),
  createdAt: z.date().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type LLMUsage = z.infer<typeof LLMUsageSchema>;

// Daily usage statistics
export const DailyUsageStatsSchema = z.object({
  date: z.date(),
  totalTokens: z.number().nonnegative(),
  totalCost: z.number().nonnegative(),
  requestCount: z.number().nonnegative(),
  modelId: z.string().optional(),
  userId: z.string().optional(),
  projectId: z.string().optional(),
});

export type DailyUsageStats = z.infer<typeof DailyUsageStatsSchema>;

// Usage statistics response
export const UsageStatsResponseSchema = z.object({
  totalTokens: z.number().nonnegative(),
  totalCost: z.number().nonnegative(),
  requestCount: z.number().nonnegative(),
  usageByModel: z.record(z.string(), z.object({
    tokens: z.number().nonnegative(),
    cost: z.number().nonnegative(),
    count: z.number().nonnegative(),
  })),
  dailyUsage: z.array(z.object({
    date: z.string(), // ISO date string
    tokens: z.number().nonnegative(),
    cost: z.number().nonnegative(),
    count: z.number().nonnegative(),
  })).optional(),
  dateRange: z.object({
    start: z.string(), // ISO date string
    end: z.string(), // ISO date string
  }).optional(),
});

export type UsageStatsResponse = z.infer<typeof UsageStatsResponseSchema>;
