import { supabase } from '@/lib/supabase/client';
import { Project } from '@/lib/store/project-store';

// Define the database table type for type safety
interface ProjectTable {
  id: string;
  user_id: string;
  website_name: string;
  website_url: string;
  created_at: string;
  updated_at?: string;
  keywords?: string[];
  competitors?: string[];
  seo_score?: number;
}

// Map database model to application model
const mapToProject = (data: ProjectTable): Project => ({
  id: data.id,
  name: data.website_name,
  url: data.website_url,
  createdAt: new Date(data.created_at),
  updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
});

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
        console.error('No user found');
        throw new Error('No user found');
      }
      
      console.log('Fetching projects for user ID:', userData.user.id);
      
      // Check if user is admin (can view all projects)
      const isAdmin = userData.user.email?.endsWith('@seomax.com') || false;
      let query = supabase.from('projects').select('*');
      
      // Only filter by user_id if not admin
      if (!isAdmin) {
        query = query.eq('user_id', userData.user.id);
      } else {
        console.log('Admin user detected. Fetching all projects.');
      }
      
      // Order by creation date, newest first
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error getting projects:', error.message);
        throw new Error(error.message);
      }
      
      return (data as ProjectTable[]).map(mapToProject);
    } catch (error) {
      console.error('Error getting projects:', error);
      throw error;
    }
  },

  async getProject(id: string): Promise<Project> {
    try {
      // Get user from Supabase auth
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError.message);
        throw new Error(userError.message);
      }
      
      // Get the project
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error getting project:', error.message);
        throw new Error(error.message);
      }
      
      // Check if user is admin (can view all projects)
      const isAdmin = userData.user?.email?.endsWith('@seomax.com') || false;
      
      // Only check ownership if not admin
      if (!isAdmin && data.user_id !== userData.user?.id) {
        console.error('Project does not belong to current user');
        console.log('Project user_id:', data.user_id);
        console.log('Current user ID:', userData.user?.id);
        throw new Error('Project not found');
      }
      
      return mapToProject(data as ProjectTable);
    } catch (error) {
      console.error('Error getting project:', error);
      throw error;
    }
  },

  async createProject(name: string, description: string, url: string): Promise<{ data: Project | null; error: string | null }> {
    try {
      // Get user from Supabase auth
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError.message);
        return { data: null, error: userError.message };
      }
      
      if (!userData.user) {
        console.error('No user found');
        return { data: null, error: 'No user found' };
      }
      
      // Debug log user ID for troubleshooting
      console.log('Creating project with user ID:', userData.user.id);
      console.log('Full user object:', userData.user);
      
      // Create a new project
      const { data, error } = await supabase
        .from('projects')
        .insert([
          {
            name,
            description,
            url,
            user_id: userData.user.id,
            created_at: new Date().toISOString(),
          },
        ])
        .select();
      
      if (error) {
        console.error('Error creating project:', error.message);
        return { data: null, error: error.message };
      }
      
      return { data: mapToProject(data[0] as ProjectTable), error: null };
    } catch (error) {
      console.error('Error creating project:', error);
      return { data: null, error: 'Failed to create project' };
    }
  },

  async updateProject(id: string, project: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Project> {
    const updateData: any = {};
    if (project.name) updateData.website_name = project.name;
    if (project.url) updateData.website_url = project.url;
    
    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating project:', error);
      throw new Error(`Error updating project: ${error.message}`);
    }

    return mapToProject(data as ProjectTable);
  },

  async deleteProject(id: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting project:', error);
      throw new Error(`Error deleting project: ${error.message}`);
    }
  },
}; 