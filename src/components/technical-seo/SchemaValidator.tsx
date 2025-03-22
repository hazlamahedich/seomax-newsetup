'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { TechnicalSEOService } from '@/lib/services/TechnicalSEOService';
import { SchemaValidationResult } from '@/lib/types/seo';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

interface SchemaValidatorProps {
  siteCrawlId: string;
}

export function SchemaValidator({ siteCrawlId }: SchemaValidatorProps) {
  const [results, setResults] = useState<SchemaValidationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Load schema validation results
  useEffect(() => {
    const validateSchema = async () => {
      try {
        setLoading(true);
        const validationResults = await TechnicalSEOService.validateSchemaMarkup(siteCrawlId);
        setResults(validationResults);
      } catch (err) {
        console.error('Error validating schema:', err);
        setError('Failed to validate schema markup. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    validateSchema();
  }, [siteCrawlId]);

  // Calculate schema statistics
  const totalPages = results.length;
  const pagesWithSchema = results.filter(r => r.hasSchema).length;
  const pagesWithValidSchema = results.filter(r => r.hasSchema && r.isValid).length;
  const pagesWithErrors = results.filter(r => r.hasSchema && !r.isValid).length;
  
  // Get schema types distribution
  const schemaTypes: Record<string, number> = {};
  results.forEach(result => {
    result.schemaTypes.forEach(type => {
      schemaTypes[type] = (schemaTypes[type] || 0) + 1;
    });
  });

  // Get common validation errors
  const commonErrors: Record<string, number> = {};
  results.forEach(result => {
    result.validationErrors.forEach(error => {
      const simplifiedError = error.split(':')[0];
      commonErrors[simplifiedError] = (commonErrors[simplifiedError] || 0) + 1;
    });
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Schema Markup Validation</CardTitle>
          <CardDescription>Analyzing structured data on your pages</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Validating schema markup...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Schema Markup Validation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-600">{error}</p>
            <Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (totalPages === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Schema Markup Validation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No pages available for schema validation.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schema Markup Validation</CardTitle>
        <CardDescription>Analysis of structured data implementation across your site</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pages">Pages</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            {/* Schema Usage Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalPages}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-medium">Pages With Schema</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pagesWithSchema}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {Math.round((pagesWithSchema / totalPages) * 100)}% of pages
                  </div>
                  <Progress 
                    value={(pagesWithSchema / totalPages) * 100} 
                    className="mt-2 h-2" 
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-medium">Valid Schema</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pagesWithValidSchema}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {pagesWithSchema > 0 
                      ? `${Math.round((pagesWithValidSchema / pagesWithSchema) * 100)}% of schemas`
                      : '0% of schemas'}
                  </div>
                  <Progress 
                    value={pagesWithSchema > 0 ? (pagesWithValidSchema / pagesWithSchema) * 100 : 0} 
                    className="mt-2 h-2" 
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-sm font-medium">Pages With Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pagesWithErrors}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {pagesWithSchema > 0 
                      ? `${Math.round((pagesWithErrors / pagesWithSchema) * 100)}% of schemas`
                      : '0% of schemas'}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Schema Types Distribution */}
            {Object.keys(schemaTypes).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Schema Types</CardTitle>
                  <CardDescription>Distribution of schema types across your site</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(schemaTypes)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between p-2 border rounded">
                          <span className="font-medium">{type}</span>
                          <Badge variant="outline">{count} {count === 1 ? 'page' : 'pages'}</Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Common Validation Errors */}
            {Object.keys(commonErrors).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Common Schema Errors</CardTitle>
                  <CardDescription>Frequent issues found in your schema markup</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(commonErrors)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 5)
                      .map(([error, count]) => (
                        <div key={error} className="flex items-center justify-between p-2 border rounded">
                          <span className="text-sm">{error}</span>
                          <Badge variant="destructive">{count} {count === 1 ? 'instance' : 'instances'}</Badge>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="pages">
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableCaption>Schema validation results for {totalPages} pages</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page URL</TableHead>
                    <TableHead>Schema Types</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={result.pageId}>
                      <TableCell className="max-w-[300px] truncate">
                        <a 
                          href={result.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center"
                        >
                          {result.url.split('/').slice(3).join('/')}
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </TableCell>
                      <TableCell>
                        {result.hasSchema ? (
                          <div className="flex flex-wrap gap-1">
                            {result.schemaTypes.map(type => (
                              <Badge key={type} variant="outline">{type}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No schema</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!result.hasSchema ? (
                          <Badge variant="outline" className="bg-gray-100">No Schema</Badge>
                        ) : result.isValid ? (
                          <Badge variant="outline" className="bg-green-100 text-green-800">Valid</Badge>
                        ) : (
                          <Badge variant="destructive">Invalid</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.validationErrors.length > 0 ? (
                          <div className="text-sm text-red-500">
                            {result.validationErrors.length} {result.validationErrors.length === 1 ? 'issue' : 'issues'}
                          </div>
                        ) : result.hasSchema ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span>No issues</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="recommendations" className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-md">
              <h3 className="text-lg font-medium flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-blue-600" />
                Schema Markup Recommendations
              </h3>
              <p className="mt-2 text-sm">
                Structured data helps search engines understand your content better and can enable rich results in search.
              </p>
            </div>
            
            {/* Pages without schema */}
            {totalPages - pagesWithSchema > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                    {totalPages - pagesWithSchema} pages without schema markup
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">
                    Consider adding schema markup to the following page types:
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                      <span>Homepage: Add Organization, WebSite or LocalBusiness schema</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                      <span>Content pages: Add Article, BlogPosting, or NewsArticle schema</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                      <span>Product pages: Add Product schema with pricing and availability</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                      <span>Add BreadcrumbList schema to improve site navigation signals</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Invalid schema */}
            {pagesWithErrors > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                    {pagesWithErrors} pages with invalid schema markup
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">
                    Fix these common issues in your schema markup:
                  </p>
                  <div className="space-y-2 text-sm">
                    {Object.entries(commonErrors)
                      .sort((a, b) => b[1] - a[1])
                      .map(([error, count], index) => (
                        <div key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                          <span>Fix "{error}" errors on {count} {count === 1 ? 'page' : 'pages'}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Schema best practices */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Schema Markup Best Practices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                    <span>Use JSON-LD format for schema (preferred by Google)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                    <span>Implement schema that's relevant to your page content</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                    <span>Include all required properties for each schema type</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                    <span>Validate schema with Google's Rich Results Test</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                    <span>Use nested schemas when appropriate (e.g., Product with AggregateRating)</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href="https://schema.org/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Schema.org Reference
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 