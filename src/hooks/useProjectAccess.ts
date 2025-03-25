import { useState, useEffect, useCallback } from 'react';
import { useExtendedAuth } from '@/components/providers/auth-provider';

interface ProjectAccessProps {
  projectId: string;
}

interface ProjectAccessState {
  isLoading: boolean;
  hasAccess: boolean;
  error: string | null;
  verifyAccess: () => Promise<boolean>;
  projectExists: boolean;
  userId: string | null;
}

export function useProjectAccess({ projectId }: ProjectAccessProps): ProjectAccessState {
  const [isLoading, setIsLoading] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectExists, setProjectExists] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const auth = useExtendedAuth();
  
  const verifyAccess = useCallback(async (): Promise<boolean> => {
    if (!projectId) {
      setError('No project ID provided');
      setHasAccess(false);
      setProjectExists(false);
      return false;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Get the active user ID
      const activeUser = auth.getActiveUser();
      if (activeUser?.id) {
        setUserId(activeUser.id);
      }
      
      console.log('[useProjectAccess] Verifying access for project:', projectId);
      
      // Use the checkProjectAccess method from auth provider
      try {
        const accessGranted = await auth.checkProjectAccess(projectId);
        
        if (!accessGranted) {
          console.log('[useProjectAccess] Access denied for project:', projectId);
          setError('You do not have access to this project');
          setHasAccess(false);
          return false;
        }
        
        console.log('[useProjectAccess] Access granted for project:', projectId);
        setHasAccess(true);
        setProjectExists(true);
        return true;
      } catch (accessError: any) {
        // Check if the error is because the project doesn't exist
        const errorMessage = accessError?.message || '';
        const errorStatus = accessError?.status || 0;
        
        if (errorStatus === 404 || errorMessage.includes('not exist')) {
          console.log('[useProjectAccess] Project does not exist:', projectId);
          setError('This project does not exist. It may have been deleted.');
          setHasAccess(false);
          setProjectExists(false);
        } else {
          console.log('[useProjectAccess] Error verifying project access:', accessError);
          setError('Could not verify project access. Please try again.');
          setHasAccess(false);
        }
        return false;
      }
    } catch (error) {
      console.log('[useProjectAccess] Error verifying project access:', error);
      setError('Could not verify project access. Please try again.');
      setHasAccess(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, auth]);
  
  // Verify access on mount or when projectId changes
  useEffect(() => {
    let isMounted = true;
    
    const checkAccess = async () => {
      if (!projectId) return;
      
      // Reset state when projectId changes
      if (isMounted) {
        setHasAccess(false);
        setError(null);
        setProjectExists(false);
      }
      
      // Don't check access if auth is still loading
      if (auth.loading) {
        console.log('[useProjectAccess] Auth still loading, delaying access check');
        return;
      }
      
      // Check if user is authenticated
      const activeUser = auth.getActiveUser();
      if (!activeUser) {
        console.log('[useProjectAccess] No active user found, skipping access check');
        if (isMounted) {
          setError('Please sign in to access this project');
        }
        return;
      }
      
      // Set the user ID
      if (isMounted && activeUser.id) {
        setUserId(activeUser.id);
      }
      
      console.log('[useProjectAccess] Checking access for project:', projectId, 'User:', activeUser.email);
      
      try {
        // Try direct database check first if supabaseUser is available
        if (auth.supabaseUser && typeof window !== 'undefined') {
          // Here we could add a direct Supabase check
        }
        
        // Then fall back to the API
        if (isMounted) {
          await verifyAccess();
        }
      } catch (error) {
        console.log('[useProjectAccess] Error during access check:', error);
        if (isMounted) {
          setError('Error checking project access');
          setHasAccess(false);
        }
      }
    };
    
    checkAccess();
    
    return () => {
      isMounted = false;
    };
  }, [projectId, verifyAccess, auth]);
  
  // Re-verify access when auth state changes (login/logout)
  useEffect(() => {
    let isMounted = true;
    
    if (!auth.loading && projectId && !hasAccess) {
      console.log('[useProjectAccess] Auth state changed, rechecking access');
      
      // Update userId when auth state changes
      const activeUser = auth.getActiveUser();
      if (isMounted && activeUser?.id) {
        setUserId(activeUser.id);
      }
      
      const recheckAccess = async () => {
        try {
          if (isMounted) {
            await verifyAccess();
          }
        } catch (error) {
          console.log('[useProjectAccess] Error rechecking access:', error);
        }
      };
      
      recheckAccess();
    }
    
    return () => {
      isMounted = false;
    };
  }, [auth.supabaseUser, auth.loading, projectId, hasAccess, verifyAccess]);
  
  return {
    isLoading,
    hasAccess,
    error,
    verifyAccess,
    projectExists,
    userId
  };
} 