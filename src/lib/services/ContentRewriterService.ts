import { createClient } from '@/lib/supabase/client';
import { liteLLMProvider } from '@/lib/ai/litellm-provider';

export interface ContentRewriteParams {
  contentId?: string;
  projectId: string;
  originalContent: string;
  targetKeywords: string[];
  preserveEEAT: boolean;
  toneStyle?: 'professional' | 'conversational' | 'academic' | 'friendly';
  contentType?: 'blog' | 'product' | 'service' | 'landing' | 'about';
  maxLength?: number;
}

export interface RewriteResult {
  id?: string;
  contentId?: string;
  projectId: string;
  originalContent: string;
  rewrittenContent: string;
  keywordUsage: {
    keyword: string;
    originalCount: number;
    newCount: number;
    positions: number[];
  }[];
  eeatSignals: {
    expertise: number;
    authoritativeness: number;
    trustworthiness: number;
    experience: number;
    overall: number;
  };
  readabilityScore: number;
  contentLength: number;
  created_at?: Date;
}

export class ContentRewriterService {
  private static supabase = createClient('supabase', process.env.NEXT_PUBLIC_SUPABASE_URL || '');

  /**
   * Rewrite content with SEO optimization while maintaining E-E-A-T signals
   */
  static async rewriteContent(params: ContentRewriteParams): Promise<RewriteResult> {
    try {
      const {
        contentId,
        projectId,
        originalContent,
        targetKeywords,
        preserveEEAT,
        toneStyle = 'professional',
        contentType = 'blog',
        maxLength
      } = params;

      // Check if we already have a rewrite for this content
      if (contentId) {
        const { data: existingRewrite } = await this.supabase
          .from('content_rewrites')
          .select('*')
          .eq('content_id', contentId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (existingRewrite && existingRewrite.length > 0) {
          console.log('Using existing rewrite');
          return this.mapDatabaseToRewriteResult(existingRewrite[0]);
        }
      }

      // Get E-E-A-T signals from original content
      const originalEEAT = await this.analyzeEEATSignals(originalContent);
      
      // Count original keyword usage
      const originalKeywordCounts = this.countKeywordOccurrences(originalContent, targetKeywords);

      // Construct the prompt for the LLM
      const prompt = `
        As an expert SEO content writer, rewrite the following content to optimize it for search engines 
        while ${preserveEEAT ? 'maintaining or improving' : 'not focusing on'} E-E-A-T signals 
        (Experience, Expertise, Authoritativeness, and Trustworthiness).

        ORIGINAL CONTENT:
        ${originalContent}

        TARGET KEYWORDS (in order of priority):
        ${targetKeywords.join(', ')}

        CONTENT TYPE:
        ${contentType}

        TONE STYLE:
        ${toneStyle}

        ${maxLength ? `MAXIMUM LENGTH: ${maxLength} characters` : ''}

        INSTRUCTIONS:
        1. Optimize the content to naturally include the target keywords
        2. ${preserveEEAT ? 'Maintain or enhance any signals of expertise, authoritativeness, and trustworthiness' : 'Focus primarily on readability and keyword optimization'}
        3. Improve readability and flow
        4. Maintain the overall message and key points
        5. Keep a similar structure unless changes would significantly improve SEO
        6. Use appropriate headings, bullet points, and paragraph breaks
        
        ${preserveEEAT ? `
        E-E-A-T GUIDANCE:
        - Experience: Include first-hand experiences or perspectives if present in the original
        - Expertise: Maintain technical terms, references to research, or industry-specific knowledge
        - Authoritativeness: Preserve citations, references to trusted sources, or industry standards
        - Trustworthiness: Keep factual accuracy, balanced viewpoints, and transparent information
        ` : ''}

        Return ONLY the rewritten content without any explanations or meta-commentary.
      `;

      // Call the LLM
      const model = liteLLMProvider.getLangChainModel();
      const response = await model.invoke(prompt);
      const rewrittenContent = response.content.toString().trim();

      // Analyze the rewritten content
      const eeatSignals = await this.analyzeEEATSignals(rewrittenContent);
      const readabilityScore = this.calculateReadabilityScore(rewrittenContent);
      const keywordUsage = this.analyzeKeywordUsage(rewrittenContent, targetKeywords, originalKeywordCounts);

      // Create the result object
      const result: RewriteResult = {
        contentId,
        projectId,
        originalContent,
        rewrittenContent,
        keywordUsage,
        eeatSignals,
        readabilityScore,
        contentLength: rewrittenContent.length
      };

      // Store the result in the database
      const { data, error } = await this.supabase
        .from('content_rewrites')
        .insert({
          content_id: contentId,
          project_id: projectId,
          original_content: originalContent,
          rewritten_content: rewrittenContent,
          keyword_usage: keywordUsage,
          eeat_signals: eeatSignals,
          readability_score: readabilityScore,
          content_length: rewrittenContent.length
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error storing content rewrite:', error);
        throw error;
      }

      result.id = data.id;
      return result;
    } catch (error: any) {
      console.error('Error rewriting content:', error);
      throw error;
    }
  }

  /**
   * Get rewrites for a specific content
   */
  static async getContentRewrites(contentId: string): Promise<RewriteResult[]> {
    try {
      const { data, error } = await this.supabase
        .from('content_rewrites')
        .select('*')
        .eq('content_id', contentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching content rewrites:', error);
        throw error;
      }

      return data.map(this.mapDatabaseToRewriteResult);
    } catch (error: any) {
      console.error('Error fetching content rewrites:', error);
      throw error;
    }
  }

  /**
   * Get rewrites for a project
   */
  static async getProjectRewrites(projectId: string, limit = 10): Promise<RewriteResult[]> {
    try {
      const { data, error } = await this.supabase
        .from('content_rewrites')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching project rewrites:', error);
        throw error;
      }

      return data.map(this.mapDatabaseToRewriteResult);
    } catch (error: any) {
      console.error('Error fetching project rewrites:', error);
      throw error;
    }
  }

  /**
   * Delete a content rewrite
   */
  static async deleteRewrite(rewriteId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('content_rewrites')
        .delete()
        .eq('id', rewriteId);

      if (error) {
        console.error('Error deleting content rewrite:', error);
        throw error;
      }
    } catch (error: any) {
      console.error('Error deleting content rewrite:', error);
      throw error;
    }
  }

  /**
   * Analyze E-E-A-T signals in content
   */
  private static async analyzeEEATSignals(content: string): Promise<{
    expertise: number;
    authoritativeness: number;
    trustworthiness: number;
    experience: number;
    overall: number;
  }> {
    try {
      const prompt = `
        Analyze the following content and provide a numerical score (0-100) for each of the Google E-E-A-T signals:
        - Experience: Evidence of first-hand experience with the topic
        - Expertise: Demonstration of knowledge, skills, and domain expertise
        - Authoritativeness: Credentials, references, and recognized authority
        - Trustworthiness: Accuracy, transparency, and credibility

        CONTENT:
        ${content}

        Return your analysis as a JSON object with these fields:
        {
          "expertise": number,  // 0-100 score
          "authoritativeness": number,  // 0-100 score
          "trustworthiness": number,  // 0-100 score
          "experience": number,  // 0-100 score
          "overall": number,  // 0-100 weighted average
          "explanation": string  // Brief explanation of scores
        }

        Focus only on evaluating the content against these signals. Do not make judgments about 
        the content's quality beyond the E-E-A-T framework.
      `;

      // Call the LLM
      const model = liteLLMProvider.getLangChainModel();
      const response = await model.invoke(prompt);
      
      // Parse the JSON response
      const responseText = response.content.toString();
      const jsonMatch = responseText.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        console.error('Invalid E-E-A-T analysis format');
        return {
          expertise: 50,
          authoritativeness: 50,
          trustworthiness: 50,
          experience: 50,
          overall: 50
        };
      }
      
      const result = JSON.parse(jsonMatch[0]);
      return {
        expertise: result.expertise,
        authoritativeness: result.authoritativeness,
        trustworthiness: result.trustworthiness,
        experience: result.experience,
        overall: result.overall
      };
    } catch (error) {
      console.error('Error analyzing E-E-A-T signals:', error);
      // Return default values if analysis fails
      return {
        expertise: 50,
        authoritativeness: 50,
        trustworthiness: 50,
        experience: 50,
        overall: 50
      };
    }
  }

  /**
   * Count keyword occurrences in original content
   */
  private static countKeywordOccurrences(content: string, keywords: string[]): Record<string, number> {
    const counts: Record<string, number> = {};
    const lowerContent = content.toLowerCase();
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword.toLowerCase()}\\b`, 'g');
      const matches = lowerContent.match(regex);
      counts[keyword] = matches ? matches.length : 0;
    });
    
    return counts;
  }

  /**
   * Calculate readability score (Flesch Reading Ease)
   */
  private static calculateReadabilityScore(content: string): number {
    // Simple implementation of Flesch Reading Ease
    const words = content.split(/\s+/).length;
    const sentences = content.split(/[.!?]+/).length;
    const syllables = this.countSyllables(content);
    
    if (sentences === 0 || words === 0) return 50; // Default value
    
    const averageWordsPerSentence = words / sentences;
    const averageSyllablesPerWord = syllables / words;
    
    // Flesch Reading Ease formula
    const readabilityScore = 206.835 - (1.015 * averageWordsPerSentence) - (84.6 * averageSyllablesPerWord);
    
    // Normalize to 0-100 range
    return Math.min(100, Math.max(0, readabilityScore));
  }

  /**
   * Count syllables in text (approximate)
   */
  private static countSyllables(text: string): number {
    // Simple approximation for English
    const noSpecialChars = text.toLowerCase().replace(/[^a-z]/g, ' ');
    const words = noSpecialChars.split(/\s+/).filter(word => word.length > 0);
    
    let syllableCount = 0;
    for (const word of words) {
      // Count vowel groups
      const vowelGroups = word.match(/[aeiouy]+/g);
      let count = vowelGroups ? vowelGroups.length : 1;
      
      // Adjust for common patterns
      if (word.endsWith('e')) count--;
      if (word.endsWith('le') && word.length > 2) count++;
      if (count === 0) count = 1; // Every word has at least one syllable
      
      syllableCount += count;
    }
    
    return syllableCount;
  }

  /**
   * Analyze keyword usage in rewritten content
   */
  private static analyzeKeywordUsage(
    content: string, 
    keywords: string[], 
    originalCounts: Record<string, number>
  ): {
    keyword: string;
    originalCount: number;
    newCount: number;
    positions: number[];
  }[] {
    const results = [];
    const lowerContent = content.toLowerCase();
    
    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase();
      const positions: number[] = [];
      const regex = new RegExp(`\\b${lowerKeyword}\\b`, 'gi');
      
      let match;
      while ((match = regex.exec(content)) !== null) {
        positions.push(match.index);
      }
      
      results.push({
        keyword,
        originalCount: originalCounts[keyword] || 0,
        newCount: positions.length,
        positions
      });
    }
    
    return results;
  }

  /**
   * Map database record to RewriteResult interface
   */
  private static mapDatabaseToRewriteResult(data: any): RewriteResult {
    return {
      id: data.id,
      contentId: data.content_id,
      projectId: data.project_id,
      originalContent: data.original_content,
      rewrittenContent: data.rewritten_content,
      keywordUsage: data.keyword_usage,
      eeatSignals: data.eeat_signals,
      readabilityScore: data.readability_score,
      contentLength: data.content_length,
      created_at: data.created_at
    };
  }
} 