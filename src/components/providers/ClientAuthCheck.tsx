'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { supabase } from '@/lib/supabase/client';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface ClientAuthCheckProps {
  children: React.ReactNode;
  redirectTo?: string;
  projectId?: string;
}

export default function ClientAuthCheck({
  children,
  redirectTo = '/login',
  projectId = undefined
}: ClientAuthCheckProps) {
  const router = useRouter();
  const { getActiveUser } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if user is authenticated
        const activeUser = getActiveUser();
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!activeUser && !session) {
          console.log('[ClientAuthCheck] No authenticated user found, redirecting');
          router.push(redirectTo);
          return;
        }
        
        // If we're checking project access
        if (projectId) {
          // Try to get the project
          const { data: project } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();
            
          if (!project) {
            console.log('[ClientAuthCheck] Project not found, redirecting to dashboard');
            router.push('/dashboard');
            return;
          }
        }
        
        // User is authenticated and has access
        setHasAccess(true);
      } catch (error) {
        console.error('[ClientAuthCheck] Authentication error:', error);
        router.push(redirectTo);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkAuth();
  }, [getActiveUser, router, redirectTo, projectId]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="large" message="Checking authentication..." />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
} 