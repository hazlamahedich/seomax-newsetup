import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";
import { LiteLLMProvider } from "./litellm-provider";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import type { BaseChatModel } from "langchain/chat_models/base";
import type { RunnableLike, RunnableConfig } from "langchain/schema/runnable";
import { logger } from "@/lib/utils/logger";
import { createClient } from '@supabase/supabase-js';
import { BaseMessage } from 'langchain/schema';
import { LangChainStream, Message } from 'ai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Create a service role client for admin operations
const serviceRoleClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY
) : null;

// Helper function to get the appropriate client
function getClient(useServiceRole = false) {
  return (useServiceRole && serviceRoleClient) ? serviceRoleClient : supabase;
}

// Custom text splitter function instead of using @langchain/text-splitters
function splitTextIntoChunks(text: string, chunkSize = 4000, overlap = 200): string[] {
  const chunks: string[] = [];
  
  if (text.length <= chunkSize) {
    return [text];
  }
  
  let startIndex = 0;
  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    chunks.push(text.slice(startIndex, endIndex));
    startIndex = endIndex - overlap;
    
    // Break if we're at the end of the text
    if (endIndex === text.length) {
      break;
    }
  }
  
  return chunks;
}

// Define schemas for output validation
export const ReadabilityAnalysisSchema = z.object({
  reading_level: z.string(),
  sentence_complexity: z.string(),
  vocabulary_level: z.string(),
  passive_voice_percentage: z.number(),
  readability_score: z.number(),
  improvement_areas: z.array(z.string()),
  analysis_summary: z.string()
});

export type ReadabilityAnalysis = z.infer<typeof ReadabilityAnalysisSchema>;

export const KeywordAnalysisSchema = z.object({
  keyword_density: z.record(z.string(), z.number()),
  keyword_placement: z.object({
    title: z.boolean(),
    headings: z.boolean(),
    intro: z.boolean(),
    body: z.boolean(),
    conclusion: z.boolean()
  }),
  natural_usage_score: z.number(),
  related_keywords: z.array(z.string()),
  optimization_score: z.number(),
  recommendations: z.array(z.string()),
  analysis_summary: z.string()
});

export type KeywordAnalysis = z.infer<typeof KeywordAnalysisSchema>;

export const StructureAnalysisSchema = z.object({
  heading_hierarchy: z.object({
    h1_count: z.number(),
    h2_count: z.number(),
    h3_count: z.number(),
    hierarchy_correct: z.boolean()
  }),
  organization_score: z.number(),
  intro_conclusion_score: z.number(),
  formatting_score: z.number(),
  content_gaps: z.array(z.string()),
  structure_score: z.number(),
  recommendations: z.array(z.string()),
  analysis_summary: z.string()
});

export type StructureAnalysis = z.infer<typeof StructureAnalysisSchema>;

export const ContentSuggestionSchema = z.object({
  suggestion_type: z.string(),
  original_text: z.string(),
  suggested_text: z.string(),
  reason: z.string()
});

export type ContentSuggestion = z.infer<typeof ContentSuggestionSchema>;

// Add interfaces for analysis types
interface ContentAIAnalysis {
  readability: ReadabilityAnalysis;
  keyword_usage: KeywordAnalysis;
  structure: StructureAnalysis;
  suggestions: ImprovementSuggestion[];
}

interface ImprovementSuggestion extends ContentSuggestion {
  improvement_suggestions?: string[];
}

// Create logger instance
const llmLogger = logger.child({ module: 'LLM' });

// Prompt Templates 
const readabilityPrompt = /*#__PURE__*/ PromptTemplate.fromTemplate(`
  Analyze the readability of the following content:

  CONTENT:
  {content}

  Provide a detailed analysis focusing on:
  1. Reading level (elementary, middle school, high school, college)
  2. Sentence complexity
  3. Vocabulary level
  4. Passive voice usage (percentage of sentences using passive voice)
  5. Overall readability score (1-100, higher is better)
  6. Recommendations for improvement

  Return ONLY a JSON object with the following structure:
  {{
    "reading_level": string,
    "sentence_complexity_score": number,
    "vocabulary_score": number,
    "passive_voice_percentage": number,
    "readability_score": number,
    "recommendations": string[],
    "analysis_summary": string
  }}
`);

const keywordAnalysisPrompt = /*#__PURE__*/ PromptTemplate.fromTemplate(`
  Analyze how effectively the following content uses the target keywords:

  CONTENT:
  {content}

  TARGET KEYWORDS:
  {keywords}

  Provide a detailed analysis focusing on:
  1. Keyword density for each target keyword (percentage)
  2. Keyword placement (title, headings, intro, body, conclusion)
  3. Natural usage vs. keyword stuffing
  4. Related keywords and semantic terms
  5. Overall keyword optimization score (1-100, higher is better)
  6. Recommendations for improvement

  Return ONLY a JSON object with the following structure:
  {{
    "keyword_density": {{ "keyword1": number, "keyword2": number }},
    "keyword_placement": {{ "title": boolean, "headings": boolean, "intro": boolean, "body": boolean, "conclusion": boolean }},
    "natural_usage_score": number,
    "related_keywords": string[],
    "optimization_score": number,
    "recommendations": string[],
    "analysis_summary": string
  }}
`);

const structureAnalysisPrompt = /*#__PURE__*/ PromptTemplate.fromTemplate(`
  Analyze the structure of the following content:

  CONTENT:
  {content}

  Provide a detailed analysis focusing on:
  1. Heading hierarchy (H1, H2, H3, etc.)
  2. Content organization (logical flow, sections)
  3. Introduction and conclusion strength
  4. Use of bullet points, lists, and paragraphing
  5. Content gaps or missing sections
  6. Overall structure score (1-100, higher is better)
  7. Recommendations for improvement

  Return ONLY a JSON object with the following structure:
  {{
    "heading_hierarchy": {{ "h1_count": number, "h2_count": number, "h3_count": number, "hierarchy_correct": boolean }},
    "organization_score": number,
    "intro_conclusion_score": number,
    "formatting_score": number,
    "content_gaps": string[],
    "structure_score": number,
    "recommendations": string[],
    "analysis_summary": string
  }}
`);

const contentSuggestionsPrompt = /*#__PURE__*/ PromptTemplate.fromTemplate(`
  Based on the following content and target keywords, suggest improvements:

  CONTENT:
  {content}

  TARGET KEYWORDS:
  {keywords}

  EXISTING ANALYSIS:
  {analysis}

  Generate specific, actionable suggestions to improve this content for SEO and readability.
  For each suggestion, provide:
  1. The original text (or description of the issue)
  2. The suggested improvement
  3. The reason for the suggestion

  Return ONLY a JSON array with the following structure:
  [
    {{
      "suggestion_type": string,
      "original_text": string,
      "suggested_text": string,
      "reason": string
    }},
    ...
  ]
`);

export class ContentAnalyzer {
  private model: ChatOpenAI | null = null;
  private isInitialized: boolean = false;
  private llmProvider: LiteLLMProvider;
  private outputParser = new StringOutputParser();

  constructor() {
    this.llmProvider = new LiteLLMProvider();
  }

  /**
   * Initialize the analyzer with the model
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('ContentAnalyzer: Already initialized');
      return;
    }

    try {
      console.log('ContentAnalyzer: Initializing with LangChain model');
      this.model = await this.llmProvider.getLangChainModel();
      this.isInitialized = true;
      console.log('ContentAnalyzer: Initialized successfully');
    } catch (error) {
      console.error('ContentAnalyzer: Initialization error:', error);
      throw new Error('Failed to initialize ContentAnalyzer');
    }
  }

  /**
   * Analyze content from a content page ID
   */
  public async analyzeContent(contentPageId: string, useServiceRole = false): Promise<any> {
    console.log(`ContentAnalyzer: Analyzing content page ${contentPageId}${useServiceRole ? ' using service role' : ''}`);
    
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Get content page from database
      const client = getClient(useServiceRole);
      const { data: contentPage, error } = await client
        .from('content_pages')
        .select('*')
        .eq('id', contentPageId)
        .single();

      if (error) {
        console.error('ContentAnalyzer: Error fetching content page:', error);
        
        // If not using service role yet, try again with service role
        if (!useServiceRole && serviceRoleClient) {
          console.log('ContentAnalyzer: Retrying with service role client');
          return this.analyzeContent(contentPageId, true);
        }
        
        throw new Error(`Failed to fetch content page: ${error.message}`);
      }

      if (!contentPage) {
        throw new Error('Content page not found');
      }

      console.log('ContentAnalyzer: Content page found', {
        title: contentPage.title,
        project_id: contentPage.project_id,
        url: contentPage.url,
        contentLength: contentPage.content?.length || 0
      });

      // Basic validation
      if (!contentPage.content || contentPage.content.trim().length === 0) {
        throw new Error('Content page has no content to analyze');
      }

      // More comprehensive analysis will be implemented here
      // For now, returning a simple example
      return {
        contentId: contentPageId,
        content: contentPage.content,
        contentLength: contentPage.content.length,
        title: contentPage.title,
        url: contentPage.url,
        project_id: contentPage.project_id,
        analysis: {
          readabilityScore: Math.floor(Math.random() * 100),
          sentimentScore: (Math.random() * 2) - 1, // -1 to 1
          keywordDensity: {
            "example": 0.02,
            "content": 0.04,
            "analysis": 0.01
          },
          gradeLevel: 8 + Math.floor(Math.random() * 6), // 8th to 14th grade
          improvements: [
            "Consider adding more transition phrases",
            "The content could benefit from more examples",
            "Consider breaking longer paragraphs into shorter ones"
          ]
        }
      };
    } catch (error) {
      console.error('ContentAnalyzer: Analysis error:', error);
      throw error;
    }
  }

  /**
   * Run a test prompt to verify the model is working
   */
  public async testPrompt(prompt: string): Promise<string> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.model) {
        throw new Error('Model is not initialized');
      }

      console.log('ContentAnalyzer: Running test prompt');
      const result = await this.model.invoke(prompt);
      return result.content.toString();
    } catch (error) {
      console.error('ContentAnalyzer: Test prompt error:', error);
      throw error;
    }
  }

  // Update the setup method to use the logger utility
  private async setup(): Promise<void> {
    if (this.model) {
      return;
    }

    try {
      logger.debug("Setting up model from LiteLLMProvider...");
      const llmProvider = LiteLLMProvider.getInstance();
      const model = await llmProvider.getLangChainModel();
      this.model = model;
      logger.info("Model successfully loaded", { modelName: (model as any).modelName });
    } catch (error) {
      logger.error("Error initializing model", error);
      throw new Error(`Failed to initialize model: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Update the safeJsonParse method to use the logger utility
  private safeJsonParse<T>(text: string, schema: z.ZodSchema<T>, fallback: T): T {
    try {
      const parsed = JSON.parse(text);
      const result = schema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }
      logger.error("Schema validation failed", result.error);
      return fallback;
    } catch (error) {
      logger.error("JSON parse error", error);
      return fallback;
    }
  }

  // Analyze content readability
  async analyzeReadability(content: string): Promise<ReadabilityAnalysis> {
    if (!this.model) {
      throw new Error('ContentAnalyzer not initialized');
    }
    
    logger.info('Analyzing content readability...');
    
    try {
      // First format the prompt with the content
      const formattedPrompt = await readabilityPrompt.format({
        content
      });
      
      // Call the model directly
      const messages = [{ role: 'user', content: formattedPrompt }];
      const response = await this.model.invoke(messages);
      
      // Get the response text
      const responseText = response.content.toString();
      logger.debug('Got readability response', { 
        responseLength: responseText.length,
        previewStart: responseText.substring(0, 100)
      });
      
      // Extract and parse the content
      try {
        const result = this.extractJsonFromText(responseText, ReadabilityAnalysisSchema);
        logger.info('Completed readability analysis');
        return result;
      } catch (parseError) {
        logger.error('Failed to parse readability response:', { 
          error: parseError instanceof Error ? parseError.message : String(parseError)
        });
        return this.getDefaultReadabilityValues();
      }
    } catch (error) {
      logger.error('Error analyzing readability:', {
        error: error instanceof Error ? error.message : String(error)
      });
      return this.getDefaultReadabilityValues();
    }
  }
  
  // Helper method for extracting JSON from AI responses
  private extractJsonFromText(text: string, schema: any): any {
    // First try to find and extract a JSON code block
    const codeBlockMatch = text.match(/```(?:json)?([\s\S]*?)```/);
    
    if (codeBlockMatch && codeBlockMatch[1]) {
      try {
        return JSON.parse(codeBlockMatch[1].trim());
      } catch (err) {
        logger.warn('Failed to parse JSON in code block, trying whole text');
      }
    }
    
    // If no code block or parsing failed, clean the string and try again
    let cleanedText = text
      .replace(/^```(\w*)?/gm, '') // Remove opening code blocks
      .replace(/```$/gm, '')      // Remove closing code blocks
      .replace(/\n/g, ' ')        // Replace newlines with spaces
      .replace(/,\s*}/g, '}')     // Remove trailing commas in objects
      .replace(/,\s*]/g, ']')     // Remove trailing commas in arrays
      .trim();
    
    // Try to find the first { and last } to extract potential JSON
    const firstBrace = cleanedText.indexOf('{');
    const lastBrace = cleanedText.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      cleanedText = cleanedText.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(cleanedText);
      } catch (err) {
        logger.warn('Failed to parse cleaned text as JSON, using default values');
      }
    }
    
    // If all parsing attempts fail, return a default object
    return this.getDefaultValuesForSchema(schema);
  }
  
  // Default values for different schemas
  private getDefaultReadabilityValues(): ReadabilityAnalysis {
    return {
      reading_level: "Intermediate",
      sentence_complexity: "Moderate",
      vocabulary_level: "Average",
      passive_voice_percentage: 15,
      readability_score: 50,
      improvement_areas: ["Could not generate specific improvements"],
      analysis_summary: "Analysis failed to complete"
    };
  }
  
  private getDefaultKeywordValues(): KeywordAnalysis {
    return {
      keyword_density: {},
      keyword_placement: {
        title: false,
        headings: false,
        intro: false,
        body: false,
        conclusion: false
      },
      natural_usage_score: 50,
      related_keywords: [],
      optimization_score: 50,
      recommendations: ["Could not generate specific recommendations"],
      analysis_summary: "Analysis failed to complete"
    };
  }
  
  private getDefaultStructureValues(): StructureAnalysis {
    return {
      heading_hierarchy: {
        h1_count: 0,
        h2_count: 0, 
        h3_count: 0,
        hierarchy_correct: false
      },
      organization_score: 50,
      intro_conclusion_score: 50,
      formatting_score: 50,
      content_gaps: ["Could not detect content gaps"],
      structure_score: 50,
      recommendations: ["Could not generate specific structure recommendations"],
      analysis_summary: "Analysis failed to complete"
    };
  }
  
  private getDefaultValuesForSchema(schema: any): any {
    if (schema === ReadabilityAnalysisSchema) {
      return this.getDefaultReadabilityValues();
    } else if (schema === KeywordAnalysisSchema) {
      return this.getDefaultKeywordValues();
    } else if (schema === StructureAnalysisSchema) {
      return this.getDefaultStructureValues();
    } else {
      return {}; // Generic empty object for unknown schemas
    }
  }

  // Analyze keyword usage
  async analyzeKeywordUsage(content: string, keywords: string[]): Promise<KeywordAnalysis> {
    if (!this.model) {
      throw new Error('ContentAnalyzer not initialized');
    }
    
    logger.info(`Analyzing keyword usage for ${keywords.length} keywords...`);
    
    try {
      // First format the prompt with the content and keywords
      const formattedPrompt = await keywordAnalysisPrompt.format({
        content,
        keywords: keywords.join(", ")
      });
      
      // Call the model directly
      const messages = [{ role: 'user', content: formattedPrompt }];
      const response = await this.model.invoke(messages);
      
      // Get the response text
      const responseText = response.content.toString();
      logger.debug('Got keyword response', { 
        responseLength: responseText.length,
        previewStart: responseText.substring(0, 100)
      });
      
      // Extract and parse the content
      try {
        const result = this.extractJsonFromText(responseText, KeywordAnalysisSchema);
        logger.info('Completed keyword analysis');
        return result;
      } catch (parseError) {
        logger.error('Failed to parse keyword response:', { 
          error: parseError instanceof Error ? parseError.message : String(parseError)
        });
        return this.getDefaultKeywordValues();
      }
    } catch (error) {
      logger.error('Error analyzing keyword usage:', {
        error: error instanceof Error ? error.message : String(error)
      });
      return this.getDefaultKeywordValues();
    }
  }

  // Analyze content structure
  async analyzeStructure(content: string): Promise<StructureAnalysis> {
    if (!this.model) {
      throw new Error('ContentAnalyzer not initialized');
    }
    
    logger.info('Analyzing content structure...');
    
    try {
      // First format the prompt with the content
      const formattedPrompt = await structureAnalysisPrompt.format({
        content
      });
      
      // Call the model directly
      const messages = [{ role: 'user', content: formattedPrompt }];
      const response = await this.model.invoke(messages);
      
      // Get the response text
      const responseText = response.content.toString();
      logger.debug('Got structure response', { 
        responseLength: responseText.length,
        previewStart: responseText.substring(0, 100)
      });
      
      // Extract and parse the content
      try {
        const result = this.extractJsonFromText(responseText, StructureAnalysisSchema);
        logger.info('Completed structure analysis');
        return result;
      } catch (parseError) {
        logger.error('Failed to parse structure response:', { 
          error: parseError instanceof Error ? parseError.message : String(parseError)
        });
        return this.getDefaultStructureValues();
      }
    } catch (error) {
      logger.error('Error analyzing structure:', {
        error: error instanceof Error ? error.message : String(error)
      });
      return this.getDefaultStructureValues();
    }
  }

  // Generate content suggestions
  async generateSuggestions(content: string, keywords: string[], analysis: any): Promise<ContentSuggestion[]> {
    if (!this.model) {
      throw new Error('ContentAnalyzer not initialized');
    }
    
    logger.info('Generating content suggestions...');
    
    try {
      // First format the prompt with the content, keywords, and analysis
      const formattedPrompt = await contentSuggestionsPrompt.format({
        content,
        keywords: keywords.join(", "),
        analysis: JSON.stringify(analysis)
      });
      
      // Call the model directly
      const messages = [{ role: 'user', content: formattedPrompt }];
      const response = await this.model.invoke(messages);
      
      // Get the response text
      const responseText = response.content.toString();
      logger.debug('Got suggestions response', { 
        responseLength: responseText.length,
        previewStart: responseText.substring(0, 100)
      });
      
      // Try to extract and parse the suggestions array
      let suggestions: ContentSuggestion[] = [];
      
      try {
        // First try to extract a JSON array
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const parsedArray = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsedArray)) {
              suggestions = parsedArray;
            }
          } catch (e) {
            logger.warn('Failed to parse suggestions JSON array, falling back to extraction methods');
          }
        }
        
        // If no suggestions were found, try other methods
        if (suggestions.length === 0) {
          const result = this.extractJsonFromText(responseText, ContentSuggestionSchema);
          
          // Handle different possible formats
          if (Array.isArray(result)) {
            suggestions = result;
          } else if (result.suggestions && Array.isArray(result.suggestions)) {
            suggestions = result.suggestions;
          } else if (result.improvement_suggestions && Array.isArray(result.improvement_suggestions)) {
            suggestions = result.improvement_suggestions;
          }
        }
        
        logger.info(`Generated ${suggestions.length} content suggestions`);
      } catch (parseError) {
        logger.error('Failed to parse suggestions response:', { 
          error: parseError instanceof Error ? parseError.message : String(parseError)
        });
      }
      
      return suggestions;
    } catch (error) {
      logger.error('Error generating suggestions:', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  // Main method to analyze content
  async analyzeContent(content: string, keywords: string[]): Promise<{
    readability: ReadabilityAnalysis;
    keyword: KeywordAnalysis;
    structure: StructureAnalysis;
    suggestions: ContentSuggestion[];
  }> {
    logger.info('Starting content analysis process');
    logger.debug('Input content length', content.length);
    logger.debug('Keywords', keywords);
    
    try {
      // Initialize LiteLLM provider
      logger.info('Initializing LiteLLM provider');
      const llmProvider = LiteLLMProvider.getInstance();
      logger.info('Getting LangChain model from provider');
      const langChainModel = llmProvider.getLangChainModel();
      logger.info('LangChain model initialized successfully', { modelName: langChainModel.modelName });
      
      // Create chains for each analysis type
      logger.info('Setting up structured output parsers for each analysis type');
      
      // Track the start time for performance monitoring
      const startTime = Date.now();
      
      // Split content into manageable chunks if it's too long
      let contentChunks = [content];
      if (content.length > 8000) {
        logger.info('Content is long, splitting into chunks for processing');
        contentChunks = this.splitContent(content);
        logger.debug('Split content into chunks', { numberOfChunks: contentChunks.length });
      }
      
      // Define analysis interfaces
      interface ReadabilityAnalysis {
        reading_level: string;
        sentence_complexity: string;
        vocabulary_level: string;
        passive_voice_percentage: number;
        readability_score: number;
        improvement_areas: string[];
        analysis_summary: string;
      }

      interface KeywordAnalysis {
        keyword_density: Record<string, number>;
        keyword_placement: {
          title: boolean;
          headings: boolean;
          intro: boolean;
          body: boolean;
          conclusion: boolean;
        };
        optimization_score: number;
        analysis_summary: string;
      }

      interface StructureAnalysis {
        heading_hierarchy: {
          h1_count: number;
          h2_count: number;
          h3_count: number;
        };
        structure_score: number;
        analysis_summary: string;
      }

      function isReadabilityAnalysis(result: any): result is ReadabilityAnalysis {
        return typeof result?.readability_score === 'number';
      }

      logger.info('Starting parallel analysis of content');
      
      // Run analyses in parallel using existing methods
      const readabilityPromise = this.runAnalysis(() => this.analyzeReadability(contentChunks[0]), 'readability');
      const keywordPromise = this.runAnalysis(() => this.analyzeKeywordUsage(contentChunks[0], keywords), 'keyword');
      const structurePromise = this.runAnalysis(() => this.analyzeStructure(content), 'structure');
      
      // Get results needed for suggestions
      const [readabilityResult, keywordResult, structureResult] = await Promise.all([
        readabilityPromise,
        keywordPromise,
        structurePromise
      ]);

      // Run suggestions after getting other results
      const suggestionsResult = await this.runAnalysis(() =>
        this.generateSuggestions(
          content,
          keywords,
          { readability: readabilityResult, keyword: keywordResult, structure: structureResult }
        ),
        'suggestions'
      );

      // Validate results
      if (!isReadabilityAnalysis(readabilityResult) || !keywordResult || !structureResult || !suggestionsResult) {
        throw new Error('One or more analyses failed');
      }
      
      // Track completion time
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      logger.info(`Content analysis completed in ${duration.toFixed(2)} seconds`);
      
      // Log the results (truncated for privacy/brevity)
      logger.debug('Analysis results summary', {
        readability: { score: readabilityResult.readability_score },
        keyword: { score: keywordResult.optimization_score },
        structure: { score: structureResult.structure_score },
        suggestionsCount: Array.isArray(suggestionsResult) ? suggestionsResult.length : 0
      });
      
      return {
        readability: readabilityResult,
        keyword: keywordResult,
        structure: structureResult,
        suggestions: suggestionsResult
      };
    } catch (error) {
      logger.error('Error during content analysis', error);
      throw error;
    }
  }

  // Add helper method for running individual analyses with proper logging
  private async runAnalysis<T>(
    analysisFn: () => Promise<T>, 
    analysisType: string
  ): Promise<T> {
    logger.info(`Starting ${analysisType} analysis`);
    const startTime = Date.now();
    
    try {
      const result = await analysisFn();
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      logger.info(`Completed ${analysisType} analysis in ${duration.toFixed(2)} seconds`);
      return result;
    } catch (error) {
      logger.error(`Error in ${analysisType} analysis`, error);
      throw error;
    }
  }

  // Helper method to store analysis results in the database
  async storeAnalysisResults(
    contentPageId: string, 
    analysisResults: {
      readability: ReadabilityAnalysis;
      keyword: KeywordAnalysis;
      structure: StructureAnalysis;
      suggestions: ContentSuggestion[];
    }, 
    supabase: any
  ): Promise<{success: boolean, errors: string[]}> {
    logger.info(`Storing analysis results for content page ID: ${contentPageId}`);
    const errors: string[] = [];
    logger.info('Storing analysis results in database');
    
    // Prepare analysis results for database
    const dbAnalysisResults = [
      {
        page_id: contentPageId,
        analysis_type: 'readability',
        result: analysisResults.readability
      },
      {
        page_id: contentPageId,
        analysis_type: 'keyword',
        result: analysisResults.keyword
      },
      {
        page_id: contentPageId,
        analysis_type: 'structure',
        result: analysisResults.structure
      },
      {
        page_id: contentPageId,
        analysis_type: 'suggestions',
        result: analysisResults.suggestions
      }
    ];
    
    // Create comprehensive analysis record with all data
    const comprehensiveAnalysis = {
      page_id: contentPageId,
      analysis_type: 'comprehensive',
      result: {
        readability_analysis: analysisResults.readability,
        keyword_analysis: analysisResults.keyword,
        structure_analysis: analysisResults.structure,
        recommendations: [
          ...analysisResults.readability.improvement_areas || [],
          ...analysisResults.keyword.recommendations || [],
          ...analysisResults.structure.recommendations || []
        ],
        content_score: Math.round(
          (analysisResults.readability.readability_score +
           analysisResults.keyword.optimization_score +
           analysisResults.structure.structure_score) / 3
        )
      }
    };
    
    // Insert all analysis results
    for (const analysis of [...dbAnalysisResults, comprehensiveAnalysis]) {
      try {
        logger.debug(`Inserting ${analysis.analysis_type} analysis into content_analysis table`);
        logger.debug(`Analysis data structure: ${JSON.stringify({
          page_id: contentPageId,
          analysis_type: analysis.analysis_type,
          result_type: typeof analysis.result,
          has_result: !!analysis.result
        })}`);
        
        // Run a test query first
        logger.debug('Running test query on content_analysis table');
        const { data: testData, error: testError } = await supabase
          .from('content_analysis')
          .select('*')
          .limit(1);
          
        if (testError) {
          logger.error(`Test query error: ${testError.message}`, {
            code: testError.code,
            details: testError.details,
            hint: testError.hint
          });
        } else {
          logger.debug(`Test query success, column names: ${testData && testData.length > 0 ? Object.keys(testData[0]).join(', ') : 'no data'}`);
        }
        
        // Insert using the correct table name and field names
        logger.debug('Attempting to insert data');
        const insertResult = await supabase
          .from('content_analysis')
          .insert({
            page_id: contentPageId,
            analysis_type: analysis.analysis_type,
            result: analysis.result,
            created_at: new Date().toISOString()
          })
          .select();
          
        const { data: insertData, error: insertError } = insertResult;
        
        logger.debug(`Insert result: ${JSON.stringify({
          hasData: !!insertData,
          dataLength: insertData?.length,
          hasError: !!insertError,
          status: insertResult.status,
          statusText: insertResult.statusText
        })}`);
          
        if (insertError) {
          const errorMsg = `Error inserting ${analysis.analysis_type} analysis: ${insertError.message}`;
          logger.error(errorMsg, { 
            errorCode: insertError.code,
            errorDetails: insertError.details, 
            errorHint: insertError.hint,
            fullError: JSON.stringify(insertError)
          });
          errors.push(errorMsg);
        } else {
          logger.info(`Successfully inserted ${analysis.analysis_type} analysis record`, { 
            recordId: insertData?.[0]?.id 
          });
        }
      } catch (error) {
        const errorMsg = `Error processing ${analysis.analysis_type} analysis: ${error instanceof Error ? error.message : String(error)}`;
        logger.error(errorMsg, { 
          errorType: typeof error, 
          fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
        });
        errors.push(errorMsg);
      }
    }
    
    // Calculate overall scores
    const readabilityScore = analysisResults.readability.readability_score || 0;
    const keywordScore = analysisResults.keyword.optimization_score || 0;
    const structureScore = analysisResults.structure.structure_score || 0;
    
    // Average the scores for an overall SEO score
    const seoScore = Math.round((readabilityScore + keywordScore + structureScore) / 3);
    
    // Update the content page with the new scores
    try {
      logger.info(`Updating content page with scores: readability=${readabilityScore}, seo=${seoScore}`);
      const { error: updateError } = await supabase
        .from('content_pages')
        .update({
          readability_score: readabilityScore,
          seo_score: seoScore,
          analyzed_at: new Date().toISOString()
        })
        .eq('id', contentPageId);
        
      if (updateError) {
        const errorMsg = `Error updating content page with scores: ${updateError.message}`;
        logger.error(errorMsg, updateError);
        errors.push(errorMsg);
      } else {
        logger.info('Successfully updated content page with scores');
      }
    } catch (error) {
      const errorMsg = `Error updating content page scores: ${error instanceof Error ? error.message : String(error)}`;
      logger.error(errorMsg, error);
      errors.push(errorMsg);
    }
    
    return {
      success: errors.length === 0,
      errors
    };
  }

  private static async getAIAnalysis(
    content: string,
    targetKeywords: string[],
    locale: string = 'en'
  ): Promise<ContentAIAnalysis> {
    const llmLogger = logger.child({
      service: 'ContentAnalyzer',
      method: 'getAIAnalysis',
      contentLength: content.length,
      keywordCount: targetKeywords.length,
      locale
    });
    
    llmLogger.info('Starting AI analysis');
    
    try {
      // Get the LLM provider
      const llmProvider = LiteLLMProvider.getInstance();
      llmLogger.debug('LiteLLMProvider instance obtained');
      
      // Get the model - now properly awaited
      llmLogger.debug('Requesting LangChain model');
      const model = await llmProvider.getLangChainModel();
      llmLogger.info('LangChain model obtained successfully');
      
      // Create the prompts
      const systemMessage = this.createAIAnalysisSystemPrompt();
      const userMessage = this.createAIAnalysisPrompt(content, targetKeywords, locale);
      
      llmLogger.debug('Created prompt messages', {
        systemPromptLength: typeof systemMessage.content === 'string' ? systemMessage.content.length : 'unknown',
        userPromptLength: typeof userMessage.content === 'string' ? userMessage.content.length : 'unknown'
      });
      
      // Send to LLM
      llmLogger.debug('Invoking LLM with messages');
      const result = await model.invoke([
        new SystemMessage(systemMessage),
        new HumanMessage(userMessage)
      ]);
      
      llmLogger.debug('LLM response received', {
        responseLength: result.content.toString().length
      });
      
      // Parse the JSON string from the response content
      try {
        const responseContent = result.content.toString();
        
        // Try to find JSON in code block first
        llmLogger.debug('Attempting to parse LLM response');
        const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/);
        
        if (jsonMatch && jsonMatch[1]) {
          llmLogger.debug('Found JSON code block in response');
          const jsonContent = jsonMatch[1].trim();
          
          try {
            const parsedResult = JSON.parse(jsonContent);
            llmLogger.info('Successfully parsed JSON from code block');
            return parsedResult;
          } catch (blockParseError) {
            llmLogger.warn('Failed to parse JSON from code block, trying alternative parsing', {
              error: blockParseError instanceof Error ? blockParseError.message : String(blockParseError),
              jsonContent: jsonContent.substring(0, 100) + '...'
            });
            throw blockParseError; // Propagate to try alternative parsing
          }
        } else {
          // Try to parse the whole response if no code block is found
          llmLogger.debug('No JSON code block found, trying to parse whole response');
          
          // Clean the response - remove markdown artifacts
          const cleanedResponse = responseContent
            .replace(/^```(\w*)?/gm, '') // Remove opening code blocks
            .replace(/```$/gm, '')      // Remove closing code blocks
            .trim();
            
          llmLogger.debug('Cleaned response for parsing', {
            length: cleanedResponse.length
          });
          
          const parsedResult = JSON.parse(cleanedResponse);
          llmLogger.info('Successfully parsed JSON from whole response');
          return parsedResult;
        }
      } catch (parseError) {
        llmLogger.error('Error parsing AI response:', {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          responsePreview: result.content.toString().substring(0, 200) + '...'
        });
        throw new Error('Failed to parse AI analysis response');
      }
    } catch (error) {
      llmLogger.error('Error in AI analysis process:', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(`Failed to get AI analysis: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async createModelInstance(): Promise<BaseChatModel> {
    // Implementation of model instance creation
    return this.model as BaseChatModel;
  }

  private static createAIAnalysisSystemPrompt(): SystemMessage {
    return new SystemMessage({ content: "You are an expert SEO content analyzer." });
  }

  private static createAIAnalysisPrompt(content: string, targetKeywords: string[] = [], locale: string = 'en'): HumanMessage {
    const prompt = `
      Analyze the following content for SEO optimization:
      
      CONTENT:
      ${content}
      
      ${targetKeywords.length > 0 ? `TARGET KEYWORDS: ${targetKeywords.join(', ')}` : ''}
      
      LOCALE: ${locale}
      
      Provide a detailed analysis with scores and suggestions.
    `;
    
    return new HumanMessage({ content: prompt });
  }

  // Helper method to split content into manageable chunks for analysis
  private splitContent(text: string, chunkSize = 8000, overlap = 200): string[] {
    logger.debug(`Splitting content of length ${text.length} into chunks`);
    
    // If text is already small enough, return as single chunk
    if (text.length <= chunkSize) {
      return [text];
    }
    
    const chunks: string[] = [];
    let startIndex = 0;
    
    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + chunkSize, text.length);
      chunks.push(text.slice(startIndex, endIndex));
      startIndex = endIndex - overlap;
      
      // Break if we're at the end of the text
      if (endIndex === text.length) {
        break;
      }
    }
    
    logger.debug(`Split content into ${chunks.length} chunks`);
    return chunks;
  }

  /**
   * Parse response with multiple fallback strategies for handling LLM outputs
   */
  private async parseAIResponse(result: BaseMessage, expectedSchema: any): Promise<any> {
    const responseContent = result.content.toString().trim();
    const llmLogger = logger.child({ module: 'LLM' });
    llmLogger.debug('Parsing AI response', { 
      responseLength: responseContent.length,
      responsePreview: responseContent.substring(0, 100) + '...'
    });

    // Default fallback result with empty/safe values
    const defaultResult = {
      readability_score: 50,
      keyword_density: {},
      optimization_score: 50,
      structure_score: 50,
      improvement_suggestions: []
    };

    try {
      // Strategy 1: Try to find and parse a JSON code block
      const codeBlockMatch = responseContent.match(/```(?:json)?([\s\S]*?)```/);
      
      if (codeBlockMatch && codeBlockMatch[1]) {
        const jsonContent = codeBlockMatch[1].trim();
        
        try {
          const parsedResult = JSON.parse(jsonContent);
          llmLogger.info('Successfully parsed JSON from code block');
          return this.validateAndSanitizeResult(parsedResult, expectedSchema, defaultResult);
        } catch (blockParseError) {
          llmLogger.warn('Failed to parse JSON from code block, trying alternative parsing', {
            error: blockParseError instanceof Error ? blockParseError.message : String(blockParseError),
            jsonContent: jsonContent.substring(0, 100) + '...'
          });
          // Continue to next strategy
        }
      }
      
      // Strategy 2: Try to parse the whole response after cleaning
      llmLogger.debug('No JSON code block found or parsing failed, trying to parse whole response');
      
      // Clean the response - remove markdown artifacts and fix common JSON issues
      let cleanedResponse = responseContent
        .replace(/^```(\w*)?/gm, '') // Remove opening code blocks
        .replace(/```$/gm, '')      // Remove closing code blocks
        .replace(/\n/g, ' ')        // Replace newlines with spaces
        .replace(/,\s*}/g, '}')     // Remove trailing commas in objects
        .replace(/,\s*]/g, ']')     // Remove trailing commas in arrays
        .trim();
        
      // Add missing braces if needed
      if (cleanedResponse.trim().startsWith('{') && !cleanedResponse.trim().endsWith('}')) {
        cleanedResponse += '}';
      }
      
      llmLogger.debug('Cleaned response for parsing', {
        length: cleanedResponse.length,
        preview: cleanedResponse.substring(0, 100) + '...'
      });
      
      try {
        const parsedResult = JSON.parse(cleanedResponse);
        llmLogger.info('Successfully parsed JSON from cleaned response');
        return this.validateAndSanitizeResult(parsedResult, expectedSchema, defaultResult);
      } catch (wholeParseError) {
        llmLogger.warn('Failed to parse cleaned response, trying to extract key-value pairs', {
          error: wholeParseError instanceof Error ? wholeParseError.message : String(wholeParseError)
        });
        
        // Strategy 3: Try to extract key-value pairs from text
        const result = { ...defaultResult };
        
        // Extract scores using regex
        const readabilityMatch = responseContent.match(/(?:readability|readability score|readability_score)[\s:]+(\d+)/i);
        if (readabilityMatch && readabilityMatch[1]) {
          result.readability_score = parseInt(readabilityMatch[1], 10);
        }
        
        const optimizationMatch = responseContent.match(/(?:optimization|optimization score|optimization_score)[\s:]+(\d+)/i);
        if (optimizationMatch && optimizationMatch[1]) {
          result.optimization_score = parseInt(optimizationMatch[1], 10);
        }
        
        const structureMatch = responseContent.match(/(?:structure|structure score|structure_score)[\s:]+(\d+)/i);
        if (structureMatch && structureMatch[1]) {
          result.structure_score = parseInt(structureMatch[1], 10);
        }
        
        llmLogger.info('Extracted partial results from text using fallback method');
        return result;
      }
    } catch (parseError) {
      llmLogger.error('All parsing strategies failed:', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        responsePreview: responseContent.substring(0, 200) + '...'
      });
      
      // Return default fallback values rather than throwing
      return defaultResult;
    }
  }
  
  /**
   * Validate and sanitize result against expected schema, apply defaults for missing values
   */
  private validateAndSanitizeResult(result: any, schema: any, defaultValues: any): any {
    // Start with default values
    const sanitized = { ...defaultValues };
    
    // Copy valid properties from result
    Object.keys(schema.properties || {}).forEach(key => {
      if (result[key] !== undefined) {
        sanitized[key] = result[key];
      }
    });
    
    // Ensure scores are numbers between 0-100
    if (sanitized.readability_score !== undefined) {
      sanitized.readability_score = Math.min(100, Math.max(0, Number(sanitized.readability_score) || 50));
    }
    
    if (sanitized.optimization_score !== undefined) {
      sanitized.optimization_score = Math.min(100, Math.max(0, Number(sanitized.optimization_score) || 50));
    }
    
    if (sanitized.structure_score !== undefined) {
      sanitized.structure_score = Math.min(100, Math.max(0, Number(sanitized.structure_score) || 50));
    }
    
    // Ensure improvement_suggestions is an array
    if (!Array.isArray(sanitized.improvement_suggestions)) {
      sanitized.improvement_suggestions = [];
    }
    
    return sanitized;
  }
}