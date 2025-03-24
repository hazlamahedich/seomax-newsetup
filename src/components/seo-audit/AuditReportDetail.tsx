import { useState } from 'react';
import { SEOAuditReport, SEOAuditCategoryScore } from '@/lib/services/seo-audit-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  FileText, 
  Loader2 
} from 'lucide-react';
import { formatDistance } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

interface AuditReportDetailProps {
  report: SEOAuditReport;
  categoryScores: SEOAuditCategoryScore[];
  isLoading?: boolean;
  projectId: string;
}

export function AuditReportDetail({ report, categoryScores, isLoading, projectId }: AuditReportDetailProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { toast } = useToast();
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-lg">Loading audit report...</span>
      </div>
    );
  }
  
  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <XCircle className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-xl font-medium mb-2">Report Not Found</h3>
        <p className="text-gray-500">The audit report you're looking for doesn't exist or has been deleted.</p>
      </div>
    );
  }
  
  const reportData = (report as any).report_data || {};
  const categories = reportData.categories || {};
  const recommendations = reportData.recommendations || {};
  const summary = reportData.summary || { 
    totalIssues: 0, 
    criticalIssues: 0, 
    warningIssues: 0, 
    infoIssues: 0 
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">Critical</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">Warning</Badge>;
      case 'low':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">Info</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">Unknown</Badge>;
    }
  };
  
  const handleGeneratePDF = async () => {
    if (isGeneratingPDF || report.status !== 'completed') return;
    
    setIsGeneratingPDF(true);
    
    try {
      const response = await fetch(`/api/seo-audit/${report.id}/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate PDF');
      }
      
      toast({
        title: "PDF Generated",
        description: "Your PDF report is ready to download.",
        variant: "default",
      });
      
      // Open the PDF in a new tab
      window.open(data.data.pdfUrl, '_blank');
    } catch (error) {
      toast({
        title: "Failed to generate PDF",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  
  const handleDownloadPDF = () => {
    if (report.pdfUrl) {
      window.open(report.pdfUrl, '_blank');
    } else {
      handleGeneratePDF();
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{report.reportName}</h1>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <Calendar className="h-4 w-4 mr-1" />
            {report.createdAt.toLocaleDateString()}
            <span className="mx-2">•</span>
            <Clock className="h-4 w-4 mr-1" />
            {formatDistance(report.createdAt, new Date(), { addSuffix: true })}
          </div>
        </div>
        
        <div className="flex gap-2">
          {report.status === 'completed' && (
            <>
              {report.pdfUrl ? (
                <Button onClick={handleDownloadPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              ) : (
                <Button onClick={handleGeneratePDF} disabled={isGeneratingPDF}>
                  {isGeneratingPDF ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating PDF...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate PDF
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
      
      {report.status === 'in_progress' ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <h3 className="text-xl font-medium mb-2">Audit in Progress</h3>
              <p className="text-gray-500 mb-6 text-center max-w-md">
                We're currently analyzing your website. This may take a few minutes depending on the size of your site.
              </p>
              <div className="w-full max-w-md">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : report.status === 'failed' ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-xl font-medium mb-2">Audit Failed</h3>
              <p className="text-gray-500 text-center max-w-md">
                There was a problem processing your SEO audit. Please try again or contact support if the issue persists.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Completed audit report
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            <TabsTrigger value="scores">Scores</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            {/* Score Summary Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Overall Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-6">
                  <div className="w-32 h-32 rounded-full border-8 border-gray-100 flex items-center justify-center relative">
                    <span className={`text-4xl font-bold ${getScoreColor(report.overallScore || 0)}`}>
                      {report.overallScore || 0}
                    </span>
                    <span className="absolute bottom-0 text-lg font-medium">
                      {report.overallGrade || 'N/A'}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {categoryScores.map((score) => (
                    <div key={score.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
                      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {score.categoryName}
                      </h3>
                      <p className={`text-2xl font-bold ${getScoreColor(score.score)}`}>
                        {score.score}
                      </p>
                      <p className="text-xs font-medium mt-1">{score.grade}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Issues Summary Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Issues Found</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-red-700 dark:text-red-400 mb-1 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" /> Critical
                    </h3>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {summary.criticalIssues}
                    </p>
                  </div>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-1 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" /> Warnings
                    </h3>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {summary.warningIssues}
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1 flex items-center">
                      <Info className="h-4 w-4 mr-1" /> Info
                    </h3>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {summary.infoIssues}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-400 mb-1 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-1" /> Total
                    </h3>
                    <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                      {summary.totalIssues}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Top Recommendations */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Top Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {Object.entries(recommendations).slice(0, 3).flatMap(([category, recs]) => 
                    (recs as string[]).slice(0, 2).map((rec, idx) => (
                      <li key={`${category}-${idx}`} className="flex items-start py-2 border-b last:border-0">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium mb-1">{rec}</p>
                          <p className="text-sm text-gray-500">{category}</p>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
                
                <Button variant="ghost" className="mt-4 w-full" onClick={() => setActiveTab('recommendations')}>
                  See All Recommendations
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="issues" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Issues ({summary.totalIssues})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(categories).map(([category, data]: [string, any]) => (
                    <div key={category} className="border-b pb-6 last:border-0 last:pb-0">
                      <h3 className="text-lg font-medium mb-4 capitalize">{category}</h3>
                      
                      {data.issues && data.issues.length > 0 ? (
                        <div className="space-y-4">
                          {data.issues.map((issue: any, idx: number) => (
                            <div key={idx} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium">{issue.issue_description}</h4>
                                {getSeverityBadge(issue.issue_severity)}
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{issue.issue_details}</p>
                              {issue.url && (
                                <a 
                                  href={issue.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-sm text-blue-600 hover:underline break-all"
                                >
                                  {issue.url}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No issues found in this category.</p>
                      )}
                    </div>
                  ))}
                  
                  {Object.keys(categories).length === 0 && (
                    <div className="text-center py-6">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Issues Found</h3>
                      <p className="text-gray-500">
                        Great job! Your website doesn't have any SEO issues in the categories we analyzed.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="recommendations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(recommendations).map(([category, recs]) => (
                    <div key={category} className="border-b pb-6 last:border-0 last:pb-0">
                      <h3 className="text-lg font-medium mb-4 capitalize">{category}</h3>
                      
                      {(recs as string[]).length > 0 ? (
                        <ul className="space-y-3">
                          {(recs as string[]).map((rec, idx) => (
                            <li key={idx} className="flex items-start">
                              <CheckCircle className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500">No recommendations for this category.</p>
                      )}
                    </div>
                  ))}
                  
                  {Object.keys(recommendations).length === 0 && (
                    <div className="text-center py-6">
                      <Info className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Recommendations Available</h3>
                      <p className="text-gray-500">
                        There are no specific recommendations for your website at this time.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="scores" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Category Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {categoryScores.map((score) => (
                    <div key={score.id} className="border-b pb-6 last:border-0 last:pb-0">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                        <h3 className="text-lg font-medium">{score.categoryName}</h3>
                        <div className="flex items-center">
                          <span className={`text-2xl font-bold ${getScoreColor(score.score)}`}>
                            {score.score}
                          </span>
                          <span className="ml-2 text-sm font-medium">({score.grade})</span>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${
                            score.score >= 90 ? 'bg-green-600' : 
                            score.score >= 70 ? 'bg-blue-600' : 
                            score.score >= 50 ? 'bg-yellow-600' : 
                            'bg-red-600'
                          }`}
                          style={{ width: `${score.score}%` }}
                        ></div>
                      </div>
                      
                      <p className="text-sm text-gray-500 mt-3">
                        {score.issuesCount} {score.issuesCount === 1 ? 'issue' : 'issues'} found
                      </p>
                    </div>
                  ))}
                  
                  {categoryScores.length === 0 && (
                    <div className="text-center py-6">
                      <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Scores Available</h3>
                      <p className="text-gray-500">
                        There are no category scores available for this audit.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Audit Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Report Name</p>
                      <p>{report.reportName}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      <p className="capitalize">{report.status.replace('_', ' ')}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Created</p>
                      <p>{report.createdAt.toLocaleString()}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Updated</p>
                      <p>{report.updatedAt.toLocaleString()}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Report ID</p>
                      <p className="font-mono text-xs">{report.id}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-500">Project ID</p>
                      <p className="font-mono text-xs">{report.projectId}</p>
                    </div>
                  </div>
                  
                  {report.pdfUrl && (
                    <div className="pt-4">
                      <Button onClick={handleDownloadPDF} className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF Report
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
} 