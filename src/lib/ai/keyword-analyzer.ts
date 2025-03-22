import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { z } from "zod";

// Initialize OpenAI model
const model = new ChatOpenAI({
  temperature: 0.7,
  modelName: "gpt-4",
});

// Define keyword research prompt
const keywordResearchPrompt = PromptTemplate.fromTemplate(`
You are an expert SEO keyword researcher. Analyze the following main keyword and generate related keywords, content ideas, and keyword clustering.

Main Keyword: {mainKeyword}
Industry/Niche: {industry}

Provide a comprehensive analysis with the following information:
1. Related long-tail keywords that would be valuable to target
2. Search intent analysis for the main keyword
3. Content topic ideas based on the keyword
4. Keyword clustering opportunities
5. Competition level assessment

Format your response as a JSON object with the following structure:
{
  "mainKeyword": "the main keyword",
  "relatedKeywords": [
    {"keyword": "related keyword 1", "searchVolume": "estimated monthly searches", "difficulty": "low/medium/high", "intent": "informational/transactional/navigational"},
    {"keyword": "related keyword 2", "searchVolume": "estimated monthly searches", "difficulty": "low/medium/high", "intent": "informational/transactional/navigational"}
  ],
  "contentIdeas": [
    {"title": "Potential content title 1", "format": "blog/guide/comparison", "topicRelevance": "high/medium/low"},
    {"title": "Potential content title 2", "format": "blog/guide/comparison", "topicRelevance": "high/medium/low"}
  ],
  "keywordClusters": [
    {"clusterName": "Cluster 1 name", "keywords": ["keyword1", "keyword2", "keyword3"]},
    {"clusterName": "Cluster 2 name", "keywords": ["keyword4", "keyword5", "keyword6"]}
  ],
  "competitionAnalysis": "Brief analysis of competition level and difficulty",
  "recommendedStrategy": "Strategic recommendations for targeting these keywords"
}
`);

// Define keyword competition analysis prompt
const keywordCompetitionPrompt = PromptTemplate.fromTemplate(`
You are an expert SEO competition analyst. Provide a detailed competition analysis for the following keywords in the specified industry.

Keywords: {keywords}
Industry/Niche: {industry}

Assess the competition landscape and provide insights on:
1. Difficulty level for each keyword
2. Top competing websites for these keywords
3. Content gaps and opportunities
4. Recommended approach for targeting these keywords

Format your response as a JSON object with the following structure:
{
  "keywords": ["keyword1", "keyword2", "..."],
  "competitionAnalysis": {
    "overallDifficulty": "low/medium/high",
    "keywordDifficulties": [
      {"keyword": "keyword1", "difficulty": "score 1-100", "explanation": "Why this difficulty score"}
    ],
    "topCompetitors": [
      {"domain": "competitor.com", "strengths": "What makes them rank well", "weaknesses": "Where they fall short"}
    ]
  },
  "contentGaps": [
    {"topic": "Underserved topic", "opportunity": "Why this is an opportunity", "suggestedAngle": "How to approach it"}
  ],
  "keywordTargetingStrategy": "Overall recommended strategy for targeting these keywords"
}
`);

// Define keyword trend analysis prompt
const keywordTrendPrompt = PromptTemplate.fromTemplate(`
You are an expert SEO trend analyst. Analyze the trend patterns for the following keyword in the specified industry.

Keyword: {keyword}
Industry/Niche: {industry}

Provide insights on:
1. Growth direction (rising, stable, declining)
2. Seasonal patterns if any
3. Emerging related terms
4. Future potential of this keyword

Format your response as a JSON object with the following structure:
{
  "keyword": "the analyzed keyword",
  "trendAnalysis": {
    "growthDirection": "rising/stable/declining",
    "growthRate": "percentage or qualitative assessment",
    "seasonality": {
      "hasSeasonal": true/false,
      "peakMonths": ["month1", "month2"],
      "lowMonths": ["month3", "month4"]
    }
  },
  "relatedEmergingTerms": [
    {"term": "emerging term 1", "growthRate": "fast/medium/slow", "relevance": "high/medium/low"},
    {"term": "emerging term 2", "growthRate": "fast/medium/slow", "relevance": "high/medium/low"}
  ],
  "futurePotential": "Assessment of future viability and potential",
  "recommendedAction": "Whether to invest in this keyword or not and why"
}
`);

// Define output schemas
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

export class KeywordAnalyzer {
  /**
   * Research a keyword to get related keywords, content ideas, and clustering opportunities
   */
  async researchKeyword(mainKeyword: string, industry: string): Promise<KeywordResearchResult> {
    try {
      // Create research chain
      const researchChain = RunnableSequence.from([
        keywordResearchPrompt,
        model,
        new StringOutputParser(),
        keywordResearchParser,
      ]);

      // Execute the chain
      const result = await researchChain.invoke({
        mainKeyword,
        industry,
      });

      return result;
    } catch (error: any) {
      console.error("Error researching keyword:", error);
      throw new Error(`Failed to research keyword: ${error.message}`);
    }
  }

  /**
   * Analyze competition for specified keywords
   */
  async analyzeCompetition(keywords: string[], industry: string): Promise<KeywordCompetitionResult> {
    try {
      // Create competition analysis chain
      const competitionChain = RunnableSequence.from([
        keywordCompetitionPrompt,
        model,
        new StringOutputParser(),
        keywordCompetitionParser,
      ]);

      // Execute the chain
      const result = await competitionChain.invoke({
        keywords: Array.isArray(keywords) ? keywords.join(", ") : keywords,
        industry,
      });

      return result;
    } catch (error: any) {
      console.error("Error analyzing keyword competition:", error);
      throw new Error(`Failed to analyze keyword competition: ${error.message}`);
    }
  }

  /**
   * Analyze trends for a keyword
   */
  async analyzeTrends(keyword: string, industry: string): Promise<KeywordTrendResult> {
    try {
      // Create trend analysis chain
      const trendChain = RunnableSequence.from([
        keywordTrendPrompt,
        model,
        new StringOutputParser(),
        keywordTrendParser,
      ]);

      // Execute the chain
      const result = await trendChain.invoke({
        keyword,
        industry,
      });

      return result;
    } catch (error: any) {
      console.error("Error analyzing keyword trends:", error);
      throw new Error(`Failed to analyze keyword trends: ${error.message}`);
    }
  }

  /**
   * Get comprehensive keyword analysis including research, competition, and trends
   */
  async getComprehensiveAnalysis(keyword: string, industry: string): Promise<{
    research: KeywordResearchResult;
    competition: KeywordCompetitionResult;
    trends: KeywordTrendResult;
  }> {
    try {
      // Run all analyses in parallel
      const [research, trends] = await Promise.all([
        this.researchKeyword(keyword, industry),
        this.analyzeTrends(keyword, industry),
      ]);

      // Extract related keywords for competition analysis
      const relatedKeywords = research.relatedKeywords.slice(0, 5).map(k => k.keyword);
      
      // Include main keyword in the competition analysis
      const keywordsToAnalyze = [keyword, ...relatedKeywords];

      // Run competition analysis with all keywords
      const competition = await this.analyzeCompetition(keywordsToAnalyze, industry);

      return {
        research,
        competition,
        trends,
      };
    } catch (error: any) {
      console.error("Error getting comprehensive keyword analysis:", error);
      throw new Error(`Failed to get comprehensive keyword analysis: ${error.message}`);
    }
  }
}

export default new KeywordAnalyzer(); 