import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScoreDisplay } from '@/components/ui/ScoreDisplay';
import { GradingSystemService } from '@/lib/services/GradingSystemService';
import { PlusCircle, ArrowRight, RefreshCw, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const metadata: Metadata = {
  title: 'SEO Audits',
  description: 'View and manage your SEO audits',
};

async function getSeoAudits() {
  const supabase = createClient();
  
  const { data: audits, error } = await supabase
    .from('seo_audits')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error fetching audits:', error);
    return [];
  }
  
  return audits;
}

export default async function SeoAuditDashboard() {
  const audits = await getSeoAudits();
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold">SEO Audits</h1>
          <p className="text-gray-500 mt-1">View and manage your SEO audit reports</p>
        </div>
        
        <Link href="/dashboard/seo-audit/new">
          <Button className="flex items-center gap-2">
            <PlusCircle size={16} />
            New Audit
          </Button>
        </Link>
      </div>
      
      {audits.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <TrendingUp className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">No audits yet</h3>
            <p className="text-gray-500 mb-4">
              Run your first SEO audit to get insights and optimization suggestions.
            </p>
            <Link href="/dashboard/seo-audit/new">
              <Button>Start your first audit</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {audits.map((audit) => (
            <Card key={audit.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{audit.site_url}</CardTitle>
                    <CardDescription>
                      {formatDistanceToNow(new Date(audit.created_at), { addSuffix: true })}
                    </CardDescription>
                  </div>
                  <ScoreDisplay 
                    score={audit.overall_score} 
                    size="sm" 
                    showLabel={false}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-medium text-gray-900">{audit.pages_crawled}</div>
                    <div className="text-xs text-gray-500">Pages</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-medium text-gray-900">{
                      audit.overall_score >= 90 ? 'A' : 
                      audit.overall_score >= 80 ? 'B' : 
                      audit.overall_score >= 70 ? 'C' : 
                      audit.overall_score >= 60 ? 'D' : 'F'
                    }</div>
                    <div className="text-xs text-gray-500">Grade</div>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <div className="font-medium text-gray-900">{audit.issues_count || '—'}</div>
                    <div className="text-xs text-gray-500">Issues</div>
                  </div>
                </div>
                
                <div className="flex justify-between mt-2">
                  <Link href={`/dashboard/seo-audit/${audit.id}`}>
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      View Report
                      <ArrowRight size={14} />
                    </Button>
                  </Link>
                  
                  <Link href={`/dashboard/seo-audit/new?reaudit=${audit.site_url}`}>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1">
                      <RefreshCw size={14} />
                      Re-audit
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {audits.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Audit Performance</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-gray-500 py-12">
                Performance chart will be displayed here
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 