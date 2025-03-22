import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProjectService } from '@/lib/services/project-service';
import { useProjectStore } from '@/lib/store/project-store';
import type { Project } from '@/lib/store/project-store';

export function useProjects() {
  const queryClient = useQueryClient();
  const { setProjects, addProject, updateProject: updateProjectInStore, removeProject, setLoading, setError } = useProjectStore();

  // Query for fetching all projects
  const {
    data: projects,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: ProjectService.getProjects,
    onSuccess: (data) => {
      setProjects(data);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

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
    projects,
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