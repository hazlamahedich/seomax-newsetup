import { createClient } from '@/lib/supabase/client';
import { liteLLMProvider } from '@/lib/ai/litellm-provider';
import * as cheerio from 'cheerio';

export interface ImageAltTextAnalysisResult {
  pageId: string;
  url: string;
  totalImages: number;
  imagesWithAlt: number;
  imagesWithoutAlt: number;
  altTextQualityScore: number;
  descriptiveScore: number;
  keywordUsage: number;
  imgSrcAnalysis: ImageSrcAnalysis[];
  improvementSuggestions: string[];
}

export interface ImageSrcAnalysis {
  src: string;
  altText: string | null;
  hasAlt: boolean;
  isDescriptive: boolean;
  containsKeywords: boolean;
  qualityScore: number;
  suggestedAltText?: string;
}

export class ImageAltTextAnalyzerService {
  private static supabase = createClient();

  /**
   * Analyze image alt text usage on a page
   */
  static async analyzeImageAltText(
    pageId: string,
    url: string,
    htmlContent: string,
    keywords: string[] = []
  ): Promise<ImageAltTextAnalysisResult> {
    try {
      // Parse HTML
      const $ = cheerio.load(htmlContent);
      
      // Find all images
      const images = $('img');
      const totalImages = images.length;
      
      if (totalImages === 0) {
        return this.createEmptyAnalysisResult(pageId, url);
      }
      
      let imagesWithAlt = 0;
      let imagesWithoutAlt = 0;
      let totalQualityScore = 0;
      let totalDescriptiveScore = 0;
      let totalKeywordUsage = 0;
      
      const imgSrcAnalysis: ImageSrcAnalysis[] = [];
      
      // Analyze each image
      images.each((_, img) => {
        const $img = $(img);
        const src = $img.attr('src') || '';
        const altText = $img.attr('alt');
        const hasAlt = altText !== undefined && altText !== '';
        
        if (hasAlt) {
          imagesWithAlt++;
        } else {
          imagesWithoutAlt++;
        }
        
        // Analyze alt text quality if present
        let isDescriptive = false;
        let containsKeywords = false;
        let qualityScore = 0;
        
        if (hasAlt && altText) {
          // Check if alt text is descriptive (more than 4 words)
          const words = altText.split(/\s+/).filter(w => w.length > 0);
          isDescriptive = words.length >= 4;
          
          // Check for keyword usage
          containsKeywords = keywords.some(keyword => 
            altText.toLowerCase().includes(keyword.toLowerCase())
          );
          
          // Calculate quality score
          qualityScore = this.calculateAltTextQualityScore(altText, isDescriptive, containsKeywords);
          
          totalQualityScore += qualityScore;
          totalDescriptiveScore += isDescriptive ? 1 : 0;
          totalKeywordUsage += containsKeywords ? 1 : 0;
        }
        
        // Add to analysis array
        imgSrcAnalysis.push({
          src,
          altText: hasAlt ? altText : null,
          hasAlt,
          isDescriptive,
          containsKeywords,
          qualityScore
        });
      });
      
      // Calculate overall scores
      const altTextQualityScore = imagesWithAlt > 0 
        ? Math.round(totalQualityScore / imagesWithAlt * 100) 
        : 0;
      
      const descriptiveScore = imagesWithAlt > 0 
        ? Math.round(totalDescriptiveScore / imagesWithAlt * 100) 
        : 0;
      
      const keywordUsage = imagesWithAlt > 0 
        ? Math.round(totalKeywordUsage / imagesWithAlt * 100) 
        : 0;
      
      // Generate improvement suggestions
      const improvementSuggestions = this.generateImprovementSuggestions(
        imagesWithoutAlt,
        descriptiveScore,
        keywordUsage,
        totalImages
      );
      
      // Add suggested alt text for images without alt or with poor alt
      await this.addSuggestedAltText(imgSrcAnalysis, keywords);
      
      // Store analysis results
      await this.storeAnalysisResults(pageId, {
        pageId,
        url,
        totalImages,
        imagesWithAlt,
        imagesWithoutAlt,
        altTextQualityScore,
        descriptiveScore,
        keywordUsage,
        imgSrcAnalysis,
        improvementSuggestions
      });
      
      return {
        pageId,
        url,
        totalImages,
        imagesWithAlt,
        imagesWithoutAlt,
        altTextQualityScore,
        descriptiveScore,
        keywordUsage,
        imgSrcAnalysis,
        improvementSuggestions
      };
    } catch (error) {
      console.error('Error analyzing image alt text:', error);
      return this.createEmptyAnalysisResult(pageId, url);
    }
  }

  /**
   * Calculate alt text quality score based on various factors
   */
  private static calculateAltTextQualityScore(
    altText: string,
    isDescriptive: boolean,
    containsKeywords: boolean
  ): number {
    let score = 0;
    
    // Base score for having any alt text
    score += 40;
    
    // Add points for descriptive alt text
    if (isDescriptive) {
      score += 30;
    }
    
    // Add points for keyword usage
    if (containsKeywords) {
      score += 20;
    }
    
    // Add points for appropriate length
    const altLength = altText.length;
    if (altLength >= 20 && altLength <= 125) {
      score += 10;
    } else if (altLength > 125) {
      score -= 10; // Too long
    }
    
    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate improvement suggestions based on analysis
   */
  private static generateImprovementSuggestions(
    missingAltCount: number,
    descriptiveScore: number,
    keywordUsage: number,
    totalImages: number
  ): string[] {
    const suggestions: string[] = [];
    
    // Missing alt text
    if (missingAltCount > 0) {
      if (missingAltCount === totalImages) {
        suggestions.push('Add alt text to all images on the page');
      } else {
        suggestions.push(`Add alt text to the ${missingAltCount} images missing it`);
      }
    }
    
    // Not descriptive enough
    if (descriptiveScore < 70 && totalImages > 0) {
      suggestions.push('Make alt text more descriptive (aim for 4+ words)');
    }
    
    // Low keyword usage
    if (keywordUsage < 30 && totalImages > 0) {
      suggestions.push('Include relevant keywords in image alt text where appropriate');
    }
    
    // General best practices
    suggestions.push('Ensure alt text accurately describes image content');
    suggestions.push('Keep alt text concise but descriptive (20-125 characters)');
    
    return suggestions;
  }

  /**
   * Add suggested alt text for images without alt or with poor quality alt
   */
  private static async addSuggestedAltText(
    imgAnalysis: ImageSrcAnalysis[],
    keywords: string[]
  ): Promise<void> {
    try {
      // Only process images that need improvement
      const imagesNeedingSuggestions = imgAnalysis.filter(img => 
        !img.hasAlt || img.qualityScore < 60
      );
      
      if (imagesNeedingSuggestions.length === 0) {
        return;
      }
      
      // Limit to 5 images to avoid excessive API usage
      const limitedImages = imagesNeedingSuggestions.slice(0, 5);
      
      // Create a batch request for the LLM
      const prompt = `
        I need suggested alt text for the following images. For each image, provide a descriptive alt text (4-10 words) that:
        1. Accurately describes what the image likely contains
        2. Is concise but descriptive
        3. Includes relevant keywords where natural
        
        ${keywords.length > 0 ? `Relevant keywords: ${keywords.join(', ')}` : ''}
        
        Image URLs:
        ${limitedImages.map((img, i) => `${i+1}. ${img.src}`).join('\n')}
        
        For each image, return a JSON array with suggested alt text strings. Format:
        [
          "Suggested alt text for image 1",
          "Suggested alt text for image 2",
          etc.
        ]
      `;
      
      const response = await liteLLMProvider.chat({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      });
      
      const responseText = response.choices[0].message.content || '';
      
      // Extract JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return;
      }
      
      try {
        const suggestions = JSON.parse(jsonMatch[0]);
        
        // Add suggestions to the original array
        for (let i = 0; i < limitedImages.length && i < suggestions.length; i++) {
          const imgIndex = imgAnalysis.findIndex(img => img.src === limitedImages[i].src);
          if (imgIndex !== -1) {
            imgAnalysis[imgIndex].suggestedAltText = suggestions[i];
          }
        }
      } catch (parseError) {
        console.error('Error parsing alt text suggestions:', parseError);
      }
    } catch (error) {
      console.error('Error generating alt text suggestions:', error);
    }
  }

  /**
   * Create empty analysis result for pages with no images
   */
  private static createEmptyAnalysisResult(pageId: string, url: string): ImageAltTextAnalysisResult {
    return {
      pageId,
      url,
      totalImages: 0,
      imagesWithAlt: 0,
      imagesWithoutAlt: 0,
      altTextQualityScore: 0,
      descriptiveScore: 0,
      keywordUsage: 0,
      imgSrcAnalysis: [],
      improvementSuggestions: ['Add relevant images with descriptive alt text to enhance content']
    };
  }

  /**
   * Store analysis results in database
   */
  private static async storeAnalysisResults(
    pageId: string,
    result: ImageAltTextAnalysisResult
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('image_alt_text_analysis')
        .insert({
          page_id: pageId,
          total_images: result.totalImages,
          images_with_alt: result.imagesWithAlt,
          images_without_alt: result.imagesWithoutAlt,
          alt_text_quality_score: result.altTextQualityScore,
          descriptive_score: result.descriptiveScore,
          keyword_usage: result.keywordUsage,
          image_analysis: result.imgSrcAnalysis,
          improvement_suggestions: result.improvementSuggestions
        });
      
      if (error) {
        console.error('Error storing image alt text analysis:', error);
      }
    } catch (error) {
      console.error('Error in storeAnalysisResults:', error);
    }
  }

  /**
   * Get the latest image alt text analysis for a page
   */
  static async getImageAltTextAnalysis(pageId: string): Promise<ImageAltTextAnalysisResult | null> {
    try {
      const { data, error } = await this.supabase
        .from('image_alt_text_analysis')
        .select('*')
        .eq('page_id', pageId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        return null;
      }
      
      return {
        pageId: data[0].page_id,
        url: data[0].url || '',
        totalImages: data[0].total_images,
        imagesWithAlt: data[0].images_with_alt,
        imagesWithoutAlt: data[0].images_without_alt,
        altTextQualityScore: data[0].alt_text_quality_score,
        descriptiveScore: data[0].descriptive_score,
        keywordUsage: data[0].keyword_usage,
        imgSrcAnalysis: data[0].image_analysis || [],
        improvementSuggestions: data[0].improvement_suggestions || []
      };
    } catch (error) {
      console.error('Error getting image alt text analysis:', error);
      return null;
    }
  }
} 