import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface IssueCounts {
  critical: number;
  warning: number;
  info: number;
}

interface CategoryIssues {
  name: string;
  issues: IssueCounts;
  total: number;
}

interface IssueDistributionChartProps {
  categories: CategoryIssues[];
  totalIssues: number;
  className?: string;
}

export function IssueDistributionChart({ categories, totalIssues, className = '' }: IssueDistributionChartProps) {
  const [activeTab, setActiveTab] = useState('bar');
  
  // Prepare data for severity pie chart
  const severityData = [
    { name: 'Critical', value: categories.reduce((sum, cat) => sum + cat.issues.critical, 0), color: '#ef4444' },
    { name: 'Warning', value: categories.reduce((sum, cat) => sum + cat.issues.warning, 0), color: '#f59e0b' },
    { name: 'Info', value: categories.reduce((sum, cat) => sum + cat.issues.info, 0), color: '#3b82f6' }
  ].filter(item => item.value > 0);
  
  // Prepare data for bar chart
  const barData = categories.map(cat => ({
    name: cat.name,
    Critical: cat.issues.critical,
    Warning: cat.issues.warning,
    Info: cat.issues.info,
    Total: cat.total
  }));
  
  // Custom tooltip for the pie chart
  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 border rounded shadow-sm">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">{`Issues: ${data.value}`}</p>
          <p className="text-sm">{`Percentage: ${((data.value / totalIssues) * 100).toFixed(1)}%`}</p>
        </div>
      );
    }
    return null;
  };
  
  // Custom tooltip for the bar chart
  const BarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow-sm">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any) => (
            <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value} issues`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // COLORS
  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6'];
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>SEO Issues Distribution</CardTitle>
        <CardDescription>
          {totalIssues === 0 
            ? 'No issues found' 
            : `Total of ${totalIssues} issues across ${categories.length} categories`}
        </CardDescription>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bar">By Category</TabsTrigger>
            <TabsTrigger value="pie">By Severity</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="pt-0">
        {totalIssues === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">No issues to display</p>
          </div>
        ) : (
          <TabsContent value={activeTab} forceMount={true} hidden={activeTab !== 'bar'}>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<BarTooltip />} />
                  <Legend />
                  <Bar dataKey="Critical" stackId="a" fill="#ef4444" />
                  <Bar dataKey="Warning" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="Info" stackId="a" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        )}
        
        <TabsContent value={activeTab} forceMount={true} hidden={activeTab !== 'pie'}>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </CardContent>
    </Card>
  );
} 