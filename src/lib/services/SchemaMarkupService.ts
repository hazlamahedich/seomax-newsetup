import { createClient } from '@/lib/supabase/client';
import * as cheerio from 'cheerio';
import { liteLLMProvider } from '@/lib/ai/litellm-provider';

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

export interface SchemaMarkupTemplate {
  id?: string;
  templateName: string;
  schemaType: string;
  templateJson: Record<string, any>;
  description?: string;
  isCustom: boolean;
}

export interface SchemaImplementation {
  id?: string;
  siteId: string;
  pageId?: string;
  schemaTemplateId?: string;
  schemaType: string;
  implementationStatus: 'pending' | 'implemented' | 'failed';
  schemaJson: Record<string, any>;
  validationStatus?: boolean;
  validationErrors?: string[];
}

export interface SchemaGenerationParams {
  siteId: string;
  pageId?: string;
  url?: string;
  schemaType: string;
  customData?: Record<string, any>;
  content?: string;
  title?: string;
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

  /**
   * Generate schema markup for a page
   */
  static async generateSchemaMarkup(params: SchemaGenerationParams): Promise<SchemaImplementation> {
    try {
      const { siteId, pageId, url, schemaType, customData, content, title } = params;
      
      // Get page data if not provided
      let pageContent = content;
      let pageTitle = title;
      let pageUrl = url;
      
      if (!pageContent && pageId) {
        const { data: pageData, error: pageError } = await this.supabase
          .from('crawled_pages')
          .select('title, content, url')
          .eq('id', pageId)
          .single();
        
        if (pageError) {
          console.error('Error fetching page data:', pageError);
          throw pageError;
        }
        
        pageContent = pageData?.content;
        pageTitle = pageData?.title;
        pageUrl = pageData?.url;
      }
      
      // Get template if available
      const { data: template, error: templateError } = await this.supabase
        .from('schema_markup_templates')
        .select('*')
        .eq('schema_type', schemaType)
        .limit(1);
      
      let templateData = null;
      if (!templateError && template && template.length > 0) {
        templateData = template[0];
      }
      
      // Create the prompt for schema generation
      const prompt = `
        You are an expert in structured data and schema.org markup. Generate valid JSON-LD schema 
        markup for the following page:
        
        URL: ${pageUrl || 'Not provided'}
        TITLE: ${pageTitle || 'Not provided'}
        SCHEMA TYPE: ${schemaType}
        
        ${pageContent ? `
        CONTENT EXCERPT:
        ${pageContent.substring(0, 3000)}
        ` : ''}
        
        ${customData ? `
        CUSTOM DATA:
        ${JSON.stringify(customData, null, 2)}
        ` : ''}
        
        ${templateData ? `
        TEMPLATE:
        ${JSON.stringify(templateData.template_json, null, 2)}
        ` : ''}
        
        Your task is to create valid, comprehensive ${schemaType} schema markup in JSON-LD format.
        
        Guidelines:
        1. Ensure all required properties for ${schemaType} are included
        2. Use reasonable defaults when information is not available
        3. Include appropriate nested types where applicable
        4. Follow schema.org best practices and Google's structured data guidelines
        5. Format as complete JSON-LD with @context and @type fields
        
        Return ONLY the schema markup as a valid JSON object without any explanation or markdown.
      `;
      
      // Call the LLM
      const model = liteLLMProvider.getLangChainModel();
      const response = await model.invoke(prompt);
      
      // Parse the JSON response
      const responseText = response.content.toString();
      const jsonMatch = responseText.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format from AI');
      }
      
      const schemaJson = JSON.parse(jsonMatch[0]);
      
      // Validate the schema
      const { isValid, errors } = await this.validateSchema(schemaJson);
      
      // Store the implementation
      const implementation: SchemaImplementation = {
        siteId,
        pageId,
        schemaTemplateId: templateData?.id,
        schemaType,
        implementationStatus: 'pending',
        schemaJson,
        validationStatus: isValid,
        validationErrors: errors
      };
      
      const { data, error } = await this.supabase
        .from('schema_implementations')
        .insert({
          site_id: implementation.siteId,
          page_id: implementation.pageId,
          schema_template_id: implementation.schemaTemplateId,
          schema_type: implementation.schemaType,
          implementation_status: implementation.implementationStatus,
          schema_json: implementation.schemaJson,
          validation_status: implementation.validationStatus,
          validation_errors: implementation.validationErrors
        })
        .select('id')
        .single();
        
      if (error) {
        console.error('Error storing schema implementation:', error);
      } else {
        implementation.id = data?.id;
      }
      
      return implementation;
    } catch (error) {
      console.error('Error generating schema markup:', error);
      throw error;
    }
  }

  /**
   * Validate schema markup
   */
  static async validateSchema(schema: Record<string, any>): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      // Basic structure validation
      const errors: string[] = [];
      
      if (!schema['@context'] || schema['@context'] !== 'https://schema.org') {
        errors.push('Missing or invalid @context property (should be "https://schema.org")');
      }
      
      if (!schema['@type']) {
        errors.push('Missing @type property');
      }
      
      // Call the LLM for deeper validation
      const prompt = `
        You are an expert in schema.org structured data validation. 
        Validate the following JSON-LD schema markup:
        
        ${JSON.stringify(schema, null, 2)}
        
        Your task is to validate this markup according to schema.org specifications and Google's 
        structured data guidelines for ${schema['@type'] || 'unknown'} type.
        
        Check for:
        1. Required properties for the schema type
        2. Proper value types for properties
        3. Proper nesting of types
        4. Adherence to schema.org syntax
        5. Google's structured data requirements
        
        Return your analysis as a JSON object with these properties:
        {
          "isValid": boolean,
          "errors": string[]  // Array of specific error messages
        }
        
        If there are no errors, return an empty array for errors.
      `;
      
      const model = liteLLMProvider.getLangChainModel();
      const response = await model.invoke(prompt);
      
      // Parse the validation response
      const responseText = response.content.toString();
      const jsonMatch = responseText.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        return { isValid: false, errors: [...errors, 'Validation error: Invalid response format'] };
      }
      
      const validation = JSON.parse(jsonMatch[0]);
      
      // Combine basic validation with deep validation
      return {
        isValid: validation.isValid && errors.length === 0,
        errors: [...errors, ...validation.errors]
      };
    } catch (error) {
      console.error('Error validating schema:', error);
      return { isValid: false, errors: ['Validation error: ' + (error as Error).message] };
    }
  }

  /**
   * Implement schema markup on a page
   */
  static async implementSchema(
    implementationId: string
  ): Promise<{ success: boolean; message: string; code?: string }> {
    try {
      // Get the implementation details
      const { data: implementation, error: implementationError } = await this.supabase
        .from('schema_implementations')
        .select('*, page:page_id(id, url, content_pages(html_content))')
        .eq('id', implementationId)
        .single();
        
      if (implementationError || !implementation) {
        console.error('Error fetching implementation:', implementationError);
        throw implementationError || new Error('Implementation not found');
      }
      
      // Generate the script tag
      const schemaScript = `
<script type="application/ld+json">
${JSON.stringify(implementation.schema_json, null, 2)}
</script>
      `.trim();
      
      // For demo purposes, just return the code
      // In a real implementation, this would update the page HTML or
      // provide instructions for implementation methods
      const result = {
        success: true,
        message: 'Schema markup code generated successfully',
        code: schemaScript
      };
      
      // Update implementation status
      await this.supabase
        .from('schema_implementations')
        .update({
          implementation_status: 'implemented'
        })
        .eq('id', implementationId);
      
      return result;
    } catch (error) {
      console.error('Error implementing schema:', error);
      
      // Update implementation status to failed
      if (typeof implementationId === 'string') {
        await this.supabase
          .from('schema_implementations')
          .update({
            implementation_status: 'failed'
          })
          .eq('id', implementationId);
      }
      
      throw error;
    }
  }

  /**
   * Create a schema template
   */
  static async createTemplate(template: SchemaMarkupTemplate): Promise<SchemaMarkupTemplate> {
    try {
      const { data, error } = await this.supabase
        .from('schema_markup_templates')
        .insert({
          template_name: template.templateName,
          schema_type: template.schemaType,
          template_json: template.templateJson,
          description: template.description,
          is_custom: template.isCustom
        })
        .select('id')
        .single();
        
      if (error) {
        console.error('Error creating schema template:', error);
        throw error;
      }
      
      return { ...template, id: data?.id };
    } catch (error) {
      console.error('Error creating schema template:', error);
      throw error;
    }
  }

  /**
   * Get available schema templates
   */
  static async getTemplates(
    options: { schemaType?: string; isCustomOnly?: boolean } = {}
  ): Promise<SchemaMarkupTemplate[]> {
    try {
      const { schemaType, isCustomOnly } = options;
      
      let query = this.supabase
        .from('schema_markup_templates')
        .select('*');
        
      if (schemaType) {
        query = query.eq('schema_type', schemaType);
      }
      
      if (isCustomOnly) {
        query = query.eq('is_custom', true);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching schema templates:', error);
        throw error;
      }
      
      return data.map(item => ({
        id: item.id,
        templateName: item.template_name,
        schemaType: item.schema_type,
        templateJson: item.template_json,
        description: item.description,
        isCustom: item.is_custom
      }));
    } catch (error) {
      console.error('Error fetching schema templates:', error);
      throw error;
    }
  }

  /**
   * Get implementations for a site
   */
  static async getSiteImplementations(
    siteId: string,
    options: { status?: 'pending' | 'implemented' | 'failed' } = {}
  ): Promise<SchemaImplementation[]> {
    try {
      const { status } = options;
      
      let query = this.supabase
        .from('schema_implementations')
        .select('*')
        .eq('site_id', siteId);
        
      if (status) {
        query = query.eq('implementation_status', status);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching schema implementations:', error);
        throw error;
      }
      
      return data.map(item => ({
        id: item.id,
        siteId: item.site_id,
        pageId: item.page_id,
        schemaTemplateId: item.schema_template_id,
        schemaType: item.schema_type,
        implementationStatus: item.implementation_status,
        schemaJson: item.schema_json,
        validationStatus: item.validation_status,
        validationErrors: item.validation_errors
      }));
    } catch (error) {
      console.error('Error fetching schema implementations:', error);
      throw error;
    }
  }

  /**
   * Extract existing schema markup from a page
   */
  static async extractExistingSchema(
    pageId: string
  ): Promise<{ found: boolean; schemas: Record<string, any>[] }> {
    try {
      // Get page content
      const { data: pageData, error: pageError } = await this.supabase
        .from('crawled_pages')
        .select('content, html_content')
        .eq('id', pageId)
        .single();
        
      if (pageError || !pageData) {
        console.error('Error fetching page data:', pageError);
        throw pageError || new Error('Page not found');
      }
      
      // Create the prompt for schema extraction
      const prompt = `
        You are an expert in structured data extraction. Extract all JSON-LD schema markup from the 
        following HTML content. Only extract schema.org markup in script tags with type="application/ld+json".
        
        ${pageData.html_content ? 
          `HTML CONTENT EXCERPT:
          ${pageData.html_content.substring(0, 10000)}` : 
          `PAGE CONTENT:
          ${pageData.content.substring(0, 5000)}`}
        
        Return your extraction as a JSON object with these properties:
        {
          "found": boolean,  // Whether any schema markup was found
          "schemas": []      // Array of extracted schema objects
        }
        
        Only include valid JSON-LD schema objects in the schemas array.
      `;
      
      const model = liteLLMProvider.getLangChainModel();
      const response = await model.invoke(prompt);
      
      // Parse the JSON response
      const responseText = response.content.toString();
      const jsonMatch = responseText.match(/{[\s\S]*}/);
      if (!jsonMatch) {
        return { found: false, schemas: [] };
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error extracting existing schema:', error);
      return { found: false, schemas: [] };
    }
  }

  /**
   * Get recommended schema types for a page
   */
  static async getRecommendedSchemas(
    pageId: string
  ): Promise<{ type: string; priority: 'high' | 'medium' | 'low'; reason: string }[]> {
    try {
      // Get page content
      const { data: pageData, error: pageError } = await this.supabase
        .from('crawled_pages')
        .select('title, content, url')
        .eq('id', pageId)
        .single();
        
      if (pageError || !pageData) {
        console.error('Error fetching page data:', pageError);
        throw pageError || new Error('Page not found');
      }
      
      // Create the prompt for schema recommendations
      const prompt = `
        You are an expert in schema.org markup and SEO. Based on the following page content,
        recommend the most appropriate schema.org types that should be implemented.
        
        URL: ${pageData.url}
        TITLE: ${pageData.title}
        
        CONTENT EXCERPT:
        ${pageData.content.substring(0, 5000)}
        
        Your task is to analyze this content and determine which schema.org structured data types 
        would provide the most SEO benefit and accurately represent the content.
        
        Return your recommendations as a JSON array with these properties:
        [
          {
            "type": string,       // The schema.org type (e.g., "Article", "Product", "LocalBusiness")
            "priority": "high" | "medium" | "low",  // How important this schema type is for this page
            "reason": string      // Brief explanation of why this schema type is appropriate
          }
        ]
        
        Limit your recommendations to the 3-5 most relevant schema types.
      `;
      
      const model = liteLLMProvider.getLangChainModel();
      const response = await model.invoke(prompt);
      
      // Parse the JSON response
      const responseText = response.content.toString();
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }
      
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('Error getting schema recommendations:', error);
      throw error;
    }
  }
} 