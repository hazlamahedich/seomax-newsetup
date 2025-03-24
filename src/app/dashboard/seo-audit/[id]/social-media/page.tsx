import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SocialMediaAnalysisService } from '@/lib/services/SocialMediaAnalysisService';
import { SocialMediaDisplay } from '@/components/seo/SocialMediaDisplay';

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
      title: 'Social Media Analysis - Not Found',
    };
  }
  
  return {
    title: `Social Media Analysis for ${audit.target_url}`,
    description: `Comprehensive social media analysis for ${audit.target_url} including platform metrics, integration, and recommendations`,
  };
}

export default async function SocialMediaPage({ params }: PageProps) {
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
  
  // Get social media analysis
  let socialMediaAnalysis = await SocialMediaAnalysisService.getSocialMediaAnalysis(audit.site_id, domain);
  
  // If no analysis exists, create one
  if (!socialMediaAnalysis) {
    socialMediaAnalysis = await SocialMediaAnalysisService.analyzeSocialMedia(audit.site_id, domain);
  }
  
  // Get historical data for trends
  const historicalData = await SocialMediaAnalysisService.getHistoricalSocialMetrics(audit.site_id, domain);
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Social Media Analysis</h1>
        <p className="text-muted-foreground">
          Analyzing the social media presence and integration for {domain}
        </p>
      </div>
      
      {socialMediaAnalysis ? (
        <SocialMediaDisplay 
          analysis={socialMediaAnalysis} 
          historicalData={historicalData}
        />
      ) : (
        <div className="flex items-center justify-center h-64 border rounded-lg bg-muted/50">
          <div className="text-center">
            <h3 className="text-lg font-medium mb-2">Social Media Analysis Failed</h3>
            <p className="text-muted-foreground">
              There was an issue analyzing social media for this domain. Please try again later.
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 