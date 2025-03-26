declare module 'langchain/chat_models/base' {
  import { BaseMessage } from '@langchain/core/messages';
  import { RunnableLike, RunnableConfig } from 'langchain/schema/runnable';

  export interface BaseChatModelCallOptions {
    timeout?: number;
    signal?: AbortSignal;
    tags?: string[];
    metadata?: Record<string, unknown>;
    callbacks?: any[];
  }

  export interface BaseMessageChunk {
    content: string;
    type: string;
    name?: string;
    additional_kwargs?: Record<string, unknown>;
  }

  export interface BaseChatModel extends RunnableLike {
    modelName: string;
    invoke(messages: BaseMessage[], options?: BaseChatModelCallOptions): Promise<BaseMessageChunk>;
    [key: string]: any; // Add index signature for RunnableMapLike compatibility
  }
}

declare module 'langchain/schema/runnable' {
  import { BaseMessage } from '@langchain/core/messages';
  
  export interface RunnableLike<RunInput = any, RunOutput = any, CallOptions = any> {
    invoke(input: RunInput, options?: CallOptions): Promise<RunOutput>;
    [key: string]: any; // Add index signature for RunnableMapLike compatibility
  }

  export interface RunnableConfig {
    timeout?: number;
    signal?: AbortSignal;
    tags?: string[];
    metadata?: Record<string, unknown>;
    callbacks?: any[];
  }

  export interface RunnableMapLike<RunInput = any, RunOutput = any> {
    [key: string]: RunnableLike<RunInput, RunOutput>;
  }
} 