import { createServerClient } from '../supabase/server';

export class BacklinkService {
  // Get all backlinks for a project
  static async getBacklinks(projectId: string) {
    const supabase = createServerClient();
    
    try {
      const { data, error } = await supabase
        .from('backlinks')
        .select('*')
        .eq('project_id', projectId)
        .order('first_discovered', { ascending: false });
      
      if (error) {
        console.error('Error fetching backlinks:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in getBacklinks:', error);
      return null;
    }
  }
  
  // Get backlink details
  static async getBacklinkDetails(backlinkId: string) {
    const supabase = createServerClient();
    
    try {
      const { data, error } = await supabase
        .from('backlinks')
        .select('*')
        .eq('id', backlinkId)
        .single();
      
      if (error) {
        console.error('Error fetching backlink details:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in getBacklinkDetails:', error);
      return null;
    }
  }
  
  // Add a new backlink
  static async addBacklink(projectId: string, sourceUrl: string, targetUrl: string, anchorText?: string, linkType: string = 'external') {
    const supabase = createServerClient();
    
    try {
      const { data, error } = await supabase
        .from('backlinks')
        .insert([
          {
            project_id: projectId,
            source_url: sourceUrl,
            target_url: targetUrl,
            anchor_text: anchorText,
            link_type: linkType,
            // Mock values for page and domain authority
            page_authority: Math.random() * 100,
            domain_authority: Math.random() * 100
          }
        ])
        .select()
        .single();
      
      if (error) {
        console.error('Error adding backlink:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in addBacklink:', error);
      return null;
    }
  }
  
  // Update backlink status
  static async updateBacklinkStatus(backlinkId: string, status: string) {
    const supabase = createServerClient();
    
    try {
      const { data, error } = await supabase
        .from('backlinks')
        .update({ 
          status,
          last_checked: new Date().toISOString()
        })
        .eq('id', backlinkId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating backlink status:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in updateBacklinkStatus:', error);
      return null;
    }
  }
  
  // Delete backlink
  static async deleteBacklink(backlinkId: string) {
    const supabase = createServerClient();
    
    try {
      const { error } = await supabase
        .from('backlinks')
        .delete()
        .eq('id', backlinkId);
      
      if (error) {
        console.error('Error deleting backlink:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error in deleteBacklink:', error);
      return false;
    }
  }
  
  // Get or create backlink analysis
  static async getOrCreateBacklinkAnalysis(projectId: string) {
    const supabase = createServerClient();
    
    try {
      // First, attempt to get the latest analysis
      const { data: existingAnalysis, error: fetchError } = await supabase
        .from('backlink_analysis')
        .select('*')
        .eq('project_id', projectId)
        .order('analyzed_at', { ascending: false })
        .limit(1)
        .single();
      
      if (!fetchError && existingAnalysis) {
        return existingAnalysis;
      }
      
      // If no analysis exists or there was an error, create a new one with mock data
      const { data: backlinks, error: backlinkError } = await supabase
        .from('backlinks')
        .select('*')
        .eq('project_id', projectId);
      
      if (backlinkError) {
        console.error('Error fetching backlinks for analysis:', backlinkError);
        return null;
      }
      
      // Generate mock analysis data
      const totalBacklinks = backlinks?.length || 0;
      const uniqueDomains = new Set(backlinks?.map(b => new URL(b.source_url).hostname) || []).size;
      
      // Create mock distribution of backlink types
      const backlinksByType = {
        external: Math.floor(Math.random() * 100),
        internal: Math.floor(Math.random() * 50),
        nofollow: Math.floor(Math.random() * 30)
      };
      
      // Create mock top anchor texts
      const topAnchorTexts = {
        "brand name": Math.floor(Math.random() * 50),
        "click here": Math.floor(Math.random() * 30),
        "learn more": Math.floor(Math.random() * 20),
        "website": Math.floor(Math.random() * 15),
        "read more": Math.floor(Math.random() * 10)
      };
      
      const { data: newAnalysis, error: createError } = await supabase
        .from('backlink_analysis')
        .insert([
          {
            project_id: projectId,
            total_backlinks: totalBacklinks,
            unique_domains: uniqueDomains,
            average_domain_authority: Math.random() * 70 + 10,
            backlinks_by_type: backlinksByType,
            top_anchor_texts: topAnchorTexts
          }
        ])
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating backlink analysis:', createError);
        return null;
      }
      
      return newAnalysis;
    } catch (error) {
      console.error('Error in getOrCreateBacklinkAnalysis:', error);
      return null;
    }
  }
  
  // Create backlink report
  static async createBacklinkReport(projectId: string, reportName: string, userId: string, schedule?: string) {
    const supabase = createServerClient();
    
    try {
      // Get the latest analysis to include in the report
      const analysis = await this.getOrCreateBacklinkAnalysis(projectId);
      
      if (!analysis) {
        return null;
      }
      
      // Get the backlinks to include in the report
      const { data: backlinks, error: backlinkError } = await supabase
        .from('backlinks')
        .select('*')
        .eq('project_id', projectId)
        .order('domain_authority', { ascending: false })
        .limit(100);
      
      if (backlinkError) {
        console.error('Error fetching backlinks for report:', backlinkError);
        return null;
      }
      
      // Create the report
      const reportData = {
        analysis,
        backlinks: backlinks || [],
        generated_at: new Date().toISOString(),
        summary: {
          quality_score: Math.floor(Math.random() * 100),
          growth_rate: `${(Math.random() * 10).toFixed(1)}%`,
          most_valuable_backlink: backlinks && backlinks.length > 0 ? backlinks[0] : null
        }
      };
      
      let nextRun = null;
      if (schedule) {
        // Calculate next run based on schedule
        const now = new Date();
        switch (schedule) {
          case 'daily':
            nextRun = new Date(now.setDate(now.getDate() + 1));
            break;
          case 'weekly':
            nextRun = new Date(now.setDate(now.getDate() + 7));
            break;
          case 'monthly':
            nextRun = new Date(now.setMonth(now.getMonth() + 1));
            break;
          default:
            nextRun = null;
        }
      }
      
      const { data: report, error: reportError } = await supabase
        .from('backlink_reports')
        .insert([
          {
            project_id: projectId,
            report_name: reportName,
            report_data: reportData,
            created_by: userId,
            schedule,
            next_run: nextRun ? nextRun.toISOString() : null
          }
        ])
        .select()
        .single();
      
      if (reportError) {
        console.error('Error creating backlink report:', reportError);
        return null;
      }
      
      return report;
    } catch (error) {
      console.error('Error in createBacklinkReport:', error);
      return null;
    }
  }
  
  // Get all backlink reports for a project
  static async getBacklinkReports(projectId: string) {
    const supabase = createServerClient();
    
    try {
      const { data, error } = await supabase
        .from('backlink_reports')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching backlink reports:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in getBacklinkReports:', error);
      return null;
    }
  }
  
  // Get competitor backlinks
  static async getCompetitorBacklinks(projectId: string, competitorUrl?: string) {
    const supabase = createServerClient();
    
    try {
      let query = supabase
        .from('competitor_backlinks')
        .select('*')
        .eq('project_id', projectId);
      
      if (competitorUrl) {
        query = query.eq('competitor_url', competitorUrl);
      }
      
      const { data, error } = await query.order('domain_authority', { ascending: false });
      
      if (error) {
        console.error('Error fetching competitor backlinks:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in getCompetitorBacklinks:', error);
      return null;
    }
  }
  
  // Add competitor backlink
  static async addCompetitorBacklink(projectId: string, competitorUrl: string, sourceUrl: string, anchorText?: string) {
    const supabase = createServerClient();
    
    try {
      const { data, error } = await supabase
        .from('competitor_backlinks')
        .insert([
          {
            project_id: projectId,
            competitor_url: competitorUrl,
            source_url: sourceUrl,
            anchor_text: anchorText,
            // Mock values for page and domain authority
            page_authority: Math.random() * 100,
            domain_authority: Math.random() * 100
          }
        ])
        .select()
        .single();
      
      if (error) {
        console.error('Error adding competitor backlink:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in addCompetitorBacklink:', error);
      return null;
    }
  }
  
  // Analyze backlink gap (comparing project backlinks with competitor backlinks)
  static async analyzeBacklinkGap(projectId: string, competitorUrl: string) {
    try {
      // Get project backlinks
      const projectBacklinks = await this.getBacklinks(projectId);
      
      // Get competitor backlinks
      const competitorBacklinks = await this.getCompetitorBacklinks(projectId, competitorUrl);
      
      if (!projectBacklinks || !competitorBacklinks) {
        return null;
      }
      
      // Extract domains from project backlinks
      const projectDomains = new Set(projectBacklinks.map(b => new URL(b.source_url).hostname));
      
      // Find competitor backlinks that don't link to the project
      const backlinksGap = competitorBacklinks.filter(b => {
        const domain = new URL(b.source_url).hostname;
        return !projectDomains.has(domain);
      });
      
      // Sort by domain authority (highest first)
      backlinksGap.sort((a, b) => b.domain_authority - a.domain_authority);
      
      return {
        competitorUrl,
        totalGap: backlinksGap.length,
        topOpportunities: backlinksGap.slice(0, 10), // Top 10 opportunities
        analysisDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error in analyzeBacklinkGap:', error);
      return null;
    }
  }
} 