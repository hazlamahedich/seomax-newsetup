import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronsUpDown, AlertCircle, Info, CheckCircle, Link2, ExternalLink } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface TechnicalIssue {
  id: string;
  description: string;
  details?: string;
  url?: string;
  severity: 'high' | 'medium' | 'low';
}

interface TechnicalCategory {
  name: string;
  issues: TechnicalIssue[];
}

interface TechnicalIssuesBreakdownProps {
  categories: TechnicalCategory[];
  className?: string;
}

export function TechnicalIssuesBreakdown({ categories, className = '' }: TechnicalIssuesBreakdownProps) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  
  const toggleCategory = (categoryName: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };
  
  const expandAll = () => {
    const allOpen: Record<string, boolean> = {};
    categories.forEach(category => {
      allOpen[category.name] = true;
    });
    setOpenCategories(allOpen);
  };
  
  const collapseAll = () => {
    setOpenCategories({});
  };
  
  // Count total issues and issues by severity
  const totalIssues = categories.reduce((sum, category) => sum + category.issues.length, 0);
  
  const countBySeverity = {
    high: categories.reduce((sum, category) => 
      sum + category.issues.filter(issue => issue.severity === 'high').length, 0),
    medium: categories.reduce((sum, category) => 
      sum + category.issues.filter(issue => issue.severity === 'medium').length, 0),
    low: categories.reduce((sum, category) => 
      sum + category.issues.filter(issue => issue.severity === 'low').length, 0)
  };
  
  // Data for pie chart
  const chartData = [
    { name: 'Critical', value: countBySeverity.high, color: '#ef4444' },
    { name: 'Warning', value: countBySeverity.medium, color: '#f59e0b' },
    { name: 'Info', value: countBySeverity.low, color: '#3b82f6' }
  ].filter(item => item.value > 0);
  
  // Get severity badge
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Critical</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Warning</Badge>;
      case 'low':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 flex items-center gap-1"><Info className="h-3 w-3" /> Info</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">Unknown</Badge>;
    }
  };
  
  // Custom tooltip for the pie chart
  const CustomTooltip = ({ active, payload }: any) => {
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
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Technical SEO Issues</CardTitle>
            <CardDescription>
              {totalIssues} {totalIssues === 1 ? 'issue' : 'issues'} found across {categories.length} {categories.length === 1 ? 'category' : 'categories'}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {totalIssues > 0 && (
          <div className="mb-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-4 mb-6">
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
                <p className="text-xs text-red-600 font-medium mb-1">Critical</p>
                <p className="text-2xl font-bold text-red-600">{countBySeverity.high}</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-center">
                <p className="text-xs text-yellow-600 font-medium mb-1">Warning</p>
                <p className="text-2xl font-bold text-yellow-600">{countBySeverity.medium}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
                <p className="text-xs text-blue-600 font-medium mb-1">Info</p>
                <p className="text-2xl font-bold text-blue-600">{countBySeverity.low}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {categories.length > 0 ? (
            categories.map((category) => (
              <Collapsible
                key={category.name}
                open={openCategories[category.name]}
                onOpenChange={() => toggleCategory(category.name)}
                className="border rounded-lg"
              >
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex w-full justify-between p-4 h-auto"
                  >
                    <div className="flex items-center gap-2 font-medium text-left">
                      {category.name} 
                      <Badge variant="outline" className="ml-2">
                        {category.issues.length} {category.issues.length === 1 ? 'issue' : 'issues'}
                      </Badge>
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4">
                  <div className="space-y-3">
                    {category.issues.length > 0 ? (
                      category.issues.map((issue) => (
                        <div 
                          key={issue.id} 
                          className="border rounded-md p-3 bg-gray-50 dark:bg-gray-800"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-medium">{issue.description}</p>
                            {getSeverityBadge(issue.severity)}
                          </div>
                          
                          {issue.details && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {issue.details}
                            </p>
                          )}
                          
                          {issue.url && (
                            <a 
                              href={issue.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-2"
                            >
                              <Link2 className="h-3 w-3" /> {issue.url}
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </a>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center justify-center py-4">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        <p className="text-gray-500">No issues in this category</p>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-xl font-medium mb-2">No Technical Issues Found</h3>
              <p className="text-gray-500 text-center">
                Great job! Your website doesn't have any technical SEO issues.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 