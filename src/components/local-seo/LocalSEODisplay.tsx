import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LocalSEOResult } from '@/lib/services/LocalSEOService';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ExternalLink, MapPin, Phone, Store, Check, X, AlertCircle, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface LocalSEODisplayProps {
  data?: LocalSEOResult;
  isLoading?: boolean;
}

export function LocalSEODisplay({ data, isLoading = false }: LocalSEODisplayProps) {
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) {
    return <LocalSEOSkeleton />;
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Local SEO Assessment</CardTitle>
          <CardDescription>No local SEO data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Run a local SEO assessment to see results here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Local SEO Assessment</CardTitle>
              <CardDescription>Analysis of your local SEO elements</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{data.overallScore}</div>
              <Badge
                className="ml-2"
                style={{ backgroundColor: data.grade.color }}
              >
                {data.grade.label}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="nap">NAP Consistency</TabsTrigger>
              <TabsTrigger value="schema">Local Schema</TabsTrigger>
              <TabsTrigger value="keywords">Local Keywords</TabsTrigger>
              <TabsTrigger value="maps">Maps & Location</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-base flex items-center">
                        <Store className="h-4 w-4 mr-2" />
                        NAP Consistency
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="flex justify-between items-center">
                        <Progress value={data.napConsistency.consistencyScore} className="h-2 w-3/4" />
                        <span className="font-bold">{data.napConsistency.consistencyScore}%</span>
                      </div>
                      <div className="mt-2 text-sm flex items-center">
                        {data.napConsistency.isConsistent ? (
                          <Check className="h-4 w-4 mr-1 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 mr-1 text-red-500" />
                        )}
                        {data.napConsistency.isConsistent 
                          ? 'NAP is consistent across pages' 
                          : `${data.napConsistency.inconsistencies.length} inconsistencies found`}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-base flex items-center">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Google Business Profile
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge 
                          variant={data.googleBusinessProfile.detected ? "default" : "destructive"}
                        >
                          {data.googleBusinessProfile.detected ? 'Detected' : 'Not Found'}
                        </Badge>
                      </div>
                      {data.googleBusinessProfile.detected && (
                        <div className="mt-2 text-sm flex items-center">
                          {data.googleBusinessProfile.isVerified ? (
                            <Check className="h-4 w-4 mr-1 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 mr-1 text-amber-500" />
                          )}
                          {data.googleBusinessProfile.isVerified 
                            ? 'Profile is verified' 
                            : 'Profile needs verification'}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-base flex items-center">
                        <Code className="h-4 w-4 mr-2" />
                        Local Business Schema
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="flex justify-between items-center">
                        <Progress value={data.localBusinessSchema.score} className="h-2 w-3/4" />
                        <span className="font-bold">{data.localBusinessSchema.score}%</span>
                      </div>
                      <div className="mt-2 text-sm flex items-center">
                        {data.localBusinessSchema.present ? (
                          data.localBusinessSchema.isValid ? (
                            <Check className="h-4 w-4 mr-1 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 mr-1 text-amber-500" />
                          )
                        ) : (
                          <X className="h-4 w-4 mr-1 text-red-500" />
                        )}
                        {!data.localBusinessSchema.present 
                          ? 'No local business schema found' 
                          : data.localBusinessSchema.isValid 
                            ? 'Valid schema implementation' 
                            : 'Schema missing required properties'}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="py-4">
                      <CardTitle className="text-base flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        Map Embed
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="flex justify-between items-center">
                        <Progress value={data.mapEmbed.score} className="h-2 w-3/4" />
                        <span className="font-bold">{data.mapEmbed.score}%</span>
                      </div>
                      <div className="mt-2 text-sm flex items-center">
                        {data.mapEmbed.detected ? (
                          <Check className="h-4 w-4 mr-1 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 mr-1 text-red-500" />
                        )}
                        {data.mapEmbed.detected 
                          ? `${data.mapEmbed.embedType || 'Map'} embed detected` 
                          : 'No map embed found'}
                        {data.mapEmbed.detected && !data.mapEmbed.hasAddress && (
                          <span className="ml-1 text-amber-500">(missing address)</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader className="py-4">
                    <CardTitle className="text-base">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <ul className="space-y-2">
                      {data.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start">
                          <Info className="h-4 w-4 mr-2 mt-1 text-blue-500 flex-shrink-0" />
                          <span className="text-sm">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="nap">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">NAP Consistency</CardTitle>
                    <CardDescription>
                      Name, Address, Phone consistency across your site
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center mb-4">
                      <div className="mr-4">
                        <div className="text-3xl font-bold">{data.napConsistency.consistencyScore}%</div>
                        <div className="text-sm text-muted-foreground">Consistency Score</div>
                      </div>
                      <Progress value={data.napConsistency.consistencyScore} className="h-2 flex-1" />
                    </div>
                    
                    {data.napConsistency.detectedInstances.length > 0 ? (
                      <>
                        <h3 className="font-medium mb-2">Detected NAP Information</h3>
                        <div className="space-y-4">
                          {data.napConsistency.detectedInstances.map((instance, i) => (
                            <div key={i} className="p-3 bg-muted rounded-md">
                              <div className="flex items-center mb-1">
                                <Store className="h-4 w-4 mr-2" />
                                <span className="font-medium">{instance.name}</span>
                              </div>
                              <div className="flex items-center mb-1 text-sm">
                                <MapPin className="h-4 w-4 mr-2" />
                                <span>{instance.address.formatted || 'No address detected'}</span>
                              </div>
                              <div className="flex items-center text-sm">
                                <Phone className="h-4 w-4 mr-2" />
                                <span>{instance.phone || 'No phone detected'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {data.napConsistency.inconsistencies.length > 0 && (
                          <div className="mt-4">
                            <h3 className="font-medium mb-2 text-red-500">Inconsistencies Found</h3>
                            <ul className="space-y-1">
                              {data.napConsistency.inconsistencies.map((issue, i) => (
                                <li key={i} className="flex items-start text-sm">
                                  <X className="h-4 w-4 mr-2 mt-0.5 text-red-500" />
                                  {issue}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-4 bg-muted rounded-md text-center">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                        <h3 className="font-medium">No NAP Information Detected</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your website should include consistent name, address, and phone information.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="schema">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Local Business Schema</CardTitle>
                    <CardDescription>
                      Structured data markup for local business information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center mb-4">
                      <div className="mr-4">
                        <div className="text-3xl font-bold">{data.localBusinessSchema.score}%</div>
                        <div className="text-sm text-muted-foreground">Implementation Score</div>
                      </div>
                      <Progress value={data.localBusinessSchema.score} className="h-2 flex-1" />
                    </div>
                    
                    {data.localBusinessSchema.present ? (
                      <>
                        <div className="flex items-center mb-3">
                          <Badge 
                            variant={data.localBusinessSchema.isValid ? "default" : "outline"}
                            className={!data.localBusinessSchema.isValid ? "text-amber-500 border-amber-500" : ""}
                          >
                            {data.localBusinessSchema.isValid ? 'Valid Schema' : 'Incomplete Schema'}
                          </Badge>
                        </div>
                        
                        {data.localBusinessSchema.missingProperties.length > 0 && (
                          <div className="mb-4">
                            <h3 className="font-medium mb-2 text-amber-500">Missing Properties</h3>
                            <div className="flex flex-wrap gap-2">
                              {data.localBusinessSchema.missingProperties.map((prop, i) => (
                                <Badge key={i} variant="outline" className="text-amber-500 border-amber-500">
                                  {prop}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <h3 className="font-medium mb-2">Schema Preview</h3>
                        <div className="bg-muted p-3 rounded-md overflow-x-auto">
                          <pre className="text-xs">
                            {JSON.stringify(data.localBusinessSchema.schema, null, 2)}
                          </pre>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 bg-muted rounded-md text-center">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                        <h3 className="font-medium">No Local Business Schema Detected</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Implementing LocalBusiness schema markup can significantly improve your local search visibility.
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">Recommendations</h3>
                      <ul className="space-y-1">
                        {data.localBusinessSchema.recommendations.map((recommendation, i) => (
                          <li key={i} className="flex items-start text-sm">
                            <Info className="h-4 w-4 mr-2 mt-0.5 text-blue-500" />
                            {recommendation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="keywords">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Local Keyword Usage</CardTitle>
                    <CardDescription>
                      Analysis of local keywords in your content
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center mb-4">
                      <div className="mr-4">
                        <div className="text-3xl font-bold">{data.localKeywordUsage.score}%</div>
                        <div className="text-sm text-muted-foreground">Usage Score</div>
                      </div>
                      <Progress value={data.localKeywordUsage.score} className="h-2 flex-1" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-muted p-3 rounded-md">
                        <div className="text-sm font-medium mb-1">Keyword Density</div>
                        <div className="text-2xl font-bold">{data.localKeywordUsage.localKeywordDensity}%</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {data.localKeywordUsage.localKeywordDensity < 0.5 ? 'Too low' : 
                           data.localKeywordUsage.localKeywordDensity > 3 ? 'Too high' : 'Optimal'}
                        </div>
                      </div>
                      
                      <div className="bg-muted p-3 rounded-md">
                        <div className="text-sm font-medium mb-1">Title & Headings</div>
                        <div className="flex items-center mt-2">
                          <div className="mr-3">
                            <div className="text-xs text-muted-foreground">Title</div>
                            {data.localKeywordUsage.keywordInTitle ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <X className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Headings</div>
                            {data.localKeywordUsage.keywordInHeadings ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <X className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-muted p-3 rounded-md">
                        <div className="text-sm font-medium mb-1">Local Keywords</div>
                        <div className="text-2xl font-bold">{data.localKeywordUsage.localKeywords.length}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {data.localKeywordUsage.localKeywords.length === 0 ? 'None detected' : 'Keywords found'}
                        </div>
                      </div>
                    </div>
                    
                    {data.localKeywordUsage.localKeywords.length > 0 ? (
                      <div className="mb-4">
                        <h3 className="font-medium mb-2">Detected Local Keywords</h3>
                        <div className="flex flex-wrap gap-2">
                          {data.localKeywordUsage.localKeywords.map((keyword, i) => (
                            <Badge key={i} variant="secondary">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-muted rounded-md text-center mb-4">
                        <AlertCircle className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                        <h3 className="font-medium">No Local Keywords Detected</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Adding local keywords to your content can improve your local search visibility.
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="font-medium mb-2">Recommendations</h3>
                      <ul className="space-y-1">
                        {data.localKeywordUsage.recommendations.map((recommendation, i) => (
                          <li key={i} className="flex items-start text-sm">
                            <Info className="h-4 w-4 mr-2 mt-0.5 text-blue-500" />
                            {recommendation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="maps">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Maps & Location Information</CardTitle>
                    <CardDescription>
                      Map embeds and location information on your website
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center mb-4">
                      <div className="mr-4">
                        <div className="text-3xl font-bold">{data.mapEmbed.score}%</div>
                        <div className="text-sm text-muted-foreground">Implementation Score</div>
                      </div>
                      <Progress value={data.mapEmbed.score} className="h-2 flex-1" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-muted p-3 rounded-md">
                        <div className="text-sm font-medium mb-1">Map Embed</div>
                        <div className="flex items-center mt-2">
                          {data.mapEmbed.detected ? (
                            <Check className="h-5 w-5 text-green-500 mr-2" />
                          ) : (
                            <X className="h-5 w-5 text-red-500 mr-2" />
                          )}
                          <span>
                            {data.mapEmbed.detected 
                              ? `${data.mapEmbed.embedType || 'Map'} embed detected` 
                              : 'No map embed found'}
                          </span>
                        </div>
                      </div>
                      
                      {data.mapEmbed.detected && (
                        <div className="bg-muted p-3 rounded-md">
                          <div className="text-sm font-medium mb-1">Address with Map</div>
                          <div className="flex items-center mt-2">
                            {data.mapEmbed.hasAddress ? (
                              <Check className="h-5 w-5 text-green-500 mr-2" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                            )}
                            <span>
                              {data.mapEmbed.hasAddress 
                                ? 'Address near map detected' 
                                : 'No address near map found'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {!data.mapEmbed.detected && (
                      <div className="p-4 bg-muted rounded-md text-center mb-4">
                        <MapPin className="h-8 w-8 mx-auto mb-2 text-red-500" />
                        <h3 className="font-medium">No Map Embed Detected</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Adding a map to your website improves user experience and local SEO.
                        </p>
                      </div>
                    )}
                    
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">Google Business Profile</h3>
                      {data.googleBusinessProfile.detected ? (
                        <div className="bg-muted p-3 rounded-md">
                          <div className="flex items-center mb-2">
                            <Check className="h-5 w-5 text-green-500 mr-2" />
                            <span className="font-medium">Google Business Profile Detected</span>
                          </div>
                          {data.googleBusinessProfile.url && (
                            <div className="text-sm overflow-hidden text-ellipsis">
                              <a 
                                href={data.googleBusinessProfile.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline flex items-center"
                              >
                                {data.googleBusinessProfile.url}
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </a>
                            </div>
                          )}
                          <div className="mt-2 text-sm">
                            {data.googleBusinessProfile.isVerified ? (
                              <span className="text-green-500 flex items-center">
                                <Check className="h-4 w-4 mr-1" />
                                Profile is verified
                              </span>
                            ) : (
                              <span className="text-amber-500 flex items-center">
                                <AlertCircle className="h-4 w-4 mr-1" />
                                Profile needs verification
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-muted p-3 rounded-md text-center">
                          <X className="h-5 w-5 mx-auto mb-2 text-red-500" />
                          <div className="font-medium">No Google Business Profile Detected</div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Creating and linking to a Google Business Profile can significantly improve local search visibility.
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4">
                      <h3 className="font-medium mb-2">Recommendations</h3>
                      <ul className="space-y-1">
                        {data.mapEmbed.recommendations.map((recommendation, i) => (
                          <li key={i} className="flex items-start text-sm">
                            <Info className="h-4 w-4 mr-2 mt-0.5 text-blue-500" />
                            {recommendation}
                          </li>
                        ))}
                        {data.googleBusinessProfile.detected === false && (
                          <li className="flex items-start text-sm">
                            <Info className="h-4 w-4 mr-2 mt-0.5 text-blue-500" />
                            Create and verify a Google Business Profile for your business
                          </li>
                        )}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function LocalSEOSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-[180px] mb-2" />
            <Skeleton className="h-4 w-[240px]" />
          </div>
          <div className="text-right">
            <Skeleton className="h-10 w-16 inline-block" />
            <Skeleton className="h-6 w-24 ml-2 inline-block" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-[360px] mb-6" />
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-[120px] w-full" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-[120px] w-full" />
            <Skeleton className="h-[120px] w-full" />
          </div>
          <Skeleton className="h-[180px] w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

function Code(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
  );
} 