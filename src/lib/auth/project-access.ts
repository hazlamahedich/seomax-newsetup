import { createClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin-client';

/**
 * Checks if a user has access to a specific project
 * 
 * @param userId The user ID to check
 * @param projectId The project ID to check access for
 * @returns Object with result and project data if successful
 */
export async function checkProjectAccess(userId: string, projectId: string) {
  if (!userId || !projectId) {
    return { 
      success: false, 
      error: 'Missing user ID or project ID',
      data: null
    };
  }

  try {
    // First try with regular client (this will follow RLS policies)
    const regularClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    
    // Use regular query instead of single() to avoid errors with no results
    const { data: regularData, error: regularError } = await regularClient
      .from('projects')
      .select('id, created_at')
      .eq('id', projectId)
      .eq('user_id', userId);
    
    // If we found data through regular client, return success
    if (!regularError && regularData && regularData.length > 0) {
      console.log(`[ProjectAccess] Project access confirmed for project ID ${projectId} (regular client)`);
      return { 
        success: true, 
        error: null, 
        data: regularData[0]
      };
    }
    
    // If regular client failed, try with admin client to bypass RLS
    console.log(`[ProjectAccess] Regular client check failed, trying admin client for ID ${projectId}`);
    const adminClient = createAdminClient();
    
    const { data, error } = await adminClient
      .from('projects')
      .select('id, user_id, created_at')
      .eq('id', projectId)
      .eq('user_id', userId);
    
    if (error) {
      console.error(`[ProjectAccess] Admin client database error:`, error);
      return { 
        success: false, 
        error: error.message,
        data: null
      };
    }
    
    // Check if any projects were found
    if (!data || data.length === 0) {
      console.log(`[ProjectAccess] No project found for user ${userId} with project ID ${projectId}`);
      return { 
        success: false, 
        error: 'Project not found or access denied',
        data: null
      };
    }
    
    // Use the first project found
    const project = data[0];
    console.log(`[ProjectAccess] Project access confirmed for project ID ${projectId} (admin client)`);
    
    return { 
      success: true, 
      error: null, 
      data: project
    };
  } catch (error) {
    console.error('[ProjectAccess] Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null
    };
  }
} 