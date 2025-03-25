// Basic layout wrapper
import { Suspense } from 'react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function ProjectLayout({ 
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="large" message="Loading project..." />
      </div>
    }>
      {children}
    </Suspense>
  );
} 