'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BusinessLocation, LocationSEOAnalysis } from '@/lib/services/MultiLocationSEOService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, MapPin, ChevronDown, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface LocationManagerProps {
  projectId: string;
  siteId: string;
}

interface ConsolidatedReportData {
  overallScore: number;
  locationScores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    description: string;
    locations: string[];
  }[];
  comparison: {
    bestPerforming: {
      locationName: string;
      score: number;
      strengths: string[];
    };
    worstPerforming: {
      locationName: string;
      score: number;
      weaknesses: string[];
    };
  };
}

const EMPTY_LOCATION: BusinessLocation = {
  projectId: '',
  locationName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  phone: '',
  email: '',
  isPrimary: false
};

export function LocationManager({ projectId, siteId }: LocationManagerProps) {
  const [locations, setLocations] = useState<BusinessLocation[]>([]);
  const [analyses, setAnalyses] = useState<Record<string, LocationSEOAnalysis>>({});
  const [currentLocation, setCurrentLocation] = useState<BusinessLocation>({...EMPTY_LOCATION, projectId});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('locations');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [reportData, setReportData] = useState<ConsolidatedReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchLocations();
    }
  }, [projectId]);

  const fetchLocations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/multi-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'getLocations', 
          projectId 
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      
      const data = await response.json();
      setLocations(data.locations || []);

      // If we have locations, fetch their analyses
      if (data.locations && data.locations.length > 0) {
        const locationIds = data.locations.filter((loc: BusinessLocation) => loc.id).map((loc: BusinessLocation) => loc.id as string);
        
        if (locationIds.length > 0) {
          await fetchAnalyses(locationIds);
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load business locations',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalyses = async (locationIds: string[]) => {
    try {
      const response = await fetch('/api/multi-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'analyzeLocation', 
          projectId,
          siteId,
          locationIds,
          includeRankingData: true
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch analyses');
      }
      
      const data = await response.json();
      
      // Convert array to record for easier access
      const analysesRecord: Record<string, LocationSEOAnalysis> = {};
      (data.analyses || []).forEach((analysis: LocationSEOAnalysis) => {
        if (analysis.locationId) {
          analysesRecord[analysis.locationId] = analysis;
        }
      });
      
      setAnalyses(analysesRecord);
    } catch (error) {
      console.error('Error fetching analyses:', error);
      toast({
        title: 'Warning',
        description: 'Failed to load SEO analyses',
        variant: 'default'
      });
    }
  };

  const fetchConsolidatedReport = async () => {
    try {
      const response = await fetch('/api/multi-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'generateConsolidatedReport', 
          projectId,
          siteId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate consolidated report');
      }
      
      const data = await response.json();
      setReportData(data.report);
      
      // Switch to report tab
      setActiveTab('report');
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate consolidated report',
        variant: 'destructive'
      });
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/multi-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'createLocation', 
          ...currentLocation 
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add location');
      }
      
      await fetchLocations();
      setIsAddDialogOpen(false);
      setCurrentLocation({...EMPTY_LOCATION, projectId});
      
      toast({
        title: 'Success',
        description: 'Business location added successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error adding location:', error);
      toast({
        title: 'Error',
        description: 'Failed to add business location',
        variant: 'destructive'
      });
    }
  };

  const handleEditLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentLocation.id) {
      toast({
        title: 'Error',
        description: 'Location ID is missing',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const response = await fetch('/api/multi-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'updateLocation', 
          locationId: currentLocation.id,
          locationData: currentLocation
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update location');
      }
      
      await fetchLocations();
      setIsEditDialogOpen(false);
      
      toast({
        title: 'Success',
        description: 'Business location updated successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error updating location:', error);
      toast({
        title: 'Error',
        description: 'Failed to update business location',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteLocation = async () => {
    if (!selectedLocationId) {
      toast({
        title: 'Error',
        description: 'No location selected for deletion',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      // This would need a delete endpoint in the API
      const response = await fetch('/api/multi-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'deleteLocation', 
          locationId: selectedLocationId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete location');
      }
      
      await fetchLocations();
      setIsDeleteDialogOpen(false);
      setSelectedLocationId(null);
      
      toast({
        title: 'Success',
        description: 'Business location deleted successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error deleting location:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete business location',
        variant: 'destructive'
      });
    }
  };

  const handleAnalyzeAllLocations = async () => {
    if (locations.length === 0) {
      toast({
        title: 'Warning',
        description: 'No locations to analyze',
        variant: 'default'
      });
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      const locationIds = locations
        .filter(loc => loc.id)
        .map(loc => loc.id as string);
        
      await fetchAnalyses(locationIds);
      
      toast({
        title: 'Success',
        description: 'All locations analyzed successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error analyzing locations:', error);
      toast({
        title: 'Error',
        description: 'Failed to analyze locations',
        variant: 'destructive'
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startEditLocation = (location: BusinessLocation) => {
    setCurrentLocation({...location});
    setIsEditDialogOpen(true);
  };

  const startDeleteLocation = (locationId: string) => {
    setSelectedLocationId(locationId);
    setIsDeleteDialogOpen(true);
  };

  const renderLocationForm = (
    <form onSubmit={isEditDialogOpen ? handleEditLocation : handleAddLocation}>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="locationName">Location Name</Label>
            <Input
              id="locationName"
              value={currentLocation.locationName}
              onChange={(e) => setCurrentLocation({...currentLocation, locationName: e.target.value})}
              required
            />
          </div>
          <div className="flex items-end space-x-2">
            <Checkbox
              id="isPrimary"
              checked={currentLocation.isPrimary}
              onCheckedChange={(checked) => 
                setCurrentLocation({...currentLocation, isPrimary: checked === true})
              }
            />
            <Label htmlFor="isPrimary">Primary Location</Label>
          </div>
        </div>
        
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="addressLine1">Address Line 1</Label>
          <Input
            id="addressLine1"
            value={currentLocation.addressLine1}
            onChange={(e) => setCurrentLocation({...currentLocation, addressLine1: e.target.value})}
            required
          />
        </div>
        
        <div className="flex flex-col space-y-1.5">
          <Label htmlFor="addressLine2">Address Line 2</Label>
          <Input
            id="addressLine2"
            value={currentLocation.addressLine2 || ''}
            onChange={(e) => setCurrentLocation({...currentLocation, addressLine2: e.target.value})}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={currentLocation.city}
              onChange={(e) => setCurrentLocation({...currentLocation, city: e.target.value})}
              required
            />
          </div>
          
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="state">State/Province</Label>
            <Input
              id="state"
              value={currentLocation.state}
              onChange={(e) => setCurrentLocation({...currentLocation, state: e.target.value})}
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="postalCode">Postal Code</Label>
            <Input
              id="postalCode"
              value={currentLocation.postalCode}
              onChange={(e) => setCurrentLocation({...currentLocation, postalCode: e.target.value})}
              required
            />
          </div>
          
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={currentLocation.country}
              onChange={(e) => setCurrentLocation({...currentLocation, country: e.target.value})}
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={currentLocation.phone || ''}
              onChange={(e) => setCurrentLocation({...currentLocation, phone: e.target.value})}
            />
          </div>
          
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={currentLocation.email || ''}
              onChange={(e) => setCurrentLocation({...currentLocation, email: e.target.value})}
            />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button type="submit">
          {isEditDialogOpen ? 'Update Location' : 'Add Location'}
        </Button>
      </DialogFooter>
    </form>
  );
  
  const renderLocationsTab = (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Business Locations</h3>
        <div className="flex space-x-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Location
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Add Business Location</DialogTitle>
              </DialogHeader>
              {renderLocationForm}
            </DialogContent>
          </Dialog>
          
          <Button 
            variant="outline" 
            onClick={handleAnalyzeAllLocations}
            disabled={isAnalyzing || locations.length === 0}
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze All'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={fetchConsolidatedReport}
            disabled={locations.length < 2 || Object.keys(analyses).length === 0}
          >
            Generate Report
          </Button>
        </div>
      </div>
      
      {locations.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No locations added</AlertTitle>
          <AlertDescription>
            Add your first business location to get started with multi-location SEO management.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((location) => (
            <Card key={location.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    {location.locationName}
                  </CardTitle>
                  {location.isPrimary && (
                    <Badge variant="secondary">Primary</Badge>
                  )}
                </div>
                <CardDescription>
                  {location.addressLine1}
                  {location.addressLine2 && <>, {location.addressLine2}</>}
                  <br />
                  {location.city}, {location.state} {location.postalCode}
                  <br />
                  {location.country}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                {location.id && analyses[location.id] ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span>Local SEO Score</span>
                      <span className="font-medium">{analyses[location.id].localSeoScore}/100</span>
                    </div>
                    <Progress value={analyses[location.id].localSeoScore} />
                    
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="text-xs">
                        <span className="block text-muted-foreground">Citations</span>
                        <span>{analyses[location.id].citationConsistencyScore}/100</span>
                      </div>
                      <div className="text-xs">
                        <span className="block text-muted-foreground">Backlinks</span>
                        <span>{analyses[location.id].localBacklinkQuality}/100</span>
                      </div>
                      <div className="text-xs">
                        <span className="block text-muted-foreground">Reviews</span>
                        <span>{analyses[location.id].reviewSentimentScore}/100</span>
                      </div>
                      <div className="text-xs">
                        <span className="block text-muted-foreground">GBP</span>
                        <span>{analyses[location.id].gbpOptimizationScore}/100</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button 
                    variant="ghost" 
                    className="w-full text-sm h-auto py-1" 
                    onClick={() => location.id && fetchAnalyses([location.id])}
                  >
                    Analyze this location
                  </Button>
                )}
              </CardContent>
              <CardFooter className="flex justify-end pt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => startEditLocation(location)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => location.id && startDeleteLocation(location.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Business Location</DialogTitle>
          </DialogHeader>
          {renderLocationForm}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Business Location</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this business location? This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteLocation}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
  
  const renderReportTab = (
    <div className="space-y-4">
      {!reportData ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No report available</AlertTitle>
          <AlertDescription>
            Generate a consolidated report to see insights across all your locations.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Overall Performance</CardTitle>
              <CardDescription>
                Aggregated score across all locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-2">
                <div className="text-4xl font-bold">{reportData.overallScore}/100</div>
                <Progress value={reportData.overallScore} className="w-full max-w-md" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div>
                  <h4 className="font-medium mb-2">Common Strengths</h4>
                  <ul className="space-y-1">
                    {reportData.strengths.map((strength: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="inline-block w-4 h-4 rounded-full bg-green-500 mr-2 mt-1" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Common Weaknesses</h4>
                  <ul className="space-y-1">
                    {reportData.weaknesses.map((weakness: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="inline-block w-4 h-4 rounded-full bg-red-500 mr-2 mt-1" />
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Location Comparison</CardTitle>
              <CardDescription>
                Best and worst performing locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Best Performing</CardTitle>
                    <CardDescription>
                      {reportData.comparison.bestPerforming.locationName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-2xl font-bold">{reportData.comparison.bestPerforming.score}/100</span>
                      <Badge variant="outline" className="bg-green-50">Top location</Badge>
                    </div>
                    <h4 className="text-sm font-medium mb-1">Key Strengths</h4>
                    <ul className="space-y-1">
                      {reportData.comparison.bestPerforming.strengths.map((strength: string, index: number) => (
                        <li key={index} className="text-sm">• {strength}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Needs Improvement</CardTitle>
                    <CardDescription>
                      {reportData.comparison.worstPerforming.locationName}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-2xl font-bold">{reportData.comparison.worstPerforming.score}/100</span>
                      <Badge variant="outline" className="bg-red-50">Needs attention</Badge>
                    </div>
                    <h4 className="text-sm font-medium mb-1">Key Weaknesses</h4>
                    <ul className="space-y-1">
                      {reportData.comparison.worstPerforming.weaknesses.map((weakness: string, index: number) => (
                        <li key={index} className="text-sm">• {weakness}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Prioritized Recommendations</CardTitle>
              <CardDescription>
                Actions to improve your multi-location SEO
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Priority</TableHead>
                    <TableHead>Recommendation</TableHead>
                    <TableHead>Applies To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.recommendations.map((rec: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={
                            rec.priority === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                            rec.priority === 'medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                          }
                        >
                          {rec.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{rec.description}</TableCell>
                      <TableCell>
                        {rec.locations.length === locations.length ? (
                          <span>All locations</span>
                        ) : (
                          <span>{rec.locations.length} locations</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Individual Location Scores</CardTitle>
              <CardDescription>
                Compare performance across all locations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(reportData.locationScores).map(([locationId, score]) => {
                  const location = locations.find(loc => loc.id === locationId);
                  if (!location) return null;
                  
                  return (
                    <div key={locationId} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{location.locationName}</span>
                        <span>{score}/100</span>
                      </div>
                      <Progress value={score as number} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="report" disabled={Object.keys(analyses).length === 0}>
            Consolidated Report
          </TabsTrigger>
        </TabsList>
        <TabsContent value="locations" className="pt-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-pulse text-center">
                <div className="h-4 w-32 bg-gray-200 rounded mb-3 mx-auto"></div>
                <div className="h-3 w-48 bg-gray-200 rounded mx-auto"></div>
              </div>
            </div>
          ) : (
            renderLocationsTab
          )}
        </TabsContent>
        <TabsContent value="report" className="pt-4">
          {renderReportTab}
        </TabsContent>
      </Tabs>
    </div>
  );
} 