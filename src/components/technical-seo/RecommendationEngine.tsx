'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle, ArrowRight, ExternalLink } from 'lucide-react';
import { TechnicalIssue } from '@/lib/types/seo';
import Link from 'next/link';

interface RecommendationEngineProps {
  siteCrawlId: string;
  issues: TechnicalIssue[];
}

interface RecommendationGroup {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  count: number;
  recommendations: string[];
  affectedPages?: string[];
}

export function RecommendationEngine({ siteCrawlId, issues }: RecommendationEngineProps) {
  const [activeTab, setActiveTab] = useState('high');
  const [recommendationGroups, setRecommendationGroups] = useState<Record<string, RecommendationGroup>>({});
  
  // Process issues into recommendation groups
  useEffect(() => {
    if (issues && issues.length > 0) {
      const groups: Record<string, RecommendationGroup> = {};
      
      // Helper function to get a key from issue type
      const getGroupKey = (issue: TechnicalIssue) => {
        return issue.issue_type.toLowerCase().replace(/\s+/g, '_');
      };
      
      // Process each issue
      issues.forEach(issue => {
        const key = getGroupKey(issue);
        
        if (!groups[key]) {
          groups[key] = {
            title: formatIssueType(issue.issue_type),
            description: issue.issue_description.split(':')[0],
            priority: issue.issue_severity as 'high' | 'medium' | 'low',
            count: 1,
            recommendations: getRecommendationsForIssueType(issue.issue_type),
            affectedPages: [issue.page_url]
          };
        } else {
          groups[key].count++;
          if (groups[key].affectedPages && !groups[key].affectedPages.includes(issue.page_url)) {
            groups[key].affectedPages.push(issue.page_url);
          }
        }
      });
      
      setRecommendationGroups(groups);
    }
  }, [issues]);

  // Format issue type for display
  const formatIssueType = (type: string): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get recommendations based on issue type
  const getRecommendationsForIssueType = (issueType: string): string[] => {
    const recommendations: Record<string, string[]> = {
      'broken_links': [
        'Fix or remove broken links to improve user experience and crawlability',
        'Set up 301 redirects for permanently moved content',
        'Update internal linking to point to valid URLs',
        'Check for typos in href attributes in your HTML'
      ],
      'missing_title': [
        'Add unique, descriptive title tags to all pages (50-60 characters optimal)',
        'Include primary keywords in titles when relevant',
        'Avoid duplicate titles across different pages',
        'Make titles compelling for users to improve click-through rates'
      ],
      'missing_meta_description': [
        'Add meta descriptions to all pages (120-155 characters optimal)',
        'Include relevant keywords naturally in the description',
        'Make descriptions compelling and actionable',
        'Avoid duplicate descriptions across pages'
      ],
      'missing_h1': [
        'Add a single H1 heading to each page that includes the main topic',
        'Ensure the H1 is visible and not hidden by CSS',
        'Make the H1 descriptive and relevant to the page content',
        'Maintain proper heading hierarchy (H1, H2, H3, etc.)'
      ],
      'duplicate_content': [
        'Implement canonical tags to indicate the preferred version of duplicate pages',
        'Use 301 redirects to consolidate duplicate URLs',
        'Modify content to make pages sufficiently different',
        'Use parameter handling in Google Search Console for URLs with query parameters'
      ],
      'slow_page': [
        'Compress and optimize images',
        'Minify CSS, JavaScript, and HTML',
        'Implement browser caching',
        'Use a content delivery network (CDN)',
        'Reduce server response time',
        'Defer loading of non-critical JavaScript'
      ],
      'mobile_unfriendly': [
        'Implement responsive design using viewport meta tags',
        'Ensure text is readable without zooming',
        'Size tap targets appropriately for mobile users',
        'Avoid horizontal scrolling on mobile devices',
        'Test your site with the Google Mobile-Friendly Test tool'
      ],
      'mixed_content': [
        'Update all HTTP resources to HTTPS',
        'Use relative URLs for resources when possible',
        'Check for hard-coded HTTP URLs in your code',
        'Update content embedded from third parties to use HTTPS'
      ],
      'redirect_chain': [
        'Update links to point directly to the final URL',
        'Simplify redirect chains to a single 301 redirect',
        'Check for redirect loops and fix them',
        'Update internal linking structure'
      ],
      'low_word_count': [
        'Expand content to provide more value to users',
        'Cover topics comprehensively with detailed information',
        'Add relevant subheadings, lists, and examples',
        'Focus on quality and relevance over arbitrary word counts'
      ]
    };
    
    // Convert the issue type to a key format
    const key = issueType.toLowerCase().replace(/\s+/g, '_');
    
    // Return specific recommendations if available, otherwise general ones
    return recommendations[key] || [
      'Fix the identified issues to improve SEO performance',
      'Regularly monitor for similar issues',
      'Consider consulting with an SEO specialist for complex issues'
    ];
  };
  
  // Group recommendations by priority
  const highPriorityGroups = Object.values(recommendationGroups).filter(group => group.priority === 'high');
  const mediumPriorityGroups = Object.values(recommendationGroups).filter(group => group.priority === 'medium');
  const lowPriorityGroups = Object.values(recommendationGroups).filter(group => group.priority === 'low');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Technical SEO Recommendations</CardTitle>
        <CardDescription>Actionable steps to improve your site's technical health</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="high" className="relative">
              High Priority
              {highPriorityGroups.length > 0 && (
                <Badge variant="destructive" className="ml-2">{highPriorityGroups.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="medium" className="relative">
              Medium Priority
              {mediumPriorityGroups.length > 0 && (
                <Badge variant="outline" className="ml-2 bg-amber-100">{mediumPriorityGroups.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="low" className="relative">
              Low Priority
              {lowPriorityGroups.length > 0 && (
                <Badge variant="outline" className="ml-2 bg-blue-100">{lowPriorityGroups.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="high" className="space-y-4 mt-4">
            {highPriorityGroups.length > 0 ? (
              highPriorityGroups.map((group, index) => (
                <div key={index} className="border rounded-md p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center">
                        <AlertCircle className="text-red-500 mr-2 h-5 w-5" />
                        {group.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    </div>
                    <Badge variant="destructive">{group.count} {group.count === 1 ? 'issue' : 'issues'}</Badge>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium mb-2">Recommendations:</h4>
                    <ul className="space-y-2">
                      {group.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {group.affectedPages && group.affectedPages.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Sample affected pages:</h4>
                      <div className="space-y-1">
                        {group.affectedPages.slice(0, 3).map((page, i) => (
                          <div key={i} className="flex items-center text-sm">
                            <ExternalLink className="h-3 w-3 mr-1 text-blue-600" />
                            <a 
                              href={page} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline truncate"
                            >
                              {page.split('/').slice(3).join('/')}
                            </a>
                          </div>
                        ))}
                        {group.affectedPages.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            ...and {group.affectedPages.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>No high priority issues</AlertTitle>
                <AlertDescription>
                  Great! Your site doesn't have any high priority technical issues.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="medium" className="space-y-4 mt-4">
            {mediumPriorityGroups.length > 0 ? (
              mediumPriorityGroups.map((group, index) => (
                <div key={index} className="border rounded-md p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center">
                        <AlertCircle className="text-amber-500 mr-2 h-5 w-5" />
                        {group.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    </div>
                    <Badge variant="outline" className="bg-amber-100">{group.count} {group.count === 1 ? 'issue' : 'issues'}</Badge>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium mb-2">Recommendations:</h4>
                    <ul className="space-y-2">
                      {group.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {group.affectedPages && group.affectedPages.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Sample affected pages:</h4>
                      <div className="space-y-1">
                        {group.affectedPages.slice(0, 3).map((page, i) => (
                          <div key={i} className="flex items-center text-sm">
                            <ExternalLink className="h-3 w-3 mr-1 text-blue-600" />
                            <a 
                              href={page} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline truncate"
                            >
                              {page.split('/').slice(3).join('/')}
                            </a>
                          </div>
                        ))}
                        {group.affectedPages.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            ...and {group.affectedPages.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>No medium priority issues</AlertTitle>
                <AlertDescription>
                  Your site doesn't have any medium priority technical issues.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="low" className="space-y-4 mt-4">
            {lowPriorityGroups.length > 0 ? (
              lowPriorityGroups.map((group, index) => (
                <div key={index} className="border rounded-md p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg flex items-center">
                        <AlertCircle className="text-blue-500 mr-2 h-5 w-5" />
                        {group.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    </div>
                    <Badge variant="outline" className="bg-blue-100">{group.count} {group.count === 1 ? 'issue' : 'issues'}</Badge>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-medium mb-2">Recommendations:</h4>
                    <ul className="space-y-2">
                      {group.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {group.affectedPages && group.affectedPages.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Sample affected pages:</h4>
                      <div className="space-y-1">
                        {group.affectedPages.slice(0, 3).map((page, i) => (
                          <div key={i} className="flex items-center text-sm">
                            <ExternalLink className="h-3 w-3 mr-1 text-blue-600" />
                            <a 
                              href={page} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline truncate"
                            >
                              {page.split('/').slice(3).join('/')}
                            </a>
                          </div>
                        ))}
                        {group.affectedPages.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            ...and {group.affectedPages.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>No low priority issues</AlertTitle>
                <AlertDescription>
                  Your site doesn't have any low priority technical issues.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-md">
          <h3 className="font-medium text-blue-800 mb-2">General Best Practices</h3>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
              <span className="text-sm">Regularly crawl your site to catch new issues early</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
              <span className="text-sm">Prioritize high-impact issues that affect crawlability and user experience</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
              <span className="text-sm">Implement proper site architecture with logical internal linking</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
              <span className="text-sm">Ensure all pages are accessible through multiple paths</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
              <span className="text-sm">Maintain a clean URL structure that reflects your site hierarchy</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
} 