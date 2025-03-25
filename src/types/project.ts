// Define the database table type for type safety
export interface ProjectTable {
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

// Define the application model type
export interface Project {
  id: string;
  name: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
  keywords?: string[];
  competitors?: string[];
  seoScore?: number;
}

// Map database model to application model
export const mapToProject = (data: ProjectTable): Project => ({
  id: data.id,
  name: data.website_name,
  url: data.website_url,
  createdAt: new Date(data.created_at),
  updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
  keywords: data.keywords || [],
  competitors: data.competitors || [],
  seoScore: data.seo_score || 0
}); 