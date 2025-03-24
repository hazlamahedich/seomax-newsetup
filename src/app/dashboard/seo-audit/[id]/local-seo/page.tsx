'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { LocalSEODisplay } from '@/components/local-seo/LocalSEODisplay';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LocalSEOResult } from '@/lib/services/LocalSEOService';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function LocalSEOPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [localSEOData, setLocalSEOData] = useState<LocalSEOResult | undefined>(undefined);
  const [domain, setDomain] = useState<string>('');
  const params = useParams();
  const router = useRouter();
  const auditId = params.id as string;
  const { toast } = useToast();

  useEffect(() => {
    fetchAuditData();
  }, [auditId]);

  async function fetchAuditData() {
    setLoading(true);
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co', 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
      );
      
      // Get SEO analysis data
      const { data: audit, error: auditError } = await supabase
        .from('seo_analyses')
        .select('url, site_crawl_id')
        .eq('id', auditId)
        .single();
        
      if (auditError) throw auditError;
      
      // Extract domain from URL
      const url = new URL(audit.url);
      const domain = url.hostname;
      setDomain(domain);
      
      // Get local SEO data
      const { data: localSeoData, error: localSeoError } = await supabase
        .from('localseo_analyses')
        .select('*')
        .eq('site_id', audit.site_crawl_id)
        .eq('domain', domain)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (localSeoError) throw localSeoError;
      
      if (localSeoData && localSeoData.length > 0) {
        // Convert database result to LocalSEOResult
        const dbResult = localSeoData[0];
        
        // Create a compatible result object
        const result: LocalSEOResult = {
          siteId: dbResult.site_id,
          url: dbResult.url,
          domain: dbResult.domain,
          napConsistency: {
            isConsistent: dbResult.nap_is_consistent,
            detectedInstances: [], // Simplified
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
            keywordInTitle: false,
            keywordInHeadings: false,
            keywordInContent: true,
            score: 0,
            recommendations: []
          },
          mapEmbed: {
            detected: dbResult.map_detected,
            hasAddress: dbResult.map_has_address,
            score: dbResult.map_detected ? 100 : 0,
            recommendations: []
          },
          overallScore: dbResult.overall_score,
          grade: {
            letter: dbResult.grade,
            color: getGradeColor(dbResult.grade),
            label: getGradeLabel(dbResult.grade)
          },
          recommendations: dbResult.recommendations,
          createdAt: dbResult.created_at
        };
        
        setLocalSEOData(result);
      }
      
    } catch (error) {
      console.error('Error fetching local SEO data:', error);
      toast({
        title: "Error",
        description: "Failed to load Local SEO data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co', 
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
      );
      
      // Get current audit data
      const { data: audit, error: auditError } = await supabase
        .from('seo_analyses')
        .select('url, site_crawl_id')
        .eq('id', auditId)
        .single();
        
      if (auditError) throw auditError;
      
      // Get main page HTML
      const { data: mainPage, error: pageError } = await supabase
        .from('crawled_pages')
        .select('html, url')
        .eq('site_crawl_id', audit.site_crawl_id)
        .eq('is_homepage', true)
        .single();
        
      if (pageError) throw pageError;
      
      if (!mainPage || !mainPage.html) {
        throw new Error('No homepage HTML found for Local SEO analysis');
      }
      
      // Get contact and about pages
      const { data: otherPages, error: otherPagesError } = await supabase
        .from('crawled_pages')
        .select('html, url')
        .eq('site_crawl_id', audit.site_crawl_id)
        .or('url.ilike.%contact%, url.ilike.%about%')
        .limit(5);
        
      if (otherPagesError) throw otherPagesError;
      
      // Make API call to analyze local SEO
      const response = await fetch('/api/analyze/local-seo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          siteId: audit.site_crawl_id,
          url: mainPage.url,
          html: mainPage.html,
          otherPages: otherPages.map((page: any) => ({
            url: page.url,
            html: page.html || ''
          }))
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze Local SEO');
      }
      
      // Refresh the data
      await fetchAuditData();
      toast({
        title: "Success",
        description: "Local SEO analysis refreshed",
      });
      
    } catch (error) {
      console.error('Error refreshing local SEO data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh Local SEO data",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Local SEO</h1>
          <p className="text-muted-foreground">
            Analysis of local business SEO elements for {domain}
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing} 
          variant="outline"
        >
          {refreshing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Refreshing
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Analysis
            </>
          )}
        </Button>
      </div>
      
      <LocalSEODisplay data={localSEOData} isLoading={loading} />
    </div>
  );
}

// Helper functions for grade display
function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    'A': '#22c55e', // Green
    'B': '#84cc16', // Light green
    'C': '#facc15', // Yellow
    'D': '#f97316', // Orange
    'F': '#ef4444'  // Red
  };
  
  return colors[grade] || '#64748b'; // Default gray
}

function getGradeLabel(grade: string): string {
  const labels: Record<string, string> = {
    'A': 'Excellent',
    'B': 'Good',
    'C': 'Average',
    'D': 'Poor',
    'F': 'Critical'
  };
  
  return labels[grade] || 'Unknown';
} 