import { createClient } from '@/lib/supabase/client';
import * as cheerio from 'cheerio';

export interface SchemaMarkupItem {
  type: string;
  properties: Record<string, any>;
  url: string;
  isValid: boolean;
  validationErrors?: string[];
}

export interface SchemaValidationResult {
  siteCrawlId: string;
  pageId: string;
  url: string;
  schemaItems: SchemaMarkupItem[];
  missingRecommendedSchemas: string[];
  score: number;
  suggestions: string[];
  createdAt: string;
}

interface SchemaTypeRequirements {
  type: string;
  requiredProperties: string[];
  recommendedProperties: string[];
  pageTypes: string[];
}

export class SchemaMarkupService {
  private static supabase = createClient();
  
  // Common schema types and their requirements
  private static schemaRequirements: SchemaTypeRequirements[] = [
    {
      type: 'Organization',
      requiredProperties: ['name', 'url'],
      recommendedProperties: ['logo', 'contactPoint', 'sameAs'],
      pageTypes: ['homepage']
    },
    {
      type: 'LocalBusiness',
      requiredProperties: ['name', 'address', 'telephone'],
      recommendedProperties: ['priceRange', 'openingHours', 'geo'],
      pageTypes: ['business', 'local']
    },
    {
      type: 'Product',
      requiredProperties: ['name', 'image'],
      recommendedProperties: ['description', 'brand', 'offers', 'review', 'aggregateRating'],
      pageTypes: ['product']
    },
    {
      type: 'Article',
      requiredProperties: ['headline', 'author', 'datePublished'],
      recommendedProperties: ['image', 'dateModified', 'publisher'],
      pageTypes: ['article', 'blog']
    },
    {
      type: 'FAQPage',
      requiredProperties: ['mainEntity'],
      recommendedProperties: [],
      pageTypes: ['faq']
    },
    {
      type: 'BreadcrumbList',
      requiredProperties: ['itemListElement'],
      recommendedProperties: [],
      pageTypes: ['all']
    }
  ];
  
  /**
   * Analyze schema markup on a page
   */
  static async analyzePageSchema(
    siteCrawlId: string,
    pageId: string,
    url: string,
    html: string,
    pageType?: string
  ): Promise<SchemaValidationResult> {
    try {
      // Parse HTML content
      const $ = cheerio.load(html);
      
      // Extract JSON-LD schema markup
      const jsonLdSchemas: any[] = [];
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const schemaText = $(el).html();
          if (schemaText) {
            const schema = JSON.parse(schemaText);
            if (Array.isArray(schema)) {
              jsonLdSchemas.push(...schema);
            } else {
              jsonLdSchemas.push(schema);
            }
          }
        } catch (error) {
          console.error(`Error parsing JSON-LD schema on ${url}:`, error);
        }
      });
      
      // Extract Microdata schema
      const microdataSchemas = this.extractMicrodataSchema($);
      
      // Combine and validate all schemas
      const allSchemas = [...jsonLdSchemas, ...microdataSchemas];
      const schemaItems: SchemaMarkupItem[] = this.validateSchemas(allSchemas, url);
      
      // Determine page type if not provided
      const detectedPageType = pageType || this.detectPageType($, url);
      
      // Check for missing recommended schemas
      const missingSchemas = this.checkMissingRecommendedSchemas(schemaItems, detectedPageType);
      
      // Generate score and suggestions
      const { score, suggestions } = this.generateScoreAndSuggestions(
        schemaItems,
        missingSchemas,
        detectedPageType
      );
      
      // Create result object
      const result: SchemaValidationResult = {
        siteCrawlId,
        pageId,
        url,
        schemaItems,
        missingRecommendedSchemas: missingSchemas,
        score,
        suggestions,
        createdAt: new Date().toISOString()
      };
      
      // Store results in Supabase
      await this.storeSchemaResults(result);
      
      return result;
    } catch (error) {
      console.error(`Error analyzing schema for ${url}:`, error);
      return {
        siteCrawlId,
        pageId,
        url,
        schemaItems: [],
        missingRecommendedSchemas: [],
        score: 0,
        suggestions: ['Error analyzing schema markup.'],
        createdAt: new Date().toISOString()
      };
    }
  }
  
  /**
   * Extract microdata schema from HTML
   */
  private static extractMicrodataSchema($: cheerio.CheerioAPI): any[] {
    const schemas: any[] = [];
    
    // Find elements with itemscope attribute
    $('[itemscope]').each((_, el) => {
      const $el = $(el);
      const type = $el.attr('itemtype');
      
      if (type) {
        const schemaType = type.split('/').pop();
        if (!schemaType) return;
        
        const properties: Record<string, any> = {};
        
        // Extract properties
        $el.find('[itemprop]').each((_, propEl) => {
          const $propEl = $(propEl);
          const propName = $propEl.attr('itemprop');
          
          if (propName) {
            // Determine property value based on tag type
            let propValue;
            
            if ($propEl.attr('content')) {
              propValue = $propEl.attr('content');
            } else if ($propEl.attr('datetime')) {
              propValue = $propEl.attr('datetime');
            } else if ($propEl.is('a')) {
              propValue = $propEl.attr('href');
            } else if ($propEl.is('img')) {
              propValue = $propEl.attr('src');
            } else if ($propEl.is('meta')) {
              propValue = $propEl.attr('content');
            } else {
              propValue = $propEl.text().trim();
            }
            
            properties[propName] = propValue;
          }
        });
        
        schemas.push({
          '@type': schemaType,
          ...properties
        });
      }
    });
    
    return schemas;
  }
  
  /**
   * Validate schema items
   */
  private static validateSchemas(schemas: any[], url: string): SchemaMarkupItem[] {
    return schemas.map(schema => {
      // Skip if no type is defined
      if (!schema['@type']) {
        return {
          type: 'Unknown',
          properties: schema,
          url,
          isValid: false,
          validationErrors: ['Missing @type property']
        };
      }
      
      const type = schema['@type'];
      const validationErrors: string[] = [];
      
      // Find requirements for this schema type
      const requirements = this.schemaRequirements.find(req => req.type === type);
      
      if (requirements) {
        // Check for required properties
        for (const requiredProp of requirements.requiredProperties) {
          if (!schema[requiredProp] && !schema['@graph']?.some((item: any) => item[requiredProp])) {
            validationErrors.push(`Missing required property: ${requiredProp}`);
          }
        }
      }
      
      return {
        type,
        properties: schema,
        url,
        isValid: validationErrors.length === 0,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined
      };
    });
  }
  
  /**
   * Detect page type based on content and URL
   */
  private static detectPageType($: cheerio.CheerioAPI, url: string): string {
    // Check URL patterns
    const urlPath = new URL(url).pathname.toLowerCase();
    
    if (urlPath === '/' || urlPath === '/index.html') {
      return 'homepage';
    }
    
    if (urlPath.includes('product') || urlPath.match(/\/[^\/]+\/?$/)) {
      // Check for product markers
      if (
        $('.product').length > 0 ||
        $('[data-product]').length > 0 ||
        $('button').filter((_, el) => $(el).text().toLowerCase().includes('add to cart')).length > 0
      ) {
        return 'product';
      }
    }
    
    if (urlPath.includes('article') || urlPath.includes('blog') || urlPath.includes('news')) {
      return 'article';
    }
    
    if (urlPath.includes('about')) {
      return 'about';
    }
    
    if (urlPath.includes('contact')) {
      return 'contact';
    }
    
    if (urlPath.includes('faq')) {
      return 'faq';
    }
    
    // Check content markers
    if ($('article').length > 0 || $('time').length > 0) {
      return 'article';
    }
    
    if ($('form').length > 0 && $('form input[type="email"]').length > 0) {
      return 'contact';
    }
    
    if ($('dt').length > 3 || $('details').length > 3) {
      return 'faq';
    }
    
    return 'other';
  }
  
  /**
   * Check for missing recommended schemas based on page type
   */
  private static checkMissingRecommendedSchemas(
    schemaItems: SchemaMarkupItem[],
    pageType: string
  ): string[] {
    const existingSchemaTypes = schemaItems.map(item => item.type);
    const missingSchemas: string[] = [];
    
    // Get recommended schemas for this page type
    const recommendedSchemas = this.schemaRequirements.filter(
      schema => schema.pageTypes.includes(pageType) || schema.pageTypes.includes('all')
    );
    
    for (const schema of recommendedSchemas) {
      if (!existingSchemaTypes.includes(schema.type)) {
        missingSchemas.push(schema.type);
      }
    }
    
    return missingSchemas;
  }
  
  /**
   * Generate a score and suggestions for schema implementation
   */
  private static generateScoreAndSuggestions(
    schemaItems: SchemaMarkupItem[],
    missingSchemas: string[],
    pageType: string
  ): { score: number; suggestions: string[] } {
    const suggestions: string[] = [];
    let score = 0;
    
    // Calculate base score
    if (schemaItems.length > 0) {
      // Start with 70 if at least some schema exists
      score = 70;
      
      // Add points for valid schemas (up to 30 more points)
      const validSchemas = schemaItems.filter(item => item.isValid);
      score += Math.min(30, validSchemas.length * 10);
      
      // Subtract points for invalid schemas
      const invalidSchemas = schemaItems.filter(item => !item.isValid);
      score -= Math.min(score, invalidSchemas.length * 15);
      
      // Subtract points for missing recommended schemas
      score -= Math.min(score, missingSchemas.length * 10);
    } else {
      suggestions.push(`No schema markup found. Implementing structured data can help search engines better understand your content.`);
    }
    
    // Generate suggestions
    for (const item of schemaItems) {
      if (!item.isValid && item.validationErrors) {
        suggestions.push(`Fix validation errors in ${item.type} schema: ${item.validationErrors.join(', ')}`);
      }
      
      // Check for recommended properties
      const requirements = this.schemaRequirements.find(req => req.type === item.type);
      if (requirements) {
        const missingRecommended = requirements.recommendedProperties.filter(
          prop => !item.properties[prop]
        );
        
        if (missingRecommended.length > 0) {
          suggestions.push(`Enhance ${item.type} schema by adding recommended properties: ${missingRecommended.join(', ')}`);
        }
      }
    }
    
    // Add suggestions for missing schemas
    if (missingSchemas.length > 0) {
      suggestions.push(`Consider adding the following schema types for this ${pageType} page: ${missingSchemas.join(', ')}`);
    }
    
    // Add general best practices
    if (schemaItems.length > 0 && !schemaItems.some(item => item.type === 'BreadcrumbList')) {
      suggestions.push(`Add BreadcrumbList schema to improve navigation signals to search engines.`);
    }
    
    return {
      score: Math.max(0, Math.min(100, Math.round(score))),
      suggestions: suggestions.length > 0 ? suggestions : ['Schema markup looks good. No specific suggestions.']
    };
  }
  
  /**
   * Store schema validation results
   */
  private static async storeSchemaResults(result: SchemaValidationResult): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('schema_markup_analysis')
        .insert({
          site_crawl_id: result.siteCrawlId,
          page_id: result.pageId,
          url: result.url,
          schema_items: result.schemaItems,
          missing_recommended_schemas: result.missingRecommendedSchemas,
          score: result.score,
          suggestions: result.suggestions,
          created_at: result.createdAt
        });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error storing schema validation results:', error);
    }
  }
  
  /**
   * Get schema validation result for a specific page
   */
  static async getSchemaValidation(
    siteCrawlId: string,
    pageId: string
  ): Promise<SchemaValidationResult | null> {
    try {
      const { data, error } = await this.supabase
        .from('schema_markup_analysis')
        .select('*')
        .eq('site_crawl_id', siteCrawlId)
        .eq('page_id', pageId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      
      if (!data) return null;
      
      return {
        siteCrawlId: data.site_crawl_id,
        pageId: data.page_id,
        url: data.url,
        schemaItems: data.schema_items,
        missingRecommendedSchemas: data.missing_recommended_schemas,
        score: data.score,
        suggestions: data.suggestions,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Error getting schema validation results:', error);
      return null;
    }
  }
  
  /**
   * Get schema validation summary for entire site crawl
   */
  static async getSiteSchemaValidationSummary(
    siteCrawlId: string
  ): Promise<{
    averageScore: number;
    pagesWithSchema: number;
    totalPages: number;
    commonIssues: string[];
  }> {
    try {
      const { data, error } = await this.supabase
        .from('schema_markup_analysis')
        .select('score, suggestions')
        .eq('site_crawl_id', siteCrawlId);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return {
          averageScore: 0,
          pagesWithSchema: 0,
          totalPages: 0,
          commonIssues: ['No schema analysis data available']
        };
      }
      
      // Calculate average score
      const totalScore = data.reduce((sum, item) => sum + (item.score || 0), 0);
      const averageScore = Math.round(totalScore / data.length);
      
      // Count pages with schema
      const pagesWithSchema = data.filter(item => item.score > 0).length;
      
      // Find common issues
      const allSuggestions = data.flatMap(item => item.suggestions || []);
      const suggestionCounts: Record<string, number> = {};
      
      for (const suggestion of allSuggestions) {
        suggestionCounts[suggestion] = (suggestionCounts[suggestion] || 0) + 1;
      }
      
      // Sort suggestions by count and get top 5
      const commonIssues = Object.entries(suggestionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([suggestion]) => suggestion);
      
      return {
        averageScore,
        pagesWithSchema,
        totalPages: data.length,
        commonIssues
      };
    } catch (error) {
      console.error('Error getting site schema validation summary:', error);
      return {
        averageScore: 0,
        pagesWithSchema: 0,
        totalPages: 0,
        commonIssues: ['Error retrieving schema analysis data']
      };
    }
  }
} 