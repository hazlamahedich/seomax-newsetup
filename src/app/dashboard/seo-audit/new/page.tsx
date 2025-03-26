import React from 'react';
import { Metadata } from 'next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Gauge, FileText, Wrench, Search, Link, Share2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { startAudit } from './actions';

export const metadata: Metadata = {
  title: 'New SEO Audit',
  description: 'Start a new comprehensive SEO audit for your website',
};

interface NewAuditPageProps {
  searchParams: {
    reaudit?: string;
  };
}

export default async function NewAuditPage({ searchParams }: NewAuditPageProps) {
  const urlToReaudit = searchParams.reaudit;
  
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
                  <Label htmlFor="site_url">Website URL</Label>
                  <Input
                    id="site_url"
                    name="site_url"
                    type="url"
                    placeholder="https://example.com"
                    defaultValue={urlToReaudit}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="crawl_limit">Page Crawl Limit</Label>
                  <Input
                    id="crawl_limit"
                    name="crawl_limit"
                    type="number"
                    min="1"
                    max="100"
                    defaultValue="25"
                  />
                  <p className="text-sm text-muted-foreground">
                    Maximum number of pages to analyze (1-100)
                  </p>
                </div>
                
                <div className="space-y-4">
                  <Label>Analysis Options</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="include_content" name="include_content" defaultChecked />
                      <Label htmlFor="include_content">Content Analysis</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="include_performance" name="include_performance" defaultChecked />
                      <Label htmlFor="include_performance">Performance Analysis</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="include_images" name="include_images" defaultChecked />
                      <Label htmlFor="include_images">Image Analysis</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="include_duplicates" name="include_duplicates" defaultChecked />
                      <Label htmlFor="include_duplicates">Duplicate Content Check</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full">
                  Start SEO Audit
                </Button>
              </CardFooter>
            </Card>
          </form>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>What We Check</CardTitle>
              <CardDescription>
                Our comprehensive SEO audit includes:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-3">
                <Gauge className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Technical SEO</h4>
                  <p className="text-sm text-muted-foreground">
                    Site speed, mobile-friendliness, crawlability, and more
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <FileText className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Content Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    Content quality, readability, and keyword optimization
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Wrench className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Performance</h4>
                  <p className="text-sm text-muted-foreground">
                    Core Web Vitals and user experience metrics
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Search className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">On-Page SEO</h4>
                  <p className="text-sm text-muted-foreground">
                    Meta tags, headings, images, and internal linking
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Link className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Link Analysis</h4>
                  <p className="text-sm text-muted-foreground">
                    Internal and external link structure
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Share2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium">Social Integration</h4>
                  <p className="text-sm text-muted-foreground">
                    Social media meta tags and sharing optimization
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 