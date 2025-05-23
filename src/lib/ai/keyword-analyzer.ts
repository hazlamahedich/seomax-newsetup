import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";
import { liteLLMProvider } from "./litellm-provider";

// Create a utility logger for the module
const logger = {
  info: (message: string, data?: any) => {
    console.log(`[KeywordAnalyzer] ${message}`, data ? data : '');
  },
  warn: (message: string, data?: any) => {
    console.warn(`[KeywordAnalyzer] WARNING: ${message}`, data ? data : '');
  },
  error: (message: string, error: any) => {
    console.error(`[KeywordAnalyzer] ${message}`, error);
    console.error(`[KeywordAnalyzer] Error stack:`, error?.stack || 'No stack trace available');
  },
  debug: (message: string, data?: any) => {
    console.log(`[KeywordAnalyzer:DEBUG] ${message}`, data ? data : '');
  }
};

// Define output interfaces
export interface KeywordResearchResult {
  mainKeyword: string;
  relatedKeywords: Array<{
    keyword: string;
    searchVolume: string;
    difficulty: string;
    intent: string;
  }>;
  contentIdeas: Array<{
    title: string;
    format: string;
    topicRelevance: string;
  }>;
  keywordClusters: Array<{
    clusterName: string;
    keywords: string[];
  }>;
  competitionAnalysis: string;
  recommendedStrategy: string;
}

export interface KeywordCompetitionResult {
  keywords: string[];
  competitionAnalysis: {
    overallDifficulty: string;
    keywordDifficulties: Array<{
      keyword: string;
      difficulty: string;
      explanation: string;
    }>;
    topCompetitors: Array<{
      domain: string;
      strengths: string;
      weaknesses: string;
    }>;
  };
  contentGaps: Array<{
    topic: string;
    opportunity: string;
    suggestedAngle: string;
  }>;
  keywordTargetingStrategy: string;
}

export interface KeywordTrendResult {
  keyword: string;
  trendAnalysis: {
    growthDirection: string;
    growthRate: string;
    seasonality: {
      hasSeasonal: boolean;
      peakMonths: string[];
      lowMonths: string[];
    };
  };
  relatedEmergingTerms: Array<{
    term: string;
    growthRate: string;
    relevance: string;
  }>;
  futurePotential: string;
  recommendedAction: string;
}

// Define Zod schemas for validation
const keywordResearchSchema = z.object({
  mainKeyword: z.string(),
  relatedKeywords: z.array(
    z.object({
      keyword: z.string(),
      searchVolume: z.string(),
      difficulty: z.string(),
      intent: z.string(),
    })
  ),
  contentIdeas: z.array(
    z.object({
      title: z.string(),
      format: z.string(),
      topicRelevance: z.string(),
    })
  ),
  keywordClusters: z.array(
    z.object({
      clusterName: z.string(),
      keywords: z.array(z.string()),
    })
  ),
  competitionAnalysis: z.string(),
  recommendedStrategy: z.string(),
});

const keywordCompetitionSchema = z.object({
  keywords: z.array(z.string()),
  competitionAnalysis: z.object({
    overallDifficulty: z.string(),
    keywordDifficulties: z.array(
      z.object({
        keyword: z.string(),
        difficulty: z.string(),
        explanation: z.string(),
      })
    ),
    topCompetitors: z.array(
      z.object({
        domain: z.string(),
        strengths: z.string(),
        weaknesses: z.string(),
      })
    ),
  }),
  contentGaps: z.array(
    z.object({
      topic: z.string(),
      opportunity: z.string(),
      suggestedAngle: z.string(),
    })
  ),
  keywordTargetingStrategy: z.string(),
});

const keywordTrendSchema = z.object({
  keyword: z.string(),
  trendAnalysis: z.object({
    growthDirection: z.string(),
    growthRate: z.string(),
    seasonality: z.object({
      hasSeasonal: z.boolean(),
      peakMonths: z.array(z.string()),
      lowMonths: z.array(z.string()),
    }),
  }),
  relatedEmergingTerms: z.array(
    z.object({
      term: z.string(),
      growthRate: z.string(),
      relevance: z.string(),
    })
  ),
  futurePotential: z.string(),
  recommendedAction: z.string(),
});

// Create output parsers
const keywordResearchParser = StructuredOutputParser.fromZodSchema(keywordResearchSchema);
const keywordCompetitionParser = StructuredOutputParser.fromZodSchema(keywordCompetitionSchema);
const keywordTrendParser = StructuredOutputParser.fromZodSchema(keywordTrendSchema);

/**
 * KeywordAnalyzer class provides methods for analyzing keywords
 * using the LiteLLMProvider for consistent LLM interaction
 */
export class KeywordAnalyzer {
  /**
   * Research a main keyword and get related keywords, content ideas, and keyword clusters
   * 
   * @param mainKeyword The primary keyword to research
   * @param industry The industry or niche context
   * @returns Structured keyword research results
   */
  static async researchKeyword(
    mainKeyword: string, 
    industry: string
  ): Promise<KeywordResearchResult> {
    logger.info(`Starting keyword research for "${mainKeyword}" in "${industry}" industry`);
    
    try {
      // Get model from centralized provider
      const model = liteLLMProvider.getLangChainModel();
      logger.info(`Using model: ${model.modelName}`);
      
      // Define research prompt
      const researchPrompt = PromptTemplate.fromTemplate(`
        You are an expert SEO keyword researcher. Analyze the following main keyword and generate related keywords, content ideas, and keyword clustering.
        
        Main Keyword: {mainKeyword}
        Industry/Niche: {industry}
        
        Provide a comprehensive analysis with the following information:
        1. Related long-tail keywords that would be valuable to target
        2. Search intent analysis for the main keyword
        3. Content topic ideas based on the keyword
        4. Keyword clustering opportunities
        5. Competition level assessment
        
        Format your response as a detailed JSON object that matches exactly this structure:
        - mainKeyword: the main keyword string
        - relatedKeywords: array of objects with properties [keyword, searchVolume, difficulty, intent]
        - contentIdeas: array of objects with properties [title, format, topicRelevance]
        - keywordClusters: array of objects with properties [clusterName, keywords array]
        - competitionAnalysis: string with brief analysis
        - recommendedStrategy: string with strategic recommendations
      `);
      
      // Create the chain
      const chain = RunnableSequence.from([
        researchPrompt,
        model,
        keywordResearchParser
      ]);
      
      // Execute the chain
      logger.info("Executing keyword research chain");
      const result = await chain.invoke({
        mainKeyword,
        industry
      });
      
      logger.info("Keyword research completed successfully");
      return result as KeywordResearchResult;
    } catch (error) {
      logger.error("Error during keyword research:", error);
      
      // Provide a fallback result if we can't get the real analysis
      if (process.env.NODE_ENV === 'development') {
        logger.warn("Returning fallback keyword research result for development");
        return {
          mainKeyword,
          relatedKeywords: [
            { keyword: `${mainKeyword} guide`, searchVolume: "unknown", difficulty: "medium", intent: "informational" },
            { keyword: `${mainKeyword} examples`, searchVolume: "unknown", difficulty: "low", intent: "informational" }
          ],
          contentIdeas: [
            { title: `Complete Guide to ${mainKeyword}`, format: "guide", topicRelevance: "high" }
          ],
          keywordClusters: [
            { clusterName: "Basic Information", keywords: [`what is ${mainKeyword}`, `${mainKeyword} definition`] }
          ],
          competitionAnalysis: "Unable to analyze competition due to error.",
          recommendedStrategy: "Try a more specific keyword for better analysis."
        };
      }
      
      throw new Error(`Keyword research failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Analyze competition for a set of keywords
   * 
   * @param keywords Array of keywords to analyze
   * @param industry The industry or niche context
   * @returns Structured competition analysis results
   */
  static async analyzeCompetition(
    keywords: string[], 
    industry: string
  ): Promise<KeywordCompetitionResult> {
    logger.info(`Starting competition analysis for [${keywords.join(", ")}] in "${industry}" industry`);
    
    try {
      // Get model from centralized provider
      const model = liteLLMProvider.getLangChainModel();
      logger.info(`Using model: ${model.modelName}`);
      
      // Define competition analysis prompt
      const competitionPrompt = PromptTemplate.fromTemplate(`
        You are an expert SEO competition analyst. Provide a detailed competition analysis for the following keywords in the specified industry.
        
        Keywords: {keywords}
        Industry/Niche: {industry}
        
        Assess the competition landscape and provide insights on:
        1. Difficulty level for each keyword
        2. Top competing websites for these keywords
        3. Content gaps and opportunities
        4. Recommended approach for targeting these keywords
        
        Format your response as a detailed JSON object that matches exactly this structure:
        - keywords: array of keyword strings
        - competitionAnalysis: object with properties [overallDifficulty, keywordDifficulties array, topCompetitors array]
        - contentGaps: array of objects with properties [topic, opportunity, suggestedAngle]
        - keywordTargetingStrategy: string with overall strategy
      `);
      
      // Create the chain
      const chain = RunnableSequence.from([
        competitionPrompt,
        model,
        keywordCompetitionParser
      ]);
      
      // Execute the chain
      logger.info("Executing competition analysis chain");
      const result = await chain.invoke({
        keywords: keywords.join(", "),
        industry
      });
      
      logger.info("Competition analysis completed successfully");
      return result as KeywordCompetitionResult;
    } catch (error) {
      logger.error("Error during competition analysis:", error);
      
      // Provide a fallback result if we can't get the real analysis
      if (process.env.NODE_ENV === 'development') {
        logger.warn("Returning fallback competition result for development");
        return {
          keywords,
          competitionAnalysis: {
            overallDifficulty: "medium",
            keywordDifficulties: keywords.map(kw => ({
              keyword: kw,
              difficulty: "50",
              explanation: "Estimated difficulty score based on general industry trends."
            })),
            topCompetitors: [
              { domain: "example.com", strengths: "Strong domain authority", weaknesses: "Limited content depth" }
            ]
          },
          contentGaps: [
            { topic: "Beginner's guides", opportunity: "Underserved content type", suggestedAngle: "Create comprehensive guides for beginners" }
          ],
          keywordTargetingStrategy: "Unable to provide complete strategy due to analysis error."
        };
      }
      
      throw new Error(`Competition analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Analyze trends for a keyword
   * 
   * @param keyword The keyword to analyze trends for
   * @param industry The industry or niche context
   * @returns Structured trend analysis results
   */
  static async analyzeTrends(
    keyword: string, 
    industry: string
  ): Promise<KeywordTrendResult> {
    logger.info(`Starting trend analysis for "${keyword}" in "${industry}" industry`);
    
    try {
      // Get model from centralized provider
      const model = liteLLMProvider.getLangChainModel();
      logger.info(`Using model: ${model.modelName}`);
      
      // Define trend analysis prompt
      const trendPrompt = PromptTemplate.fromTemplate(`
        You are an expert SEO trend analyst. Analyze the trend patterns for the following keyword in the specified industry.
        
        Keyword: {keyword}
        Industry/Niche: {industry}
        
        Provide insights on:
        1. Growth direction (rising, stable, declining)
        2. Seasonal patterns if any
        3. Future potential for this keyword
        4. Related keywords that are trending
        
        Format your response as a detailed JSON object that matches exactly this structure:
        - keyword: the analyzed keyword string
        - trendAnalysis: object with properties [growthDirection, growthRate, seasonality object]
        - relatedEmergingTerms: array of objects with properties [term, growthRate, relevance]
        - futurePotential: string assessment of potential
        - recommendedAction: string with strategic recommendations
      `);
      
      // Create the chain
      const chain = RunnableSequence.from([
        trendPrompt,
        model,
        keywordTrendParser
      ]);
      
      // Execute the chain
      logger.info("Executing trend analysis chain");
      const result = await chain.invoke({
        keyword,
        industry
      });
      
      logger.info("Trend analysis completed successfully");
      return result as KeywordTrendResult;
    } catch (error) {
      logger.error("Error during trend analysis:", error);
      
      // Provide a fallback result if we can't get the real analysis
      if (process.env.NODE_ENV === 'development') {
        logger.warn("Returning fallback trend result for development");
        return {
          keyword,
          trendAnalysis: {
            growthDirection: "stable",
            growthRate: "minimal change",
            seasonality: {
              hasSeasonal: false,
              peakMonths: [],
              lowMonths: []
            }
          },
          relatedEmergingTerms: [
            { term: `${keyword} 2023`, growthRate: "medium", relevance: "medium" }
          ],
          futurePotential: "Unable to accurately assess future potential due to analysis error.",
          recommendedAction: "Monitor keyword manually for more accurate assessment."
        };
      }
      
      throw new Error(`Trend analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Get comprehensive analysis including research, competition, and trends
   * 
   * @param keyword The keyword to analyze
   * @param industry The industry or niche context
   * @returns Combined analysis results
   */
  static async getComprehensiveAnalysis(
    keyword: string, 
    industry: string
  ): Promise<{
    research: KeywordResearchResult;
    competition: KeywordCompetitionResult;
    trends: KeywordTrendResult;
  }> {
    logger.info(`Starting comprehensive analysis for "${keyword}" in "${industry}" industry`);
    
    try {
      // Run all three analyses in parallel for efficiency
      const [research, competition, trends] = await Promise.all([
        this.researchKeyword(keyword, industry),
        this.analyzeCompetition([keyword], industry),
        this.analyzeTrends(keyword, industry)
      ]);
      
      logger.info("Comprehensive analysis completed successfully");
      return {
        research,
        competition,
        trends
      };
    } catch (error) {
      logger.error("Error during comprehensive analysis:", error);
      throw new Error(`Comprehensive analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Export a default instance for backward compatibility
export default KeywordAnalyzer; 