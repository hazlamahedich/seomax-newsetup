// This is a Server Component to properly handle the params
import { Suspense } from 'react';
import { ClientProjectLayout } from './ClientProjectLayout';

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: {
    id: string;
  };
}

export default function ProjectLayout({ children, params }: ProjectLayoutProps) {
  // This server component safely extracts the ID parameter
  const projectId = params.id;
  
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full mb-3 animate-spin"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    }>
      <ClientProjectLayout projectId={projectId}>
        {children}
      </ClientProjectLayout>
    </Suspense>
  );
} 