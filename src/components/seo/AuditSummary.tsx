'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScoreDisplay, ScoreCard, ScoreComparison } from '@/components/ui/ScoreDisplay';
import { IssuesList } from '@/components/ui/IssuesList';
import { Button } from '@/components/ui/button';
import { Download, Printer, Share2, Gauge, FileText, Wrench, Search, Link, FileSearch } from 'lucide-react';
import { SEOAuditSummary, SEOCategory, SEOIssue } from '@/lib/types/seo';
import { PDFGenerationService } from '@/lib/services/pdf-generation-service';

interface AuditSummaryProps {
  auditSummary: SEOAuditSummary;
  previousScore?: number | null;
  industryAverage?: number;
  onGeneratePDF?: () => void;
  isLoadingPDF?: boolean;
  className?: string;
}

export const AuditSummary: React.FC<AuditSummaryProps> = ({
  auditSummary,
  previousScore = null,
  industryAverage,
  onGeneratePDF,
  isLoadingPDF = false,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  
  // Get all critical issues across all categories
  const criticalIssues = auditSummary.categories.flatMap(
    category => category.issues.filter(issue => issue.severity === 'critical')
  );
  
  // Get top issues (critical first, then warnings)
  const topIssues = [
    ...criticalIssues,
    ...auditSummary.categories.flatMap(
      category => category.issues.filter(issue => issue.severity === 'warning')
    ),
  ].slice(0, 5);
  
  const handleGeneratePDF = () => {
    if (onGeneratePDF) {
      onGeneratePDF();
    } else {
      PDFGenerationService.generateAuditReportPDF(auditSummary);
    }
  };
  
  // Update the CategoryScoreCard component to include social media icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance':
        return <Gauge className="w-5 h-5 text-blue-500" />;
      case 'content':
        return <FileText className="w-5 h-5 text-emerald-500" />;
      case 'technical':
        return <Wrench className="w-5 h-5 text-purple-500" />;
      case 'onpage':
        return <Search className="w-5 h-5 text-amber-500" />;
      case 'backlinks':
        return <Link className="w-5 h-5 text-indigo-500" />;
      case 'social_media':
        return <Share2 className="w-5 h-5 text-pink-500" />;
      default:
        return <FileSearch className="w-5 h-5" />;
    }
  };
  
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{auditSummary.title || 'SEO Audit Results'}</h2>
          <p className="text-gray-500">
            {auditSummary.date 
              ? new Date(auditSummary.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
            }
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.print()} 
            className="flex items-center gap-1"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center gap-1"
            onClick={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url);
              // You could add a toast notification here
            }}
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          
          <Button 
            onClick={handleGeneratePDF} 
            size="sm"
            disabled={isLoadingPDF}
            className="flex items-center gap-1"
          >
            <Download className="w-4 h-4" />
            <span>{isLoadingPDF ? 'Generating...' : 'Download PDF'}</span>
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Overall Performance</CardTitle>
            <CardDescription>
              Summary of your website's SEO performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-500 mb-1">Overall Score</div>
                <ScoreComparison 
                  current={auditSummary.overallScore}
                  previous={previousScore}
                  industry={industryAverage}
                  showDelta={previousScore !== null}
                  showIndustry={industryAverage !== undefined}
                />
              </div>
              
              <div className="text-right">
                <div className="text-sm mb-2">
                  <span className="text-gray-500">Passed checks: </span>
                  <span className="font-medium text-green-600">{auditSummary.passedChecks}</span>
                </div>
                <div className="text-sm mb-2">
                  <span className="text-gray-500">Failed checks: </span>
                  <span className="font-medium text-red-600">{auditSummary.failedChecks}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Crawled pages: </span>
                  <span className="font-medium">{auditSummary.crawledPages || 'N/A'}</span>
                </div>
              </div>
            </div>
            
            {auditSummary.improvementsSummary && (
              <div className="mt-6 bg-blue-50 border border-blue-100 rounded-md p-4">
                <h4 className="font-medium text-blue-800 mb-2">Improvement Opportunities</h4>
                <p className="text-blue-700 text-sm">{auditSummary.improvementsSummary}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Top Issues</CardTitle>
            <CardDescription>Critical issues to address first</CardDescription>
          </CardHeader>
          <CardContent>
            {topIssues.length > 0 ? (
              <IssuesList 
                issues={topIssues} 
                showRecommendations={false} 
                maxIssues={3}
              />
            ) : (
              <p className="text-gray-500 italic">No critical issues found.</p>
            )}
            
            {topIssues.length > 3 && (
              <Button 
                variant="link" 
                className="mt-2 p-0"
                onClick={() => setActiveTab('issues')}
              >
                View all issues
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {auditSummary.categories.map((category) => (
          <ScoreCard
            key={category.id}
            title={category.name}
            score={category.score}
            description={`${category.issues.length} issues found`}
            className="h-full"
          >
            {getCategoryIcon(category.name.toLowerCase())}
          </ScoreCard>
        ))}
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="issues">
            Issues
            {auditSummary.failedChecks > 0 && (
              <span className="ml-1 bg-red-100 text-red-800 text-xs py-0.5 px-1.5 rounded-full">
                {auditSummary.failedChecks}
              </span>
            )}
          </TabsTrigger>
          {auditSummary.categories.map((category) => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.name}
              {category.issues.length > 0 && (
                <span className="ml-1 bg-gray-100 text-gray-800 text-xs py-0.5 px-1.5 rounded-full">
                  {category.issues.length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit Overview</CardTitle>
              <CardDescription>
                Comprehensive analysis of your website's SEO performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {auditSummary.summary && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Summary</h3>
                    <p className="text-gray-700">{auditSummary.summary}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="text-lg font-medium mb-3">Performance by Category</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {auditSummary.categories.map((category) => (
                      <div 
                        key={category.id} 
                        className="border rounded-lg p-4 hover:bg-gray-50 transition cursor-pointer"
                        onClick={() => setActiveTab(category.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{category.name}</h4>
                            <p className="text-sm text-gray-500 mt-1">
                              {category.issues.length} {category.issues.length === 1 ? 'issue' : 'issues'} found
                            </p>
                          </div>
                          <ScoreDisplay score={category.score} size="sm" showLabel={false} />
                        </div>
                        
                        {category.recommendations && category.recommendations.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm text-gray-700 font-medium">Top recommendations:</p>
                            <ul className="list-disc pl-5 mt-1 text-sm text-gray-600">
                              {category.recommendations.slice(0, 2).map((rec, i) => (
                                <li key={i}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {auditSummary.nextSteps && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Recommended Next Steps</h3>
                    <div className="bg-blue-50 border border-blue-100 rounded-md p-4">
                      <p className="text-blue-700">{auditSummary.nextSteps}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="issues" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>All Issues</CardTitle>
              <CardDescription>
                Complete list of issues found during the audit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IssuesList 
                issues={auditSummary.categories.flatMap(category => category.issues)} 
                groupByType
                showCount
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        {auditSummary.categories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle>{category.name}</CardTitle>
                  <CardDescription>
                    {category.description || `Analysis of your website's ${category.name.toLowerCase()} performance`}
                  </CardDescription>
                </div>
                <ScoreDisplay score={category.score} size="sm" />
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {category.summary && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Summary</h3>
                      <p className="text-gray-700">{category.summary}</p>
                    </div>
                  )}
                  
                  {category.issues.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-3">Issues</h3>
                      <IssuesList 
                        issues={category.issues} 
                        showCount
                      />
                    </div>
                  )}
                  
                  {category.recommendations && category.recommendations.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-2">Recommendations</h3>
                      <ul className="list-disc pl-5 space-y-2">
                        {category.recommendations.map((rec, i) => (
                          <li key={i} className="text-gray-700">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AuditSummary; 