import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { MultiLocationSEOService, BusinessLocation, LocationSEOAnalysis } from '@/lib/services/MultiLocationSEOService';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await req.json();
    const { action, ...params } = data;
    
    switch (action) {
      case 'createLocation':
        if (!isValidLocation(params)) {
          return NextResponse.json({ error: 'Invalid location data' }, { status: 400 });
        }
        const location = await MultiLocationSEOService.createLocation(params);
        return NextResponse.json({ location });
        
      case 'getLocations':
        if (!params.projectId) {
          return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }
        const locations = await MultiLocationSEOService.getProjectLocations(params.projectId);
        return NextResponse.json({ locations });
        
      case 'updateLocation':
        if (!params.locationId || !params.locationData) {
          return NextResponse.json({ error: 'Location ID and update data are required' }, { status: 400 });
        }
        const updatedLocation = await MultiLocationSEOService.updateLocation(params.locationId, params.locationData);
        return NextResponse.json({ location: updatedLocation });
        
      case 'analyzeLocation':
        if (!params.projectId || !params.siteId) {
          return NextResponse.json({ error: 'Project ID and Site ID are required' }, { status: 400 });
        }
        const analyses = await MultiLocationSEOService.analyzeMultiLocationSEO({
          projectId: params.projectId,
          siteId: params.siteId,
          locationIds: params.locationIds,
          includeRankingData: params.includeRankingData
        });
        return NextResponse.json({ analyses });
        
      case 'getLocationAnalysis':
        if (!params.locationId || !params.siteId) {
          return NextResponse.json({ error: 'Location ID and Site ID are required' }, { status: 400 });
        }
        const analysis = await MultiLocationSEOService.getLocationSEOAnalysis(params.locationId, params.siteId);
        return NextResponse.json({ analysis });
        
      case 'generateConsolidatedReport':
        if (!params.projectId || !params.siteId) {
          return NextResponse.json({ error: 'Project ID and Site ID are required' }, { status: 400 });
        }
        const report = await MultiLocationSEOService.generateConsolidatedReport(params.projectId, params.siteId);
        return NextResponse.json({ report });
        
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in multi-location API:', error);
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}

function isValidLocation(location: any): location is BusinessLocation {
  return (
    typeof location === 'object' &&
    typeof location.projectId === 'string' &&
    typeof location.locationName === 'string' &&
    typeof location.addressLine1 === 'string' &&
    typeof location.city === 'string' &&
    typeof location.state === 'string' &&
    typeof location.postalCode === 'string' &&
    typeof location.country === 'string' &&
    typeof location.isPrimary === 'boolean'
  );
} 