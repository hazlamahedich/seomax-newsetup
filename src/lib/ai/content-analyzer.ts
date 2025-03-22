import { ChatOpenAI } from 'langchain/chat_models/openai';
import { PromptTemplate } from 'langchain/prompts';
import { StringOutputParser } from 'langchain/schema/output_parser';
import { RunnableSequence } from 'langchain/schema/runnable';
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";

// Initialize the model - you can replace with Groq or other provider if needed
const model = new ChatOpenAI({
  modelName: 'gpt-4o', // Can be configured based on needs and budget
  temperature: 0.2, 
  maxTokens: 2000,
});

const outputParser = new StringOutputParser();

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

// Content readability analysis
const readabilityPrompt = PromptTemplate.fromTemplate(`
Analyze the following content for readability:

CONTENT:
{content}

Provide a detailed analysis focusing on:
1. Reading level (elementary, middle school, high school, college, professional)
2. Sentence complexity (simple, moderate, complex)
3. Vocabulary level (basic, intermediate, advanced)
4. Passive voice usage (percentage)
5. Overall readability score (1-100, higher is more readable)
6. Key improvement areas

Return ONLY a JSON object with the following structure:
{
  "reading_level": string,
  "sentence_complexity": string,
  "vocabulary_level": string, 
  "passive_voice_percentage": number,
  "readability_score": number,
  "improvement_areas": string[],
  "analysis_summary": string
}
`);

const readabilityChain = RunnableSequence.from([
  readabilityPrompt,
  model,
  outputParser,
]);

// Keyword usage analysis
const keywordAnalysisPrompt = PromptTemplate.fromTemplate(`
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
{
  "keyword_density": { "keyword1": number, "keyword2": number, ... },
  "keyword_placement": { "title": boolean, "headings": boolean, "intro": boolean, "body": boolean, "conclusion": boolean },
  "natural_usage_score": number,
  "related_keywords": string[],
  "optimization_score": number,
  "recommendations": string[],
  "analysis_summary": string
}
`);

const keywordAnalysisChain = RunnableSequence.from([
  keywordAnalysisPrompt,
  model,
  outputParser,
]);

// Content structure analysis
const structureAnalysisPrompt = PromptTemplate.fromTemplate(`
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
{
  "heading_hierarchy": { "h1_count": number, "h2_count": number, "h3_count": number, "hierarchy_correct": boolean },
  "organization_score": number,
  "intro_conclusion_score": number,
  "formatting_score": number,
  "content_gaps": string[],
  "structure_score": number,
  "recommendations": string[],
  "analysis_summary": string
}
`);

const structureAnalysisChain = RunnableSequence.from([
  structureAnalysisPrompt,
  model,
  outputParser,
]);

// Content suggestions generator
const contentSuggestionsPrompt = PromptTemplate.fromTemplate(`
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
  {
    "suggestion_type": string, // "title", "meta_description", "heading", "paragraph", "structure", etc.
    "original_text": string,
    "suggested_text": string,
    "reason": string
  },
  ...
]
`);

const contentSuggestionsChain = RunnableSequence.from([
  contentSuggestionsPrompt,
  model,
  outputParser,
]);

// Topic cluster generator
const topicClusterPrompt = PromptTemplate.fromTemplate(`
Based on the following main keyword, generate a topic cluster:

MAIN KEYWORD:
{main_keyword}

EXISTING CONTENT TOPICS (if any):
{existing_topics}

Generate a comprehensive topic cluster including:
1. The main pillar topic
2. 8-10 subtopics that should be covered
3. 3-5 related long-tail keywords for each subtopic

Return ONLY a JSON object with the following structure:
{
  "main_topic": {
    "title": string,
    "description": string
  },
  "subtopics": [
    {
      "title": string,
      "description": string,
      "long_tail_keywords": string[]
    },
    ...
  ],
  "related_keywords": string[]
}
`);

const topicClusterChain = RunnableSequence.from([
  topicClusterPrompt,
  model,
  outputParser,
]);

// Content brief generator
const contentBriefPrompt = PromptTemplate.fromTemplate(`
Create a detailed content brief for an article on the following topic:

TOPIC:
{topic}

TARGET KEYWORDS:
{keywords}

COMPETITOR CONTENT INSIGHTS:
{competitor_insights}

Create a comprehensive content brief including:
1. Suggested title (with target keyword)
2. Meta description (with target keyword)
3. Content structure with H2 and H3 headings
4. Key points to cover in each section
5. Target word count
6. Suggested internal and external links
7. SEO recommendations

Return ONLY a JSON object with the following structure:
{
  "title": string,
  "meta_description": string,
  "target_word_count": number,
  "target_keywords": string[],
  "content_structure": [
    {
      "heading": string,
      "heading_level": number,
      "key_points": string[],
      "target_keywords": string[]
    },
    ...
  ],
  "suggested_internal_links": string[],
  "suggested_external_links": string[],
  "seo_recommendations": string[]
}
`);

const contentBriefChain = RunnableSequence.from([
  contentBriefPrompt,
  model,
  outputParser,
]);

// Type definitions for analysis results
export interface ReadabilityAnalysis {
  reading_level: string;
  sentence_complexity: string;
  vocabulary_level: string;
  passive_voice_percentage: number;
  readability_score: number;
  improvement_areas: string[];
  analysis_summary: string;
}

export interface KeywordAnalysis {
  keyword_density: Record<string, number>;
  keyword_placement: {
    title: boolean;
    headings: boolean;
    intro: boolean;
    body: boolean;
    conclusion: boolean;
  };
  natural_usage_score: number;
  related_keywords: string[];
  optimization_score: number;
  recommendations: string[];
  analysis_summary: string;
}

export interface StructureAnalysis {
  heading_hierarchy: {
    h1_count: number;
    h2_count: number;
    h3_count: number;
    hierarchy_correct: boolean;
  };
  organization_score: number;
  intro_conclusion_score: number;
  formatting_score: number;
  content_gaps: string[];
  structure_score: number;
  recommendations: string[];
  analysis_summary: string;
}

export interface ContentSuggestion {
  suggestion_type: string;
  original_text: string;
  suggested_text: string;
  reason: string;
}

export interface TopicCluster {
  main_topic: {
    title: string;
    description: string;
  };
  subtopics: Array<{
    title: string;
    description: string;
    long_tail_keywords: string[];
  }>;
  related_keywords: string[];
}

export interface ContentBrief {
  title: string;
  meta_description: string;
  target_word_count: number;
  target_keywords: string[];
  content_structure: Array<{
    heading: string;
    heading_level: number;
    key_points: string[];
    target_keywords: string[];
  }>;
  suggested_internal_links: string[];
  suggested_external_links: string[];
  seo_recommendations: string[];
}

// Define interfaces for the analysis results
export interface ReadabilityAnalysis {
  readingLevel: { value: string; score: number };
  sentenceStructure: { score: number; analysis: string };
  contentStructure: { score: number; analysis: string };
  suggestions: string[];
}

export interface KeywordAnalysis {
  density: { value: number; score: number };
  placement: { score: number; analysis: string };
  relatedTerms: { score: number; terms: string[] };
  suggestedTerms: string[];
}

export interface ContentSuggestion {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ContentAnalysisResult {
  readabilityAnalysis: ReadabilityAnalysis;
  keywordAnalysis: KeywordAnalysis;
  contentSuggestions: ContentSuggestion[];
  overallScore: number;
}

export interface OptimizedContentResult {
  optimizedContent: string;
  changesExplanation: string;
}

// Main ContentAnalyzer class
export class ContentAnalyzer {
  private model: ChatOpenAI;
  private readabilityPrompt: PromptTemplate;
  private keywordPrompt: PromptTemplate;
  private contentAnalysisPrompt: PromptTemplate;
  private optimizeContentPrompt: PromptTemplate;

  constructor() {
    // Initialize LLM
    this.model = new ChatOpenAI({
      modelName: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      temperature: 0.2,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize prompt templates
    this.readabilityPrompt = PromptTemplate.fromTemplate(`
      You are an expert content editor focused on readability.
      Analyze the following content and provide detailed feedback on its readability.
      
      Content:
      {content}
      
      Provide a structured analysis including:
      1. The approximate reading level (e.g., "Grade 8-9", "College level")
      2. Sentence structure assessment (variety, length, complexity)
      3. Content organization and flow
      4. Specific suggestions for improvement
      
      Format your response as JSON according to the ReadabilityAnalysis interface.
    `);

    this.keywordPrompt = PromptTemplate.fromTemplate(`
      You are an SEO expert analyzing content for keyword optimization.
      
      Content: {content}
      Target Keyword: {keyword}
      
      Provide a structured analysis of how well the content is optimized for the target keyword:
      1. Keyword density (percentage and assessment)
      2. Keyword placement (title, headers, intro, conclusion)
      3. Related terms usage
      4. Suggested additional semantically related terms to include
      
      Format your response as JSON according to the KeywordAnalysis interface.
    `);

    this.contentAnalysisPrompt = PromptTemplate.fromTemplate(`
      You are an expert SEO content analyst. Analyze the following content for SEO effectiveness and readability.
      
      Content: {content}
      Target Keyword: {keyword}
      
      Provide a comprehensive analysis including:
      
      1. Readability:
         - Reading level (e.g., "Grade 8-9", "College level") with a score out of 10
         - Sentence structure assessment (variety, length, complexity) with a score out of 10
         - Content structure and organization with a score out of 10
         - Specific suggestions for improving readability (list 2-4 suggestions)
      
      2. Keyword Analysis:
         - Keyword density (percentage) with a score out of 10
         - Keyword placement assessment with a score out of 10
         - Related terms usage with a score out of 10
         - List of 5-8 suggested semantically related terms to include
      
      3. Content Suggestions:
         - 3-5 specific suggestions to improve the content, each with a title, description, and priority (high/medium/low)
      
      4. Overall Score:
         - A score out of 100 evaluating the overall SEO quality of the content
      
      Format your response as a JSON object with this structure:
      {
        "readabilityAnalysis": {
          "readingLevel": { "value": string, "score": number },
          "sentenceStructure": { "score": number, "analysis": string },
          "contentStructure": { "score": number, "analysis": string },
          "suggestions": string[]
        },
        "keywordAnalysis": {
          "density": { "value": number, "score": number },
          "placement": { "score": number, "analysis": string },
          "relatedTerms": { "score": number, "terms": string[] },
          "suggestedTerms": string[]
        },
        "contentSuggestions": [
          { "title": string, "description": string, "priority": "high"|"medium"|"low" }
        ],
        "overallScore": number
      }
    `);

    this.optimizeContentPrompt = PromptTemplate.fromTemplate(`
      You are an expert SEO content optimizer. Rewrite the following content to improve its SEO effectiveness
      while maintaining its original message and voice.
      
      Content: {content}
      Target Keyword: {keyword}
      Optimization Level: {level} (light, medium, or high)
      
      Guidelines:
      - Improve keyword placement and density without keyword stuffing
      - Enhance readability and flow
      - Add semantically related terms
      - Improve headings, intro, and conclusion
      - Adjust based on the optimization level (light = subtle changes, high = more aggressive optimization)
      
      Provide:
      1. The fully optimized content (keep the same overall length)
      2. A brief explanation of the changes made
      
      Format as JSON:
      {
        "optimizedContent": "The full optimized content here",
        "changesExplanation": "Brief explanation of changes made"
      }
    `);
  }

  // Split long content into manageable chunks
  private async splitContent(content: string): Promise<string[]> {
    return splitTextIntoChunks(content);
  }

  // Analyze content readability
  async analyzeReadability(content: string): Promise<ReadabilityAnalysis> {
    try {
      const formattedPrompt = await this.readabilityPrompt.format({
        content,
      });

      const response = await this.model.invoke(formattedPrompt);
      const responseText = response.content.toString();
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/```json\n([\s\S]*)\n```/) || 
                         responseText.match(/{[\s\S]*}/);
      
      const jsonContent = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;
      
      return JSON.parse(jsonContent);
    } catch (error) {
      console.error("Error analyzing readability:", error);
      throw new Error("Failed to analyze content readability");
    }
  }

  // Analyze keyword usage
  async analyzeKeywordUsage(content: string, keywords: string[]): Promise<KeywordAnalysis> {
    try {
      // For long content, analyze first chunks
      const contentChunks = await this.splitContent(content);
      const result = await keywordAnalysisChain.invoke({
        content: contentChunks.slice(0, 2).join('\n\n'), // Analyze first two chunks
        keywords: keywords.join(', '),
      });
      
      return JSON.parse(result) as KeywordAnalysis;
    } catch (error) {
      console.error('Error analyzing keyword usage:', error);
      throw new Error('Failed to analyze keyword usage');
    }
  }

  // Analyze content structure
  async analyzeStructure(content: string): Promise<StructureAnalysis> {
    try {
      // For structure analysis, we need the full content but may need to simplify it
      const contentChunks = await this.splitContent(content);
      
      // If there are multiple chunks, pass a simplified version for structure analysis
      const simplifiedContent = contentChunks.length > 2 
        ? contentChunks.map(chunk => chunk.substring(0, 500)).join('\n\n')
        : content;
      
      const result = await structureAnalysisChain.invoke({
        content: simplifiedContent,
      });
      
      return JSON.parse(result) as StructureAnalysis;
    } catch (error) {
      console.error('Error analyzing content structure:', error);
      throw new Error('Failed to analyze content structure');
    }
  }

  // Generate content suggestions
  async generateSuggestions(
    content: string, 
    keywords: string[], 
    analysis: { 
      readability?: ReadabilityAnalysis,
      keyword?: KeywordAnalysis,
      structure?: StructureAnalysis
    }
  ): Promise<ContentSuggestion[]> {
    try {
      const analysisText = JSON.stringify(analysis);
      const contentChunks = await this.splitContent(content);
      
      // Generate suggestions based on first part of content
      const result = await contentSuggestionsChain.invoke({
        content: contentChunks.slice(0, 2).join('\n\n'),
        keywords: keywords.join(', '),
        analysis: analysisText,
      });
      
      return JSON.parse(result) as ContentSuggestion[];
    } catch (error) {
      console.error('Error generating content suggestions:', error);
      throw new Error('Failed to generate content suggestions');
    }
  }

  // Generate topic cluster
  async generateTopicCluster(mainKeyword: string, existingTopics: string[] = []): Promise<TopicCluster> {
    try {
      const result = await topicClusterChain.invoke({
        main_keyword: mainKeyword,
        existing_topics: existingTopics.join(', '),
      });
      
      return JSON.parse(result) as TopicCluster;
    } catch (error) {
      console.error('Error generating topic cluster:', error);
      throw new Error('Failed to generate topic cluster');
    }
  }

  // Generate content brief
  async generateContentBrief(
    topic: string, 
    keywords: string[], 
    competitorInsights: string = ''
  ): Promise<ContentBrief> {
    try {
      const result = await contentBriefChain.invoke({
        topic,
        keywords: keywords.join(', '),
        competitor_insights: competitorInsights,
      });
      
      return JSON.parse(result) as ContentBrief;
    } catch (error) {
      console.error('Error generating content brief:', error);
      throw new Error('Failed to generate content brief');
    }
  }

  // Comprehensive content analysis
  async analyzeContent(content: string, keywords: string[]): Promise<{
    readability: ReadabilityAnalysis;
    keyword: KeywordAnalysis;
    structure: StructureAnalysis;
    suggestions: ContentSuggestion[];
  }> {
    // Perform all analyses in parallel
    const [readability, keyword, structure] = await Promise.all([
      this.analyzeReadability(content),
      this.analyzeKeywordUsage(content, keywords),
      this.analyzeStructure(content),
    ]);

    // Generate suggestions based on analyses
    const suggestions = await this.generateSuggestions(content, keywords, {
      readability,
      keyword,
      structure,
    });

    return {
      readability,
      keyword,
      structure,
      suggestions,
    };
  }

  /**
   * Analyze content for a specific keyword and provide comprehensive analysis
   */
  async analyzeContentForKeyword(content: string, keyword: string): Promise<ContentAnalysisResult> {
    try {
      const formattedPrompt = await this.contentAnalysisPrompt.format({
        content,
        keyword,
      });

      const response = await this.model.invoke(formattedPrompt);
      const responseText = response.content.toString();
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/```json\n([\s\S]*)\n```/) || 
                         responseText.match(/{[\s\S]*}/);
      
      const jsonContent = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;
      
      return JSON.parse(jsonContent);
    } catch (error) {
      console.error("Error analyzing content:", error);
      throw new Error("Failed to analyze content");
    }
  }

  /**
   * Optimize content for a given keyword with the specified optimization level
   */
  async optimizeContent(
    content: string, 
    keyword: string, 
    level: 'light' | 'medium' | 'high' = 'medium'
  ): Promise<OptimizedContentResult> {
    try {
      const formattedPrompt = await this.optimizeContentPrompt.format({
        content,
        keyword,
        level
      });

      const response = await this.model.invoke(formattedPrompt);
      const responseText = response.content.toString();
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/```json\n([\s\S]*)\n```/) || 
                         responseText.match(/{[\s\S]*}/);
      
      const jsonContent = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;
      
      return JSON.parse(jsonContent);
    } catch (error) {
      console.error("Error optimizing content:", error);
      throw new Error("Failed to optimize content");
    }
  }
} 