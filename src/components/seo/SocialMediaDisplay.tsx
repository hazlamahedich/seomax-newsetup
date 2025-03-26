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
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import { 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin, 
  Youtube, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  Share2,
  Users,
  Link
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScoreDisplay } from '@/components/ui/ScoreDisplay';
import { IssuesList } from '@/components/ui/IssuesList';
import { 
  SocialMediaAnalysis, 
  SocialMediaProfile, 
  SocialMediaIssue 
} from '@/lib/services/SocialMediaAnalysisService';

interface SocialMediaDisplayProps {
  analysis: SocialMediaAnalysis;
  historicalData?: Array<{
    date: string;
    totalFollowers: number;
    platformCoverage: number;
    siteIntegration: number;
    score: number;
  }>;
  className?: string;
}

export function SocialMediaDisplay({
  analysis,
  historicalData = [],
  className = '',
}: SocialMediaDisplayProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Convert metrics for radar chart
  const radarData = [
    {
      subject: 'Platform Coverage',
      value: analysis.metrics.platformCoverage,
      fullMark: 100,
    },
    {
      subject: 'Profile Consistency',
      value: analysis.metrics.profileConsistency,
      fullMark: 100,
    },
    {
      subject: 'Post Frequency',
      value: analysis.metrics.averagePostFrequency > 5 ? 100 : analysis.metrics.averagePostFrequency * 20,
      fullMark: 100,
    },
    {
      subject: 'Engagement',
      value: (analysis.metrics.totalEngagement / analysis.metrics.totalFollowers) * 10000,
      fullMark: 100,
    },
    {
      subject: 'Site Integration',
      value: analysis.metrics.siteIntegration,
      fullMark: 100,
    },
    {
      subject: 'Content Alignment',
      value: analysis.contentAlignment,
      fullMark: 100,
    },
  ];

  // Format historical data for trend chart
  const trendData = historicalData.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    followers: item.totalFollowers,
    coverage: item.platformCoverage,
    integration: item.siteIntegration,
    score: item.score,
  }));

  // Extract issues from recommendations
  const issues: SocialMediaIssue[] = analysis.recommendations.map((recommendation, index) => ({
    id: `issue-${index}`,
    type: 'social_media',
    severity: index < 2 ? 'high' : (index < 4 ? 'medium' : 'low'),
    description: recommendation,
    recommendation: recommendation,
    impact: 'Affects social media effectiveness and SEO value',
  }));

  // Get platform icon
  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook':
        return <Facebook className="text-blue-600" />;
      case 'twitter':
        return <Twitter className="text-blue-400" />;
      case 'instagram':
        return <Instagram className="text-pink-500" />;
      case 'linkedin':
        return <Linkedin className="text-blue-700" />;
      case 'youtube':
        return <Youtube className="text-red-600" />;
      default:
        return <Link />;
    }
  };

  // Format follower count
  const formatFollowers = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  // Format engagement rate
  const formatEngagement = (rate: number) => {
    return `${rate.toFixed(1)}%`;
  };

  // Get integration status
  const getIntegrationStatus = (isPresent: boolean) => {
    return isPresent 
      ? <CheckCircle2 className="w-5 h-5 text-green-500" /> 
      : <XCircle className="w-5 h-5 text-red-500" />;
  };

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Social Media Analysis</h2>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="profiles">Profiles</TabsTrigger>
            <TabsTrigger value="integration">Integration</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
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
                <CardTitle className="text-base font-medium text-muted-foreground">Platform Coverage</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center h-[140px]">
                <div className="flex gap-2 mb-3">
                  {analysis.profiles.slice(0, 5).map((profile) => (
                    <div key={profile.platform} className="relative">
                      <a 
                        href={profile.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block p-2 border rounded-full hover:bg-muted/50 transition-colors"
                      >
                        {getPlatformIcon(profile.platform)}
                      </a>
                      {profile.verified && (
                        <Badge 
                          variant="outline" 
                          className="absolute -top-2 -right-2 p-0 w-4 h-4 flex items-center justify-center bg-blue-500 text-white border-blue-500 text-[10px]"
                        >
                          ✓
                        </Badge>
                      )}
                    </div>
                  ))}
                  {analysis.profiles.length > 5 && (
                    <div className="p-2 border rounded-full bg-muted/50 text-xs font-medium">
                      +{analysis.profiles.length - 5}
                    </div>
                  )}
                </div>
                <p className="text-2xl font-bold">
                  {Math.round(analysis.metrics.platformCoverage)}%
                </p>
                <p className="text-sm text-muted-foreground">Coverage of recommended platforms</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium text-muted-foreground">Follower Base</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center h-[140px]">
                <div className="text-3xl font-bold mb-1">
                  {analysis.metrics.totalFollowers.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Total followers across platforms</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">
                    {formatEngagement(analysis.metrics.totalEngagement / analysis.metrics.totalFollowers * 100)} engagement rate
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader>
                <CardTitle>Strategy Strength</CardTitle>
                <CardDescription>Analysis of key social media performance factors</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart outerRadius={90} data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} />
                    <Radar
                      name="Your Performance"
                      dataKey="value"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.5}
                    />
                    <Tooltip />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Website Integration</CardTitle>
                <CardDescription>Social media elements on your website</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-medium flex items-center gap-2">
                      <Link className="w-4 h-4" />
                      Social Media Links
                    </span>
                    <span>
                      {getIntegrationStatus(analysis.integration.hasSocialLinks)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-medium flex items-center gap-2">
                      <Share2 className="w-4 h-4" />
                      Social Sharing Buttons
                    </span>
                    <span>
                      {getIntegrationStatus(analysis.integration.hasSocialSharing)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-medium flex items-center gap-2">
                      <Facebook className="w-4 h-4" />
                      Open Graph Meta Tags
                    </span>
                    <span>
                      {getIntegrationStatus(analysis.integration.hasOpenGraph)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-medium flex items-center gap-2">
                      <Twitter className="w-4 h-4" />
                      Twitter Card Meta Tags
                    </span>
                    <span>
                      {getIntegrationStatus(analysis.integration.hasTwitterCards)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium flex items-center gap-2">
                      <Link className="w-4 h-4" />
                      Social Links Position
                    </span>
                    <Badge variant={analysis.integration.socialIconsPosition === 'none' ? 'destructive' : 'outline'}>
                      {analysis.integration.socialIconsPosition}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6">{analysis.summary}</p>

              <div className="mt-4">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-500" />
                  Key Improvements Needed
                </h4>
                <IssuesList 
                  issues={issues} 
                  showSeverity 
                  maxIssues={3} 
                  showCount
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full">
                View All Recommendations
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="profiles">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.profiles.map((profile) => (
              <Card key={profile.platform}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(profile.platform)}
                      <CardTitle className="capitalize">{profile.platform}</CardTitle>
                      {profile.verified && (
                        <Badge className="ml-2 bg-blue-500 hover:bg-blue-600">Verified</Badge>
                      )}
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={profile.url} target="_blank" rel="noopener noreferrer">
                        Visit
                      </a>
                    </Button>
                  </div>
                  <CardDescription>@{profile.username}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 border rounded-md">
                      <div className="text-lg font-bold">{formatFollowers(profile.followers)}</div>
                      <div className="text-xs text-muted-foreground">Followers</div>
                    </div>
                    <div className="text-center p-2 border rounded-md">
                      <div className="text-lg font-bold">{formatEngagement(profile.engagement)}</div>
                      <div className="text-xs text-muted-foreground">Engagement</div>
                    </div>
                    <div className="text-center p-2 border rounded-md">
                      <div className="text-lg font-bold">{profile.postFrequency.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">Posts/Week</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last updated:</span>
                    <span>{new Date(profile.lastUpdated).toLocaleDateString()}</span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-0">
                  <Badge variant="outline" className={
                    profile.postFrequency < 1 ? "text-red-500 border-red-200" :
                    profile.postFrequency >= 3 ? "text-green-500 border-green-200" :
                    "text-amber-500 border-amber-200"
                  }>
                    {profile.postFrequency < 1 ? "Infrequent posting" :
                     profile.postFrequency >= 3 ? "Active account" :
                     "Moderate activity"}
                  </Badge>
                </CardFooter>
              </Card>
            ))}
            
            {/* If no profiles found */}
            {analysis.profiles.length === 0 && (
              <div className="col-span-2 flex items-center justify-center h-64 border rounded-lg bg-muted/50">
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-2">No Social Profiles Found</h3>
                  <p className="text-muted-foreground">
                    We couldn't find any social media profiles for this domain.
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="integration">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Social Media Integration Assessment</CardTitle>
              <CardDescription>
                How well your website integrates with social media
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row mb-4">
                <div className="flex-1 flex items-center justify-center pb-4 md:pb-0">
                  <ScoreDisplay 
                    score={analysis.metrics.siteIntegration} 
                    size="lg"
                    showGrade
                  />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Social Media Links</span>
                    <Badge 
                      variant={analysis.integration.hasSocialLinks ? "default" : "destructive"}
                    >
                      {analysis.integration.hasSocialLinks ? "Implemented" : "Missing"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Social Share Buttons</span>
                    <Badge 
                      variant={analysis.integration.hasSocialSharing ? "default" : "destructive"}
                    >
                      {analysis.integration.hasSocialSharing ? "Implemented" : "Missing"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Open Graph Tags</span>
                    <Badge 
                      variant={analysis.integration.hasOpenGraph ? "default" : "destructive"}
                    >
                      {analysis.integration.hasOpenGraph ? "Implemented" : "Missing"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Twitter Cards</span>
                    <Badge 
                      variant={analysis.integration.hasTwitterCards ? "default" : "destructive"}
                    >
                      {analysis.integration.hasTwitterCards ? "Implemented" : "Missing"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Pinterest Rich Pins</span>
                    <Badge 
                      variant={analysis.integration.hasRichPins ? "default" : "destructive"}
                    >
                      {analysis.integration.hasRichPins ? "Implemented" : "Missing"}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Content Alignment</h4>
                <div className="flex items-center mb-2">
                  <div className="h-2.5 w-full rounded-full bg-gray-200">
                    <div 
                      className={`h-2.5 rounded-full ${
                        analysis.contentAlignment >= 70 ? "bg-green-500" :
                        analysis.contentAlignment >= 50 ? "bg-amber-500" :
                        "bg-red-500"
                      }`} 
                      style={{ width: `${analysis.contentAlignment}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm font-medium">{analysis.contentAlignment}%</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Content alignment measures how well your social media content aligns with your website's content and messaging.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Integration Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!analysis.integration.hasSocialLinks && (
                  <div className="p-3 border rounded-md bg-muted/50">
                    <h4 className="font-medium flex items-center gap-1 mb-1">
                      <Users className="w-4 h-4" /> Add Social Media Links
                    </h4>
                    <p className="text-sm">
                      Add links to your social profiles in the website header, footer, or sidebar to make them easily accessible to visitors.
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Recommended placement: Header and footer
                    </div>
                  </div>
                )}
                
                {!analysis.integration.hasSocialSharing && (
                  <div className="p-3 border rounded-md bg-muted/50">
                    <h4 className="font-medium flex items-center gap-1 mb-1">
                      <Share2 className="w-4 h-4" /> Implement Social Sharing
                    </h4>
                    <p className="text-sm">
                      Add social sharing buttons to blog posts and key content pages to encourage visitors to share your content.
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Recommended platforms: Facebook, Twitter, LinkedIn, Pinterest
                    </div>
                  </div>
                )}
                
                {!analysis.integration.hasOpenGraph && (
                  <div className="p-3 border rounded-md bg-muted/50">
                    <h4 className="font-medium flex items-center gap-1 mb-1">
                      <Facebook className="w-4 h-4" /> Add Open Graph Meta Tags
                    </h4>
                    <p className="text-sm">
                      Implement Open Graph meta tags so your content looks great when shared on Facebook, LinkedIn, and other platforms.
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Required tags: og:title, og:description, og:image, og:url
                    </div>
                  </div>
                )}
                
                {!analysis.integration.hasTwitterCards && (
                  <div className="p-3 border rounded-md bg-muted/50">
                    <h4 className="font-medium flex items-center gap-1 mb-1">
                      <Twitter className="w-4 h-4" /> Add Twitter Card Meta Tags
                    </h4>
                    <p className="text-sm">
                      Implement Twitter Card meta tags so your content looks great when shared on Twitter.
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Required tags: twitter:card, twitter:title, twitter:description, twitter:image
                    </div>
                  </div>
                )}
                
                {analysis.contentAlignment < 70 && (
                  <div className="p-3 border rounded-md bg-muted/50">
                    <h4 className="font-medium flex items-center gap-1 mb-1">
                      <TrendingUp className="w-4 h-4" /> Improve Content Alignment
                    </h4>
                    <p className="text-sm">
                      Create a unified content strategy that aligns your social media content with your website's messaging and goals.
                    </p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Action: Develop a content calendar that coordinates website and social media updates
                    </div>
                  </div>
                )}
                
                {/* If all integrations are present */}
                {analysis.integration.hasSocialLinks && 
                  analysis.integration.hasSocialSharing && 
                  analysis.integration.hasOpenGraph && 
                  analysis.integration.hasTwitterCards && 
                  analysis.contentAlignment >= 70 && (
                  <div className="p-3 border rounded-md bg-green-50 border-green-200">
                    <h4 className="font-medium flex items-center gap-1 mb-1 text-green-700">
                      <CheckCircle2 className="w-4 h-4" /> Excellent Social Integration
                    </h4>
                    <p className="text-sm text-green-700">
                      Your website has excellent social media integration with all recommended elements implemented.
                    </p>
                    <div className="mt-2 text-xs text-green-600">
                      Next step: Monitor performance and optimize engagement rates
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Social Media Trends</CardTitle>
              <CardDescription>
                Historical social media data over time
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
                      <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        yAxisId="left" 
                        type="monotone" 
                        dataKey="followers" 
                        name="Total Followers" 
                        stroke="#3b82f6" 
                        activeDot={{ r: 8 }} 
                      />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="coverage" 
                        name="Platform Coverage" 
                        stroke="#22c55e" 
                      />
                      <Line 
                        yAxisId="right" 
                        type="monotone" 
                        dataKey="integration" 
                        name="Site Integration" 
                        stroke="#ec4899" 
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
            <CardFooter>
              <div className="w-full text-sm text-muted-foreground">
                Social media metrics are tracked over time to help you identify trends and measure the impact of your strategy changes.
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 