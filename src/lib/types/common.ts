import { z } from 'zod';

// API Response Types
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// LLM Types
export interface LLMResponse {
  text: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  metadata?: Record<string, unknown>;
}

// Analysis Types
export interface AnalysisResult {
  score: number;
  details: string[];
  recommendations?: string[];
  metadata?: Record<string, unknown>;
}

// Service Types
export interface ServiceConfig {
  enabled: boolean;
  options?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Generic Types
export type JSONValue = 
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

export type AsyncFunction<T = void> = (...args: any[]) => Promise<T>;

// Validation Types
export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

// Event Types
export interface AnalysisEvent {
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Error Types
export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

// Config Types
export interface ServiceOptions {
  timeout?: number;
  retries?: number;
  cacheEnabled?: boolean;
  validateInput?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

// Zod Schemas
export const ServiceOptionsSchema = z.object({
  timeout: z.number().optional(),
  retries: z.number().optional(),
  cacheEnabled: z.boolean().optional(),
  validateInput: z.boolean().optional(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).optional()
});

export const AnalysisEventSchema = z.object({
  type: z.string(),
  timestamp: z.string(),
  data: z.record(z.unknown()),
  metadata: z.record(z.unknown()).optional()
});

export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional()
});

export const ServiceErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
  stack: z.string().optional()
});

export const LLMResponseSchema = z.object({
  text: z.string(),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number()
  }).optional(),
  metadata: z.record(z.unknown()).optional()
});

export const AnalysisResultSchema = z.object({
  score: z.number(),
  details: z.array(z.string()),
  recommendations: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional()
});

// Type Guards
export function isServiceError(error: unknown): error is ServiceError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}

export function isAnalysisResult(result: unknown): result is AnalysisResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'score' in result &&
    'details' in result
  );
}

export function isLLMResponse(response: unknown): response is LLMResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'text' in response
  );
}

export function isValidationResult(result: unknown): result is ValidationResult {
  return (
    typeof result === 'object' &&
    result !== null &&
    'isValid' in result
  );
} 