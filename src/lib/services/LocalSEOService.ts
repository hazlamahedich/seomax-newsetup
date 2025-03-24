import { createClient } from '@/lib/supabase/client';
import * as cheerio from 'cheerio';
import { SchemaMarkupService } from './SchemaMarkupService';
import { GradingSystemService } from './GradingSystemService';

export interface NAPInfo {
  name: string;
  address: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
    formatted?: string;
  };
  phone: string;
}

export interface NAPConsistencyResult {
  isConsistent: boolean;
  detectedInstances: NAPInfo[];
  consistencyScore: number;
  inconsistencies: string[];
}

export interface GoogleBusinessProfileResult {
  detected: boolean;
  url?: string;
  isVerified?: boolean;
  details?: {
    reviews?: number;
    rating?: number;
  };
}

export interface LocalBusinessSchemaResult {
  present: boolean;
  isValid: boolean;
  missingProperties: string[];
  schema?: any;
  score: number;
  recommendations: string[];
}

export interface LocalKeywordResult {
  localKeywords: string[];
  localKeywordDensity: number;
  keywordInTitle: boolean;
  keywordInHeadings: boolean;
  keywordInContent: boolean;
  score: number;
  recommendations: string[];
}

export interface MapEmbedResult {
  detected: boolean;
  embedType?: 'google' | 'bing' | 'other';
  hasAddress: boolean;
  score: number;
  recommendations: string[];
}

export interface LocalSEOResult {
  siteId: string;
  url: string;
  domain: string;
  napConsistency: NAPConsistencyResult;
  googleBusinessProfile: GoogleBusinessProfileResult;
  localBusinessSchema: LocalBusinessSchemaResult;
  localKeywordUsage: LocalKeywordResult;
  mapEmbed: MapEmbedResult;
  overallScore: number;
  grade: {
    letter: string;
    color: string;
    label: string;
  };
  recommendations: string[];
  createdAt: string;
}

export class LocalSEOService {
  private static supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co', 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  );
  
  // Common local business keywords
  private static localKeywords = [
    'near me', 'nearby', 'local', 'location', 'directions',
    'hours', 'store', 'shop', 'office', 'branch',
    'visit us', 'visit our', 'find us', 'located',
    'neighborhood', 'area', 'region', 'city', 'town', 'community'
  ];
  
  // Required properties for LocalBusiness schema
  private static requiredLocalBusinessProps = [
    'name', 'address', 'telephone', 'openingHours', 'geo'
  ];
  
  // Recommended properties for LocalBusiness schema
  private static recommendedLocalBusinessProps = [
    'priceRange', 'description', 'image', 'url', 'sameAs'
  ];

  /**
   * Run a comprehensive local SEO analysis for a domain
   */
  static async analyzeLocalSEO(
    siteId: string, 
    url: string, 
    html: string, 
    otherPages: {url: string, html: string}[] = []
  ): Promise<LocalSEOResult> {
    try {
      // Get domain from URL
      const domain = new URL(url).hostname;
      
      // Load main page HTML
      const $ = cheerio.load(html);
      
      // Analyze NAP consistency
      const napConsistency = await this.analyzeNAPConsistency($, otherPages);
      
      // Check for Google Business Profile
      const googleBusinessProfile = await this.detectGoogleBusinessProfile($, domain);
      
      // Validate local business schema
      const localBusinessSchema = await this.validateLocalBusinessSchema($, url);
      
      // Analyze local keyword usage
      const localKeywordUsage = this.analyzeLocalKeywordUsage($, url);
      
      // Check for map embeds
      const mapEmbed = this.detectMapEmbed($);
      
      // Calculate overall score (weighted average)
      const overallScore = Math.round(
        (napConsistency.consistencyScore * 0.25) +
        (googleBusinessProfile.detected ? 20 : 0) +
        (localBusinessSchema.score * 0.25) +
        (localKeywordUsage.score * 0.15) +
        (mapEmbed.score * 0.15)
      );
      
      // Generate grade based on score
      const grade = GradingSystemService.getGrade(overallScore);
      
      // Compile all recommendations
      const recommendations = [
        ...this.generateNAPRecommendations(napConsistency),
        ...this.generateGBPRecommendations(googleBusinessProfile),
        ...localBusinessSchema.recommendations,
        ...localKeywordUsage.recommendations,
        ...mapEmbed.recommendations
      ];
      
      // Remove duplicates and limit to top 10
      const uniqueRecommendations = [...new Set(recommendations)].slice(0, 10);
      
      // Create result object
      const result: LocalSEOResult = {
        siteId,
        url,
        domain,
        napConsistency,
        googleBusinessProfile,
        localBusinessSchema,
        localKeywordUsage,
        mapEmbed,
        overallScore,
        grade,
        recommendations: uniqueRecommendations,
        createdAt: new Date().toISOString()
      };
      
      // Store results in database
      await this.storeLocalSEOResults(result);
      
      return result;
    } catch (error) {
      console.error(`Error analyzing Local SEO for ${url}:`, error);
      throw error;
    }
  }
  
  /**
   * Analyze NAP consistency across pages
   */
  private static async analyzeNAPConsistency(
    $: cheerio.CheerioAPI, 
    otherPages: {url: string, html: string}[]
  ): Promise<NAPConsistencyResult> {
    // Extract NAP from main page
    const mainPageNAP = this.extractNAPInfo($);
    
    if (!mainPageNAP) {
      return {
        isConsistent: false,
        detectedInstances: [],
        consistencyScore: 0,
        inconsistencies: ['No NAP information detected on main page']
      };
    }
    
    const detectedInstances: NAPInfo[] = [mainPageNAP];
    const inconsistencies: string[] = [];
    
    // Check other pages for NAP information
    for (const page of otherPages) {
      const $page = cheerio.load(page.html);
      const pageNAP = this.extractNAPInfo($page);
      
      if (pageNAP) {
        detectedInstances.push(pageNAP);
        
        // Check for inconsistencies
        if (pageNAP.name !== mainPageNAP.name) {
          inconsistencies.push(`Inconsistent business name on ${page.url}`);
        }
        
        if (pageNAP.phone !== mainPageNAP.phone) {
          inconsistencies.push(`Inconsistent phone number on ${page.url}`);
        }
        
        if (pageNAP.address.formatted !== mainPageNAP.address.formatted) {
          inconsistencies.push(`Inconsistent address on ${page.url}`);
        }
      }
    }
    
    // Calculate consistency score
    let consistencyScore = 100;
    if (inconsistencies.length > 0) {
      consistencyScore = Math.max(0, 100 - (inconsistencies.length * 20));
    }
    
    return {
      isConsistent: inconsistencies.length === 0,
      detectedInstances,
      consistencyScore,
      inconsistencies
    };
  }
  
  /**
   * Extract NAP information from a page
   */
  private static extractNAPInfo($: cheerio.CheerioAPI): NAPInfo | null {
    // Look for LocalBusiness schema first
    const localBusinessSchema = this.extractLocalBusinessSchema($);
    
    if (localBusinessSchema && 
        localBusinessSchema.name && 
        localBusinessSchema.address && 
        localBusinessSchema.telephone) {
      return {
        name: localBusinessSchema.name,
        address: {
          streetAddress: localBusinessSchema.address.streetAddress,
          addressLocality: localBusinessSchema.address.addressLocality,
          addressRegion: localBusinessSchema.address.addressRegion,
          postalCode: localBusinessSchema.address.postalCode,
          addressCountry: localBusinessSchema.address.addressCountry,
          formatted: this.formatAddress(localBusinessSchema.address)
        },
        phone: localBusinessSchema.telephone
      };
    }
    
    // Fallback to generic DOM search
    // Note: This is a simplified approach; real implementation would be more robust
    const name = $('h1').first().text().trim() || 
                 $('meta[property="og:site_name"]').attr('content') ||
                 $('title').text().trim();
    
    // Look for address in footer, contact sections, etc.
    const addressElement = $('.address, .contact-address, footer address, [itemtype*="PostalAddress"]').first();
    const address = addressElement.length ? addressElement.text().trim() : '';
    
    // Look for phone in common locations
    const phoneElement = $('.phone, .contact-phone, a[href^="tel:"], [itemprop="telephone"]').first();
    const phone = phoneElement.length 
      ? phoneElement.text().trim() || phoneElement.attr('href')?.replace('tel:', '') 
      : '';
    
    if (name && (address || phone)) {
      return {
        name,
        address: {
          formatted: address
        },
        phone: phone || ''
      };
    }
    
    return null;
  }
  
  /**
   * Format address components into a string
   */
  private static formatAddress(address: any): string {
    if (typeof address === 'string') return address;
    
    const parts = [];
    if (address.streetAddress) parts.push(address.streetAddress);
    if (address.addressLocality) {
      const locality = [address.addressLocality];
      if (address.addressRegion) locality.push(address.addressRegion);
      parts.push(locality.join(', '));
    }
    if (address.postalCode) parts.push(address.postalCode);
    if (address.addressCountry) parts.push(address.addressCountry);
    
    return parts.join(', ');
  }
  
  /**
   * Generate recommendations for NAP consistency
   */
  private static generateNAPRecommendations(result: NAPConsistencyResult): string[] {
    if (result.isConsistent && result.detectedInstances.length > 0) {
      return [];
    }
    
    const recommendations: string[] = [];
    
    if (result.detectedInstances.length === 0) {
      recommendations.push('Add complete NAP (Name, Address, Phone) information to your website');
      recommendations.push('Implement LocalBusiness schema markup with complete contact information');
      return recommendations;
    }
    
    if (!result.isConsistent) {
      recommendations.push('Ensure NAP information is consistent across all pages of your website');
      
      if (result.inconsistencies.some(i => i.includes('name'))) {
        recommendations.push('Standardize your business name across all pages');
      }
      
      if (result.inconsistencies.some(i => i.includes('phone'))) {
        recommendations.push('Use the same phone number format across your website');
      }
      
      if (result.inconsistencies.some(i => i.includes('address'))) {
        recommendations.push('Use the same address format across your website');
      }
    }
    
    return recommendations;
  }
  
  /**
   * Detect Google Business Profile
   */
  private static async detectGoogleBusinessProfile(
    $: cheerio.CheerioAPI, 
    domain: string
  ): Promise<GoogleBusinessProfileResult> {
    let detected = false;
    let url: string | undefined;
    let isVerified = false;
    
    // Look for Google Business Profile link
    $('a[href*="google.com/business"], a[href*="business.google.com"]').each((_, el) => {
      detected = true;
      url = $(el).attr('href') || undefined;
    });
    
    // Look for schema markup with sameAs pointing to Google Business
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const schema = JSON.parse($(el).html() || '{}');
        if (schema.sameAs && Array.isArray(schema.sameAs)) {
          schema.sameAs.forEach((link: string) => {
            if (link.includes('business.google.com') || link.includes('g.page/')) {
              detected = true;
              url = link;
            }
          });
        }
      } catch (e) {
        // Skip invalid JSON
      }
    });
    
    // TODO: In a real implementation, we would verify the profile and get details
    // This would require an API call to Google Places or similar
    
    return {
      detected,
      url,
      isVerified,
      details: {
        reviews: 0,
        rating: 0
      }
    };
  }
  
  /**
   * Generate recommendations for Google Business Profile
   */
  private static generateGBPRecommendations(result: GoogleBusinessProfileResult): string[] {
    const recommendations: string[] = [];
    
    if (!result.detected) {
      recommendations.push('Create and verify a Google Business Profile for your business');
      recommendations.push('Add your Google Business Profile link to your website');
      recommendations.push('Include your Google Business Profile in your schema markup');
    } else if (!result.isVerified) {
      recommendations.push('Verify your Google Business Profile to improve local search visibility');
    }
    
    return recommendations;
  }
  
  /**
   * Validate local business schema implementation
   */
  private static async validateLocalBusinessSchema(
    $: cheerio.CheerioAPI,
    url: string
  ): Promise<LocalBusinessSchemaResult> {
    const schema = this.extractLocalBusinessSchema($);
    
    if (!schema) {
      return {
        present: false,
        isValid: false,
        missingProperties: this.requiredLocalBusinessProps,
        score: 0,
        recommendations: [
          'Implement LocalBusiness schema markup on your website',
          'Include all required properties: name, address, telephone, openingHours, and geo coordinates',
          'Add schema markup using JSON-LD format in the page header'
        ]
      };
    }
    
    const missingRequired: string[] = [];
    const missingRecommended: string[] = [];
    
    // Check required properties
    for (const prop of this.requiredLocalBusinessProps) {
      if (!schema[prop]) {
        missingRequired.push(prop);
      }
    }
    
    // Check recommended properties
    for (const prop of this.recommendedLocalBusinessProps) {
      if (!schema[prop]) {
        missingRecommended.push(prop);
      }
    }
    
    // Calculate score based on completeness
    const requiredWeight = 0.7;
    const recommendedWeight = 0.3;
    
    const requiredScore = this.requiredLocalBusinessProps.length > 0
      ? ((this.requiredLocalBusinessProps.length - missingRequired.length) / this.requiredLocalBusinessProps.length) * 100
      : 0;
      
    const recommendedScore = this.recommendedLocalBusinessProps.length > 0
      ? ((this.recommendedLocalBusinessProps.length - missingRecommended.length) / this.recommendedLocalBusinessProps.length) * 100
      : 0;
    
    const score = Math.round((requiredScore * requiredWeight) + (recommendedScore * recommendedWeight));
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (missingRequired.length > 0) {
      recommendations.push(`Add these required properties to your LocalBusiness schema: ${missingRequired.join(', ')}`);
    }
    
    if (missingRecommended.length > 0) {
      recommendations.push(`Consider adding these recommended properties to your LocalBusiness schema: ${missingRecommended.join(', ')}`);
    }
    
    if (missingRequired.length === 0 && missingRecommended.length === 0) {
      recommendations.push('Your LocalBusiness schema implementation is excellent');
    }
    
    return {
      present: true,
      isValid: missingRequired.length === 0,
      missingProperties: [...missingRequired, ...missingRecommended],
      schema,
      score,
      recommendations
    };
  }
  
  /**
   * Extract LocalBusiness schema from a page
   */
  private static extractLocalBusinessSchema($: cheerio.CheerioAPI): any {
    let localBusinessSchema = null;
    
    // Extract from JSON-LD
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const schemaText = $(el).html();
        if (schemaText) {
          const schema = JSON.parse(schemaText);
          
          // Handle both direct and @graph contained schemas
          const checkSchema = (item: any) => {
            if (item['@type'] === 'LocalBusiness' || 
                item['@type']?.includes('LocalBusiness') ||
                (item['@type'] && typeof item['@type'] === 'string' && item['@type'].endsWith('Business'))) {
              localBusinessSchema = item;
              return true;
            }
            return false;
          };
          
          if (Array.isArray(schema)) {
            schema.some(checkSchema);
          } else if (schema['@graph'] && Array.isArray(schema['@graph'])) {
            schema['@graph'].some(checkSchema);
          } else {
            checkSchema(schema);
          }
        }
      } catch (error) {
        // Skip invalid JSON
      }
    });
    
    return localBusinessSchema;
  }
  
  /**
   * Analyze local keyword usage
   */
  private static analyzeLocalKeywordUsage($: cheerio.CheerioAPI, url: string): LocalKeywordResult {
    const title = $('title').text().trim();
    const h1 = $('h1').text().trim();
    const h2 = $('h2').text().trim();
    
    // Get all text content
    const content = $('body').text().trim();
    
    // Process URL to extract potential location
    const urlParts = url.toLowerCase().split(/[\/\-_]/);
    const possibleLocationInUrl = urlParts.filter(part => 
      part.length > 3 && 
      !this.localKeywords.includes(part) && 
      !['www', 'http', 'https', 'com', 'org', 'net', 'html', 'php'].includes(part)
    );
    
    // Detect local keywords
    const detectedKeywords = new Set<string>();
    
    // Check predefined local keywords
    for (const keyword of this.localKeywords) {
      if (content.toLowerCase().includes(keyword)) {
        detectedKeywords.add(keyword);
      }
    }
    
    // Check for potential location in URL
    for (const part of possibleLocationInUrl) {
      if (content.toLowerCase().includes(part)) {
        detectedKeywords.add(part);
      }
    }
    
    // Convert to array
    const localKeywords = Array.from(detectedKeywords);
    
    // Calculate density
    const wordCount = content.split(/\s+/).length;
    const keywordInstances = localKeywords.reduce((count, keyword) => {
      const regex = new RegExp('\\b' + keyword + '\\b', 'gi');
      const matches = content.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);
    
    const localKeywordDensity = wordCount > 0 
      ? Math.round((keywordInstances / wordCount) * 100) 
      : 0;
    
    // Check keyword placement
    const keywordInTitle = localKeywords.some(keyword => title.toLowerCase().includes(keyword));
    const keywordInHeadings = localKeywords.some(keyword => 
      h1.toLowerCase().includes(keyword) || h2.toLowerCase().includes(keyword)
    );
    const keywordInContent = keywordInstances > 0;
    
    // Calculate score
    let score = 0;
    if (localKeywords.length > 0) score += 20;
    if (keywordInTitle) score += 30;
    if (keywordInHeadings) score += 25;
    if (keywordInContent && localKeywordDensity > 0 && localKeywordDensity <= 3) score += 25;
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (localKeywords.length === 0) {
      recommendations.push('Add local keywords to your website content');
    }
    
    if (!keywordInTitle) {
      recommendations.push('Include local keywords in your page title');
    }
    
    if (!keywordInHeadings) {
      recommendations.push('Add local keywords to your page headings (H1, H2)');
    }
    
    if (localKeywordDensity < 0.5) {
      recommendations.push('Increase local keyword usage in your content (aim for 1-3% density)');
    } else if (localKeywordDensity > 3) {
      recommendations.push('Reduce local keyword density in your content (currently too high)');
    }
    
    return {
      localKeywords,
      localKeywordDensity,
      keywordInTitle,
      keywordInHeadings,
      keywordInContent,
      score,
      recommendations
    };
  }
  
  /**
   * Detect map embeds on the page
   */
  private static detectMapEmbed($: cheerio.CheerioAPI): MapEmbedResult {
    let detected = false;
    let embedType: 'google' | 'bing' | 'other' | undefined;
    let hasAddress = false;
    
    // Check for Google Maps embed
    if (
      $('iframe[src*="google.com/maps"]').length > 0 ||
      $('div.google-map, div.google-maps').length > 0 ||
      $('a[href*="maps.google.com"]').length > 0
    ) {
      detected = true;
      embedType = 'google';
    }
    
    // Check for Bing Maps embed
    if (
      $('iframe[src*="bing.com/maps"]').length > 0 ||
      $('div.bing-map, div.bing-maps').length > 0 ||
      $('a[href*="bing.com/maps"]').length > 0
    ) {
      detected = true;
      embedType = 'bing';
    }
    
    // Check for other map embeds
    if (
      $('iframe[src*="map"], iframe[src*="maps"]').length > 0 ||
      $('div.map, div.maps, .location-map').length > 0
    ) {
      detected = true;
      embedType = embedType || 'other';
    }
    
    // Check if the map contains address
    if (detected) {
      // Assuming address is near the map
      const mapElements = $(
        'iframe[src*="map"], iframe[src*="maps"], div.map, div.maps, .google-map, .google-maps, .location-map'
      );
      
      mapElements.each((_, el) => {
        const $parent = $(el).parent();
        const nearbyText = $parent.text() + ' ' + $parent.next().text() + ' ' + $parent.prev().text();
        
        // Simple check for address patterns
        if (
          /\d+\s+[A-Za-z\s]+,\s+[A-Za-z\s]+,\s+[A-Z]{2}/.test(nearbyText) || // US address format
          /\d+\s+[A-Za-z\s]+,\s+[A-Za-z\s]+,\s+[A-Z0-9]{2,}/.test(nearbyText) // Generic address format
        ) {
          hasAddress = true;
        }
      });
    }
    
    // Calculate score
    let score = 0;
    if (detected) score += 70;
    if (embedType === 'google') score += 20; // Google Maps is preferred
    if (hasAddress) score += 10;
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (!detected) {
      recommendations.push('Add a map embed (preferably Google Maps) to your website');
      recommendations.push('Include an interactive map on your contact page with directions');
    } else if (!hasAddress) {
      recommendations.push('Add your business address near or on the map embed');
    }
    
    if (detected && embedType !== 'google') {
      recommendations.push('Consider using Google Maps rather than other map providers for better SEO');
    }
    
    return {
      detected,
      embedType,
      hasAddress,
      score,
      recommendations
    };
  }
  
  /**
   * Store local SEO results in the database
   */
  private static async storeLocalSEOResults(result: LocalSEOResult): Promise<void> {
    try {
      // Store in localseo_analyses table
      const { error } = await this.supabase
        .from('localseo_analyses')
        .upsert({
          site_id: result.siteId,
          url: result.url,
          domain: result.domain,
          nap_consistency_score: result.napConsistency.consistencyScore,
          nap_instances: result.napConsistency.detectedInstances.length,
          nap_is_consistent: result.napConsistency.isConsistent,
          gbp_detected: result.googleBusinessProfile.detected,
          gbp_verified: result.googleBusinessProfile.isVerified,
          local_schema_present: result.localBusinessSchema.present,
          local_schema_valid: result.localBusinessSchema.isValid,
          local_schema_score: result.localBusinessSchema.score,
          local_keyword_count: result.localKeywordUsage.localKeywords.length,
          local_keyword_density: result.localKeywordUsage.localKeywordDensity,
          map_detected: result.mapEmbed.detected,
          map_has_address: result.mapEmbed.hasAddress,
          overall_score: result.overallScore,
          grade: result.grade.letter,
          recommendations: result.recommendations,
          created_at: result.createdAt
        });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error storing local SEO results:', error);
    }
  }
  
  /**
   * Get cached Local SEO analysis for a site
   */
  static async getCachedAnalysis(siteId: string, domain: string): Promise<LocalSEOResult | null> {
    try {
      // Check for recent analysis (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data, error } = await this.supabase
        .from('localseo_analyses')
        .select('*')
        .eq('site_id', siteId)
        .eq('domain', domain)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error || !data || data.length === 0) {
        return null;
      }
      
      // Convert from database format to LocalSEOResult
      const dbResult = data[0];
      
      return {
        siteId: dbResult.site_id,
        url: dbResult.url,
        domain: dbResult.domain,
        napConsistency: {
          isConsistent: dbResult.nap_is_consistent,
          detectedInstances: [], // Simplified for cache
          consistencyScore: dbResult.nap_consistency_score,
          inconsistencies: []
        },
        googleBusinessProfile: {
          detected: dbResult.gbp_detected,
          isVerified: dbResult.gbp_verified
        },
        localBusinessSchema: {
          present: dbResult.local_schema_present,
          isValid: dbResult.local_schema_valid,
          missingProperties: [],
          score: dbResult.local_schema_score,
          recommendations: []
        },
        localKeywordUsage: {
          localKeywords: [],
          localKeywordDensity: dbResult.local_keyword_density,
          keywordInTitle: false, // Simplified for cache
          keywordInHeadings: false,
          keywordInContent: true,
          score: 0, // Will be recalculated
          recommendations: []
        },
        mapEmbed: {
          detected: dbResult.map_detected,
          hasAddress: dbResult.map_has_address,
          score: dbResult.map_detected ? 100 : 0,
          recommendations: []
        },
        overallScore: dbResult.overall_score,
        grade: GradingSystemService.getGrade(dbResult.overall_score),
        recommendations: dbResult.recommendations,
        createdAt: dbResult.created_at
      };
    } catch (error) {
      console.error('Error getting cached local SEO analysis:', error);
      return null;
    }
  }
} 