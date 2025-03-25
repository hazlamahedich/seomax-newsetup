/**
 * Client Project Layout Component
 * 
 * This component wraps the project detail pages and handles authentication checking
 */
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useExtendedAuth } from '@/components/providers/auth-provider';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { debugSessionInfo } from '@/lib/auth/session-utils';
import ProjectUI from './ProjectUI';

interface ClientProjectLayoutProps {
  children: React.ReactNode;
  projectId?: string; // Make this optional as we'll use useParams as backup
}

export default function ClientProjectLayout({
  children,
  projectId: propProjectId
}: ClientProjectLayoutProps) {
  const router = useRouter();
  const params = useParams();
  // Use prop ID or fallback to params
  const projectId = propProjectId || (params?.id as string);
  const { supabaseUser, getActiveUser } = useExtendedAuth();
  const [isChecking, setIsChecking] = useState(true);
  const hasRunAuthCheck = useRef(false);

  useEffect(() => {
    // Prevent multiple auth checks during mount/update
    if (hasRunAuthCheck.current) return;
    hasRunAuthCheck.current = true;

    const checkAuth = async () => {
      console.log('[ClientProjectLayout] Checking authentication...');
      console.log('[ClientProjectLayout] Project ID:', projectId);
      
      // Debug current session state
      debugSessionInfo('ClientProjectLayout');
      
      // Get active user from either auth source
      const activeUser = getActiveUser();
      
      if (!activeUser) {
        console.log('[ClientProjectLayout] No authenticated user found, redirecting to login');
        router.push('/login');
        return;
      }
      
      console.log('[ClientProjectLayout] User authenticated:', activeUser.email);
      setIsChecking(false);
    };

    // Use a slight delay to let other auth processes complete
    const timer = setTimeout(() => {
      checkAuth();
    }, 100);

    return () => clearTimeout(timer);
  }, [router, getActiveUser, projectId]);

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" message="Verifying access..." />
      </div>
    );
  }

  return <ProjectUI>{children}</ProjectUI>;
} 