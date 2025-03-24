// Server component wrapper to safely handle params
import { Suspense } from 'react';
import { ClientKeywordsPage } from './ClientKeywordsPage';

interface KeywordsPageProps {
  params: {
    id: string;
  };
}

export default function KeywordsPage({ params }: KeywordsPageProps) {
  const projectId = params.id;
  
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full mb-3 animate-spin"></div>
          <p className="text-muted-foreground">Loading keywords...</p>
        </div>
      </div>
    }>
      <ClientKeywordsPage projectId={projectId} />
    </Suspense>
  );
} 