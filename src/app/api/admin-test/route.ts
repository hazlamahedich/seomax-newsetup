import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin-client';

/**
 * Test admin access to Supabase tables
 * This route is for debugging database access issues
 */
export async function GET() {
  const results: Record<string, any> = {};
  
  try {
    console.log('[AdminTest] Testing admin access to Supabase tables...');
    const adminClient = createAdminClient();
    
    // Test access to content_pages table
    console.log('[AdminTest] Testing content_pages access...');
    try {
      const { data: contentPagesData, error: contentPagesError } = await adminClient
        .from('content_pages')
        .select('count')
        .single();
      
      results.contentPages = {
        success: !contentPagesError,
        count: contentPagesData?.count,
        error: contentPagesError?.message
      };
      
      if (contentPagesError) {
        console.error('[AdminTest] Error accessing content_pages:', contentPagesError);
      } else {
        console.log('[AdminTest] Successfully accessed content_pages');
      }
    } catch (err: any) {
      console.error('[AdminTest] Exception accessing content_pages:', err);
      results.contentPages = {
        success: false,
        error: err?.message || 'Unknown error'
      };
    }
    
    // Test access to competitors table
    console.log('[AdminTest] Testing competitors access...');
    try {
      const { data: competitorsData, error: competitorsError } = await adminClient
        .from('competitors')
        .select('count')
        .single();
      
      results.competitors = {
        success: !competitorsError,
        count: competitorsData?.count,
        error: competitorsError?.message
      };
      
      if (competitorsError) {
        console.error('[AdminTest] Error accessing competitors:', competitorsError);
      } else {
        console.log('[AdminTest] Successfully accessed competitors');
      }
    } catch (err: any) {
      console.error('[AdminTest] Exception accessing competitors:', err);
      results.competitors = {
        success: false,
        error: err?.message || 'Unknown error'
      };
    }
    
    // Test URL lookup in content_pages
    console.log('[AdminTest] Testing URL lookup in content_pages...');
    try {
      const testUrl = 'https://divorcehome.com/';
      const { data: urlData, error: urlError } = await adminClient
        .from('content_pages')
        .select('*')
        .eq('url', testUrl)
        .maybeSingle();
      
      results.urlLookup = {
        success: !urlError,
        found: !!urlData,
        url: testUrl,
        error: urlError?.message
      };
      
      if (urlError) {
        console.error('[AdminTest] Error looking up URL:', urlError);
      } else if (urlData) {
        console.log('[AdminTest] Found URL in content_pages:', urlData.url);
      } else {
        console.log('[AdminTest] URL not found in content_pages:', testUrl);
      }
    } catch (err: any) {
      console.error('[AdminTest] Exception looking up URL:', err);
      results.urlLookup = {
        success: false,
        error: err?.message || 'Unknown error'
      };
    }
    
    return NextResponse.json({
      success: true,
      results
    });
  } catch (error: any) {
    console.error('[AdminTest] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Unknown error',
      results
    }, { status: 500 });
  }
} 