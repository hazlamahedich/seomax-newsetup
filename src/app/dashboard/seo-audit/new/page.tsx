import React from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NewAuditForm from '@/components/seo/NewAuditForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Gauge, FileText, Wrench, Search, Link, Share2 } from 'lucide-react';
import { AdvancedSEOAnalyzerService } from '@/services/AdvancedSEOAnalyzerService';

export const metadata: Metadata = {
  title: 'New SEO Audit',
  description: 'Start a new comprehensive SEO audit for your website',
};

interface NewAuditPageProps {
  searchParams: {
    reaudit?: string;
  };
}

export default function NewAuditPage({ searchParams }: NewAuditPageProps) {
  const urlToReaudit = searchParams.reaudit;
  
  async function startAudit(formData: FormData) {
    'use server';
    
    const siteUrl = formData.get('site_url') as string;
    const crawlLimit = parseInt(formData.get('crawl_limit') as string) || 25;
    const includeImages = formData.get('include_images') === 'on';
    const includePerformance = formData.get('include_performance') === 'on';
    const includeContent = formData.get('include_content') === 'on';
    const includeDuplicates = formData.get('include_duplicates') === 'on';
    
    if (!siteUrl) {
      return { error: 'Site URL is required' };
    }
    
    try {
      const supabase = createClient();
      
      // Create a new audit record
      const { data: audit, error } = await supabase
        .from('seo_audits')
        .insert({
          site_url: siteUrl,
          status: 'pending',
          pages_crawled: 0,
          overall_score: 0,
          options: {
            crawl_limit: crawlLimit,
            include_images: includeImages,
            include_performance: includePerformance,
            include_content: includeContent,
            include_duplicates: includeDuplicates,
          },
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Start the audit process (this would typically be handled by a background process)
      // Here, we're just redirecting to a page that will show the audit progress
      redirect(`/dashboard/seo-audit/${audit.id}/progress`);
    } catch (error) {
      console.error('Error starting audit:', error);
      return { error: 'Failed to start audit' };
    }
  }
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">New SEO Audit</h1>
        <p className="text-muted-foreground">
          Configure and run a comprehensive SEO analysis of your website
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <form action={startAudit}>
            <Card>
              <CardHeader>
                <CardTitle>Website Details</CardTitle>
                <CardDescription>
                  Enter the website URL and configure audit options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="url">Website URL</Label>
                  <Input 
                    id="url" 
                    name="url" 
                    type="url" 
                    placeholder="https://example.com" 
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter the full URL including https://
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="crawlLimit">Page Crawl Limit</Label>
                  <Select name="crawlLimit" defaultValue="25">
                    <SelectTrigger>
                      <SelectValue placeholder="Select crawl limit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 pages</SelectItem>
                      <SelectItem value="25">25 pages</SelectItem>
                      <SelectItem value="50">50 pages</SelectItem>
                      <SelectItem value="100">100 pages</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Higher limits provide more thorough analysis but take longer
                  </p>
                </div>
                
                <div className="space-y-3 border rounded-md p-4">
                  <h3 className="font-medium">Analysis Features</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id="analyzeContent" name="analyzeContent" defaultChecked />
                      <Label htmlFor="analyzeContent" className="text-sm font-normal">Content Quality Analysis</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="analyzePerformance" name="analyzePerformance" defaultChecked />
                      <Label htmlFor="analyzePerformance" className="text-sm font-normal">Performance Metrics</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="analyzeTechnicalSEO" name="analyzeTechnicalSEO" defaultChecked />
                      <Label htmlFor="analyzeTechnicalSEO" className="text-sm font-normal">Technical SEO</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="analyzeBacklinks" name="analyzeBacklinks" defaultChecked />
                      <Label htmlFor="analyzeBacklinks" className="text-sm font-normal">Backlink Analysis</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="analyzeSocialMedia" name="analyzeSocialMedia" defaultChecked />
                      <Label htmlFor="analyzeSocialMedia" className="text-sm font-normal">Social Media Integration</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full">Start SEO Audit</Button>
              </CardFooter>
            </Card>
          </form>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>About SEO Audits</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Our comprehensive SEO audit will analyze multiple aspects of your website to identify opportunities for improvement and help you boost your search engine rankings.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start gap-2">
                  <Gauge className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Performance Analysis</h3>
                    <p className="text-xs text-muted-foreground">Core Web Vitals and page speed optimization</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <FileText className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Content Quality</h3>
                    <p className="text-xs text-muted-foreground">Readability, keyword usage, and structure</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Wrench className="w-5 h-5 text-purple-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Technical SEO</h3>
                    <p className="text-xs text-muted-foreground">Crawlability, indexability, and structured data</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Search className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">On-Page SEO</h3>
                    <p className="text-xs text-muted-foreground">Meta tags, headings, and URL structure</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Link className="w-5 h-5 text-indigo-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Backlink Profile</h3>
                    <p className="text-xs text-muted-foreground">Link quality, authority, and anchor text</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Share2 className="w-5 h-5 text-pink-500 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium">Social Media Integration</h3>
                    <p className="text-xs text-muted-foreground">Profile analysis and website integration</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Process form data and start the audit
async function startAudit(formData: FormData) {
  'use server';
  
  const url = formData.get('url') as string;
  const crawlLimit = parseInt(formData.get('crawlLimit') as string);
  
  // Get analysis options
  const analyzeContent = formData.get('analyzeContent') === 'on';
  const analyzePerformance = formData.get('analyzePerformance') === 'on';
  const analyzeTechnicalSEO = formData.get('analyzeTechnicalSEO') === 'on';
  const analyzeBacklinks = formData.get('analyzeBacklinks') === 'on';
  const analyzeSocialMedia = formData.get('analyzeSocialMedia') === 'on';
  
  const supabase = createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/signin?callbackUrl=/dashboard/seo-audit/new');
  }
  
  // Get or create site
  const domain = new URL(url).hostname;
  let site_id;
  
  const { data: existingSite } = await supabase
    .from('sites')
    .select('id')
    .eq('domain', domain)
    .eq('user_id', user.id)
    .single();
  
  if (existingSite) {
    site_id = existingSite.id;
  } else {
    const { data: newSite } = await supabase
      .from('sites')
      .insert({
        domain,
        user_id: user.id,
        name: domain
      })
      .select('id')
      .single();
      
    site_id = newSite?.id;
  }
  
  if (!site_id) {
    throw new Error('Failed to create or retrieve site');
  }
  
  // Create audit record
  const { data: audit } = await supabase
    .from('seo_audits')
    .insert({
      site_id,
      target_url: url,
      status: 'queued',
      user_id: user.id,
      title: `SEO Audit for ${domain}`
    })
    .select('id')
    .single();
  
  if (!audit) {
    throw new Error('Failed to create audit');
  }
  
  // Start the audit process in the background
  const auditService = new AdvancedSEOAnalyzerService();
  auditService.runAdvancedAudit(user.id, site_id, url, {
    crawlLimit,
    analyzeContent,
    analyzePerformance,
    analyzeTechnicalSEO,
    analyzeBacklinks,
    analyzeSocialMedia
  }).catch(console.error);
  
  // Redirect to progress page
  redirect(`/dashboard/seo-audit/${audit.id}/progress`);
} 