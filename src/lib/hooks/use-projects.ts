import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProjectService } from '@/lib/services/project-service';
import { useProjectStore } from '@/lib/store/project-store';
import type { Project } from '@/lib/store/project-store';
import React from 'react';

// Define explicit return type for the hook
interface UseProjectsReturn {
  projects: Project[];
  isLoading: boolean;
  error: Error | null;
  createProject: (newProject: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProject: (params: { id: string; project: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>> }) => void;
  deleteProject: (id: string) => void;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

export function useProjects(): UseProjectsReturn {
  const queryClient = useQueryClient();
  const { setProjects, addProject, updateProject: updateProjectInStore, removeProject, setLoading, setError } = useProjectStore();

  // Query for fetching all projects
  const {
    data,
    isLoading,
    error,
  } = useQuery<Project[], Error>({
    queryKey: ['projects'],
    queryFn: ProjectService.getProjects,
  });

  // Set projects in store when data changes
  React.useEffect(() => {
    if (data) {
      setProjects(data);
    }
  }, [data, setProjects]);

  // Handle errors
  React.useEffect(() => {
    if (error) {
      setError(error.message);
    }
  }, [error, setError]);

  // Mutation for creating a new project
  const createProjectMutation = useMutation({
    mutationFn: (newProject: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) =>
      ProjectService.createProject(newProject),
    onSuccess: (data) => {
      addProject(data);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Mutation for updating a project
  const updateProjectMutation = useMutation({
    mutationFn: ({
      id,
      project,
    }: {
      id: string;
      project: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>;
    }) => ProjectService.updateProject(id, project),
    onSuccess: (data) => {
      updateProjectInStore(data.id, data);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Mutation for deleting a project
  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => ProjectService.deleteProject(id),
    onSuccess: (_, id) => {
      removeProject(id);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  return {
    projects: data || [],
    isLoading,
    error,
    createProject: createProjectMutation.mutate,
    updateProject: updateProjectMutation.mutate,
    deleteProject: deleteProjectMutation.mutate,
    isCreating: createProjectMutation.isPending,
    isUpdating: updateProjectMutation.isPending,
    isDeleting: deleteProjectMutation.isPending,
  };
} 