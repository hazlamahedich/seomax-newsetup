import { createClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin-client';

/**
 * Creates a project in the database for the given user
 */
export async function createProject(
  userId: string, 
  name: string,
  domain: string = '',
  description: string = ''
) {
  try {
    console.log('[ProjectHelper] Creating project for user:', userId);
    
    // Use admin client to bypass RLS
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('projects')
      .insert([
        { 
          user_id: userId,
          website_name: name,
          website_url: domain,
          keywords: [],
          competitors: [],
          seo_score: 0
        }
      ])
      .select()
      .single();
      
    if (error) {
      console.error('[ProjectHelper] Error creating project:', error);
      throw error;
    }
    
    console.log('[ProjectHelper] Project created:', data);
    return data;
  } catch (error) {
    console.error('[ProjectHelper] Error creating project:', error);
    throw error;
  }
}

/**
 * Checks if a project exists and creates it if it doesn't
 */
export async function ensureProjectExists(projectId: string, userId: string, name: string = 'Default Project') {
  try {
    console.log('[ProjectHelper] Ensuring project exists:', projectId);
    
    // Use admin client for both checking and creating to bypass RLS
    // This avoids situations where regular client doesn't see a project due to RLS
    const adminClient = createAdminClient();
    
    // First check if the project exists
    const { data: existingProject, error: queryError } = await adminClient
      .from('projects')
      .select('id, user_id, website_name, website_url')
      .eq('id', projectId)
      .maybeSingle();
      
    if (queryError) {
      console.error('[ProjectHelper] Error checking project:', queryError);
      throw queryError;
    }
    
    // If project exists, return it
    if (existingProject) {
      console.log('[ProjectHelper] Project already exists:', existingProject);
      
      // If the project exists but has a different user_id, update it
      if (existingProject.user_id !== userId) {
        console.log('[ProjectHelper] Project exists but belongs to different user, reassigning to:', userId);
        return await assignProjectToUser(projectId, userId);
      }
      
      return existingProject;
    }
    
    // Project doesn't exist, create it with the specified ID
    console.log('[ProjectHelper] Project does not exist, creating with ID:', projectId);
    
    try {
      const { data: newProject, error: insertError } = await adminClient
        .from('projects')
        .insert([
          { 
            id: projectId,
            user_id: userId,
            website_name: name,
            website_url: 'https://example.com',
            keywords: [],
            competitors: [],
            seo_score: 0
          }
        ])
        .select()
        .single();
        
      if (insertError) {
        // Check if this is a duplicate key error
        if (insertError.code === '23505') {
          console.log('[ProjectHelper] Project was created by another process, fetching it');
          
          // Project was created between our check and insert, just fetch it
          const { data: concurrentProject, error: fetchError } = await adminClient
            .from('projects')
            .select('id, user_id, website_name, website_url')
            .eq('id', projectId)
            .maybeSingle();
            
          if (fetchError) {
            console.error('[ProjectHelper] Error fetching concurrent project:', fetchError);
            throw fetchError;
          }
          
          if (concurrentProject) {
            // If the project belongs to a different user, reassign it
            if (concurrentProject.user_id !== userId) {
              console.log('[ProjectHelper] Concurrent project belongs to different user, reassigning to:', userId);
              return await assignProjectToUser(projectId, userId);
            }
            
            return concurrentProject;
          }
        }
        
        console.error('[ProjectHelper] Error creating project with ID:', insertError);
        throw insertError;
      }
      
      console.log('[ProjectHelper] New project created with ID:', newProject);
      return newProject;
    } catch (insertCatchError: any) {
      // One more fallback in case the error wasn't caught properly above
      if (insertCatchError?.code === '23505') {
        console.log('[ProjectHelper] Caught duplicate key error in catch block, fetching existing project');
        
        // Try one more time to fetch the project that caused the conflict
        const { data: existingProject, error: fetchError } = await adminClient
          .from('projects')
          .select('id, user_id, website_name, website_url')
          .eq('id', projectId)
          .maybeSingle();
          
        if (!fetchError && existingProject) {
          // If the project belongs to a different user, reassign it
          if (existingProject.user_id !== userId) {
            console.log('[ProjectHelper] Existing project belongs to different user, reassigning to:', userId);
            return await assignProjectToUser(projectId, userId);
          }
          
          return existingProject;
        }
      }
      
      throw insertCatchError;
    }
  } catch (error) {
    console.error('[ProjectHelper] Error ensuring project exists:', error);
    throw error;
  }
}

/**
 * Lists all projects for a user
 */
export async function getUserProjects(userId: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      console.error('[ProjectHelper] Error fetching user projects:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('[ProjectHelper] Error getting user projects:', error);
    throw error;
  }
}

/**
 * Assigns a project to a user
 */
export async function assignProjectToUser(projectId: string, userId: string) {
  try {
    // Use admin client to bypass RLS
    const supabase = createAdminClient();
    
    // Check if project exists
    const { data: existingProject, error: queryError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .maybeSingle();
      
    if (queryError) {
      console.error('[ProjectHelper] Error checking project:', queryError);
      throw queryError;
    }
    
    if (!existingProject) {
      throw new Error(`Project with ID ${projectId} does not exist`);
    }
    
    // Update the user_id
    const { data, error } = await supabase
      .from('projects')
      .update({ user_id: userId })
      .eq('id', projectId)
      .select()
      .single();
      
    if (error) {
      console.error('[ProjectHelper] Error assigning project to user:', error);
      throw error;
    }
    
    console.log('[ProjectHelper] Project assigned to user:', data);
    return data;
  } catch (error) {
    console.error('[ProjectHelper] Error assigning project to user:', error);
    throw error;
  }
} 