import { createClient } from '@/lib/supabase/client';
import * as cheerio from 'cheerio';
import { liteLLMProvider } from '@/lib/ai/litellm-provider';

export interface DuplicateGroup {
  id: string;
  pages: {
    id: string;
    url: string;
    title: string;
    similarity: number;
  }[];
  type: 'exact' | 'near_duplicate' | 'similar';
  similarity: number;
}

export interface DuplicateContentResult {
  siteCrawlId: string;
  exactDuplicates: DuplicateGroup[];
  nearDuplicates: DuplicateGroup[];
  similarContent: DuplicateGroup[];
}

interface ContentFingerprint {
  pageId: string;
  url: string;
  title: string;
  hash: string;
  textContent: string;
  headings: string[];
  paragraphs: string[];
}

export class DuplicateContentService {
  private static supabase = createClient();

  /**
   * Find duplicate content within a site crawl
   */
  static async findDuplicateContent(siteCrawlId: string): Promise<DuplicateContentResult> {
    try {
      // Get all crawled pages for this site
      const { data: pages, error } = await this.supabase
        .from('crawled_pages')
        .select('id, url, title, html_content, js_rendered_html, status_code')
        .eq('site_crawl_id', siteCrawlId)
        .eq('status_code', 200); // Only analyze pages that loaded successfully
      
      if (error) throw error;
      
      if (!pages || pages.length === 0) {
        return {
          siteCrawlId,
          exactDuplicates: [],
          nearDuplicates: [],
          similarContent: []
        };
      }
      
      // Generate content fingerprints for all pages
      const fingerprints: ContentFingerprint[] = [];
      
      for (const page of pages) {
        const content = page.js_rendered_html || page.html_content;
        if (!content) continue;
        
        const fingerprint = await this.generateContentFingerprint(
          page.id,
          page.url,
          page.title,
          content
        );
        
        fingerprints.push(fingerprint);
      }
      
      // Find exact duplicates (same hash)
      const hashGroups: Record<string, ContentFingerprint[]> = {};
      
      fingerprints.forEach(fp => {
        if (!hashGroups[fp.hash]) {
          hashGroups[fp.hash] = [];
        }
        hashGroups[fp.hash].push(fp);
      });
      
      const exactDuplicates: DuplicateGroup[] = Object.values(hashGroups)
        .filter(group => group.length > 1)
        .map(group => ({
          id: `exact_${group[0].hash}`,
          pages: group.map(fp => ({
            id: fp.pageId,
            url: fp.url,
            title: fp.title,
            similarity: 1.0
          })),
          type: 'exact',
          similarity: 1.0
        }));
      
      // Find near duplicates using content comparison
      const nearDuplicates: DuplicateGroup[] = await this.findNearDuplicates(
        fingerprints,
        exactDuplicates.flatMap(g => g.pages.map(p => p.id))
      );
      
      // Find similar content using semantic analysis with LLM
      const similarContent: DuplicateGroup[] = await this.findSimilarContent(
        fingerprints,
        [...exactDuplicates, ...nearDuplicates].flatMap(g => g.pages.map(p => p.id))
      );
      
      // Store results
      const result: DuplicateContentResult = {
        siteCrawlId,
        exactDuplicates,
        nearDuplicates,
        similarContent
      };
      
      await this.storeDuplicateResults(result);
      
      return result;
    } catch (error) {
      console.error('Error finding duplicate content:', error);
      return {
        siteCrawlId,
        exactDuplicates: [],
        nearDuplicates: [],
        similarContent: []
      };
    }
  }
  
  /**
   * Generate a fingerprint for page content
   */
  private static async generateContentFingerprint(
    pageId: string,
    url: string,
    title: string,
    htmlContent: string
  ): Promise<ContentFingerprint> {
    // Parse HTML
    const $ = cheerio.load(htmlContent);
    
    // Remove scripts, styles, and navigation elements
    $('script, style, nav, header, footer').remove();
    
    // Extract text content
    const textContent = $('body').text().trim().replace(/\s+/g, ' ');
    
    // Extract headings
    const headings: string[] = [];
    $('h1, h2, h3').each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.push(text);
    });
    
    // Extract paragraphs
    const paragraphs: string[] = [];
    $('p').each((_, el) => {
      const text = $(el).text().trim();
      if (text) paragraphs.push(text);
    });
    
    // Create a simple hash based on headings and paragraphs
    let contentForHash = [...headings, ...paragraphs].join('|');
    const hash = await this.hashString(contentForHash);
    
    return {
      pageId,
      url,
      title,
      hash,
      textContent,
      headings,
      paragraphs
    };
  }
  
  /**
   * Hash a string using SHA-256
   */
  private static async hashString(str: string): Promise<string> {
    // Use browser's crypto API or Node.js crypto module
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const buffer = new TextEncoder().encode(str);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } else {
      // Simple string hash if crypto is not available
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash.toString(16);
    }
  }
  
  /**
   * Find near duplicates (similar content but not exact)
   */
  private static async findNearDuplicates(
    fingerprints: ContentFingerprint[],
    excludeIds: string[]
  ): Promise<DuplicateGroup[]> {
    // Filter out pages already identified as exact duplicates
    const filteredFingerprints = fingerprints.filter(fp => 
      !excludeIds.includes(fp.pageId)
    );
    
    if (filteredFingerprints.length < 2) {
      return [];
    }
    
    const duplicateGroups: DuplicateGroup[] = [];
    const processedIds = new Set<string>();
    
    for (let i = 0; i < filteredFingerprints.length; i++) {
      const fp1 = filteredFingerprints[i];
      
      if (processedIds.has(fp1.pageId)) continue;
      
      const similarPages = [];
      
      for (let j = i + 1; j < filteredFingerprints.length; j++) {
        const fp2 = filteredFingerprints[j];
        
        if (processedIds.has(fp2.pageId)) continue;
        
        // Compare content similarity
        const similarity = this.calculateContentSimilarity(fp1, fp2);
        
        // Consider as near duplicate if similarity > 0.8
        if (similarity > 0.8) {
          similarPages.push({
            id: fp2.pageId,
            url: fp2.url,
            title: fp2.title,
            similarity
          });
          
          processedIds.add(fp2.pageId);
        }
      }
      
      if (similarPages.length > 0) {
        duplicateGroups.push({
          id: `near_${fp1.pageId}`,
          pages: [
            {
              id: fp1.pageId,
              url: fp1.url,
              title: fp1.title,
              similarity: 1.0
            },
            ...similarPages
          ],
          type: 'near_duplicate',
          similarity: similarPages.reduce((sum, p) => sum + p.similarity, 0) / similarPages.length
        });
        
        processedIds.add(fp1.pageId);
      }
    }
    
    return duplicateGroups;
  }
  
  /**
   * Calculate similarity between two content fingerprints
   */
  private static calculateContentSimilarity(
    fp1: ContentFingerprint,
    fp2: ContentFingerprint
  ): number {
    // Calculate Jaccard similarity for headings
    const headingSimilarity = this.calculateJaccardSimilarity(
      fp1.headings,
      fp2.headings
    );
    
    // Calculate Jaccard similarity for paragraphs
    const paragraphSimilarity = this.calculateJaccardSimilarity(
      fp1.paragraphs,
      fp2.paragraphs
    );
    
    // Calculate overall similarity with more weight on paragraphs
    return headingSimilarity * 0.3 + paragraphSimilarity * 0.7;
  }
  
  /**
   * Calculate Jaccard similarity between two arrays
   */
  private static calculateJaccardSimilarity(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 && arr2.length === 0) return 1.0;
    if (arr1.length === 0 || arr2.length === 0) return 0.0;
    
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    
    let intersection = 0;
    for (const item of set1) {
      if (set2.has(item)) {
        intersection++;
      }
    }
    
    const union = set1.size + set2.size - intersection;
    return intersection / union;
  }
  
  /**
   * Find similar content using semantic analysis with LLM
   */
  private static async findSimilarContent(
    fingerprints: ContentFingerprint[],
    excludeIds: string[]
  ): Promise<DuplicateGroup[]> {
    // Filter out pages already identified as exact or near duplicates
    const filteredFingerprints = fingerprints.filter(fp => 
      !excludeIds.includes(fp.pageId)
    );
    
    if (filteredFingerprints.length < 2) {
      return [];
    }
    
    const similiarGroups: DuplicateGroup[] = [];
    
    // Limit to a reasonable number of pages to avoid excessive API calls
    const maxPagesToAnalyze = Math.min(10, filteredFingerprints.length);
    const pagesToAnalyze = filteredFingerprints.slice(0, maxPagesToAnalyze);
    
    // Use LLM to detect semantic similarity
    for (let i = 0; i < pagesToAnalyze.length; i++) {
      const page1 = pagesToAnalyze[i];
      const similarPages = [];
      
      for (let j = i + 1; j < pagesToAnalyze.length; j++) {
        const page2 = pagesToAnalyze[j];
        
        const semanticSimilarity = await this.calculateSemanticSimilarity(page1, page2);
        
        if (semanticSimilarity > 0.7) {
          similarPages.push({
            id: page2.pageId,
            url: page2.url,
            title: page2.title,
            similarity: semanticSimilarity
          });
        }
      }
      
      if (similarPages.length > 0) {
        similiarGroups.push({
          id: `similar_${page1.pageId}`,
          pages: [
            {
              id: page1.pageId,
              url: page1.url,
              title: page1.title,
              similarity: 1.0
            },
            ...similarPages
          ],
          type: 'similar',
          similarity: similarPages.reduce((sum, p) => sum + p.similarity, 0) / similarPages.length
        });
      }
    }
    
    return similiarGroups;
  }
  
  /**
   * Calculate semantic similarity between two pages using LLM
   */
  private static async calculateSemanticSimilarity(
    page1: ContentFingerprint,
    page2: ContentFingerprint
  ): Promise<number> {
    try {
      // Truncate content to a reasonable length for the LLM
      const content1 = page1.textContent.substring(0, 1000);
      const content2 = page2.textContent.substring(0, 1000);
      
      // Construct prompt for LLM
      const prompt = `
Compare the following two webpage contents and determine their semantic similarity:

PAGE 1 (${page1.url}):
Title: ${page1.title}
Content: ${content1}

PAGE 2 (${page2.url}):
Title: ${page2.title}
Content: ${content2}

On a scale of 0.0 to 1.0, where 0.0 means completely different topics and 1.0 means identical topics, what is the semantic similarity between these pages?
Provide just a single decimal number between 0.0 and 1.0 as your answer.
`;

      // Call LLM to analyze similarity
      const result = await liteLLMProvider.callLLM(prompt);
      
      if (!result) return 0;
      
      // Extract numeric score from result
      const scoreMatch = result.match(/([0-9]*\.[0-9]+|[0-9]+)/);
      if (scoreMatch) {
        const score = parseFloat(scoreMatch[0]);
        return Math.min(1, Math.max(0, score)); // Ensure score is between 0 and 1
      }
      
      return 0;
    } catch (error) {
      console.error('Error calculating semantic similarity:', error);
      return 0;
    }
  }
  
  /**
   * Store duplicate content results
   */
  private static async storeDuplicateResults(result: DuplicateContentResult): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('duplicate_content_analysis')
        .insert({
          site_crawl_id: result.siteCrawlId,
          exact_duplicates: result.exactDuplicates,
          near_duplicates: result.nearDuplicates,
          similar_content: result.similarContent,
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error storing duplicate content results:', error);
    }
  }
  
  /**
   * Get duplicate content analysis for a site crawl
   */
  static async getDuplicateContent(siteCrawlId: string): Promise<DuplicateContentResult | null> {
    try {
      const { data, error } = await this.supabase
        .from('duplicate_content_analysis')
        .select('*')
        .eq('site_crawl_id', siteCrawlId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      
      if (!data) return null;
      
      return {
        siteCrawlId: data.site_crawl_id,
        exactDuplicates: data.exact_duplicates,
        nearDuplicates: data.near_duplicates,
        similarContent: data.similar_content
      };
    } catch (error) {
      console.error('Error getting duplicate content analysis:', error);
      return null;
    }
  }
  
  /**
   * Generate recommendations for handling duplicate content
   */
  static generateRecommendations(result: DuplicateContentResult): string[] {
    const recommendations: string[] = [];
    
    const exactCount = result.exactDuplicates.length;
    const nearCount = result.nearDuplicates.length;
    const similarCount = result.similarContent.length;
    
    if (exactCount > 0) {
      recommendations.push(
        `Found ${exactCount} groups of exactly duplicate pages. Implement canonical tags to identify the preferred version or use 301 redirects to consolidate these pages.`
      );
    }
    
    if (nearCount > 0) {
      recommendations.push(
        `Found ${nearCount} groups of nearly duplicate pages. Review these pages to either differentiate their content or consolidate them to avoid content duplication issues.`
      );
    }
    
    if (similarCount > 0) {
      recommendations.push(
        `Found ${similarCount} groups of semantically similar pages. Consider expanding their content to make them more distinct or creating a single comprehensive page that covers the topic thoroughly.`
      );
    }
    
    if (exactCount + nearCount + similarCount === 0) {
      recommendations.push(
        `No duplicate content issues found. Continue to maintain unique content across your site.`
      );
    }
    
    return recommendations;
  }
} 