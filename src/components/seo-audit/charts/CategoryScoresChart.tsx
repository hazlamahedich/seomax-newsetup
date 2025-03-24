import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface CategoryScore {
  id: string;
  categoryName: string;
  score: number;
  grade: string;
  issuesCount: number;
}

interface CategoryScoresChartProps {
  scores: CategoryScore[];
  className?: string;
}

export function CategoryScoresChart({ scores, className = '' }: CategoryScoresChartProps) {
  // Prepare data for the charts
  const chartData = scores.map(score => ({
    category: score.categoryName,
    score: score.score,
    fullMark: 100,
    grade: score.grade,
    issuesCount: score.issuesCount
  }));
  
  // Get colors for scores
  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10b981'; // green
    if (score >= 70) return '#3b82f6'; // blue
    if (score >= 50) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };
  
  // Custom tooltip for the charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="font-medium text-sm">{data.category}</p>
          <p className="text-sm font-bold" style={{ color: getScoreColor(data.score) }}>
            Score: {data.score}
          </p>
          <p className="text-xs text-gray-500">Grade: {data.grade}</p>
          <p className="text-xs text-gray-500">Issues: {data.issuesCount}</p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Category Performance</CardTitle>
        <CardDescription>
          SEO score breakdown by category
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="bar">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bar">Bar Chart</TabsTrigger>
            <TabsTrigger value="radar">Radar Chart</TabsTrigger>
          </TabsList>
          
          <TabsContent value="bar">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 70,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="category" 
                    angle={-45} 
                    textAnchor="end" 
                    height={70}
                    interval={0} 
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey="score" 
                    name="Score" 
                    isAnimationActive={true}
                    animationDuration={1000}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
          
          <TabsContent value="radar">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.6}
                    isAnimationActive={true}
                    animationDuration={1000}
                  />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 