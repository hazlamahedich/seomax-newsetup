import { ChatOpenAI } from 'langchain/chat_models/openai';
import { PromptTemplate } from 'langchain/prompts';
import { StringOutputParser } from 'langchain/schema/output_parser';
import { RunnableSequence } from 'langchain/schema/runnable';

// Initialize the AI model with OpenAI
const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-4',
  temperature: 0.1
});

const outputParser = new StringOutputParser();

// Prompt template for keyword research
const keywordResearchPrompt = PromptTemplate.fromTemplate(`
You are an expert SEO keyword researcher. Analyze the following main keyword and generate related keywords, content ideas, and keyword clusters:

MAIN KEYWORD: {keyword}
INDUSTRY/NICHE: {industry}

Return a JSON object with the following structure:
{
  "mainKeyword": "{keyword}",
  "relatedKeywords": [
    {"keyword": "<related_keyword_1>", "searchVolume": "<estimated_volume>", "difficulty": "<low|medium|high>"},
    {"keyword": "<related_keyword_2>", "searchVolume": "<estimated_volume>", "difficulty": "<low|medium|high>"},
    ...
  ],
  "contentIdeas": [
    {"title": "<content_idea_1>", "type": "<blog|guide|infographic|video>", "targetKeywords": ["<kw1>", "<kw2>"]},
    {"title": "<content_idea_2>", "type": "<blog|guide|infographic|video>", "targetKeywords": ["<kw1>", "<kw2>"]},
    ...
  ],
  "keywordClusters": [
    {"name": "<cluster_name_1>", "keywords": ["<kw1>", "<kw2>", "<kw3>"]},
    {"name": "<cluster_name_2>", "keywords": ["<kw1>", "<kw2>", "<kw3>"]},
    ...
  ],
  "analysis": "<brief_analysis_of_keyword_opportunity>"
}
`);

const keywordResearchChain = RunnableSequence.from([
  keywordResearchPrompt,
  model,
  outputParser,
]);

// Prompt template for keyword competition analysis
const keywordCompetitionPrompt = PromptTemplate.fromTemplate(`
You are an expert SEO competition analyst. Analyze the competitive landscape for the following keywords:

KEYWORDS: {keywords}
INDUSTRY/NICHE: {industry}

Return a JSON object with the following structure:
{
  "difficulty": "<overall_difficulty_assessment>",
  "topCompetitors": [
    {"domain": "<competitor_domain_1>", "strengths": ["<strength_1>", "<strength_2>"], "weaknesses": ["<weakness_1>", "<weakness_2>"]},
    {"domain": "<competitor_domain_2>", "strengths": ["<strength_1>", "<strength_2>"], "weaknesses": ["<weakness_1>", "<weakness_2>"]},
    ...
  ],
  "contentGaps": [
    "<content_gap_opportunity_1>",
    "<content_gap_opportunity_2>",
    ...
  ],
  "keywordTargetingStrategy": "<recommended_approach_for_targeting_these_keywords>",
  "difficultyByKeyword": [
    {"keyword": "<keyword_1>", "difficulty": "<low|medium|high>", "reason": "<brief_reason>"},
    {"keyword": "<keyword_2>", "difficulty": "<low|medium|high>", "reason": "<brief_reason>"},
    ...
  ]
}
`);

const keywordCompetitionChain = RunnableSequence.from([
  keywordCompetitionPrompt,
  model,
  outputParser,
]);

// Prompt template for keyword trend analysis
const keywordTrendPrompt = PromptTemplate.fromTemplate(`
You are an expert SEO trend analyst. Analyze the trends for the following keyword and industry:

KEYWORD: {keyword}
INDUSTRY/NICHE: {industry}

Return a JSON object with the following structure:
{
  "trendDirection": "<growing|stable|declining>",
  "seasonality": {
    "pattern": "<none|monthly|quarterly|annual>",
    "peakMonths": ["<month_1>", "<month_2>"],
    "lowMonths": ["<month_1>", "<month_2>"]
  },
  "emergingTerms": [
    {"term": "<emerging_term_1>", "relevance": "<high|medium|low>"},
    {"term": "<emerging_term_2>", "relevance": "<high|medium|low>"},
    ...
  ],
  "recommendedTiming": "<recommendation_for_when_to_target_this_keyword>",
  "analysis": "<brief_analysis_of_trend_observations>"
}
`);

const keywordTrendChain = RunnableSequence.from([
  keywordTrendPrompt,
  model,
  outputParser,
]);

// Interface for keyword research results
export interface KeywordResearchResult {
  mainKeyword: string;
  relatedKeywords: Array<{
    keyword: string;
    searchVolume: string;
    difficulty: 'low' | 'medium' | 'high';
  }>;
  contentIdeas: Array<{
    title: string;
    type: string;
    targetKeywords: string[];
  }>;
  keywordClusters: Array<{
    name: string;
    keywords: string[];
  }>;
  analysis: string;
}

// Interface for keyword competition analysis results
export interface KeywordCompetitionResult {
  difficulty: string;
  topCompetitors: Array<{
    domain: string;
    strengths: string[];
    weaknesses: string[];
  }>;
  contentGaps: string[];
  keywordTargetingStrategy: string;
  difficultyByKeyword: Array<{
    keyword: string;
    difficulty: 'low' | 'medium' | 'high';
    reason: string;
  }>;
}

// Interface for keyword trend analysis results
export interface KeywordTrendResult {
  trendDirection: 'growing' | 'stable' | 'declining';
  seasonality: {
    pattern: 'none' | 'monthly' | 'quarterly' | 'annual';
    peakMonths: string[];
    lowMonths: string[];
  };
  emergingTerms: Array<{
    term: string;
    relevance: 'high' | 'medium' | 'low';
  }>;
  recommendedTiming: string;
  analysis: string;
}

// Interface for comprehensive keyword analysis
export interface KeywordAnalysisResult {
  research: KeywordResearchResult;
  competition?: KeywordCompetitionResult;
  trends?: KeywordTrendResult;
}

/**
 * KeywordAnalyzer class for analyzing and researching keywords
 */
export class KeywordAnalyzer {
  private model: ChatOpenAI;

  constructor() {
    this.model = model;
  }

  /**
   * Research keywords related to a main keyword
   */
  async researchKeywords(keyword: string, industry: string): Promise<KeywordResearchResult> {
    try {
      const prompt = await keywordResearchPrompt.format({ keyword, industry });
      const response = await this.model.invoke(prompt);
      
      // Parse the JSON response
      let data;
      try {
        const jsonMatch = response.content.toString().match(/({[\s\S]*})/);
        data = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch (e) {
        console.error('Failed to parse keyword research response:', e);
        throw new Error('Failed to parse AI response for keyword research');
      }
      
      if (!data) {
        throw new Error('Invalid response format from keyword research');
      }
      
      return {
        mainKeyword: data.mainKeyword || keyword,
        relatedKeywords: data.relatedKeywords || [],
        contentIdeas: data.contentIdeas || [],
        keywordClusters: data.keywordClusters || [],
        analysis: data.analysis || ''
      };
    } catch (error) {
      console.error('Error researching keywords:', error);
      throw error;
    }
  }

  /**
   * Analyze competition for a set of keywords
   */
  async analyzeCompetition(keywords: string[], industry: string): Promise<KeywordCompetitionResult> {
    try {
      const prompt = await keywordCompetitionPrompt.format({ 
        keywords: keywords.join(', '), 
        industry 
      });
      const response = await this.model.invoke(prompt);
      
      // Parse the JSON response
      let data;
      try {
        const jsonMatch = response.content.toString().match(/({[\s\S]*})/);
        data = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch (e) {
        console.error('Failed to parse keyword competition response:', e);
        throw new Error('Failed to parse AI response for keyword competition analysis');
      }
      
      if (!data) {
        throw new Error('Invalid response format from keyword competition analysis');
      }
      
      return {
        difficulty: data.difficulty || 'medium',
        topCompetitors: data.topCompetitors || [],
        contentGaps: data.contentGaps || [],
        keywordTargetingStrategy: data.keywordTargetingStrategy || '',
        difficultyByKeyword: data.difficultyByKeyword || []
      };
    } catch (error) {
      console.error('Error analyzing keyword competition:', error);
      throw error;
    }
  }

  /**
   * Analyze trends for a keyword
   */
  async analyzeTrends(keyword: string, industry: string): Promise<KeywordTrendResult> {
    try {
      const prompt = await keywordTrendPrompt.format({ keyword, industry });
      const response = await this.model.invoke(prompt);
      
      // Parse the JSON response
      let data;
      try {
        const jsonMatch = response.content.toString().match(/({[\s\S]*})/);
        data = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch (e) {
        console.error('Failed to parse keyword trend response:', e);
        throw new Error('Failed to parse AI response for keyword trend analysis');
      }
      
      if (!data) {
        throw new Error('Invalid response format from keyword trend analysis');
      }
      
      return {
        trendDirection: data.trendDirection || 'stable',
        seasonality: data.seasonality || {
          pattern: 'none',
          peakMonths: [],
          lowMonths: []
        },
        emergingTerms: data.emergingTerms || [],
        recommendedTiming: data.recommendedTiming || '',
        analysis: data.analysis || ''
      };
    } catch (error) {
      console.error('Error analyzing keyword trends:', error);
      throw error;
    }
  }

  /**
   * Get a comprehensive analysis for a keyword
   */
  async getComprehensiveAnalysis(keyword: string, industry: string): Promise<KeywordAnalysisResult> {
    try {
      // First get the research results
      const research = await this.researchKeywords(keyword, industry);
      
      // Get just the keyword strings from the related keywords
      const relatedKeywordStrings = research.relatedKeywords.map(k => k.keyword);
      
      // Adding the main keyword to the list
      const allKeywords = [keyword, ...relatedKeywordStrings.slice(0, 4)];
      
      // Analyze competition for the main keyword and top related keywords
      const competition = await this.analyzeCompetition(allKeywords, industry);
      
      // Analyze trends for the main keyword
      const trends = await this.analyzeTrends(keyword, industry);
      
      return {
        research,
        competition,
        trends
      };
    } catch (error: any) {
      console.error('Error getting comprehensive keyword analysis:', error);
      // Return just the research if other analyses fail
      if (error.research) {
        return {
          research: error.research
        };
      }
      throw error;
    }
  }
}

export default new KeywordAnalyzer(); 