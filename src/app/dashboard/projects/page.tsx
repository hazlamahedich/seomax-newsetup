'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, PenLine, Trash2, ExternalLink, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useProjects } from '@/lib/hooks/use-projects';
import type { Project } from '@/lib/store/project-store';

// Project Form that will be used in both create and edit modals
interface ProjectFormProps {
  defaultValues?: {
    name: string;
    url: string;
    description?: string;
  };
  onSubmit: (data: { name: string; url: string; description?: string }) => void;
  isSubmitting: boolean;
}

function ProjectForm({ defaultValues, onSubmit, isSubmitting }: ProjectFormProps) {
  const [formData, setFormData] = useState({
    name: defaultValues?.name || '',
    url: defaultValues?.url || '',
    description: defaultValues?.description || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Project Name</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="My Awesome Website"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="url">Website URL</Label>
        <Input
          id="url"
          name="url"
          value={formData.url}
          onChange={handleChange}
          placeholder="https://example.com"
          type="url"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="A brief description of your project"
          rows={3}
        />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {defaultValues ? 'Update Project' : 'Create Project'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function ProjectsPage() {
  const router = useRouter();
  const { 
    projects,
    isLoading, 
    error, 
    createProject, 
    updateProject, 
    deleteProject, 
    isCreating, 
    isUpdating, 
    isDeleting 
  } = useProjects();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Create project handler
  const handleCreateProject = (data: { name: string; url: string; description?: string }) => {
    createProject({
      name: data.name,
      url: data.url,
    });
    setIsCreateDialogOpen(false);
  };

  // Edit project handler
  const handleEditProject = (data: { name: string; url: string; description?: string }) => {
    if (editProject) {
      updateProject({
        id: editProject.id,
        project: {
          name: data.name,
          url: data.url,
        },
      });
      setIsEditDialogOpen(false);
      setEditProject(null);
    }
  };

  // Delete project handler
  const handleDeleteProject = () => {
    if (projectToDelete) {
      deleteProject(projectToDelete.id);
      setIsDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  // Render skeletal UI while loading
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Projects</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Projects</h2>
          <p className="text-gray-600 mb-6">{error.message}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Projects</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>Add a new website project to start optimizing your SEO.</DialogDescription>
            </DialogHeader>
            <ProjectForm onSubmit={handleCreateProject} isSubmitting={isCreating} />
          </DialogContent>
        </Dialog>
      </div>

      {projects.length > 0 ? (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {projects.map((project) => (
            <motion.div key={project.id} variants={item}>
              <Card className="h-full flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">{project.name}</CardTitle>
                  <CardDescription className="truncate">
                    <a 
                      href={project.url.startsWith('http') ? project.url : `https://${project.url}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center hover:underline text-blue-500"
                    >
                      {project.url}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-muted rounded-md p-3 text-center">
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="font-medium">{new Date(project.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="bg-muted rounded-md p-3 text-center">
                      <p className="text-xs text-muted-foreground">Last Updated</p>
                      <p className="font-medium">{new Date(project.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t pt-4 flex justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditProject(project);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <PenLine className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setProjectToDelete(project);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button asChild>
                    <Link href={`/dashboard/projects/${project.id}`}>View Dashboard</Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">No Projects Yet</h2>
          <p className="text-gray-600 mb-6">Create your first project to start optimizing your website SEO.</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Project
          </Button>
        </div>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update your project details.</DialogDescription>
          </DialogHeader>
          {editProject && (
            <ProjectForm
              defaultValues={{
                name: editProject.name,
                url: editProject.url,
              }}
              onSubmit={handleEditProject}
              isSubmitting={isUpdating}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project &quot;{projectToDelete?.name}&quot; and all of its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-red-500 hover:bg-red-600">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 