import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { BacklinkAnalysisService } from '@/lib/services/BacklinkAnalysisService';
import { BacklinkAnalysisDisplay } from '@/components/seo/BacklinkAnalysisDisplay';

type PageProps = {
  params: {
    id: string;
  };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createClient();
  
  const { data: audit } = await supabase
    .from('seo_audits')
    .select('target_url, title')
    .eq('id', params.id)
    .single();
  
  if (!audit) {
    return {
      title: 'Backlink Analysis - Not Found',
    };
  }
  
  return {
    title: `Backlink Analysis for ${audit.target_url}`,
    description: `Comprehensive backlink analysis for ${audit.target_url} including quality metrics, top backlinks, and recommendations`,
  };
}

export default async function BacklinksPage({ params }: PageProps) {
  const supabase = createClient();
  
  // Get audit details
  const { data: audit } = await supabase
    .from('seo_audits')
    .select('id, target_url, site_id, title, status')
    .eq('id', params.id)
    .single();
  
  if (!audit) {
    notFound();
  }
  
  // Extract domain from target URL
  const domain = new URL(audit.target_url).hostname;
  
  // Get backlink analysis
  let backlinkAnalysis = await BacklinkAnalysisService.getBacklinkAnalysis(audit.site_id, domain);
  
  // If no analysis exists, create one
  if (!backlinkAnalysis) {
    backlinkAnalysis = await BacklinkAnalysisService.analyzeBacklinks(audit.site_id, domain);
  }
  
  // Get historical data for trends
  const historicalData = await BacklinkAnalysisService.getHistoricalMetrics(audit.site_id, domain);
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Backlink Analysis</h1>
        <p className="text-muted-foreground">
          Analyzing the quality and quantity of backlinks for {domain}
        </p>
      </div>
      
      {backlinkAnalysis ? (
        <BacklinkAnalysisDisplay 
          analysis={backlinkAnalysis} 
          historicalData={historicalData}
        />
      ) : (
        <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/50">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Backlink Analysis Failed</h3>
            <p className="text-muted-foreground">
              There was an issue analyzing backlinks for this domain. Please try again later.
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 