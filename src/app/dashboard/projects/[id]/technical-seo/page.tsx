'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Clock, Gauge, FileSearch, AlertCircle, CheckCircle, AlertTriangle, ExternalLink, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SiteCrawlerService } from '@/lib/services/SiteCrawlerService';
import { TechnicalSEOService } from '@/lib/services/TechnicalSEOService';
import { SiteCrawl, TechnicalIssue } from '@/lib/types/seo';
import { SiteStructureVisualization } from '@/components/technical-seo/SiteStructureVisualization';
import { RecommendationEngine } from '@/components/technical-seo/RecommendationEngine';
import { SchemaValidator } from '@/components/technical-seo/SchemaValidator';

export default function TechnicalSEOPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const projectId = params.id;

  // State
  const [project, setProject] = useState<any>(null);
  const [crawls, setCrawls] = useState<SiteCrawl[]>([]);
  const [selectedCrawl, setSelectedCrawl] = useState<string | null>(null);
  const [issues, setIssues] = useState<TechnicalIssue[]>([]);
  const [issuesSummary, setIssuesSummary] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawlProgress, setCrawlProgress] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [issueCounts, setIssueCounts] = useState({
    high: 0,
    medium: 0,
    low: 0
  });
  const [technicalSeoScore, setTechnicalSeoScore] = useState(0);

  // Load user data
  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
      } else {
        router.push('/login');
      }
    };
    getUserData();
  }, [router, supabase]);

  // Load project data
  useEffect(() => {
    if (user) {
      fetchProject();
      fetchCrawls();
    }
  }, [user, projectId]);

  // Load crawl data when selected crawl changes
  useEffect(() => {
    if (selectedCrawl) {
      fetchCrawlDetails();
    }
  }, [selectedCrawl]);

  // Poll for crawl progress if a crawl is in progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isCrawling) {
      interval = setInterval(async () => {
        const activeCrawl = crawls.find(c => c.status === 'in_progress');
        if (activeCrawl) {
          const updatedCrawl = await SiteCrawlerService.getCrawlById(activeCrawl.id);
          if (updatedCrawl) {
            if (updatedCrawl.status !== 'in_progress') {
              setIsCrawling(false);
              fetchCrawls();
              clearInterval(interval);
            } else {
              // Update progress
              setCrawlProgress(updatedCrawl.pagesCrawled);
            }
          }
        } else {
          setIsCrawling(false);
          clearInterval(interval);
        }
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCrawling, crawls]);

  // Helper to calculate issue severity counts
  useEffect(() => {
    if (issues.length > 0) {
      const counts = {
        high: issues.filter(i => i.issue_severity === 'high').length,
        medium: issues.filter(i => i.issue_severity === 'medium').length,
        low: issues.filter(i => i.issue_severity === 'low').length
      };
      setIssueCounts(counts);
    }
  }, [issues]);

  const fetchProject = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
      
    if (error) {
      console.error('Error fetching project:', error);
      return;
    }
    
    setProject(data);
  };

  const fetchCrawls = async () => {
    try {
      const crawlData = await SiteCrawlerService.getCrawlsByProjectId(projectId);
      setCrawls(crawlData);
      
      // If there are crawls, select the most recent one
      if (crawlData.length > 0) {
        setSelectedCrawl(crawlData[0].id);
        
        // Check if there's a crawl in progress
        const activeCrawl = crawlData.find(c => c.status === 'in_progress');
        if (activeCrawl) {
          setIsCrawling(true);
          setCrawlProgress(activeCrawl.pagesCrawled);
        }
      }
    } catch (error) {
      console.error('Error fetching crawls:', error);
    }
  };

  const fetchCrawlDetails = async () => {
    if (!selectedCrawl) return;
    
    try {
      // Get pages
      const pagesData = await SiteCrawlerService.getPagesByCrawlId(selectedCrawl);
      setPages(pagesData);
      
      // Get issues
      const issuesData = await TechnicalSEOService.getIssuesByCrawlId(selectedCrawl);
      setIssues(issuesData);
      
      // Get issues summary
      const summaryData = await TechnicalSEOService.getIssuesSummary(selectedCrawl);
      setIssuesSummary(summaryData);
      
      // Calculate technical SEO health score
      calculateTechnicalSeoScore(issuesData);
    } catch (error) {
      console.error('Error fetching crawl details:', error);
    }
  };

  // Calculate a technical SEO health score based on the issues
  const calculateTechnicalSeoScore = (issues: TechnicalIssue[]) => {
    // Start with a perfect score
    let score = 100;
    
    // Deduct points based on issue severity
    const highIssues = issues.filter(i => i.issue_severity === 'high').length;
    const mediumIssues = issues.filter(i => i.issue_severity === 'medium').length;
    const lowIssues = issues.filter(i => i.issue_severity === 'low').length;
    
    // More severe issues have a bigger impact on the score
    score -= highIssues * 5;
    score -= mediumIssues * 2;
    score -= lowIssues * 0.5;
    
    // Ensure score stays within bounds (0-100)
    score = Math.max(0, Math.min(100, score));
    
    setTechnicalSeoScore(Math.round(score));
  };

  const startCrawl = async () => {
    if (!user || !project) return;
    
    try {
      setIsCrawling(true);
      
      // Create a new crawl
      const newCrawl = await SiteCrawlerService.createCrawl(projectId, user.id);
      if (!newCrawl) {
        throw new Error('Failed to create crawl');
      }
      
      // Start crawling in the background
      SiteCrawlerService.crawlWebsite(newCrawl.id, project.url, {
        maxPages: 100,
        maxDepth: 3,
        respectRobotsTxt: true,
        ignoreQueryParams: true
      });
      
      // Update the crawls list
      fetchCrawls();
      
      // Select the new crawl
      setSelectedCrawl(newCrawl.id);
    } catch (error) {
      console.error('Error starting crawl:', error);
      setIsCrawling(false);
    }
  };

  const analyzeCrawl = async () => {
    if (!selectedCrawl) return;
    
    try {
      await TechnicalSEOService.analyzeCrawl(selectedCrawl);
      
      // Refresh the issues
      fetchCrawlDetails();
    } catch (error) {
      console.error('Error analyzing crawl:', error);
    }
  };

  const getIssueSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-amber-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getIssueSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'low':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <FileSearch className="h-5 w-5 text-gray-500" />;
    }
  };

  const groupIssuesByType = () => {
    const grouped: Record<string, TechnicalIssue[]> = {};
    
    issues.forEach(issue => {
      if (!grouped[issue.issue_type]) {
        grouped[issue.issue_type] = [];
      }
      grouped[issue.issue_type].push(issue);
    });
    
    return grouped;
  };

  const formatIssueType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="container p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Technical SEO Analysis</h1>
        <div className="flex gap-2">
          {crawls.length > 0 && (
            <select 
              className="border rounded p-2"
              value={selectedCrawl || ''}
              onChange={(e) => setSelectedCrawl(e.target.value)}
              disabled={isCrawling}
            >
              {crawls.map(crawl => (
                <option key={crawl.id} value={crawl.id}>
                  {new Date(crawl.createdAt).toLocaleString()} ({crawl.pagesCrawled} pages)
                </option>
              ))}
            </select>
          )}
          <Button
            onClick={startCrawl}
            disabled={isCrawling}
          >
            {isCrawling ? 'Crawling...' : 'Start New Crawl'}
          </Button>
          {selectedCrawl && !isCrawling && (
            <Button
              onClick={analyzeCrawl}
              variant="outline"
            >
              Analyze Crawl
            </Button>
          )}
        </div>
      </div>

      {isCrawling && (
        <Card>
          <CardHeader>
            <CardTitle>Crawl in Progress</CardTitle>
            <CardDescription>
              Crawling website {project?.url}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Pages crawled: {crawlProgress}</span>
              </div>
              <Progress value={Math.min(crawlProgress, 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {!isCrawling && selectedCrawl && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="structure">Site Structure</TabsTrigger>
            <TabsTrigger value="schema">Schema</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Technical SEO Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Gauge className="h-10 w-10 text-primary" />
                    <span className="text-4xl font-bold">{technicalSeoScore}</span>
                  </div>
                  <div className="mt-3 h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${
                        technicalSeoScore > 80 ? 'bg-green-500' : 
                        technicalSeoScore > 60 ? 'bg-blue-500' : 
                        technicalSeoScore > 40 ? 'bg-amber-500' : 
                        'bg-red-500'
                      }`}
                      style={{ width: `${technicalSeoScore}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Based on {issues.length} technical issues found
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Pages Crawled</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <FileSearch className="h-10 w-10 text-primary" />
                    <span className="text-4xl font-bold">{pages.length}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Technical Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <AlertCircle className="h-10 w-10 text-red-500" />
                    <span className="text-4xl font-bold">{issues.length}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="destructive">{issueCounts.high} High</Badge>
                    <Badge variant="outline" className="bg-amber-100">{issueCounts.medium} Medium</Badge>
                    <Badge variant="outline" className="bg-blue-100">{issueCounts.low} Low</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">Last Crawl</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Clock className="h-10 w-10 text-primary" />
                    <span className="text-lg">
                      {crawls.length > 0 ? new Date(crawls[0].createdAt).toLocaleString() : 'No crawls yet'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Issues by category */}
            <Card>
              <CardHeader>
                <CardTitle>Issues by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(groupIssuesByType()).map(([type, typeIssues]) => (
                    <div key={type} className="flex items-center gap-2 p-2 border rounded">
                      <div className={`w-2 h-full ${getIssueSeverityColor(typeIssues[0].issue_severity)} rounded-full`}></div>
                      <div className="flex-1">
                        <p className="font-medium">{formatIssueType(type)}</p>
                        <p className="text-sm text-muted-foreground">{typeIssues.length} issues</p>
                      </div>
                      <Badge 
                        variant={typeIssues[0].issue_severity === 'high' ? 'destructive' : 'outline'}
                        className={typeIssues[0].issue_severity === 'medium' ? 'bg-amber-100' : 
                                 typeIssues[0].issue_severity === 'low' ? 'bg-blue-100' : ''}
                      >
                        {typeIssues[0].issue_severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Technical SEO Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Technical SEO Insights</CardTitle>
                <CardDescription>Actionable recommendations to improve your technical SEO</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {issueCounts.high > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>High Priority Issues Detected</AlertTitle>
                      <AlertDescription>
                        You have {issueCounts.high} high priority issues that need immediate attention. 
                        These issues can significantly impact your search rankings.
                      </AlertDescription>
                    </Alert>
                  )}

                  {Object.entries(groupIssuesByType())
                    .filter(([_, issues]) => issues[0].issue_severity === 'high')
                    .slice(0, 3)
                    .map(([type, issues]) => (
                      <div key={type} className="p-4 border rounded">
                        <h3 className="font-medium flex items-center gap-2">
                          {getIssueSeverityIcon(issues[0].issue_severity)}
                          {formatIssueType(type)}
                        </h3>
                        <p className="text-sm mt-1 text-muted-foreground">
                          {issues[0].issue_description}
                        </p>
                        <div className="mt-3">
                          <h4 className="text-sm font-medium">Recommendation:</h4>
                          <p className="text-sm">
                            {type === 'missing_title' && 'Add unique, descriptive titles to all pages, keeping them under 60 characters.'}
                            {type === 'duplicate_title' && 'Ensure each page has a unique title that describes its specific content.'}
                            {type === 'missing_meta_description' && 'Add meta descriptions to all pages, keeping them under 160 characters.'}
                            {type === 'broken_link' && 'Fix or remove broken links to improve user experience and crawlability.'}
                            {type === 'missing_h1' && 'Add an H1 heading to every page that clearly describes the page content.'}
                            {type === 'missing_viewport' && 'Add a proper viewport meta tag to ensure mobile-friendliness.'}
                            {type === 'low_content' && 'Add more quality content to pages with low word count (aim for at least a few paragraphs).'}
                            {type.includes('canonical') && 'Implement proper canonical tags to avoid duplicate content issues.'}
                            {!['missing_title', 'duplicate_title', 'missing_meta_description', 'broken_link', 'missing_h1', 'missing_viewport', 'low_content'].includes(type) && !type.includes('canonical') && 
                              'Review and fix these issues according to SEO best practices.'}
                          </p>
                        </div>
                        <div className="mt-2">
                          <Button variant="link" className="p-0 h-auto text-sm" asChild>
                            <Link href={`#${type}`} onClick={() => setActiveTab('issues')}>
                              View all {issues.length} issues
                              <ArrowRight className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}

                  {technicalSeoScore > 80 && issueCounts.high === 0 && (
                    <Alert className="bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <AlertTitle>Good Technical SEO Health</AlertTitle>
                      <AlertDescription>
                        Your site's technical SEO is in good shape! Continue monitoring for new issues that may arise.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="p-4 border rounded">
                    <h3 className="font-medium">Next Steps</h3>
                    <ul className="mt-2 space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                        <span>Prioritize fixing high severity issues first, then move to medium and low.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                        <span>Re-crawl your site after fixing issues to verify improvements.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                        <span>Run regular crawls (monthly) to catch new issues early.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="issues" className="space-y-4">
            {Object.entries(groupIssuesByType()).map(([type, typeIssues]) => (
              <Card key={type} id={type}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {getIssueSeverityIcon(typeIssues[0].issue_severity)}
                    <CardTitle>{formatIssueType(type)} ({typeIssues.length})</CardTitle>
                  </div>
                  <CardDescription>
                    {typeIssues[0].issue_description.split(':')[0]}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {typeIssues.map((issue) => (
                      <div key={issue.id} className="p-3 border rounded">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium truncate max-w-md">{issue.page_url}</p>
                            <p className="text-sm text-muted-foreground">{issue.issue_description}</p>
                          </div>
                          <Badge 
                            variant={issue.issue_severity === 'high' ? 'destructive' : 'outline'}
                            className={issue.issue_severity === 'medium' ? 'bg-amber-100' : 
                                     issue.issue_severity === 'low' ? 'bg-blue-100' : ''}
                          >
                            {issue.issue_severity}
                          </Badge>
                        </div>
                        <div className="mt-2">
                          <a 
                            href={issue.page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs flex items-center gap-1 text-blue-600"
                          >
                            <ExternalLink className="h-3 w-3" /> Open URL
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {issues.length === 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>No issues found</AlertTitle>
                <AlertDescription>
                  Either there are no issues, or you need to analyze the crawl to detect issues.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="pages" className="space-y-4">
            {/* Pages summary information */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pages.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Status Code Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">200 OK</span>
                      <Badge variant="outline" className="bg-green-100">
                        {pages.filter(p => p.statusCode === 200).length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">3xx Redirect</span>
                      <Badge variant="outline" className="bg-amber-100">
                        {pages.filter(p => p.statusCode >= 300 && p.statusCode < 400).length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">4xx Client Error</span>
                      <Badge variant="destructive">
                        {pages.filter(p => p.statusCode >= 400 && p.statusCode < 500).length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">5xx Server Error</span>
                      <Badge variant="destructive">
                        {pages.filter(p => p.statusCode >= 500).length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Page Depth</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Level 1 (Homepage)</span>
                      <Badge variant="outline">
                        {pages.filter(p => p.depth === 0).length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Level 2</span>
                      <Badge variant="outline">
                        {pages.filter(p => p.depth === 1).length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Level 3+</span>
                      <Badge variant="outline">
                        {pages.filter(p => p.depth >= 2).length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Content Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Missing Title</span>
                      <Badge variant="destructive">
                        {pages.filter(p => !p.title && p.statusCode === 200).length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Missing Meta Description</span>
                      <Badge variant="destructive">
                        {pages.filter(p => !p.metaDescription && p.statusCode === 200).length}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Missing H1</span>
                      <Badge variant="destructive">
                        {pages.filter(p => !p.h1 && p.statusCode === 200).length}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Crawled Pages</h3>
              <div className="flex gap-2 items-center">
                <span className="text-sm text-muted-foreground">
                  {pages.length > 50 ? 'Showing 50 of ' + pages.length + ' pages' : 'Showing all ' + pages.length + ' pages'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {pages.slice(0, 50).map((page) => (
                <Card key={page.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg truncate max-w-md" title={page.title || page.url}>
                          {page.title || 'No title'}
                        </CardTitle>
                        <CardDescription className="truncate max-w-md" title={page.url}>
                          {page.url}
                        </CardDescription>
                      </div>
                      <Badge 
                        variant={page.statusCode >= 400 ? 'destructive' : 
                               page.statusCode >= 300 ? 'outline' : 'default'}
                        className={page.statusCode >= 300 && page.statusCode < 400 ? 'bg-amber-100' : ''}
                      >
                        {page.statusCode || 'Unknown'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Depth</p>
                        <p>{page.depth}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Word Count</p>
                        <p>{page.wordCount || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">H1</p>
                        <p className="truncate max-w-[150px]" title={page.h1}>
                          {page.h1 || 'Missing'}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Meta Description</p>
                        <p>
                          {page.metaDescription ? 'Present' : 'Missing'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <a 
                      href={page.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs flex items-center gap-1 text-blue-600"
                    >
                      <ExternalLink className="h-3 w-3" /> Open URL
                    </a>
                  </CardFooter>
                </Card>
              ))}
              
              {pages.length > 50 && (
                <Alert>
                  <AlertTitle>Showing 50 of {pages.length} pages</AlertTitle>
                  <AlertDescription>
                    To keep performance high, only the first 50 pages are displayed.
                  </AlertDescription>
                </Alert>
              )}
              
              {pages.length === 0 && (
                <Alert>
                  <AlertTitle>No pages found</AlertTitle>
                  <AlertDescription>
                    This crawl hasn't found any pages yet.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="structure" className="space-y-4">
            {selectedCrawl ? (
              <SiteStructureVisualization siteCrawlId={selectedCrawl} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Site Structure</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Select a crawl to view the site structure.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="schema" className="space-y-4">
            {selectedCrawl ? (
              <SchemaValidator siteCrawlId={selectedCrawl} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Schema Validation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Select a crawl to validate schema markup.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="recommendations" className="space-y-4">
            {selectedCrawl && issues.length > 0 ? (
              <RecommendationEngine siteCrawlId={selectedCrawl} issues={issues} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {!selectedCrawl 
                      ? 'Select a crawl to view recommendations.' 
                      : 'No issues found. Your site appears to be in good technical health!'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
      
      {!isCrawling && crawls.length === 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>No crawls found</CardTitle>
            <CardDescription>
              Start your first crawl to analyze this website.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              A site crawl will examine your website to identify technical SEO issues like:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Broken links and redirects</li>
              <li>Missing or duplicate titles, descriptions, and headings</li>
              <li>Pages with low content</li>
              <li>Mobile-friendliness issues</li>
              <li>Canonicalization problems</li>
            </ul>
          </CardContent>
          <CardFooter>
            <Button onClick={startCrawl}>Start First Crawl</Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
} 