'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, PlusCircle, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
import { ScoreGaugeChart } from './charts/ScoreGaugeChart';
import { CategoryScoresChart } from './charts/CategoryScoresChart';
import { IssueDistributionChart } from './charts/IssueDistributionChart';
import { TechnicalIssuesBreakdown } from './charts/TechnicalIssuesBreakdown';
import { RecommendationList } from './charts/RecommendationList';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams, useRouter } from 'next/navigation';
import { useSEOAuditStore } from '@/lib/store/seo-audit-store';
import { SEOAuditPdfButton } from './SEOAuditPdfButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SEOAuditDashboardProps {
  reportId: string;
}

export function SEOAuditDashboard({ reportId }: SEOAuditDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const router = useRouter();
  const { toast } = useToast();

  // Get data and methods from the store
  const isLoading = useSEOAuditStore(state => state.isLoading);
  const error = useSEOAuditStore(state => state.error);
  const fetchReportById = useSEOAuditStore(state => state.fetchReportById);
  const currentReport = useSEOAuditStore(state => state.currentReport);
  const pdfGenerationStatus = useSEOAuditStore(state => state.pdfGenerationStatus);
  const generatePDF = useSEOAuditStore(state => state.generatePDF);
  
  // Fetch report data
  useEffect(() => {
    fetchReportById(reportId);
  }, [reportId, fetchReportById]);
  
  // Show error toast when there's an error
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading SEO audit report...</p>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error || !currentReport) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-bold">Failed to load report</h2>
          <p className="text-muted-foreground">
            {error || "The requested SEO audit report could not be found or loaded."}
          </p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }
  
  // Get the report from the store
  const report = currentReport;
  
  // Check if report is still processing
  if (report.status === 'pending' || report.status === 'processing') {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h2 className="text-xl font-bold">Processing SEO Audit</h2>
          <p className="text-muted-foreground">
            Your audit for <span className="font-medium">{report.url}</span> is currently being processed.
            This may take a few minutes to complete.
          </p>
          <div className="mt-2">
            <Badge variant="outline" className="bg-blue-100 text-blue-700">
              {report.status === 'pending' ? 'Pending' : 'Processing'}
            </Badge>
          </div>
          <Button onClick={() => fetchReportById(reportId)} variant="outline" className="mt-4">
            Check Status
          </Button>
        </div>
      </div>
    );
  }
  
  // Check if report failed
  if (report.status === 'failed') {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-bold">Audit Failed</h2>
          <p className="text-muted-foreground">
            The SEO audit for <span className="font-medium">{report.url}</span> could not be completed.
          </p>
          <div className="mt-2">
            <Badge variant="outline" className="bg-red-100 text-red-700">
              Failed
            </Badge>
          </div>
          <p className="text-sm text-destructive mt-4">
            {report.error || "An unknown error occurred during the audit process."}
          </p>
          <Button onClick={() => router.back()} variant="outline" className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold">{report.name}</h2>
              <div className="ml-4">
                <SEOAuditPdfButton 
                  reportId={reportId}
                  variant="default"
                  size="default"
                />
              </div>
            </div>
            <p className="text-muted-foreground">
              Created: {formatDate(report.createdAt)}
            </p>
            <div className="flex items-center mt-1">
              <a 
                href={report.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary flex items-center"
              >
                {report.url}
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-lg font-semibold">Overall Score</h3>
            <div className="text-4xl font-bold text-primary">{report.overallScore}</div>
            <div className="text-lg font-medium mt-1">{report.overallGrade}</div>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="technical">Technical Issues</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle>Overall Score</CardTitle>
                <CardDescription>Performance rating across all categories</CardDescription>
              </CardHeader>
              <CardContent>
                {report.overallScore !== undefined && (
                  <ScoreGaugeChart 
                    score={report.overallScore} 
                    grade={report.overallGrade || ''} 
                  />
                )}
              </CardContent>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle>Category Scores</CardTitle>
                <CardDescription>Performance across major SEO categories</CardDescription>
              </CardHeader>
              <CardContent>
                {report.categories && report.categories.length > 0 && (
                  <CategoryScoresChart 
                    scores={report.categories.map(cat => ({
                      id: cat.categoryId,
                      categoryName: cat.categoryName,
                      score: cat.score,
                      grade: cat.grade,
                      issuesCount: cat.issuesCount
                    }))}
                  />
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Issue Distribution</CardTitle>
              <CardDescription>Overview of issues by category and severity</CardDescription>
            </CardHeader>
            <CardContent>
              {report.categories && report.technicalIssues && (
                <IssueDistributionChart 
                  categories={report.categories.map(cat => ({
                    name: cat.categoryName,
                    issues: {
                      critical: Math.floor(cat.issuesCount * 0.3), // Example distribution
                      warning: Math.floor(cat.issuesCount * 0.5),
                      info: cat.issuesCount - Math.floor(cat.issuesCount * 0.3) - Math.floor(cat.issuesCount * 0.5)
                    },
                    total: cat.issuesCount
                  }))}
                  totalIssues={report.categories.reduce((sum, cat) => sum + cat.issuesCount, 0)}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="technical" className="space-y-6 mt-6">
          {report.technicalIssues && report.technicalIssues.length > 0 ? (
            <TechnicalIssuesBreakdown 
              categories={report.technicalIssues}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-6">
                  <h3 className="text-lg font-medium mb-2">No Technical Issues</h3>
                  <p className="text-muted-foreground">
                    No technical SEO issues were found during the audit.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="recommendations" className="space-y-6 mt-6">
          {report.recommendations && report.recommendations.length > 0 ? (
            <RecommendationList recommendations={report.recommendations} />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-6">
                  <h3 className="text-lg font-medium mb-2">No Recommendations</h3>
                  <p className="text-muted-foreground">
                    No specific recommendations were generated for this audit.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 