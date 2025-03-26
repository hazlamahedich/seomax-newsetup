import { createClient } from '@/lib/supabase/client';
import { liteLLMProvider } from '@/lib/ai/litellm-provider';
import { createHash } from 'crypto';

export interface SEOIssue {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  url: string;
  details?: string;
}

export interface ContentAnalysisResult {
  score: number;
  issues: SEOIssue[];
  recommendations: string[];
}

export interface ContentAnalysisOptions {
  checkReadability?: boolean;
  checkKeywords?: boolean;
  checkStructure?: boolean;
}

export interface ReadabilityAnalysis {
  readability_score: number;
  reading_level: string;
  sentence_complexity: string;
  vocabulary_level: string;
  passive_voice_percentage: number;
  improvement_areas: string[];
  analysis_summary: string;
}

export interface KeywordAnalysis {
  keyword_density: Record<string, number>;
  keyword_distribution: string;
  primary_keyword_usage: number;
  secondary_keyword_usage: number[];
  keyword_in_title: boolean;
  keyword_in_headings: number;
  keyword_in_first_paragraph: boolean;
  improvement_areas: string[];
  optimization_score?: number;
  related_keywords?: string[];
  keyword_placement?: Record<string, boolean>;
  analysis_summary?: string;
  recommendations?: string[];
}

export interface StructureAnalysis {
  heading_structure: string;
  heading_count: Record<string, number>;
  paragraph_count: number;
  average_paragraph_length: number;
  list_count: number;
  image_count: number;
  structure_score: number;
  improvement_areas: string[];
}

export class ContentAnalyzerService {
  private static supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );

  /**
   * Analyze content and return comprehensive analysis
   */
  static async analyzeContent(
    crawlId: string,
    siteUrl: string,
    options: ContentAnalysisOptions = {}
  ): Promise<ContentAnalysisResult> {
    // Implementation
    return {
      score: 0,
      issues: [],
      recommendations: []
    };
  }

  /**
   * Analyze the readability of content
   */
  static async analyzeReadability(content: string): Promise<ReadabilityAnalysis> {
    try {
      // Use LLM for comprehensive readability analysis
      const prompt = `
        Analyze the following text for readability. Provide a JSON response with these fields:
        - readabilityScore: number from 0-100
        - readingLevel: string (Elementary, Middle School, High School, College, Graduate)
        - sentenceComplexity: string (Simple, Moderate, Complex)
        - vocabularyLevel: string (Basic, Intermediate, Advanced)
        - passiveVoicePercentage: number (estimate percentage of passive voice sentences)
        - improvementAreas: array of strings with specific suggestions
        - analysisSummary: one paragraph summary of the analysis

        Content to analyze:
        ${content.substring(0, 3000)} // Limit to 3000 chars to avoid token limits
      `;
      
      // Replace chat with callLLM method
      const response = await liteLLMProvider.callLLM(prompt);
      
      const responseText = response?.choices?.[0]?.message?.content || '';
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid LLM response format');
      }
      
      const analysisData = JSON.parse(jsonMatch[0]);
      
      // Convert to snake_case for UI component compatibility
      return {
        readability_score: analysisData.readabilityScore,
        reading_level: analysisData.readingLevel,
        sentence_complexity: analysisData.sentenceComplexity,
        vocabulary_level: analysisData.vocabularyLevel,
        passive_voice_percentage: analysisData.passiveVoicePercentage,
        improvement_areas: analysisData.improvementAreas,
        analysis_summary: analysisData.analysisSummary
      };
    } catch (error) {
      console.error('Error analyzing readability:', error);
      // Return fallback analysis with snake_case properties
      return {
        readability_score: 50,
        reading_level: 'High School',
        sentence_complexity: 'Moderate',
        vocabulary_level: 'Intermediate',
        passive_voice_percentage: 20,
        improvement_areas: ['Consider analyzing the content with a different tool'],
        analysis_summary: 'Analysis could not be completed successfully.'
      };
    }
  }

  /**
   * Analyze keyword usage in content
   */
  static async analyzeKeywords(
    content: string, 
    title: string,
    targetKeywords?: string[]
  ): Promise<KeywordAnalysis> {
    try {
      // Normalize content for analysis
      const normalizedContent = content.toLowerCase();
      const normalizedTitle = title.toLowerCase();
      
      // If no target keywords provided, extract potential keywords
      let keywordsToAnalyze = targetKeywords || await this.extractKeywords(content, title);
      
      if (!keywordsToAnalyze || keywordsToAnalyze.length === 0) {
        // Instead of throwing error, use default placeholder keywords
        console.warn('No keywords available for analysis, using placeholder keywords');
        // Extract simple placeholder keywords from the title
        keywordsToAnalyze = title.toLowerCase().split(/\s+/).filter(word => 
          word.length > 3 && !['with', 'that', 'this', 'from', 'them', 'they', 'have', 'were'].includes(word)
        );
        
        // If still no keywords, use generic defaults
        if (keywordsToAnalyze.length === 0) {
          keywordsToAnalyze = ['content', 'analysis'];
        }
      }
      
      // Get the primary keyword (first one)
      const primaryKeyword = keywordsToAnalyze[0].toLowerCase();
      
      // Calculate keyword density for all keywords
      const keywordDensity: Record<string, number> = {};
      const totalWords = normalizedContent.split(/\s+/).length;
      
      for (const keyword of keywordsToAnalyze) {
        const normalizedKeyword = keyword.toLowerCase();
        const regex = new RegExp(`\\b${normalizedKeyword}\\b`, 'gi');
        const matches = normalizedContent.match(regex) || [];
        const occurrences = matches.length;
        
        keywordDensity[keyword] = +(occurrences / totalWords * 100).toFixed(2);
      }
      
      // Check keyword in title
      const keywordInTitle = normalizedTitle.includes(primaryKeyword);
      
      // Split content into sections to check distribution
      const contentSections = this.splitContentIntoSections(normalizedContent);
      let keywordDistribution = 'uneven';
      
      if (contentSections.length > 0) {
        // Check how evenly the primary keyword is distributed
        const primaryKeywordRegex = new RegExp(`\\b${primaryKeyword}\\b`, 'gi');
        const sectionMatches = contentSections.map(section => {
          const matches = section.match(primaryKeywordRegex) || [];
          return matches.length;
        });
        
        // Check if keyword appears in at least 70% of sections
        const sectionsWithKeyword = sectionMatches.filter(count => count > 0).length;
        if (sectionsWithKeyword / contentSections.length >= 0.7) {
          keywordDistribution = 'even';
        } else if (sectionsWithKeyword / contentSections.length >= 0.4) {
          keywordDistribution = 'somewhat even';
        }
      }
      
      // Check keyword in headings
      const headingMatches = this.extractHeadings(content).filter(
        heading => heading.toLowerCase().includes(primaryKeyword)
      );
      const keywordInHeadings = headingMatches.length;
      
      // Check keyword in first paragraph
      const paragraphs = this.extractParagraphs(content);
      const keywordInFirstParagraph = paragraphs.length > 0 && 
        paragraphs[0].toLowerCase().includes(primaryKeyword);
      
      // Calculate usage of primary keyword
      const primaryKeywordRegex = new RegExp(`\\b${primaryKeyword}\\b`, 'gi');
      const primaryMatches = normalizedContent.match(primaryKeywordRegex) || [];
      const primaryKeywordUsage = primaryMatches.length;
      
      // Calculate usage of secondary keywords
      const secondaryKeywordUsage = keywordsToAnalyze.slice(1).map(keyword => {
        const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'gi');
        const matches = normalizedContent.match(regex) || [];
        return matches.length;
      });
      
      // Generate improvement areas
      const improvementAreas: string[] = [];
      
      if (!keywordInTitle) {
        improvementAreas.push(`Add the primary keyword "${keywordsToAnalyze[0]}" to the title`);
      }
      
      if (keywordInHeadings === 0) {
        improvementAreas.push(`Include the primary keyword "${keywordsToAnalyze[0]}" in at least one heading`);
      }
      
      if (!keywordInFirstParagraph) {
        improvementAreas.push(`Include the primary keyword "${keywordsToAnalyze[0]}" in the first paragraph`);
      }
      
      if (keywordDistribution === 'uneven') {
        improvementAreas.push('Distribute the primary keyword more evenly throughout the content');
      }
      
      // Calculate optimization score
      const optimizationScore = this.calculateKeywordScore({
        keyword_density: keywordDensity,
        keyword_distribution: keywordDistribution,
        primary_keyword_usage: primaryKeywordUsage,
        secondary_keyword_usage: secondaryKeywordUsage,
        keyword_in_title: keywordInTitle,
        keyword_in_headings: keywordInHeadings,
        keyword_in_first_paragraph: keywordInFirstParagraph,
        improvement_areas: improvementAreas
      });
      
      // Generate related keywords (use the remaining keywords in the list)
      const relatedKeywords = keywordsToAnalyze.slice(1);
      
      // Create keyword placement information
      const keywordPlacement = {
        title: keywordInTitle,
        headings: keywordInHeadings > 0,
        first_paragraph: keywordInFirstParagraph,
        body: primaryKeywordUsage > 0
      };
      
      return {
        keyword_density: keywordDensity,
        keyword_distribution: keywordDistribution,
        primary_keyword_usage: primaryKeywordUsage,
        secondary_keyword_usage: secondaryKeywordUsage,
        keyword_in_title: keywordInTitle,
        keyword_in_headings: keywordInHeadings,
        keyword_in_first_paragraph: keywordInFirstParagraph,
        improvement_areas: improvementAreas,
        optimization_score: optimizationScore,
        related_keywords: relatedKeywords,
        keyword_placement: keywordPlacement,
        analysis_summary: `Content contains ${primaryKeywordUsage} instances of the primary keyword. Overall keyword optimization score: ${optimizationScore}/100.`,
        recommendations: improvementAreas
      };
    } catch (error) {
      console.error('Error analyzing keywords:', error);
      // Return fallback analysis
      return {
        keyword_density: {},
        keyword_distribution: 'even',
        primary_keyword_usage: 0,
        secondary_keyword_usage: [],
        keyword_in_title: false,
        keyword_in_headings: 0,
        keyword_in_first_paragraph: false,
        improvement_areas: ['Keyword analysis could not be completed'],
        optimization_score: 0,
        analysis_summary: 'Analysis could not be completed successfully.',
        recommendations: ['Consider using a different tool for keyword analysis']
      };
    }
  }

  /**
   * Analyze content structure
   */
  static async analyzeStructure(content: string): Promise<StructureAnalysis> {
    try {
      // Extract structural elements
      const headings = this.extractHeadings(content);
      const paragraphs = this.extractParagraphs(content);
      const lists = this.extractLists(content);
      const images = this.extractImages(content);
      
      // Count headings by level
      const headingCount: Record<string, number> = {
        h1: 0,
        h2: 0,
        h3: 0,
        h4: 0,
        h5: 0,
        h6: 0
      };
      
      const headingRegex = /<h([1-6]).*?>(.*?)<\/h\1>/gi;
      let match;
      while ((match = headingRegex.exec(content)) !== null) {
        const level = match[1];
        headingCount[`h${level}`]++;
      }
      
      // Calculate average paragraph length
      const totalParagraphWords = paragraphs.reduce((total, paragraph) => {
        return total + paragraph.split(/\s+/).length;
      }, 0);
      
      const averageParagraphLength = paragraphs.length > 0 ? 
        Math.round(totalParagraphWords / paragraphs.length) : 0;
      
      // Analyze heading structure
      let headingStructure = 'well-structured';
      const improvementAreas: string[] = [];
      
      // Check if H1 is used only once
      if (headingCount.h1 === 0) {
        improvementAreas.push('Add an H1 heading to your content');
        headingStructure = 'needs-improvement';
      } else if (headingCount.h1 > 1) {
        improvementAreas.push('Use only one H1 heading per page');
        headingStructure = 'needs-improvement';
      }
      
      // Check for proper heading hierarchy
      if (headingCount.h3 > 0 && headingCount.h2 === 0) {
        improvementAreas.push('Fix heading hierarchy: H3 used without H2');
        headingStructure = 'needs-improvement';
      }
      
      if (headingCount.h4 > 0 && headingCount.h3 === 0) {
        improvementAreas.push('Fix heading hierarchy: H4 used without H3');
        headingStructure = 'needs-improvement';
      }
      
      // Check paragraph length
      if (averageParagraphLength > 100) {
        improvementAreas.push('Break up long paragraphs for better readability');
      } else if (averageParagraphLength < 20 && paragraphs.length > 10) {
        improvementAreas.push('Consider combining some very short paragraphs');
      }
      
      // Check for lists and images
      if (lists.length === 0 && content.length > 1000) {
        improvementAreas.push('Add bulleted or numbered lists to break up content');
      }
      
      if (images.length === 0 && content.length > 1000) {
        improvementAreas.push('Add images to enhance your content');
      }
      
      // Calculate structure score
      let structureScore = 100;
      
      // Deduct for each improvement area
      structureScore -= improvementAreas.length * 10;
      
      // Deduct for poor heading structure
      if (headingStructure === 'needs-improvement') {
        structureScore -= 15;
      }
      
      // Ensure score stays within 0-100
      structureScore = Math.max(0, Math.min(100, structureScore));
      
      return {
        heading_structure: headingStructure,
        heading_count: headingCount,
        paragraph_count: paragraphs.length,
        average_paragraph_length: averageParagraphLength,
        list_count: lists.length,
        image_count: images.length,
        structure_score: structureScore,
        improvement_areas: improvementAreas
      };
    } catch (error) {
      console.error('Error analyzing structure:', error);
      // Return fallback analysis
      return {
        heading_structure: 'unknown',
        heading_count: { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 },
        paragraph_count: 0,
        average_paragraph_length: 0,
        list_count: 0,
        image_count: 0,
        structure_score: 50,
        improvement_areas: ['Structure analysis could not be completed']
      };
    }
  }

  /**
   * Calculate overall content score
   */
  private static calculateContentScore(
    readabilityAnalysis: ReadabilityAnalysis,
    keywordAnalysis: KeywordAnalysis,
    structureAnalysis: StructureAnalysis
  ): number {
    // Define weights for each component
    const readabilityWeight = 0.4;
    const keywordWeight = 0.4;
    const structureWeight = 0.2;
    
    // Get the keyword optimization score or calculate it if not available
    const keywordScore = keywordAnalysis.optimization_score ?? 
      this.calculateKeywordScore(keywordAnalysis);
    
    // Calculate weighted score
    const weightedScore = 
      (readabilityAnalysis.readability_score * readabilityWeight) +
      (keywordScore * keywordWeight) +
      (structureAnalysis.structure_score * structureWeight);
    
    // Ensure final score is in 0-100 range
    return Math.max(0, Math.min(100, Math.round(weightedScore)));
  }

  /**
   * Calculate keyword score based on keyword analysis
   */
  private static calculateKeywordScore(keywordAnalysis: KeywordAnalysis): number {
    let score = 100;
    
    // Check if keyword is in strategic places
    if (!keywordAnalysis.keyword_in_title) score -= 20;
    if (keywordAnalysis.keyword_in_headings === 0) score -= 15;
    if (!keywordAnalysis.keyword_in_first_paragraph) score -= 15;
    
    // Check keyword distribution
    if (keywordAnalysis.keyword_distribution === 'uneven') score -= 15;
    else if (keywordAnalysis.keyword_distribution === 'somewhat even') score -= 5;
    
    // Deduct points for each improvement needed
    score -= keywordAnalysis.improvement_areas.length * 5;
    
    // Ensure score is in valid range
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate content recommendations
   */
  private static generateRecommendations(
    readabilityAnalysis: ReadabilityAnalysis,
    keywordAnalysis: KeywordAnalysis,
    structureAnalysis: StructureAnalysis
  ): string[] {
    const recommendations: string[] = [];
    
    // Add all improvement areas
    recommendations.push(...readabilityAnalysis.improvement_areas);
    recommendations.push(...keywordAnalysis.improvement_areas);
    recommendations.push(...structureAnalysis.improvement_areas);
    
    // Remove duplicates
    return [...new Set(recommendations)];
  }

  /**
   * Format analysis result from database record
   */
  private static formatAnalysisResult(contentId: string, analysis: any): ContentAnalysisResult {
    console.log('Formatting analysis result from database:', analysis);
    console.log('Analysis result structure:', JSON.stringify(analysis.result, null, 2));
    
    // Check if analysis has correct structure
    if (!analysis.result) {
      console.error('Analysis result is missing or malformed:', analysis);
      // Provide fallback
      return {
        score: 0,
        issues: [],
        recommendations: ['Unable to parse analysis result']
      };
    }
    
    return {
      score: analysis.result.content_score,
      issues: [],
      recommendations: analysis.result.recommendations
    };
  }

  /**
   * Split content into sections for distribution analysis
   */
  private static splitContentIntoSections(content: string, sectionCount = 5): string[] {
    // Split content into roughly equal sections
    const words = content.split(/\s+/);
    const wordsPerSection = Math.ceil(words.length / sectionCount);
    const sections = [];
    
    for (let i = 0; i < words.length; i += wordsPerSection) {
      sections.push(words.slice(i, i + wordsPerSection).join(' '));
    }
    
    return sections;
  }

  /**
   * Extract keywords from content if not provided
   */
  private static async extractKeywords(content: string, title: string): Promise<string[]> {
    try {
      const prompt = `
        Analyze the following content and title. Extract the 5 most important SEO keywords or phrases.
        Return them as a JSON array of strings, sorted by importance.
        
        Title: ${title}
        
        Content excerpt:
        ${content.substring(0, 2000)}
      `;
      
      const response = await liteLLMProvider.callLLM(prompt);
      
      const responseText = response?.choices?.[0]?.message?.content || '';
      
      // Extract JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Invalid LLM response format');
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error extracting keywords:', error);
      // Extract basic keywords from title as fallback
      return title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);
    }
  }

  /**
   * Extract headings from HTML content
   */
  private static extractHeadings(content: string): string[] {
    const headingRegex = /<h[1-6].*?>(.*?)<\/h[1-6]>/gi;
    const headings: string[] = [];
    let match;
    
    while ((match = headingRegex.exec(content)) !== null) {
      // Strip HTML tags from heading text
      const headingText = match[1].replace(/<\/?[^>]+(>|$)/g, '').trim();
      headings.push(headingText);
    }
    
    return headings;
  }

  /**
   * Extract paragraphs from HTML content
   */
  private static extractParagraphs(content: string): string[] {
    const paragraphRegex = /<p.*?>(.*?)<\/p>/gi;
    const paragraphs: string[] = [];
    let match;
    
    while ((match = paragraphRegex.exec(content)) !== null) {
      // Strip HTML tags from paragraph text
      const paragraphText = match[1].replace(/<\/?[^>]+(>|$)/g, '').trim();
      if (paragraphText) {
        paragraphs.push(paragraphText);
      }
    }
    
    return paragraphs;
  }

  /**
   * Extract lists from HTML content
   */
  private static extractLists(content: string): string[] {
    const listRegex = /<(ul|ol).*?>(.*?)<\/(ul|ol)>/gi;
    const lists: string[] = [];
    let match;
    
    while ((match = listRegex.exec(content)) !== null) {
      lists.push(match[0]);
    }
    
    return lists;
  }

  /**
   * Extract images from HTML content
   */
  private static extractImages(content: string): string[] {
    const imageRegex = /<img.*?>/gi;
    const images: string[] = [];
    let match;
    
    while ((match = imageRegex.exec(content)) !== null) {
      images.push(match[0]);
    }
    
    return images;
  }

  /**
   * Generate a summary of the analysis
   */
  private static generateAnalysisSummary(
    readabilityAnalysis: ReadabilityAnalysis,
    keywordAnalysis: KeywordAnalysis,
    structureAnalysis: StructureAnalysis
  ): string {
    const summary: string[] = [];
    
    summary.push(`Readability: ${readabilityAnalysis.readability_score}%`);
    summary.push(`Reading Level: ${readabilityAnalysis.reading_level}`);
    summary.push(`Sentence Complexity: ${readabilityAnalysis.sentence_complexity}`);
    summary.push(`Vocabulary Level: ${readabilityAnalysis.vocabulary_level}`);
    summary.push(`Passive Voice Percentage: ${readabilityAnalysis.passive_voice_percentage}%`);
    
    summary.push(`Keyword Density: ${keywordAnalysis.keyword_density}`);
    summary.push(`Keyword Distribution: ${keywordAnalysis.keyword_distribution}`);
    summary.push(`Primary Keyword Usage: ${keywordAnalysis.primary_keyword_usage}%`);
    summary.push(`Secondary Keyword Usage: ${keywordAnalysis.secondary_keyword_usage}`);
    summary.push(`Keyword in Title: ${keywordAnalysis.keyword_in_title ? 'Yes' : 'No'}`);
    summary.push(`Keyword in Headings: ${keywordAnalysis.keyword_in_headings}`);
    summary.push(`Keyword in First Paragraph: ${keywordAnalysis.keyword_in_first_paragraph ? 'Yes' : 'No'}`);
    
    summary.push(`Structure Score: ${structureAnalysis.structure_score}%`);
    summary.push(`Heading Structure: ${structureAnalysis.heading_structure}`);
    summary.push(`Paragraph Count: ${structureAnalysis.paragraph_count}`);
    summary.push(`Average Paragraph Length: ${structureAnalysis.average_paragraph_length}`);
    summary.push(`List Count: ${structureAnalysis.list_count}`);
    summary.push(`Image Count: ${structureAnalysis.image_count}`);
    
    return summary.join('\n');
  }
} 