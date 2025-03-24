import axios from 'axios';
import * as cheerio from 'cheerio';
import { createClient } from '@/lib/supabase/client';

export interface ImageIssue {
  id: string;
  url: string;
  type: 'missing_alt' | 'oversized' | 'wrong_format' | 'wrong_dimensions' | 'lazy_loading_missing';
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
}

export interface ImageAnalysisResult {
  crawledPageId: string;
  imageCount: number;
  totalSize: number;
  averageSize: number;
  issuesCount: number;
  issues: ImageIssue[];
  optimizationScore: number;
}

interface ImageMetadata {
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
  format: string | null;
  lazyLoaded: boolean;
  inViewport: boolean;
}

export class ImageOptimizationService {
  private static supabase = createClient();
  private static readonly SIZE_THRESHOLD = 200 * 1024; // 200 KB
  private static readonly FORMATS = ['webp', 'avif', 'jpg', 'jpeg', 'png', 'gif', 'svg'];

  /**
   * Analyze images on a crawled page
   */
  static async analyzePageImages(
    crawledPageId: string, 
    renderedHtml: string,
    url: string
  ): Promise<ImageAnalysisResult> {
    try {
      // Get images from HTML
      const $ = cheerio.load(renderedHtml);
      const images: ImageMetadata[] = [];
      
      // Process all image elements
      $('img').each((_, img) => {
        const $img = $(img);
        const imgUrl = $img.attr('src') || $img.attr('data-src') || '';
        
        if (!imgUrl) return;
        
        // Make URL absolute if needed
        const absoluteUrl = this.makeUrlAbsolute(imgUrl, url);
        
        // Check if image is lazy loaded
        const lazyLoaded = Boolean(
          $img.attr('loading') === 'lazy' || 
          $img.attr('data-src') || 
          $img.attr('data-lazy-src')
        );
        
        // Determine if image is likely in viewport (approximate method)
        const inViewport = $img.parents('header, .hero, #hero, [class*="banner"], [class*="header"]').length > 0;
        
        images.push({
          url: absoluteUrl,
          alt: $img.attr('alt') || null,
          width: parseInt($img.attr('width') || '') || null,
          height: parseInt($img.attr('height') || '') || null,
          size: null, // To be fetched
          format: this.getImageFormat(absoluteUrl),
          lazyLoaded,
          inViewport
        });
      });
      
      // Fetch image sizes
      await this.fetchImageSizes(images);
      
      // Generate issues
      const issues: ImageIssue[] = [];
      let totalSize = 0;
      
      images.forEach((image, index) => {
        // Track total size
        if (image.size) {
          totalSize += image.size;
        }
        
        // Check for missing alt text
        if (!image.alt) {
          issues.push({
            id: `img_alt_${index}`,
            url: image.url,
            type: 'missing_alt',
            severity: 'high',
            description: 'Image is missing alt text',
            recommendation: 'Add descriptive alt text to improve accessibility and SEO'
          });
        }
        
        // Check for oversized images
        if (image.size && image.size > this.SIZE_THRESHOLD) {
          issues.push({
            id: `img_size_${index}`,
            url: image.url,
            type: 'oversized',
            severity: 'medium',
            description: `Image size (${Math.round(image.size / 1024)} KB) exceeds recommended maximum (${Math.round(this.SIZE_THRESHOLD / 1024)} KB)`,
            recommendation: 'Compress the image or use a more efficient format like WebP'
          });
        }
        
        // Check for modern image formats
        if (image.format && !['webp', 'avif', 'svg'].includes(image.format.toLowerCase())) {
          issues.push({
            id: `img_format_${index}`,
            url: image.url,
            type: 'wrong_format',
            severity: 'medium',
            description: `Image uses format ${image.format} instead of a more efficient format like WebP or AVIF`,
            recommendation: 'Convert image to WebP or AVIF for better compression and quality'
          });
        }
        
        // Check for missing dimensions
        if (!image.width || !image.height) {
          issues.push({
            id: `img_dims_${index}`,
            url: image.url,
            type: 'wrong_dimensions',
            severity: 'low',
            description: 'Image is missing explicit width and/or height attributes',
            recommendation: 'Add width and height attributes to prevent layout shifts during page load'
          });
        }
        
        // Check for lazy loading on below-the-fold images
        if (!image.lazyLoaded && !image.inViewport) {
          issues.push({
            id: `img_lazy_${index}`,
            url: image.url,
            type: 'lazy_loading_missing',
            severity: 'low',
            description: 'Below-the-fold image is not using lazy loading',
            recommendation: 'Add loading="lazy" attribute to images that are not initially visible'
          });
        }
      });
      
      // Calculate average size
      const averageSize = images.length > 0 ? totalSize / images.length : 0;
      
      // Calculate optimization score (0-100)
      // Based on: issues per image ratio, size issues, alt text issues, format issues
      const issuesPerImage = images.length > 0 ? issues.length / images.length : 0;
      const highSeverityCount = issues.filter(i => i.severity === 'high').length;
      const mediumSeverityCount = issues.filter(i => i.severity === 'medium').length;
      
      const baseScore = 100;
      const issuesPerImagePenalty = Math.min(50, issuesPerImage * 20);
      const highSeverityPenalty = Math.min(30, highSeverityCount * 10);
      const mediumSeverityPenalty = Math.min(20, mediumSeverityCount * 5);
      
      const optimizationScore = Math.max(0, Math.round(
        baseScore - issuesPerImagePenalty - highSeverityPenalty - mediumSeverityPenalty
      ));
      
      // Store results in the database
      const result: ImageAnalysisResult = {
        crawledPageId,
        imageCount: images.length,
        totalSize,
        averageSize,
        issuesCount: issues.length,
        issues,
        optimizationScore
      };
      
      await this.storeImageAnalysis(result);
      
      return result;
    } catch (error) {
      console.error('Error analyzing page images:', error);
      
      // Return empty result on error
      return {
        crawledPageId,
        imageCount: 0,
        totalSize: 0,
        averageSize: 0,
        issuesCount: 0,
        issues: [],
        optimizationScore: 0
      };
    }
  }
  
  /**
   * Make a URL absolute
   */
  private static makeUrlAbsolute(imgUrl: string, pageUrl: string): string {
    try {
      // Already absolute URL with protocol
      if (imgUrl.startsWith('http://') || imgUrl.startsWith('https://')) {
        return imgUrl;
      }
      
      const urlObj = new URL(pageUrl);
      
      // URL with no protocol
      if (imgUrl.startsWith('//')) {
        return `${urlObj.protocol}${imgUrl}`;
      }
      
      // Root-relative URL
      if (imgUrl.startsWith('/')) {
        return `${urlObj.origin}${imgUrl}`;
      }
      
      // Data URI or Base64 image
      if (imgUrl.startsWith('data:')) {
        return imgUrl;
      }
      
      // Relative URL
      // Remove filename from path
      const pathParts = urlObj.pathname.split('/');
      pathParts.pop();
      const directory = pathParts.join('/');
      
      return `${urlObj.origin}${directory}/${imgUrl}`;
    } catch (error) {
      console.error('Error making URL absolute:', error);
      return imgUrl;
    }
  }
  
  /**
   * Fetch image sizes
   */
  private static async fetchImageSizes(images: ImageMetadata[]): Promise<void> {
    // Use Promise.all to fetch sizes in parallel with a limit
    const batchSize = 5;
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (image) => {
          try {
            // Skip data URIs
            if (image.url.startsWith('data:')) {
              return;
            }
            
            // Make HEAD request to get content-length
            const response = await axios.head(image.url, {
              timeout: 5000,
              validateStatus: status => status < 400
            });
            
            if (response.headers['content-length']) {
              image.size = parseInt(response.headers['content-length']);
            }
            
            // Update format from content-type if available
            if (response.headers['content-type']) {
              const contentType = response.headers['content-type'].toLowerCase();
              if (contentType.includes('image/')) {
                image.format = contentType.replace('image/', '');
              }
            }
          } catch (error) {
            console.error(`Error fetching image size for ${image.url}:`, error);
          }
        })
      );
    }
  }
  
  /**
   * Get the image format from a URL
   */
  private static getImageFormat(url: string): string | null {
    // Handle data URLs
    if (url.startsWith('data:image/')) {
      const match = url.match(/data:image\/([a-zA-Z0-9]+);/);
      return match ? match[1].toLowerCase() : null;
    }
    
    // Handle file URLs
    const urlObj = new URL(url, 'https://example.com'); // Use example.com as a base for relative URLs
    const pathname = urlObj.pathname;
    const extension = pathname.split('.').pop()?.toLowerCase();
    
    if (extension && this.FORMATS.includes(extension)) {
      return extension;
    }
    
    return null;
  }
  
  /**
   * Store image analysis results
   */
  private static async storeImageAnalysis(result: ImageAnalysisResult): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('image_analysis')
        .insert({
          crawled_page_id: result.crawledPageId,
          image_count: result.imageCount,
          total_size: result.totalSize,
          average_size: result.averageSize,
          issues_count: result.issuesCount,
          issues: result.issues,
          optimization_score: result.optimizationScore,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error storing image analysis:', error);
    }
  }
  
  /**
   * Get image analysis for a page
   */
  static async getImageAnalysis(crawledPageId: string): Promise<ImageAnalysisResult | null> {
    try {
      const { data, error } = await this.supabase
        .from('image_analysis')
        .select('*')
        .eq('crawled_page_id', crawledPageId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      
      return data ? {
        crawledPageId: data.crawled_page_id,
        imageCount: data.image_count,
        totalSize: data.total_size,
        averageSize: data.average_size,
        issuesCount: data.issues_count,
        issues: data.issues,
        optimizationScore: data.optimization_score
      } : null;
    } catch (error) {
      console.error('Error fetching image analysis:', error);
      return null;
    }
  }
  
  /**
   * Get optimization recommendations for all issues
   */
  static getOptimizationRecommendations(issues: ImageIssue[]): string[] {
    const recommendations: string[] = [];
    
    // Group issues by type
    const issuesByType: Record<string, number> = {};
    issues.forEach(issue => {
      issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
    });
    
    // Generate recommendations based on issues
    if (issuesByType['missing_alt']) {
      recommendations.push(`Add descriptive alt text to ${issuesByType['missing_alt']} images to improve accessibility and SEO.`);
    }
    
    if (issuesByType['oversized']) {
      recommendations.push(`Compress ${issuesByType['oversized']} oversized images to reduce page load time and bandwidth usage.`);
    }
    
    if (issuesByType['wrong_format']) {
      recommendations.push(`Convert ${issuesByType['wrong_format']} images to modern formats like WebP or AVIF for better compression and quality.`);
    }
    
    if (issuesByType['wrong_dimensions']) {
      recommendations.push(`Add explicit width and height attributes to ${issuesByType['wrong_dimensions']} images to prevent layout shifts during page load.`);
    }
    
    if (issuesByType['lazy_loading_missing']) {
      recommendations.push(`Add loading="lazy" attribute to ${issuesByType['lazy_loading_missing']} below-the-fold images to improve initial page load time.`);
    }
    
    return recommendations;
  }
} 