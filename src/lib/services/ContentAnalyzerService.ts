import { createClient } from '@/lib/supabase/client';
import { liteLLMProvider } from '@/lib/ai/litellm-provider';
import { createHash } from 'crypto';

export interface ContentAnalysisResult {
  contentId: string;
  contentScore: number;
  readabilityAnalysis: ReadabilityAnalysis;
  keywordAnalysis: KeywordAnalysis;
  structureAnalysis: StructureAnalysis;
  recommendations: string[];
}

export interface ReadabilityAnalysis {
  readabilityScore: number;
  readingLevel: string;
  sentenceComplexity: string;
  vocabularyLevel: string;
  passiveVoicePercentage: number;
  improvementAreas: string[];
  analysisSummary: string;
}

export interface KeywordAnalysis {
  keywordDensity: Record<string, number>;
  keywordDistribution: string;
  primaryKeywordUsage: number;
  secondaryKeywordUsage: number[];
  keywordInTitle: boolean;
  keywordInHeadings: number;
  keywordInFirstParagraph: boolean;
  improvementAreas: string[];
}

export interface StructureAnalysis {
  headingStructure: string;
  headingCount: Record<string, number>;
  paragraphCount: number;
  averageParagraphLength: number;
  listCount: number;
  imageCount: number;
  structureScore: number;
  improvementAreas: string[];
}

export class ContentAnalyzerService {
  private static supabase = createClient();

  /**
   * Analyze content and return comprehensive analysis
   */
  static async analyzeContent(
    contentId: string, 
    content: string, 
    title: string,
    targetKeywords?: string[]
  ): Promise<ContentAnalysisResult | null> {
    try {
      // Check if we already have an analysis for this content hash
      const contentHash = this.generateContentHash(content);
      
      const { data: existingAnalysis } = await this.supabase
        .from('content_analysis')
        .select('*')
        .eq('content_hash', contentHash)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (existingAnalysis && existingAnalysis.length > 0) {
        return this.formatAnalysisResult(contentId, existingAnalysis[0]);
      }
      
      // Perform new analysis
      const readabilityAnalysis = await this.analyzeReadability(content);
      const keywordAnalysis = await this.analyzeKeywords(content, title, targetKeywords);
      const structureAnalysis = await this.analyzeStructure(content);
      
      // Calculate overall content score
      const contentScore = this.calculateContentScore(
        readabilityAnalysis,
        keywordAnalysis,
        structureAnalysis
      );
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(
        readabilityAnalysis,
        keywordAnalysis,
        structureAnalysis
      );
      
      // Store analysis results
      const analysisData = {
        content_page_id: contentId,
        content_hash: contentHash,
        content_score: contentScore,
        analysis_type: 'comprehensive',
        readability_analysis: readabilityAnalysis,
        keyword_analysis: keywordAnalysis,
        structure_analysis: structureAnalysis,
        recommendations: recommendations
      };
      
      const { data: savedAnalysis, error } = await this.supabase
        .from('content_analysis')
        .insert(analysisData)
        .select()
        .single();
      
      if (error) {
        console.error('Error saving content analysis:', error);
        throw error;
      }
      
      return {
        contentId,
        contentScore,
        readabilityAnalysis,
        keywordAnalysis,
        structureAnalysis,
        recommendations
      };
    } catch (error) {
      console.error('Error analyzing content:', error);
      return null;
    }
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
      
      const response = await liteLLMProvider.chat({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 1000
      });
      
      const responseText = response.choices[0].message.content || '';
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid LLM response format');
      }
      
      const analysisData = JSON.parse(jsonMatch[0]);
      
      return {
        readabilityScore: analysisData.readabilityScore,
        readingLevel: analysisData.readingLevel,
        sentenceComplexity: analysisData.sentenceComplexity,
        vocabularyLevel: analysisData.vocabularyLevel,
        passiveVoicePercentage: analysisData.passiveVoicePercentage,
        improvementAreas: analysisData.improvementAreas,
        analysisSummary: analysisData.analysisSummary
      };
    } catch (error) {
      console.error('Error analyzing readability:', error);
      // Return fallback analysis
      return {
        readabilityScore: 50,
        readingLevel: 'High School',
        sentenceComplexity: 'Moderate',
        vocabularyLevel: 'Intermediate',
        passiveVoicePercentage: 20,
        improvementAreas: ['Consider analyzing the content with a different tool'],
        analysisSummary: 'Analysis could not be completed successfully.'
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
      const keywordsToAnalyze = targetKeywords || await this.extractKeywords(content, title);
      
      if (!keywordsToAnalyze || keywordsToAnalyze.length === 0) {
        throw new Error('No keywords available for analysis');
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
        improvementAreas.push(`Include the primary keyword in at least one heading`);
      }
      
      if (!keywordInFirstParagraph) {
        improvementAreas.push(`Add the primary keyword to the first paragraph`);
      }
      
      if (keywordDistribution === 'uneven') {
        improvementAreas.push(`Distribute the primary keyword more evenly throughout the content`);
      }
      
      if (primaryKeywordUsage === 0) {
        improvementAreas.push(`Add the primary keyword "${keywordsToAnalyze[0]}" to your content`);
      } else if (primaryKeywordUsage > totalWords * 0.03) {
        improvementAreas.push(`Reduce the usage of the primary keyword to avoid keyword stuffing`);
      } else if (primaryKeywordUsage < 3 && totalWords > 500) {
        improvementAreas.push(`Increase the usage of the primary keyword (aim for 3-5 occurrences per 1000 words)`);
      }
      
      return {
        keywordDensity,
        keywordDistribution,
        primaryKeywordUsage,
        secondaryKeywordUsage,
        keywordInTitle,
        keywordInHeadings,
        keywordInFirstParagraph,
        improvementAreas
      };
    } catch (error) {
      console.error('Error analyzing keywords:', error);
      // Return fallback analysis
      return {
        keywordDensity: {},
        keywordDistribution: 'even',
        primaryKeywordUsage: 0,
        secondaryKeywordUsage: [],
        keywordInTitle: false,
        keywordInHeadings: 0,
        keywordInFirstParagraph: false,
        improvementAreas: ['Keyword analysis could not be completed']
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
      
      const headingRegex = /<h([1-6]).*?>(.*?)<\/h\1>/gis;
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
        headingStructure,
        headingCount,
        paragraphCount: paragraphs.length,
        averageParagraphLength,
        listCount: lists.length,
        imageCount: images.length,
        structureScore,
        improvementAreas
      };
    } catch (error) {
      console.error('Error analyzing structure:', error);
      // Return fallback analysis
      return {
        headingStructure: 'unknown',
        headingCount: { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 },
        paragraphCount: 0,
        averageParagraphLength: 0,
        listCount: 0,
        imageCount: 0,
        structureScore: 50,
        improvementAreas: ['Structure analysis could not be completed']
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
    // Weight each component
    const readabilityWeight = 0.4;
    const keywordWeight = 0.3;
    const structureWeight = 0.3;
    
    // Calculate weighted score
    const weightedScore = 
      (readabilityAnalysis.readabilityScore * readabilityWeight) +
      (this.calculateKeywordScore(keywordAnalysis) * keywordWeight) +
      (structureAnalysis.structureScore * structureWeight);
    
    // Round to integer
    return Math.round(weightedScore);
  }

  /**
   * Calculate keyword score based on keyword analysis
   */
  private static calculateKeywordScore(keywordAnalysis: KeywordAnalysis): number {
    let score = 100;
    
    // Deduct for missing primary keyword in important places
    if (!keywordAnalysis.keywordInTitle) score -= 20;
    if (keywordAnalysis.keywordInHeadings === 0) score -= 15;
    if (!keywordAnalysis.keywordInFirstParagraph) score -= 15;
    
    // Deduct for poor keyword distribution
    if (keywordAnalysis.keywordDistribution === 'uneven') score -= 15;
    else if (keywordAnalysis.keywordDistribution === 'somewhat even') score -= 5;
    
    // Deduct for each improvement area
    score -= keywordAnalysis.improvementAreas.length * 5;
    
    // Ensure score stays within 0-100
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
    recommendations.push(...readabilityAnalysis.improvementAreas);
    recommendations.push(...keywordAnalysis.improvementAreas);
    recommendations.push(...structureAnalysis.improvementAreas);
    
    // Deduplicate recommendations
    return [...new Set(recommendations)];
  }

  /**
   * Format stored analysis into result object
   */
  private static formatAnalysisResult(contentId: string, analysis: any): ContentAnalysisResult {
    return {
      contentId,
      contentScore: analysis.content_score,
      readabilityAnalysis: analysis.readability_analysis,
      keywordAnalysis: analysis.keyword_analysis,
      structureAnalysis: analysis.structure_analysis,
      recommendations: analysis.recommendations || []
    };
  }

  /**
   * Generate a hash for content to avoid duplicate analysis
   */
  private static generateContentHash(content: string): string {
    return createHash('md5').update(content).digest('hex');
  }

  /**
   * Split content into equal sections for distribution analysis
   */
  private static splitContentIntoSections(content: string, sectionCount = 5): string[] {
    const words = content.split(/\s+/);
    const sectionSize = Math.ceil(words.length / sectionCount);
    const sections: string[] = [];
    
    for (let i = 0; i < words.length; i += sectionSize) {
      sections.push(words.slice(i, i + sectionSize).join(' '));
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
      
      const response = await liteLLMProvider.chat({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 300
      });
      
      const responseText = response.choices[0].message.content || '';
      
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
    const headingRegex = /<h[1-6].*?>(.*?)<\/h[1-6]>/gis;
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
    const paragraphRegex = /<p.*?>(.*?)<\/p>/gis;
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
    const listRegex = /<(ul|ol).*?>(.*?)<\/(ul|ol)>/gis;
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
    const imageRegex = /<img.*?>/gis;
    const images: string[] = [];
    let match;
    
    while ((match = imageRegex.exec(content)) !== null) {
      images.push(match[0]);
    }
    
    return images;
  }
} 