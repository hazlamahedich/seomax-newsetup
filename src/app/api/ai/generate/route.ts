import { NextRequest, NextResponse } from 'next/server';
import { LiteLLMProvider } from '@/lib/ai/litellm-provider';
import { Message } from 'ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(req: NextRequest) {
  try {
    console.log('[API] /api/ai/generate request received');
    
    // Get session to verify authentication
    const session = await getServerSession(authOptions);
    
    // Skip auth check in development mode
    if (!session?.user && process.env.NODE_ENV !== 'development') {
      console.log('[API] Authentication failed for /api/ai/generate');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request
    const body = await req.json();
    const { prompt, model } = body;

    if (!prompt) {
      console.log('[API] Missing prompt in /api/ai/generate request');
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Initialize LLM provider
    console.log('[API] Initializing LLM provider');
    let llm;
    try {
      llm = LiteLLMProvider.getInstance();
      console.log('[API] LLM provider initialized successfully');
    } catch (llmInitError) {
      console.error('[API] Failed to initialize LLM provider:', llmInitError);
      return NextResponse.json(
        { 
          error: 'Failed to initialize LLM provider', 
          details: String(llmInitError),
        },
        { status: 500 }
      );
    }

    // Get model info for logging
    let modelName = model || 'default';
    let defaultConfig;
    if (!model) {
      try {
        defaultConfig = await llm.getDefaultModelConfig();
        modelName = defaultConfig.modelName || 'unknown';
        console.log('[API] Default model config loaded:', defaultConfig);
      } catch (error) {
        console.warn('[API] Error getting default model config:', error);
      }
    }
    
    console.log(`[API] Using LLM model: ${modelName}`);
    console.log(`[API] API key available: ${!!defaultConfig?.apiKey}`);
    console.log(`[API] Base URL: ${defaultConfig?.baseUrl || 'default'}`);

    // Create message
    const message: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
    };

    // Process with LLM
    try {
      console.log(`[API] Sending prompt to LLM, length: ${prompt.length}`);
      
      let response;
      try {
        response = await llm.callLLM([message], model);
        console.log('[API] LLM call initiated successfully, processing stream');
      } catch (llmCallError) {
        console.error('[API] Error during LLM call:', llmCallError);
        return NextResponse.json(
          { 
            error: 'Error initiating LLM call', 
            details: String(llmCallError),
            modelAttempted: modelName
          },
          { status: 500 }
        );
      }
      
      if (!response || !response.stream) {
        console.error('[API] LLM returned invalid response:', response);
        return NextResponse.json(
          { 
            error: 'Invalid response from LLM', 
            details: 'No stream in response',
            modelAttempted: modelName
          },
          { status: 500 }
        );
      }
      
      // Process the stream to get the full content
      const reader = response.stream.getReader();
      const decoder = new TextDecoder();
      let content = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Decode the chunk
          const chunk = decoder.decode(value);
          console.log(`[API] Received chunk (${chunk.length} bytes)`);
          
          // Extract the content from the SSE format
          const matches = chunk.match(/data: (.*)\n\n/g);
          if (matches) {
            for (const match of matches) {
              const contentMatch = match.match(/data: (.*)\n\n/);
              if (contentMatch && contentMatch[1]) {
                content += contentMatch[1];
              }
            }
          } else {
            console.warn('[API] No content matches found in chunk:', chunk);
          }
        }
      } catch (streamError) {
        console.error('[API] Error processing stream:', streamError);
        return NextResponse.json(
          { 
            error: 'Error processing LLM stream', 
            details: String(streamError),
            modelAttempted: modelName,
            partialContent: content
          },
          { status: 500 }
        );
      }
      
      if (!content) {
        console.warn('[API] LLM returned empty content');
      }
      
      console.log(`[API] LLM response received, length: ${content.length}`);
      return NextResponse.json({ 
        content,
        modelUsed: modelName,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('[API] Error processing content with LLM:', error);
      console.error('[API] Error stack:', error instanceof Error ? error.stack : 'Unknown');
      return NextResponse.json(
        { 
          error: 'Error processing content with AI service', 
          details: String(error),
          modelAttempted: modelName
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[API] Error in AI generate endpoint:', error);
    console.error('[API] Error stack:', error instanceof Error ? error.stack : 'Unknown');
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
} 