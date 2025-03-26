'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  LineChart, 
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { 
  AlertCircle, 
  CheckCircle, 
  File, 
  Lock, 
  ShieldCheck, 
  Smartphone, 
  AlertTriangle,
  FileCode,
  Info,
  Bot,
  Hash,
  Zap,
  FileCode as FileCodeIcon,
  LinkIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScoreDisplay } from '@/components/ui/ScoreDisplay';
import { IssuesList } from '@/components/ui/IssuesList';
import { TechnicalSEOResult, TechnicalSEOIssue } from '@/lib/services/TechnicalSEOService';

interface TechnicalSEODisplayProps {
  analysis: TechnicalSEOResult;
  historicalData?: Array<{
    date: string;
    score: number;
    issues: number;
  }>;
  className?: string;
}

export function TechnicalSEODisplay({
  analysis,
  historicalData = [],
  className = '',
}: TechnicalSEODisplayProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Format historical data for trend chart
  const trendData = historicalData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    score: item.score,
    issues: item.issues,
  }));

  // Group issues by type
  const issuesByType = analysis.issues.reduce<Record<string, TechnicalSEOIssue[]>>((acc, issue) => {
    if (!acc[issue.type]) {
      acc[issue.type] = [];
    }
    acc[issue.type].push(issue);
    return acc;
  }, {});

  // Get issues count by severity
  const criticalIssues = analysis.issues.filter(i => i.severity === 'critical').length;
  const highIssues = analysis.issues.filter(i => i.severity === 'high').length;
  const mediumIssues = analysis.issues.filter(i => i.severity === 'medium').length;
  const lowIssues = analysis.issues.filter(i => i.severity === 'low').length;
  const infoIssues = analysis.issues.filter(i => i.severity === 'info').length;

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'robots':
        return <Bot className="h-5 w-5 text-purple-500" />;
      case 'sitemap':
        return <FileCodeIcon className="h-5 w-5 text-blue-500" />;
      case 'ssl':
        return <Lock className="h-5 w-5 text-green-500" />;
      case 'canonical':
        return <Hash className="h-5 w-5 text-amber-500" />;
      case 'http_status':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'redirect':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'structured_data':
        return <FileCodeIcon className="h-5 w-5 text-indigo-500" />;
      case 'mobile_friendly':
        return <Smartphone className="h-5 w-5 text-pink-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Technical SEO Analysis</h2>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
            <TabsTrigger value="checks">Checks</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-muted-foreground">Technical Score</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ScoreDisplay 
                  score={analysis.score} 
                  size="lg" 
                  showGrade 
                  showLabel 
                />
              </CardContent>
              <CardFooter className="text-center text-sm text-muted-foreground">
                {analysis.score < 50 ? 'Needs improvement' : (analysis.score < 70 ? 'Average' : 'Good')}
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-muted-foreground">Key Checks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-purple-500" />
                    <span className="text-sm">Robots.txt</span>
                  </div>
                  <Badge variant={analysis.robotsTxt.exists && analysis.robotsTxt.valid ? "outline" : "destructive"}>
                    {analysis.robotsTxt.exists && analysis.robotsTxt.valid ? "Valid" : "Issue"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <FileCodeIcon className="h-4 w-4 text-blue-500" />
                    <span className="text-sm">Sitemap.xml</span>
                  </div>
                  <Badge variant={analysis.sitemap.exists && analysis.sitemap.valid ? "outline" : "destructive"}>
                    {analysis.sitemap.exists && analysis.sitemap.valid ? "Valid" : "Issue"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-green-500" />
                    <span className="text-sm">SSL Certificate</span>
                  </div>
                  <Badge variant={analysis.ssl.valid ? "outline" : "destructive"}>
                    {analysis.ssl.valid ? "Valid" : "Invalid"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-amber-500" />
                    <span className="text-sm">Canonical Tags</span>
                  </div>
                  <Badge variant={analysis.canonicals.valid ? "outline" : "destructive"}>
                    {analysis.canonicals.valid ? "Valid" : "Issues"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-pink-500" />
                    <span className="text-sm">Mobile Friendly</span>
                  </div>
                  <Badge variant={analysis.mobileCompatibility.compatible ? "outline" : "destructive"}>
                    {analysis.mobileCompatibility.compatible ? "Compatible" : "Issues"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-muted-foreground">Issues Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-red-600 font-medium">Critical</span>
                    <span className="text-xs text-muted-foreground">{criticalIssues}</span>
                  </div>
                  <Progress value={criticalIssues ? 100 : 0} className="h-2 bg-gray-100" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-orange-500 font-medium">High</span>
                    <span className="text-xs text-muted-foreground">{highIssues}</span>
                  </div>
                  <Progress value={highIssues ? Math.min(100, (highIssues / 5) * 100) : 0} className="h-2 bg-gray-100" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-amber-500 font-medium">Medium</span>
                    <span className="text-xs text-muted-foreground">{mediumIssues}</span>
                  </div>
                  <Progress value={mediumIssues ? Math.min(100, (mediumIssues / 10) * 100) : 0} className="h-2 bg-gray-100" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-blue-500 font-medium">Low</span>
                    <span className="text-xs text-muted-foreground">{lowIssues}</span>
                  </div>
                  <Progress value={lowIssues ? Math.min(100, (lowIssues / 15) * 100) : 0} className="h-2 bg-gray-100" />
                </div>
              </CardContent>
              <CardFooter className="text-center text-sm text-muted-foreground">
                {analysis.issues.length} total issues found
              </CardFooter>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Key Recommendations</CardTitle>
                <CardDescription>Top issues to address for better technical SEO</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysis.recommendations.slice(0, 5).map((recommendation, index) => (
                    <div key={index} className="flex gap-3 items-start p-3 border rounded-md bg-muted/20">
                      <AlertTriangle className={`mt-0.5 h-5 w-5 
                        ${index === 0 ? 'text-red-500' : 
                          index === 1 ? 'text-orange-500' : 
                          index === 2 ? 'text-amber-500' : 'text-blue-500'}`} 
                      />
                      <div>
                        <p className="text-sm">{recommendation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Technical Health Overview</CardTitle>
                <CardDescription>
                  Analysis of your website's technical SEO health
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 p-4 border rounded-md">
                      <h3 className="text-sm font-medium mb-1 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Passed Checks
                      </h3>
                      <p className="text-2xl font-bold">{analysis.checks.passed}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.round((analysis.checks.passed / analysis.checks.total) * 100)}% of all checks
                      </p>
                    </div>
                    
                    <div className="flex-1 p-4 border rounded-md">
                      <h3 className="text-sm font-medium mb-1 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        Failed Checks
                      </h3>
                      <p className="text-2xl font-bold">{analysis.checks.failed}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.round((analysis.checks.failed / analysis.checks.total) * 100)}% of all checks
                      </p>
                    </div>
                    
                    <div className="flex-1 p-4 border rounded-md">
                      <h3 className="text-sm font-medium mb-1 flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-blue-500" />
                        Overall Health
                      </h3>
                      <p className="text-2xl font-bold">{analysis.score}/100</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {analysis.grade.label} ({analysis.grade.letter})
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="issues">
          <Card>
            <CardHeader>
              <CardTitle>Technical SEO Issues</CardTitle>
              <CardDescription>
                Detected issues that may affect your site's search engine performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IssuesList 
                issues={analysis.issues} 
                showSeverity
                showRecommendations
                groupByType
                showCount
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checks">
          <div className="grid grid-cols-1 gap-4">
            {analysis.robotsTxt.exists && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-purple-500" />
                    Robots.txt Check
                  </CardTitle>
                  <CardDescription>
                    Analysis of your robots.txt file
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm font-medium">Status</p>
                        <p className="text-sm text-muted-foreground">
                          {analysis.robotsTxt.exists ? 'File exists' : 'File not found'}
                        </p>
                      </div>
                      <Badge variant={analysis.robotsTxt.valid ? "outline" : "destructive"}>
                        {analysis.robotsTxt.valid ? "Valid" : "Invalid"}
                      </Badge>
                    </div>
                    
                    {analysis.robotsTxt.exists && analysis.robotsTxt.content && (
                      <div>
                        <p className="text-sm font-medium mb-2">Content</p>
                        <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                          {analysis.robotsTxt.content}
                        </pre>
                      </div>
                    )}
                    
                    {analysis.robotsTxt.issues && analysis.robotsTxt.issues.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Issues</p>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          {analysis.robotsTxt.issues.map((issue, i) => (
                            <li key={i} className="text-red-600">{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {analysis.sitemap.exists && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileCodeIcon className="h-5 w-5 text-blue-500" />
                    Sitemap.xml Check
                  </CardTitle>
                  <CardDescription>
                    Analysis of your sitemap.xml file
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm font-medium">Status</p>
                        <p className="text-sm text-muted-foreground">
                          {analysis.sitemap.exists ? 'File exists' : 'File not found'}
                        </p>
                      </div>
                      <Badge variant={analysis.sitemap.valid ? "outline" : "destructive"}>
                        {analysis.sitemap.valid ? "Valid" : "Invalid"}
                      </Badge>
                    </div>
                    
                    {analysis.sitemap.exists && analysis.sitemap.urls && (
                      <div>
                        <p className="text-sm font-medium">Statistics</p>
                        <p className="text-sm text-muted-foreground">
                          Contains {analysis.sitemap.urls} URLs
                        </p>
                      </div>
                    )}
                    
                    {analysis.sitemap.issues && analysis.sitemap.issues.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Issues</p>
                        <ul className="list-disc pl-5 text-sm space-y-1">
                          {analysis.sitemap.issues.map((issue, i) => (
                            <li key={i} className="text-red-600">{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-green-500" />
                  SSL Certificate Check
                </CardTitle>
                <CardDescription>
                  Analysis of your site's SSL certificate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <p className="text-sm text-muted-foreground">
                        {analysis.ssl.valid ? 'Certificate valid' : 'Certificate invalid or missing'}
                      </p>
                    </div>
                    <Badge variant={analysis.ssl.valid ? "outline" : "destructive"}>
                      {analysis.ssl.valid ? "Valid" : "Invalid"}
                    </Badge>
                  </div>
                  
                  {analysis.ssl.valid && analysis.ssl.expires && (
                    <div>
                      <p className="text-sm font-medium">Expiration</p>
                      <p className="text-sm text-muted-foreground">
                        Expires on {new Date(analysis.ssl.expires).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  
                  {analysis.ssl.issues && analysis.ssl.issues.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Issues</p>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        {analysis.ssl.issues.map((issue, i) => (
                          <li key={i} className="text-red-600">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5 text-amber-500" />
                  Canonical Tags Check
                </CardTitle>
                <CardDescription>
                  Analysis of canonical tag implementation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <p className="text-sm text-muted-foreground">
                        {analysis.canonicals.valid ? 'Properly implemented' : 'Issues detected'}
                      </p>
                    </div>
                    <Badge variant={analysis.canonicals.valid ? "outline" : "destructive"}>
                      {analysis.canonicals.valid ? "Valid" : "Issues"}
                    </Badge>
                  </div>
                  
                  {analysis.canonicals.issues && analysis.canonicals.issues.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Issues</p>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        {analysis.canonicals.issues.map((issue, i) => (
                          <li key={i} className="text-red-600">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {issuesByType.canonical && issuesByType.canonical.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Affected Pages</p>
                      <IssuesList 
                        issues={issuesByType.canonical} 
                        showSeverity={false}
                        maxIssues={3}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-pink-500" />
                  Mobile Compatibility Check
                </CardTitle>
                <CardDescription>
                  Analysis of mobile-friendliness
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <p className="text-sm text-muted-foreground">
                        {analysis.mobileCompatibility.compatible ? 'Mobile-friendly' : 'Issues detected'}
                      </p>
                    </div>
                    <Badge variant={analysis.mobileCompatibility.compatible ? "outline" : "destructive"}>
                      {analysis.mobileCompatibility.compatible ? "Compatible" : "Issues"}
                    </Badge>
                  </div>
                  
                  {analysis.mobileCompatibility.issues && analysis.mobileCompatibility.issues.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Issues</p>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        {analysis.mobileCompatibility.issues.map((issue, i) => (
                          <li key={i} className="text-red-600">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {issuesByType.mobile_friendly && issuesByType.mobile_friendly.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Affected Pages</p>
                      <IssuesList 
                        issues={issuesByType.mobile_friendly} 
                        showSeverity={false}
                        maxIssues={3}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCodeIcon className="h-5 w-5 text-indigo-500" />
                  Structured Data Check
                </CardTitle>
                <CardDescription>
                  Analysis of structured data implementation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <p className="text-sm text-muted-foreground">
                        {analysis.structured_data.valid ? 'Properly implemented' : 'Issues detected'}
                      </p>
                    </div>
                    <Badge variant={analysis.structured_data.valid ? "outline" : "destructive"}>
                      {analysis.structured_data.valid ? "Valid" : "Issues"}
                    </Badge>
                  </div>
                  
                  {analysis.structured_data.types && analysis.structured_data.types.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Schema Types</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {analysis.structured_data.types.map((type, i) => (
                          <Badge key={i} variant="outline">{type}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {analysis.structured_data.issues && analysis.structured_data.issues.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Issues</p>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        {analysis.structured_data.issues.map((issue, i) => (
                          <li key={i} className="text-red-600">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {issuesByType.structured_data && issuesByType.structured_data.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Affected Pages</p>
                      <IssuesList 
                        issues={issuesByType.structured_data} 
                        showSeverity={false}
                        maxIssues={3}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* HTTP/2 Implementation Check */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  HTTP/2 Implementation
                </CardTitle>
                <CardDescription>
                  Analysis of HTTP/2 protocol usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium">Status</p>
                      <p className="text-sm text-muted-foreground">
                        {analysis.http2.implemented ? 'HTTP/2 Implemented' : 'HTTP/2 Not Implemented'}
                      </p>
                    </div>
                    <Badge variant={analysis.http2.implemented ? "outline" : "destructive"}>
                      {analysis.http2.implemented ? "Implemented" : "Missing"}
                    </Badge>
                  </div>
                  
                  {analysis.http2.issues && analysis.http2.issues.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Issues</p>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        {analysis.http2.issues.map((issue, i) => (
                          <li key={i} className="text-red-600">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {!analysis.http2.implemented && (
                    <div>
                      <p className="text-sm font-medium mb-2">Benefits of HTTP/2</p>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        <li>Multiplexed connections for faster loading</li>
                        <li>Header compression for reduced overhead</li>
                        <li>Server push capabilities</li>
                        <li>Binary protocol for more efficient parsing</li>
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Resource Optimization Check */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCodeIcon className="h-5 w-5 text-blue-500" />
                  Resource Optimization
                </CardTitle>
                <CardDescription>
                  JavaScript and CSS minification status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium">JavaScript Status</p>
                      <p className="text-sm text-muted-foreground">
                        {analysis.resourceOptimization.jsMinified ? 'Minified' : 'Not Minified'}
                      </p>
                    </div>
                    <Badge variant={analysis.resourceOptimization.jsMinified ? "outline" : "destructive"}>
                      {analysis.resourceOptimization.jsMinified ? "Optimized" : "Unoptimized"}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium">CSS Status</p>
                      <p className="text-sm text-muted-foreground">
                        {analysis.resourceOptimization.cssMinified ? 'Minified' : 'Not Minified'}
                      </p>
                    </div>
                    <Badge variant={analysis.resourceOptimization.cssMinified ? "outline" : "destructive"}>
                      {analysis.resourceOptimization.cssMinified ? "Optimized" : "Unoptimized"}
                    </Badge>
                  </div>
                  
                  {analysis.resourceOptimization.issues && analysis.resourceOptimization.issues.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Issues</p>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        {analysis.resourceOptimization.issues.map((issue, i) => (
                          <li key={i} className="text-red-600">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {(!analysis.resourceOptimization.jsMinified || !analysis.resourceOptimization.cssMinified) && (
                    <div>
                      <p className="text-sm font-medium mb-2">Minification Benefits</p>
                      <ul className="list-disc pl-5 text-sm space-y-1">
                        <li>Reduced file size and faster download</li>
                        <li>Decreased bandwidth usage</li>
                        <li>Improved page load time</li>
                        <li>Better mobile performance</li>
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Technical SEO Trends</CardTitle>
              <CardDescription>
                Historical technical SEO data over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendData.length > 1 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" domain={[0, 100]} />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line 
                        yAxisId="left" 
                        type="monotone" 
                        dataKey="score" 
                        name="Technical Score" 
                        stroke="#3b82f6" 
                        activeDot={{ r: 8 }} 
                      />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="issues" 
                        name="Issues Count" 
                        stroke="#ef4444" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <p className="text-muted-foreground mb-2">Not enough historical data available</p>
                  <p className="text-sm">
                    We need at least two data points to show trends. Check back after your next analysis.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <div className="w-full text-sm text-muted-foreground">
                Technical SEO metrics are tracked over time to help you identify trends and measure the effectiveness of your fixes.
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 