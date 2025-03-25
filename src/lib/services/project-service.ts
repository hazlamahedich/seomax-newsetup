import { createClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin-client';
import { mapToProject, type Project, type ProjectTable } from '@/types/project';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Map database project records to Project objects
function mapProjectTable(record: ProjectTable): Project {
  return mapToProject(record);
}

/**
 * Creates a new project in the database
 */
async function createProject(name: string, url: string): Promise<Project> {
  try {
    // Get user from Supabase auth
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting user:', userError.message);
      throw new Error(userError.message);
    }
    
    if (!userData.user) {
      console.error('No authenticated user found');
      throw new Error('User not authenticated');
    }

    // Create the project
    const { data, error } = await supabase
      .from('projects')
      .insert([
        { 
          user_id: userData.user.id,
          website_name: name,
          website_url: url
        }
      ])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating project:', error.message);
      throw new Error(error.message);
    }
    
    return mapToProject(data as ProjectTable);
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
};

export const ProjectService = {
  async getProjects(): Promise<Project[]> {
    try {
      // Get user from Supabase auth
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError.message);
        throw new Error(userError.message);
      }
      
      if (!userData.user) {
        console.error('No authenticated user found');
        throw new Error('User not authenticated');
      }
      
      // Check if user is admin (can view all projects)
      const isAdmin = userData.user.email?.endsWith('@seomax.com') || false;
      
      let query = supabase.from('projects').select('*');
      
      // Filter by user_id if not admin
      if (!isAdmin) {
        query = query.eq('user_id', userData.user.id);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Error getting projects:', error.message);
        throw new Error(error.message);
      }
      
      return (data as ProjectTable[]).map(mapProjectTable);
    } catch (error) {
      console.error('Error getting projects:', error);
      throw error;
    }
  },

  async getProject(id: string): Promise<Project> {
    console.log('[ProjectService] Getting project with ID:', id);
    
    try {
      // Get user from Supabase auth
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('[ProjectService] Error getting user:', userError.message);
        throw new Error(userError.message);
      }
      
      if (!userData.user) {
        console.error('[ProjectService] No authenticated user found');
        throw new Error('User not authenticated');
      }
      
      // Check if user is admin (can view all projects)
      const isAdmin = userData.user.email?.endsWith('@seomax.com') || false;
      const userId = userData.user.id;
      
      try {
        // First try with regular client (follows RLS policies)
        console.log('[ProjectService] Trying regular client for project:', id);
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) {
          // If RLS blocks the query, this could be because:
          // 1. Project doesn't exist
          // 2. Project exists but belongs to another user
          // 3. Some other database error
          console.log('[ProjectService] Regular client error, may be RLS:', error.message);
          throw error;
        }
        
        return mapToProject(data as ProjectTable);
      } catch (regularClientError) {
        // If we're an admin or the project doesn't belong to current user, 
        // try with admin client to bypass RLS
        if (isAdmin || true) { // Always try admin client as fallback
          console.log('[ProjectService] Falling back to admin client for project:', id);
          try {
            // Use admin client to bypass RLS
            const adminClient = createAdminClient();
            
            const { data: adminData, error: adminError } = await adminClient
              .from('projects')
              .select('*')
              .eq('id', id)
              .single();
              
            if (adminError) {
              console.error('[ProjectService] Admin client error:', adminError.message);
              throw adminError;
            }
            
            // If we're not admin, check if the project belongs to current user
            if (!isAdmin && adminData.user_id !== userId) {
              console.log('[ProjectService] Project belongs to different user, access denied');
              console.log('Project user_id:', adminData.user_id);
              console.log('Current user ID:', userId);
              throw new Error('Project not found or access denied');
            }
            
            console.log('[ProjectService] Project found with admin client:', adminData.id);
            return mapToProject(adminData as ProjectTable);
          } catch (adminClientError) {
            console.error('[ProjectService] Admin client failed:', adminClientError);
            throw adminClientError;
          }
        } else {
          // Re-throw original error
          throw regularClientError;
        }
      }
    } catch (error) {
      console.error('[ProjectService] Error getting project:', error);
      throw error;
    }
  },

  createProject,

  async deleteProject(id: string): Promise<boolean> {
    try {
      // Get user from Supabase auth to verify ownership
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError.message);
        throw new Error(userError.message);
      }
      
      // Check if user is admin (can delete any project)
      const isAdmin = userData.user?.email?.endsWith('@seomax.com') || false;
      
      // Get the project first to verify ownership
      if (!isAdmin) {
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('user_id')
          .eq('id', id)
          .single();
        
        if (projectError) {
          console.error('Error getting project:', projectError.message);
          throw new Error(projectError.message);
        }
        
        if (project.user_id !== userData.user?.id) {
          throw new Error('You do not have permission to delete this project');
        }
      }
      
      // Delete the project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting project:', error.message);
        throw new Error(error.message);
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  },

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    try {
      // Get user from Supabase auth to verify ownership
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError.message);
        throw new Error(userError.message);
      }
      
      // Check if user is admin (can update any project)
      const isAdmin = userData.user?.email?.endsWith('@seomax.com') || false;
      
      // Get the project first to verify ownership
      if (!isAdmin) {
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('user_id')
          .eq('id', id)
          .single();
        
        if (projectError) {
          console.error('Error getting project:', projectError.message);
          throw new Error(projectError.message);
        }
        
        if (project.user_id !== userData.user?.id) {
          throw new Error('You do not have permission to update this project');
        }
      }
      
      // Update the project
      const { data: updatedData, error } = await supabase
        .from('projects')
        .update({
          website_name: data.name,
          website_url: data.url,
          keywords: data.keywords,
          competitors: data.competitors,
          seo_score: data.seoScore
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating project:', error.message);
        throw new Error(error.message);
      }
      
      return mapToProject(updatedData as ProjectTable);
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }
}; 