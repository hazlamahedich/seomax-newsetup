import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AuditSummary from '@/components/seo/AuditSummary';
import { SEOAuditSummary } from '@/lib/types/seo';
import { AdvancedSEOAnalyzerService } from '@/lib/services/AdvancedSEOAnalyzerService';
import Link from 'next/link';
import { Gauge, FileText, Wrench, Link2, Share2, MapPin } from 'lucide-react';

interface SeoAuditPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: SeoAuditPageProps): Promise<Metadata> {
  const supabase = createClient();
  
  const { data: audit } = await supabase
    .from('seo_audits')
    .select('site_url, created_at')
    .eq('id', params.id)
    .single();
  
  if (!audit) {
    return {
      title: 'Audit Not Found',
    };
  }
  
  return {
    title: `SEO Audit - ${audit.site_url}`,
    description: `SEO audit results for ${audit.site_url} from ${new Date(audit.created_at).toLocaleDateString()}`,
  };
}

async function getAuditData(auditId: string): Promise<SEOAuditSummary> {
  const supabase = createClient();
  
  // Get the main audit record
  const { data: audit, error } = await supabase
    .from('seo_audits')
    .select('*')
    .eq('id', auditId)
    .single();
  
  if (error || !audit) {
    console.error('Error fetching audit:', error);
    notFound();
  }
  
  // Get the previous audit for comparison (if any)
  const { data: previousAudits } = await supabase
    .from('seo_audits')
    .select('overall_score, created_at')
    .eq('site_url', audit.site_url)
    .lt('created_at', audit.created_at)
    .order('created_at', { ascending: false })
    .limit(1);
  
  const previousScore = previousAudits && previousAudits.length > 0 
    ? previousAudits[0].overall_score 
    : null;
  
  // Get industry average (this would typically come from a different table or API)
  // This is a placeholder implementation
  const industryAverage = 75;
  
  // Compile the full audit data from all related tables
  // This would be where we fetch all the detailed category data
  // and compile it into a comprehensive SEOAuditSummary object
  
  return await AdvancedSEOAnalyzerService.getAuditSummary(auditId, previousScore, industryAverage);
}

export default async function SeoAuditPage({ params }: SeoAuditPageProps) {
  const auditData = await getAuditData(params.id);
  
  return (
    <div className="container mx-auto py-8 px-4">
      <AuditSummary 
        auditSummary={auditData} 
        previousScore={auditData.previousScore}
        industryAverage={auditData.industryAverage}
      />
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href={`/dashboard/seo-audit/${params.id}/performance`}
          className="block p-6 bg-white rounded-lg border hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <Gauge className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-medium">Performance</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            View detailed performance metrics and core web vitals analysis.
          </p>
        </Link>
        
        <Link
          href={`/dashboard/seo-audit/${params.id}/content`}
          className="block p-6 bg-white rounded-lg border hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-5 w-5 text-emerald-500" />
            <h3 className="text-lg font-medium">Content</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Analyze content quality, readability, and keyword optimization.
          </p>
        </Link>
        
        <Link
          href={`/dashboard/seo-audit/${params.id}/technical-seo`}
          className="block p-6 bg-white rounded-lg border hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <Wrench className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-medium">Technical SEO</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Evaluate technical aspects like robots.txt, sitemap, and SSL configuration.
          </p>
        </Link>
        
        <Link
          href={`/dashboard/seo-audit/${params.id}/backlinks`}
          className="block p-6 bg-white rounded-lg border hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <Link2 className="h-5 w-5 text-indigo-500" />
            <h3 className="text-lg font-medium">Backlinks</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Analyze backlink profile, authority, and referring domains.
          </p>
        </Link>
        
        <Link
          href={`/dashboard/seo-audit/${params.id}/social-media`}
          className="block p-6 bg-white rounded-lg border hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <Share2 className="h-5 w-5 text-pink-500" />
            <h3 className="text-lg font-medium">Social Media</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Evaluate social media presence and integration with your website.
          </p>
        </Link>
        
        <Link
          href={`/dashboard/seo-audit/${params.id}/local-seo`}
          className="block p-6 bg-white rounded-lg border hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="h-5 w-5 text-amber-500" />
            <h3 className="text-lg font-medium">Local SEO</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Assess local business SEO elements like NAP consistency and Google Business Profile.
          </p>
        </Link>
        
        <Link 
          href={`/dashboard/seo-audit/${params.id}/pdf`}
          className="block p-6 bg-white rounded-lg border hover:border-primary transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-medium">Generate Report</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Create a comprehensive PDF report of all findings.
          </p>
        </Link>
      </div>
    </div>
  );
} 