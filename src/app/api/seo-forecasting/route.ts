import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { SEOForecastingService, ForecastRequest } from '@/lib/services/SEOForecastingService';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await req.json();
    const { action, ...params } = data;
    
    switch (action) {
      case 'generateForecast':
        if (!isValidForecastRequest(params)) {
          return NextResponse.json({ error: 'Invalid forecast parameters' }, { status: 400 });
        }
        const forecast = await SEOForecastingService.generateForecast(params);
        return NextResponse.json({ forecast });
        
      case 'getProjectForecasts':
        if (!params.projectId) {
          return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }
        const forecasts = await SEOForecastingService.getForecasts(params.projectId);
        return NextResponse.json({ forecasts });
        
      case 'getForecast':
        if (!params.forecastId) {
          return NextResponse.json({ error: 'Forecast ID is required' }, { status: 400 });
        }
        const siteForecast = await SEOForecastingService.getForecast(params.forecastId);
        return NextResponse.json({ forecast: siteForecast });
        
      case 'deleteForecast':
        if (!params.forecastId) {
          return NextResponse.json({ error: 'Forecast ID is required' }, { status: 400 });
        }
        await SEOForecastingService.deleteForecast(params.forecastId);
        return NextResponse.json({ success: true });
        
      case 'getSiteMetrics':
        if (!params.siteId) {
          return NextResponse.json({ error: 'Site ID is required' }, { status: 400 });
        }
        const metrics = await SEOForecastingService.getSiteMetrics(params.siteId);
        return NextResponse.json({ metrics });
        
      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in SEO forecasting API:', error);
    return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 });
  }
}

function isValidForecastRequest(params: any): params is ForecastRequest {
  return (
    typeof params === 'object' &&
    typeof params.projectId === 'string' &&
    typeof params.siteId === 'string' &&
    Array.isArray(params.recommendations) &&
    params.recommendations.length > 0 &&
    params.recommendations.every(
      (rec: any) =>
        typeof rec.description === 'string' &&
        typeof rec.impact === 'string' &&
        typeof rec.effort === 'string'
    )
  );
} 