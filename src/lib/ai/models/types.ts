import { z } from 'zod';

// Define the schema for LLM models
export const LLMModelSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  provider: z.enum(['openai', 'anthropic', 'local', 'google', 'azure']),
  modelName: z.string(),
  apiKey: z.string().nullable(),
  baseUrl: z.string().nullable(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().positive().default(2000),
  costPerToken: z.number().min(0).default(0),
  costPerThousandTokens: z.number().min(0).default(0),
  isDefault: z.boolean().default(false),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Export the type
export type LLMModel = z.infer<typeof LLMModelSchema>; 