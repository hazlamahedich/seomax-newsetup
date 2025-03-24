import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { TechnicalSEOService } from '@/lib/services/TechnicalSEOService';
import { TechnicalSEODisplay } from '@/components/seo/TechnicalSEODisplay';
import { createClient } from '@/lib/supabase/client';

interface TechnicalSEOPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: TechnicalSEOPageProps): Promise<Metadata> {
  const { id } = params;
  
  try {
    const supabase = createClient();
    const { data: audit } = await supabase
      .from('seo_audits')
      .select('domain, created_at')
      .eq('id', id)
      .single();
    
    if (!audit) {
      return {
        title: 'Technical SEO Analysis - Not Found',
      };
    }
    
    return {
      title: `Technical SEO Analysis for ${audit.domain}`,
      description: `View technical SEO analysis and recommendations for ${audit.domain}`,
    };
  } catch (error) {
    console.error('Error fetching audit metadata:', error);
    return {
      title: 'Technical SEO Analysis',
      description: 'View technical SEO analysis and recommendations',
    };
  }
}

export default async function TechnicalSEOPage({ params }: TechnicalSEOPageProps) {
  const { id } = params;
  
  try {
    // Get the audit details
    const supabase = createClient();
    const { data: audit } = await supabase
      .from('seo_audits')
      .select('id, domain, url, status')
      .eq('id', id)
      .single();
    
    if (!audit) {
      notFound();
    }
    
    // Get technical SEO analysis
    const technicalSEOService = new TechnicalSEOService();
    const analysis = await technicalSEOService.getCachedAnalysis(id, audit.domain);
    
    // If analysis doesn't exist, create it
    const technicalSEOResult = analysis || 
      await technicalSEOService.analyzeTechnicalSEO({
        siteId: id,
        domain: audit.domain,
        url: audit.url
      });
    
    // Get historical data for trends
    const historicalData = await technicalSEOService.getHistoricalScores(audit.domain);
    
    return (
      <div className="container mx-auto py-6">
        <TechnicalSEODisplay 
          analysis={technicalSEOResult}
          historicalData={historicalData}
          className="mb-8"
        />
      </div>
    );
  } catch (error) {
    console.error('Error in Technical SEO Page:', error);
    return (
      <div className="container mx-auto py-6">
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md mb-8">
          <h2 className="font-bold text-lg mb-2">Error Loading Technical SEO Analysis</h2>
          <p>There was a problem loading the technical SEO analysis. Please try again later.</p>
        </div>
      </div>
    );
  }
} 