import { createClient } from '@/lib/supabase/client';
import { liteLLMProvider } from '@/lib/ai/litellm-provider';

export interface BusinessLocation {
  id?: string;
  projectId: string;
  locationName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  isPrimary: boolean;
}

export interface LocationSEOAnalysis {
  id?: string;
  locationId: string;
  siteId: string;
  localSeoScore: number;
  citationConsistencyScore: number;
  localRankingPositions?: Record<string, number>;
  localBacklinkQuality: number;
  reviewSentimentScore: number;
  gbpOptimizationScore: number;
  localRecommendations: string[];
}

export interface MultiLocationSEOParams {
  projectId: string;
  siteId: string;
  locationIds?: string[];
  includeRankingData?: boolean;
}

export class MultiLocationSEOService {
  private static supabase = createClient('supabase', process.env.NEXT_PUBLIC_SUPABASE_URL || '');

  /**
   * Create a new business location
   */
  static async createLocation(location: BusinessLocation): Promise<BusinessLocation> {
    try {
      // Check if this is the first location being set as primary
      let isPrimary = location.isPrimary;
      
      if (isPrimary) {
        const { data: existingPrimary } = await this.supabase
          .from('business_locations')
          .select('id')
          .eq('project_id', location.projectId)
          .eq('is_primary', true)
          .limit(1);
          
        if (existingPrimary && existingPrimary.length > 0) {
          // This project already has a primary location
          // In a real app, you might want to update the existing primary or show a warning
          console.warn('Project already has a primary location. Setting this location as non-primary.');
          isPrimary = false;
        }
      }
      
      const { data, error } = await this.supabase
        .from('business_locations')
        .insert({
          project_id: location.projectId,
          location_name: location.locationName,
          address_line1: location.addressLine1,
          address_line2: location.addressLine2,
          city: location.city,
          state: location.state,
          postal_code: location.postalCode,
          country: location.country,
          phone: location.phone,
          email: location.email,
          latitude: location.latitude,
          longitude: location.longitude,
          is_primary: isPrimary
        })
        .select('id')
        .single();
        
      if (error) {
        console.error('Error creating business location:', error);
        throw error;
      }
      
      return { ...location, id: data.id, isPrimary };
    } catch (error: any) {
      console.error('Error creating business location:', error);
      throw error;
    }
  }

  /**
   * Get business locations for a project
   */
  static async getProjectLocations(projectId: string): Promise<BusinessLocation[]> {
    try {
      const { data, error } = await this.supabase
        .from('business_locations')
        .select('*')
        .eq('project_id', projectId)
        .order('is_primary', { ascending: false })
        .order('location_name', { ascending: true });
        
      if (error) {
        console.error('Error fetching business locations:', error);
        throw error;
      }
      
      return data.map(item => ({
        id: item.id,
        projectId: item.project_id,
        locationName: item.location_name,
        addressLine1: item.address_line1,
        addressLine2: item.address_line2,
        city: item.city,
        state: item.state,
        postalCode: item.postal_code,
        country: item.country,
        phone: item.phone,
        email: item.email,
        latitude: item.latitude,
        longitude: item.longitude,
        isPrimary: item.is_primary
      }));
    } catch (error: any) {
      console.error('Error fetching business locations:', error);
      throw error;
    }
  }

  /**
   * Update a business location
   */
  static async updateLocation(id: string, locationData: Partial<BusinessLocation>): Promise<BusinessLocation> {
    try {
      // Convert from camelCase to snake_case for database
      const dbData: Record<string, any> = {};
      
      if (locationData.projectId) dbData.project_id = locationData.projectId;
      if (locationData.locationName) dbData.location_name = locationData.locationName;
      if (locationData.addressLine1) dbData.address_line1 = locationData.addressLine1;
      if (locationData.addressLine2 !== undefined) dbData.address_line2 = locationData.addressLine2;
      if (locationData.city) dbData.city = locationData.city;
      if (locationData.state) dbData.state = locationData.state;
      if (locationData.postalCode) dbData.postal_code = locationData.postalCode;
      if (locationData.country) dbData.country = locationData.country;
      if (locationData.phone !== undefined) dbData.phone = locationData.phone;
      if (locationData.email !== undefined) dbData.email = locationData.email;
      if (locationData.latitude !== undefined) dbData.latitude = locationData.latitude;
      if (locationData.longitude !== undefined) dbData.longitude = locationData.longitude;
      if (locationData.isPrimary !== undefined) dbData.is_primary = locationData.isPrimary;
      
      // Handle primary location update
      if (locationData.isPrimary) {
        const { data: existingLocation } = await this.supabase
          .from('business_locations')
          .select('project_id')
          .eq('id', id)
          .single();
          
        if (existingLocation) {
          // Update all other locations in this project to not be primary
          await this.supabase
            .from('business_locations')
            .update({ is_primary: false })
            .eq('project_id', existingLocation.project_id)
            .neq('id', id);
        }
      }
      
      const { data, error } = await this.supabase
        .from('business_locations')
        .update(dbData)
        .eq('id', id)
        .select('*')
        .single();
        
      if (error) {
        console.error('Error updating business location:', error);
        throw error;
      }
      
      return {
        id: data.id,
        projectId: data.project_id,
        locationName: data.location_name,
        addressLine1: data.address_line1,
        addressLine2: data.address_line2,
        city: data.city,
        state: data.state,
        postalCode: data.postal_code,
        country: data.country,
        phone: data.phone,
        email: data.email,
        latitude: data.latitude,
        longitude: data.longitude,
        isPrimary: data.is_primary
      };
    } catch (error: any) {
      console.error('Error updating business location:', error);
      throw error;
    }
  }

  /**
   * Analyze SEO for multiple locations
   */
  static async analyzeMultiLocationSEO(params: MultiLocationSEOParams): Promise<LocationSEOAnalysis[]> {
    try {
      const { projectId, siteId, locationIds, includeRankingData = false } = params;
      
      // Get locations to analyze
      let locations: BusinessLocation[] = [];
      
      if (locationIds && locationIds.length > 0) {
        const { data, error } = await this.supabase
          .from('business_locations')
          .select('*')
          .in('id', locationIds)
          .eq('project_id', projectId);
          
        if (error) {
          console.error('Error fetching locations by IDs:', error);
          throw error;
        }
        
        locations = data.map(item => ({
          id: item.id,
          projectId: item.project_id,
          locationName: item.location_name,
          addressLine1: item.address_line1,
          addressLine2: item.address_line2,
          city: item.city,
          state: item.state,
          postalCode: item.postal_code,
          country: item.country,
          phone: item.phone,
          email: item.email,
          latitude: item.latitude,
          longitude: item.longitude,
          isPrimary: item.is_primary
        }));
      } else {
        locations = await this.getProjectLocations(projectId);
      }
      
      if (locations.length === 0) {
        throw new Error('No locations found to analyze');
      }
      
      // Get site data for analysis
      const { data: siteData, error: siteError } = await this.supabase
        .from('site_crawls')
        .select('domain')
        .eq('id', siteId)
        .single();
        
      if (siteError) {
        console.error('Error fetching site data:', siteError);
        throw siteError;
      }
      
      // Get local SEO analysis data if available
      const { data: localSEOData, error: localSEOError } = await this.supabase
        .from('localseo_analyses')
        .select('*')
        .eq('site_id', siteId)
        .limit(1);
        
      if (localSEOError) {
        console.error('Error fetching local SEO data:', localSEOError);
      }
      
      // Get keyword ranking data if requested
      let rankingData: any[] = [];
      if (includeRankingData) {
        const { data, error } = await this.supabase
          .from('keyword_rankings')
          .select('keyword, position')
          .eq('site_id', siteId)
          .order('created_at', { ascending: false })
          .limit(50);
          
        if (!error) {
          rankingData = data || [];
        }
      }
      
      // Analyze each location
      const analysisResults: LocationSEOAnalysis[] = [];
      
      for (const location of locations) {
        if (!location.id) {
          console.warn('Skipping location without ID');
          continue;
        }

        // Check if analysis already exists
        const { data: existingAnalysis, error: analysisError } = await this.supabase
          .from('location_seo_analysis')
          .select('*')
          .eq('location_id', location.id)
          .eq('site_id', siteId)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (!analysisError && existingAnalysis && existingAnalysis.length > 0) {
          // Return existing analysis
          analysisResults.push(this.mapDatabaseToLocationAnalysis(existingAnalysis[0]));
          continue;
        }
        
        // Create the prompt for analyzing this location
        const prompt = `
          You are an expert in local SEO. Analyze the following business location for a multi-location business
          and provide a comprehensive local SEO assessment.
          
          BUSINESS INFORMATION:
          Location Name: ${location.locationName}
          Address: ${location.addressLine1}${location.addressLine2 ? ', ' + location.addressLine2 : ''}
          City: ${location.city}
          State: ${location.state}
          Postal Code: ${location.postalCode}
          Country: ${location.country}
          Phone: ${location.phone || 'Not provided'}
          Email: ${location.email || 'Not provided'}
          Primary Location: ${location.isPrimary ? 'Yes' : 'No'}
          
          WEBSITE:
          Domain: ${siteData?.domain || 'Not available'}
          
          ${localSEOData && localSEOData.length > 0 ? `
          EXISTING LOCAL SEO ANALYSIS:
          NAP Consistency Score: ${localSEOData[0].nap_consistency_score}/100
          Local Schema Present: ${localSEOData[0].local_schema_present ? 'Yes' : 'No'}
          Local Schema Valid: ${localSEOData[0].local_schema_valid ? 'Yes' : 'No'}
          Google Business Profile Detected: ${localSEOData[0].gbp_detected ? 'Yes' : 'No'}
          ` : ''}
          
          ${rankingData.length > 0 ? `
          TOP RANKING KEYWORDS (Sample):
          ${rankingData.slice(0, 10).map(r => `${r.keyword}: Position ${r.position}`).join('\n')}
          ` : ''}
          
          Your task is to:
          1. Evaluate local SEO for this specific location
          2. Assess citation consistency across the web
          3. Evaluate local backlink quality
          4. Analyze review sentiment
          5. Check Google Business Profile optimization
          6. Provide location-specific recommendations
          
          Return your analysis as a JSON object with these properties:
          {
            "localSeoScore": number,  // 0-100 overall score
            "citationConsistencyScore": number,  // 0-100 score for NAP consistency
            "localRankingPositions": {  // Estimated ranking positions for local queries
              "[query]": number  // Position
            },
            "localBacklinkQuality": number,  // 0-100 score for local backlink quality
            "reviewSentimentScore": number,  // 0-100 score for review sentiment
            "gbpOptimizationScore": number,  // 0-100 score for Google Business Profile
            "localRecommendations": string[]  // Array of 5-10 specific recommendations
          }
        `;
        
        // Call the LLM
        const model = liteLLMProvider.getLangChainModel();
        const response = await model.invoke(prompt);
        
        // Parse the JSON response
        const responseText = response.content.toString();
        const jsonMatch = responseText.match(/{[\s\S]*}/);
        if (!jsonMatch) {
          console.error(`Invalid response format for location: ${location.locationName}`);
          continue;
        }
        
        const analysis = JSON.parse(jsonMatch[0]);
        
        // Store the analysis
        const locationAnalysis: LocationSEOAnalysis = {
          locationId: location.id,
          siteId,
          localSeoScore: analysis.localSeoScore,
          citationConsistencyScore: analysis.citationConsistencyScore,
          localRankingPositions: analysis.localRankingPositions,
          localBacklinkQuality: analysis.localBacklinkQuality,
          reviewSentimentScore: analysis.reviewSentimentScore,
          gbpOptimizationScore: analysis.gbpOptimizationScore,
          localRecommendations: analysis.localRecommendations
        };
        
        const { data, error } = await this.supabase
          .from('location_seo_analysis')
          .insert({
            location_id: locationAnalysis.locationId,
            site_id: locationAnalysis.siteId,
            local_seo_score: locationAnalysis.localSeoScore,
            citation_consistency_score: locationAnalysis.citationConsistencyScore,
            local_ranking_positions: locationAnalysis.localRankingPositions,
            local_backlink_quality: locationAnalysis.localBacklinkQuality,
            review_sentiment_score: locationAnalysis.reviewSentimentScore,
            gbp_optimization_score: locationAnalysis.gbpOptimizationScore,
            local_recommendations: locationAnalysis.localRecommendations
          })
          .select('id')
          .single();
          
        if (error) {
          console.error('Error storing location SEO analysis:', error);
        } else {
          locationAnalysis.id = data.id;
          analysisResults.push(locationAnalysis);
        }
      }
      
      return analysisResults;
    } catch (error: any) {
      console.error('Error analyzing multi-location SEO:', error);
      throw error;
    }
  }

  /**
   * Get SEO analysis for a specific location
   */
  static async getLocationSEOAnalysis(locationId: string, siteId: string): Promise<LocationSEOAnalysis | null> {
    try {
      const { data, error } = await this.supabase
        .from('location_seo_analysis')
        .select('*')
        .eq('location_id', locationId)
        .eq('site_id', siteId)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (error) {
        console.error('Error fetching location SEO analysis:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        return null;
      }
      
      return this.mapDatabaseToLocationAnalysis(data[0]);
    } catch (error: any) {
      console.error('Error fetching location SEO analysis:', error);
      throw error;
    }
  }

  /**
   * Generate a consolidated report for all locations
   */
  static async generateConsolidatedReport(
    projectId: string,
    siteId: string
  ): Promise<{
    overallScore: number;
    locationScores: Record<string, number>;
    strengths: string[];
    weaknesses: string[];
    recommendations: { priority: 'high' | 'medium' | 'low'; description: string; locations: string[] }[];
    comparison: {
      bestPerforming: { locationName: string; score: number; strengths: string[] };
      worstPerforming: { locationName: string; score: number; weaknesses: string[] };
    };
  }> {
    try {
      // Get all locations for the project
      const locations = await this.getProjectLocations(projectId);
      
      if (locations.length === 0) {
        throw new Error('No locations found for this project');
      }
      
      // Get SEO analysis for all locations
      const locationIds = locations.map(loc => loc.id as string).filter(Boolean);
      const analyses = await this.analyzeMultiLocationSEO({
        projectId,
        siteId,
        locationIds
      });
      
      if (analyses.length === 0) {
        throw new Error('No SEO analyses available for project locations');
      }
      
      // Create a lookup map for location names
      const locationNameMap: Record<string, string> = {};
      locations.forEach(loc => {
        if (loc.id) {
          locationNameMap[loc.id] = loc.locationName;
        }
      });
      
      // Create the prompt for consolidated analysis
      const prompt = `
        You are an expert in multi-location SEO. Generate a consolidated report for the following 
        business locations based on their individual SEO analyses.
        
        LOCATIONS:
        ${locations.map(loc => 
          `${loc.locationName}: ${loc.city}, ${loc.state}, ${loc.country}`
        ).join('\n')}
        
        SEO ANALYSES:
        ${analyses.map(analysis => `
        Location: ${locationNameMap[analysis.locationId] || 'Unknown'}
        Overall Score: ${analysis.localSeoScore}/100
        Citation Consistency: ${analysis.citationConsistencyScore}/100
        Local Backlink Quality: ${analysis.localBacklinkQuality}/100
        Review Sentiment: ${analysis.reviewSentimentScore}/100
        GBP Optimization: ${analysis.gbpOptimizationScore}/100
        Key Recommendations:
        ${analysis.localRecommendations.slice(0, 3).map(rec => `- ${rec}`).join('\n')}
        `).join('\n')}
        
        Your task is to create a consolidated report that:
        1. Calculates an overall score for all locations combined
        2. Identifies common strengths across locations
        3. Identifies common weaknesses across locations
        4. Provides prioritized recommendations that apply to multiple locations
        5. Compares the best and worst performing locations
        
        Return your report as a JSON object with these properties:
        {
          "overallScore": number,  // 0-100 overall score for all locations
          "locationScores": {  // Individual location scores
            "[locationId]": number
          },
          "strengths": string[],  // Common strengths across locations (3-5)
          "weaknesses": string[],  // Common weaknesses across locations (3-5)
          "recommendations": [  // Prioritized recommendations
            {
              "priority": "high" | "medium" | "low",
              "description": string,
              "locations": string[]  // Array of location IDs this applies to
            }
          ],
          "comparison": {
            "bestPerforming": {
              "locationName": string,
              "score": number,
              "strengths": string[]  // 2-3 key strengths
            },
            "worstPerforming": {
              "locationName": string,
              "score": number,
              "weaknesses": string[]  // 2-3 key weaknesses
            }
          }
        }
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
      
      return JSON.parse(jsonMatch[0]);
    } catch (error: any) {
      console.error('Error generating consolidated report:', error);
      throw error;
    }
  }
  
  /**
   * Map database response to LocationSEOAnalysis interface
   */
  private static mapDatabaseToLocationAnalysis(data: any): LocationSEOAnalysis {
    return {
      id: data.id,
      locationId: data.location_id,
      siteId: data.site_id,
      localSeoScore: data.local_seo_score,
      citationConsistencyScore: data.citation_consistency_score,
      localRankingPositions: data.local_ranking_positions,
      localBacklinkQuality: data.local_backlink_quality,
      reviewSentimentScore: data.review_sentiment_score,
      gbpOptimizationScore: data.gbp_optimization_score,
      localRecommendations: data.local_recommendations
    };
  }
} 