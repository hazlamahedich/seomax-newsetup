'use server';

import { createClient } from '@/lib/supabase/server';
import { AdvancedSEOAnalyzerService } from '@/lib/services/AdvancedSEOAnalyzerService';
import { redirect } from 'next/navigation';

export async function startAudit(formData: FormData) {
  const siteUrl = formData.get('site_url') as string;
  const crawlLimit = parseInt(formData.get('crawl_limit') as string) || 25;
  const includeImages = formData.get('include_images') === 'on';
  const includePerformance = formData.get('include_performance') === 'on';
  const includeContent = formData.get('include_content') === 'on';
  const includeDuplicates = formData.get('include_duplicates') === 'on';
  
  if (!siteUrl) {
    throw new Error('Site URL is required');
  }
  
  try {
    const supabase = createClient();
    
    // Create a new audit record
    const { data: audit, error } = await supabase
      .from('seo_audits')
      .insert({
        site_url: siteUrl,
        status: 'pending',
        pages_crawled: 0,
        overall_score: 0,
        options: {
          crawl_limit: crawlLimit,
          include_images: includeImages,
          include_performance: includePerformance,
          include_content: includeContent,
          include_duplicates: includeDuplicates,
        },
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    // Start the audit process in the background
    await AdvancedSEOAnalyzerService.runAdvancedAudit(audit.id, siteUrl, {
      crawlLimit,
      includeImages,
      includePerformance,
      includeContent,
      includeDuplicates
    });
    
    // Redirect to progress page
    redirect(`/dashboard/seo-audit/${audit.id}/progress`);
  } catch (error) {
    console.error('Error starting audit:', error);
    throw new Error('Failed to start audit');
  }
} 