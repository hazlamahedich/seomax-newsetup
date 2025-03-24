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
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { ArrowUpRight, LinkIcon, ExternalLink, TrendingUp, AlertTriangle, Building2, GraduationCap, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScoreDisplay } from '@/components/ui/ScoreDisplay';
import { IssuesList } from '@/components/ui/IssuesList';
import { BacklinkAnalysis, BacklinkData, BacklinkIssue } from '@/lib/services/BacklinkAnalysisService';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface BacklinkAnalysisDisplayProps {
  analysis: BacklinkAnalysis;
  historicalData?: Array<{
    date: string;
    totalBacklinks: number;
    uniqueDomains: number;
    averageDomainAuthority: number;
    score: number;
  }>;
  className?: string;
}

export function BacklinkAnalysisDisplay({
  analysis,
  historicalData = [],
  className = '',
}: BacklinkAnalysisDisplayProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Convert data for charts
  const qualityData = [
    { name: 'High Quality', value: analysis.metrics.quality.high, color: '#22c55e' },
    { name: 'Medium Quality', value: analysis.metrics.quality.medium, color: '#f59e0b' },
    { name: 'Low Quality', value: analysis.metrics.quality.low, color: '#ef4444' },
  ];

  const linkTypeData = [
    { name: 'Dofollow', value: analysis.metrics.dofollowLinks, color: '#3b82f6' },
    { name: 'Nofollow', value: analysis.metrics.nofollowLinks, color: '#94a3b8' },
  ];

  // Format historical data for trend chart
  const trendData = historicalData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    backlinks: item.totalBacklinks,
    domains: item.uniqueDomains,
    authority: item.averageDomainAuthority,
    score: item.score,
  }));

  // Extract issues from the analysis
  const issues: BacklinkIssue[] = analysis.recommendations.map((recommendation, index) => ({
    id: `issue-${index}`,
    type: 'backlink',
    severity: index < 2 ? 'high' : (index < 4 ? 'medium' : 'low'),
    description: recommendation,
    recommendation: recommendation,
    impact: 'Affects overall backlink profile strength',
  }));

  // Format competitor data for the chart
  const competitorData = [
    {
      name: `${analysis.url.split('.')[0]}`,
      backlinks: analysis.metrics.totalBacklinks,
      domains: analysis.metrics.uniqueDomains,
    },
    ...(analysis.competitorComparison?.map(competitor => ({
      name: competitor.domain.split('.')[0],
      backlinks: competitor.totalBacklinks,
      domains: competitor.uniqueDomains,
    })) || []),
  ];

  // Check if we have any high-value backlinks
  const hasEducationalBacklinks = analysis.highValueBacklinks?.educational.length > 0;
  const hasGovernmentBacklinks = analysis.highValueBacklinks?.government.length > 0;
  const hasHighValueBacklinks = hasEducationalBacklinks || hasGovernmentBacklinks;

  // Calculate high-value backlinks percentage
  const highValueBacklinksCount = 
    (analysis.highValueBacklinks?.educational.length || 0) + 
    (analysis.highValueBacklinks?.government.length || 0);
  const highValuePercentage = analysis.metrics.totalBacklinks > 0 
    ? Math.round((highValueBacklinksCount / analysis.metrics.totalBacklinks) * 100) 
    : 0;

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Backlink Analysis</h2>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="topBacklinks">Top Backlinks</TabsTrigger>
            <TabsTrigger value="highValueBacklinks">High-Value Backlinks</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="competitors">Competitors</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-muted-foreground">Overall Score</CardTitle>
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
                <CardTitle className="text-base font-medium text-muted-foreground">Backlink Quality</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center py-2 h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={qualityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {qualityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
              <CardFooter className="text-center text-sm">
                <Badge className="mx-auto" variant={analysis.metrics.quality.high > analysis.metrics.quality.low ? "default" : "destructive"}>
                  {analysis.metrics.quality.high > analysis.metrics.quality.low ? 
                    `${Math.round(analysis.metrics.quality.high / analysis.metrics.totalBacklinks * 100)}% High Quality` :
                    `${Math.round(analysis.metrics.quality.low / analysis.metrics.totalBacklinks * 100)}% Low Quality`
                  }
                </Badge>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-muted-foreground">Link Types</CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center py-2 h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={linkTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {linkTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
              <CardFooter className="text-center text-sm">
                <Badge className="mx-auto" variant={analysis.metrics.dofollowLinks > analysis.metrics.nofollowLinks ? "default" : "destructive"}>
                  {Math.round(analysis.metrics.dofollowLinks / analysis.metrics.totalBacklinks * 100)}% Dofollow
                </Badge>
              </CardFooter>
            </Card>
          </div>

          {/* High Value Backlinks Summary Card */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BadgeCheck className="mr-2 h-5 w-5 text-blue-500" />
                High-Value Backlinks
              </CardTitle>
              <CardDescription>
                Educational (.edu) and Government (.gov) backlinks are considered the most valuable for SEO
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <div className="flex items-center mb-2">
                    <GraduationCap className="mr-2 h-5 w-5 text-amber-500" />
                    <h3 className="font-semibold">Educational Backlinks</h3>
                  </div>
                  <div className="text-3xl font-bold mb-2">{analysis.metrics.educationalBacklinks}</div>
                  <p className="text-muted-foreground text-sm">
                    {hasEducationalBacklinks 
                      ? "Educational backlinks provide high authority and credibility" 
                      : "No educational backlinks found - these are valuable for trustworthiness"}
                  </p>
                </div>
                
                <div className="flex flex-col">
                  <div className="flex items-center mb-2">
                    <Building2 className="mr-2 h-5 w-5 text-emerald-500" />
                    <h3 className="font-semibold">Government Backlinks</h3>
                  </div>
                  <div className="text-3xl font-bold mb-2">{analysis.metrics.governmentBacklinks}</div>
                  <p className="text-muted-foreground text-sm">
                    {hasGovernmentBacklinks 
                      ? "Government backlinks signal the highest level of trustworthiness" 
                      : "No government backlinks found - these are very valuable for authority"}
                  </p>
                </div>
              </div>
              
              {hasHighValueBacklinks && (
                <div className="mt-4">
                  <Badge variant="default" className="mr-2">
                    {highValuePercentage}% of backlinks are high-value
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-blue-500"
                    onClick={() => setActiveTab('highValueBacklinks')}
                  >
                    View Details <ArrowUpRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* New tab for high-value backlinks */}
        <TabsContent value="highValueBacklinks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BadgeCheck className="mr-2 h-5 w-5 text-blue-500" />
                High-Value Backlinks Analysis
              </CardTitle>
              <CardDescription>
                Educational and Government backlinks provide exceptional SEO value
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!hasHighValueBacklinks && (
                <div className="py-8 text-center">
                  <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No High-Value Backlinks Found</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-4">
                    Educational (.edu) and Government (.gov) backlinks are among the most valuable for SEO.
                    They significantly boost domain authority and trustworthiness.
                  </p>
                  <div className="bg-muted p-4 rounded-lg max-w-lg mx-auto text-left">
                    <h4 className="font-medium mb-2">Recommendations:</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Create high-quality resources that educational institutions might reference</li>
                      <li>Conduct original research or surveys that could be cited by academic sources</li>
                      <li>Participate in educational initiatives or programs</li>
                      <li>Create resources that government agencies might find useful</li>
                      <li>Participate in government initiatives or public service campaigns</li>
                    </ul>
                  </div>
                </div>
              )}

              {hasEducationalBacklinks && (
                <>
                  <div className="mb-6">
                    <div className="flex items-center mb-4">
                      <GraduationCap className="mr-2 h-5 w-5 text-amber-500" />
                      <h3 className="text-lg font-semibold">Educational Backlinks ({analysis.highValueBacklinks.educational.length})</h3>
                    </div>
                    
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source</TableHead>
                          <TableHead>Target URL</TableHead>
                          <TableHead>Authority</TableHead>
                          <TableHead>Link Type</TableHead>
                          <TableHead>First Seen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysis.highValueBacklinks.educational.map((link, index) => (
                          <TableRow key={`edu-${index}`}>
                            <TableCell className="font-medium">
                              <a href={link.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-blue-500">
                                {link.sourceDomain}
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{link.targetUrl}</TableCell>
                            <TableCell>
                              <Badge variant={link.domainAuthority > 70 ? "default" : "outline"}>
                                {link.domainAuthority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={link.linkType === 'dofollow' ? "default" : "outline"}>
                                {link.linkType}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(link.firstSeen).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Separator className="my-6" />
                </>
              )}

              {hasGovernmentBacklinks && (
                <div>
                  <div className="flex items-center mb-4">
                    <Building2 className="mr-2 h-5 w-5 text-emerald-500" />
                    <h3 className="text-lg font-semibold">Government Backlinks ({analysis.highValueBacklinks.government.length})</h3>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead>Target URL</TableHead>
                        <TableHead>Authority</TableHead>
                        <TableHead>Link Type</TableHead>
                        <TableHead>First Seen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysis.highValueBacklinks.government.map((link, index) => (
                        <TableRow key={`gov-${index}`}>
                          <TableCell className="font-medium">
                            <a href={link.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-blue-500">
                              {link.sourceDomain}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{link.targetUrl}</TableCell>
                          <TableCell>
                            <Badge variant={link.domainAuthority > 70 ? "default" : "outline"}>
                              {link.domainAuthority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={link.linkType === 'dofollow' ? "default" : "outline"}>
                              {link.linkType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(link.firstSeen).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="topBacklinks">
          <Card>
            <CardHeader>
              <CardTitle>Top Quality Backlinks</CardTitle>
              <CardDescription>
                The most valuable backlinks based on domain authority and link type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.topBacklinks.map((backlink, index) => (
                  <div key={index} className="border rounded-md p-3 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <a 
                        href={backlink.sourceUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        {backlink.sourceDomain} <ExternalLink size={14} />
                      </a>
                      <div className="flex items-center gap-2">
                        <Badge variant={backlink.linkType === 'dofollow' ? 'default' : 'secondary'}>
                          {backlink.linkType}
                        </Badge>
                        <Badge variant="outline" className="bg-blue-50">
                          DA: {backlink.domainAuthority}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      <span className="font-medium">Target URL:</span> {backlink.targetUrl}
                    </div>
                    <div className="text-sm flex flex-wrap gap-2 items-center">
                      <span className="font-medium">Anchor text:</span> 
                      <Badge variant="outline" className="font-normal">
                        "{backlink.anchorText}"
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        First seen: {new Date(backlink.firstSeen).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" size="sm">Export Backlinks</Button>
              <Button variant="default" size="sm">View All Backlinks</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Backlink Trends</CardTitle>
              <CardDescription>
                Historical backlink data over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendData.length > 1 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line 
                        yAxisId="left" 
                        type="monotone" 
                        dataKey="backlinks" 
                        name="Total Backlinks" 
                        stroke="#3b82f6" 
                        activeDot={{ r: 8 }} 
                      />
                      <Line 
                        yAxisId="left" 
                        type="monotone" 
                        dataKey="domains" 
                        name="Unique Domains" 
                        stroke="#22c55e" 
                      />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="score" 
                        name="Overall Score" 
                        stroke="#f59e0b" 
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
          </Card>
        </TabsContent>

        <TabsContent value="competitors">
          <Card>
            <CardHeader>
              <CardTitle>Competitor Comparison</CardTitle>
              <CardDescription>
                How your backlink profile compares to competitors
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analysis.competitorComparison && analysis.competitorComparison.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={competitorData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="backlinks" name="Total Backlinks" fill="#3b82f6" />
                      <Bar dataKey="domains" name="Unique Domains" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                  <p className="text-muted-foreground mb-2">No competitor data available</p>
                  <p className="text-sm">
                    Add competitor websites in your settings to compare backlink profiles.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full">
                Add Competitors
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 