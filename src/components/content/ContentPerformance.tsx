'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle, BarChart, TrendingUp, Eye, MousePointerClick, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContentPageService } from '@/lib/services/content-service';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart as RechartsBarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

interface ContentPerformanceProps {
  contentPageId: string;
  onBack?: () => void;
}

// Sample data - in a real implementation this would come from your API
const generateSampleData = (days = 30) => {
  const data = [];
  const today = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    
    // Generate random but trending data
    const baseline = 50 - (i * 1.5); // Trending up as we get closer to today
    const impressions = Math.max(0, Math.floor(baseline + Math.random() * 30));
    const clicks = Math.max(0, Math.floor(impressions * (0.1 + Math.random() * 0.1)));
    const position = Math.max(1, Math.min(10, 10 - (baseline / 15) + (Math.random() * 2 - 1)));
    
    data.push({
      date: date.toISOString().split('T')[0],
      impressions,
      clicks,
      position: parseFloat(position.toFixed(1)),
      ctr: parseFloat(((clicks / impressions) * 100).toFixed(1)) || 0
    });
  }
  
  return data;
};

export function ContentPerformance({ contentPageId, onBack }: ContentPerformanceProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [contentPage, setContentPage] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState('30');
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadContentData();
  }, [contentPageId]);

  useEffect(() => {
    // Refresh data when date range changes
    setPerformanceData(generateSampleData(parseInt(dateRange)));
  }, [dateRange]);

  const loadContentData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Load content page data
      const page = await ContentPageService.getContentPage(contentPageId);
      setContentPage(page);
      
      // In a real implementation, you would fetch actual performance data
      // For this demo, we'll generate sample data
      setPerformanceData(generateSampleData(parseInt(dateRange)));
    } catch (err) {
      setError('Failed to load content data');
      console.error('Error loading content:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="ml-4">Loading content performance data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-xl font-semibold mb-2">Error Loading Data</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={loadContentData}>Try Again</Button>
          {onBack && (
            <Button variant="outline" onClick={onBack} className="mt-2">
              Go Back
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!contentPage) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Content Not Found</h3>
          <p className="text-muted-foreground mb-4">The requested content could not be found.</p>
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              Go Back
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }
  
  // Calculate summary metrics
  const calculateSummary = () => {
    if (!performanceData.length) return { impressions: 0, clicks: 0, avgPosition: 0, ctr: 0 };
    
    const total = performanceData.reduce((acc, day) => {
      return {
        impressions: acc.impressions + day.impressions,
        clicks: acc.clicks + day.clicks,
        position: acc.position + day.position
      };
    }, { impressions: 0, clicks: 0, position: 0 });
    
    const avgPosition = parseFloat((total.position / performanceData.length).toFixed(1));
    const ctr = total.impressions ? parseFloat(((total.clicks / total.impressions) * 100).toFixed(1)) : 0;
    
    return {
      impressions: total.impressions,
      clicks: total.clicks,
      avgPosition,
      ctr
    };
  };
  
  const summary = calculateSummary();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Content Performance</h1>
          <p className="text-muted-foreground text-sm">
            {contentPage.title || 'Untitled Page'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              Back
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Impressions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Eye className="h-4 w-4 mr-2 text-blue-500" />
              <span className="text-2xl font-bold">{summary.impressions.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <MousePointerClick className="h-4 w-4 mr-2 text-green-500" />
              <span className="text-2xl font-bold">{summary.clicks.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Click-Through Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BarChart className="h-4 w-4 mr-2 text-purple-500" />
              <span className="text-2xl font-bold">{summary.ctr}%</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Position</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-amber-500" />
              <span className="text-2xl font-bold">{summary.avgPosition}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="impressions">Impressions</TabsTrigger>
          <TabsTrigger value="clicks">Clicks</TabsTrigger>
          <TabsTrigger value="position">Position</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
              <CardDescription>Content performance over the selected time period</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 'dataMax + 1']} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="impressions" stroke="#3b82f6" name="Impressions" />
                  <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#22c55e" name="Clicks" />
                  <Line yAxisId="right" type="monotone" dataKey="position" stroke="#f59e0b" name="Position" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="impressions">
          <Card>
            <CardHeader>
              <CardTitle>Impressions</CardTitle>
              <CardDescription>Number of times your content appeared in search results</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={performanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="impressions" fill="#3b82f6" name="Impressions" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="clicks">
          <Card>
            <CardHeader>
              <CardTitle>Clicks</CardTitle>
              <CardDescription>Number of clicks received from search results</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={performanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="clicks" fill="#22c55e" name="Clicks" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="position">
          <Card>
            <CardHeader>
              <CardTitle>Position</CardTitle>
              <CardDescription>Average position in search results</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 'dataMax + 1']} reversed />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="position" stroke="#f59e0b" name="Position" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                Note: Lower position numbers are better (position 1 is the top of search results)
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 