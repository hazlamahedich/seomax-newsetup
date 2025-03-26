import { LLMResponse, ServiceOptions } from '@/lib/types/common';

// Type definitions for langchain modules
declare module 'langchain/chat_models/openai' {
  export interface ChatOpenAIOptions extends ServiceOptions {
    modelName?: string;
    temperature?: number;
    maxTokens?: number;
    apiKey?: string;
    streaming?: boolean;
  }

  export class ChatOpenAI {
    constructor(options: ChatOpenAIOptions);
    invoke(input: string | string[]): Promise<LLMResponse>;
  }
}

declare module 'langchain/prompts' {
  export interface PromptTemplateOptions {
    template: string;
    inputVariables: string[];
    partialVariables?: Record<string, unknown>;
  }

  export class PromptTemplate {
    constructor(options: PromptTemplateOptions);
    format(variables: Record<string, unknown>): Promise<string>;
  }
}

declare module 'langchain/schema/output_parser' {
  export class StringOutputParser {
    constructor();
    parse(text: string): Promise<string>;
  }
}

declare module 'langchain/schema/runnable' {
  export type RunnableComponent = 
    | ChatOpenAI 
    | PromptTemplate 
    | StringOutputParser;

  export class RunnableSequence {
    static from(components: RunnableComponent[]): RunnableSequence;
  }
}

declare module 'langchain/output_parsers' {
  import { z } from 'zod';

  export class StructuredOutputParser {
    static fromZodSchema<T extends z.ZodType>(schema: T): StructuredOutputParser;
    parse(text: string): Promise<z.infer<T>>;
  }
}
