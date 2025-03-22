import { supabase } from '@/lib/supabase/client';
import { Project } from '@/lib/store/project-store';

// Define the database table type for type safety
interface ProjectTable {
  id: string;
  user_id: string;
  name: string;
  url: string;
  created_at: string;
  updated_at: string;
}

// Map database model to application model
const mapToProject = (data: ProjectTable): Project => ({
  id: data.id,
  name: data.name,
  url: data.url,
  createdAt: new Date(data.created_at),
  updatedAt: new Date(data.updated_at),
});

export const ProjectService = {
  async getProjects(): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error fetching projects: ${error.message}`);
    }

    return (data as ProjectTable[]).map(mapToProject);
  },

  async getProject(id: string): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Error fetching project: ${error.message}`);
    }

    return mapToProject(data as ProjectTable);
  },

  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: project.name,
        url: project.url,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error creating project: ${error.message}`);
    }

    return mapToProject(data as ProjectTable);
  },

  async updateProject(id: string, project: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .update({
        ...project,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
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
      throw new Error(`Error deleting project: ${error.message}`);
    }
  },
}; 