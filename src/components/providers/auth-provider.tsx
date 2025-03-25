'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useSession } from 'next-auth/react';
import { 
  saveSessionToStorage, 
  getSessionFromStorage,
  clearSessionStorage,
  UserData 
} from '@/lib/auth/session-utils';

// Create a Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// User type for better type safety
type User = {
  id: string;
  email?: string;
  name?: string;
  __supabase?: boolean; // Marker to identify users coming from Supabase
  [key: string]: any;
};

type ExtendedAuthContextType = {
  supabaseUser: User | null;
  loading: boolean;
  supabaseSignIn: (email: string, password: string) => Promise<any>;
  supabaseSignOut: () => Promise<any>;
  isAdmin: () => boolean;
  getActiveUser: () => User | null;
  refreshAuth: () => Promise<User | null>;
  synchronizeSupabaseSession: () => Promise<void>;
  checkProjectAccess: (projectId: string) => Promise<boolean>;
};

const ExtendedAuthContext = createContext<ExtendedAuthContextType>({
  supabaseUser: null,
  loading: true,
  supabaseSignIn: async () => null,
  supabaseSignOut: async () => null,
  isAdmin: () => false,
  getActiveUser: () => null,
  refreshAuth: async () => null,
  synchronizeSupabaseSession: async () => {},
  checkProjectAccess: async () => false,
});

export function ExtendedAuthProvider({ children }: { children: React.ReactNode }) {
  // Try to initialize with stored user to prevent flash of unauthenticated state
  const initialSession = getSessionFromStorage();
  const [supabaseUser, setSupabaseUser] = useState<User | null>(initialSession.user as User | null);
  const [loading, setLoading] = useState(true);
  const { data: session, status: sessionStatus } = useSession();
  
  // Track initialization to prevent multiple setups
  const initialized = useRef(false);
  // Track last update time to prevent too frequent updates
  const lastUpdateTime = useRef(0);
  // Track cleanups
  const cleanupFunctions = useRef<Array<() => void>>([]);
  // Track manual auth sync to prevent loops
  const authSyncInProgress = useRef(false);

  // Debug on initial render
  useEffect(() => {
    console.log('[AuthProvider] Initial render with stored session:', 
      initialSession.user?.email, 
      'isAdmin:', initialSession.isAdmin);
  }, []);

  // Synchronize Supabase session with NextAuth
  const synchronizeSupabaseSession = useCallback(async (): Promise<void> => {
    if (authSyncInProgress.current) return;
    
    try {
      authSyncInProgress.current = true;
      console.log('[AuthProvider] Starting auth synchronization');
      
      // Enhanced validation to check if we have a valid user with an ID
      const isValidUser = (user: any): boolean => {
        return Boolean(
          user && 
          user.id && 
          typeof user.id !== 'object' &&  // Catch empty object IDs
          typeof user.id === 'string' && 
          user.id.trim() !== '' &&
          (!user.email || typeof user.email === 'string')
        );
      };
      
      // Try to get a valid user from any source
      let validUser: User | null = null;
      
      // First check NextAuth
      if (session?.user && isValidUser(session.user)) {
        console.log('[AuthProvider] Using NextAuth user for sync:', session.user.email);
        validUser = session.user as User;
      } 
      // Then check Supabase
      else if (supabaseUser && isValidUser(supabaseUser)) {
        console.log('[AuthProvider] Using existing Supabase user for sync:', supabaseUser.email);
        validUser = supabaseUser;
      }
      // Finally check local storage
      else {
        try {
          const storedSession = getSessionFromStorage();
          if (storedSession.user && isValidUser(storedSession.user)) {
            console.log('[AuthProvider] Using stored user for sync:', storedSession.user.email);
            validUser = storedSession.user as User;
          }
        } catch (storageError) {
          console.error('[AuthProvider] Failed to get user from storage:', storageError);
        }
      }
      
      // If we have a valid user, make sure it's set as the current user
      if (validUser) {
        // Only update if different
        if (!supabaseUser || supabaseUser.id !== validUser.id) {
          console.log('[AuthProvider] Updating supabaseUser during sync to:', validUser.email);
          const isAdmin = validUser.email?.endsWith('@seomax.com') || false;
          setSupabaseUser(validUser);
          
          // Ensure we have a valid user object before storage
          if (validUser.id && typeof validUser.id === 'string' && validUser.id.trim() !== '') {
            saveSessionToStorage(validUser as UserData, isAdmin);
          } else {
            console.error('[AuthProvider] Refusing to save invalid user during sync:', validUser);
          }
        }
        
        // Also verify that we can access the auth sync endpoint
        try {
          const response = await fetch('/api/auth/sync');
          const data = await response.json();
          
          if (response.ok && data.success) {
            console.log('[AuthProvider] Auth sync verified with API');
          } else {
            console.warn('[AuthProvider] Auth sync API verification failed:', data);
            
            // Try to diagnose and resolve auth issues
            if (data.error === 'Not authenticated') {
              console.log('[AuthProvider] Authentication issue detected, refreshing auth state');
              await refreshAuth();
            }
          }
        } catch (apiError) {
          console.error('[AuthProvider] Auth sync API error:', apiError);
        }
      } else {
        console.warn('[AuthProvider] No valid user found during synchronization');
      }
    } catch (error) {
      console.error('[AuthProvider] Error synchronizing sessions:', error);
    } finally {
      authSyncInProgress.current = false;
    }
  }, [session, supabaseUser]);

  // Function to check project access
  const checkProjectAccess = useCallback(async (projectId: string): Promise<boolean> => {
    if (!projectId) return false;
    
    try {
      console.log('[AuthProvider] Checking project access for project:', projectId);
      
      // Ensure we have a synchronized auth state
      if (!authSyncInProgress.current) {
        await synchronizeSupabaseSession();
      }
      
      const response = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        console.log('[AuthProvider] Project access granted for project:', projectId);
        return true;
      } else {
        console.warn('[AuthProvider] Project access denied:', data);
        
        // If denied due to auth issues, try to refresh auth and try again
        if (data.error === 'Not authenticated') {
          console.log('[AuthProvider] Retrying after auth refresh');
          await refreshAuth();
          
          // Try again after refresh
          const retryResponse = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId })
          });
          
          const retryData = await retryResponse.json();
          
          if (retryResponse.ok && retryData.success) {
            console.log('[AuthProvider] Project access granted after auth refresh');
            return true;
          }
        }
        
        return false;
      }
    } catch (error) {
      console.error('[AuthProvider] Error checking project access:', error);
      return false;
    }
  }, [synchronizeSupabaseSession]);

  // Function to refresh auth state from both sources
  const refreshAuth = useCallback(async (): Promise<User | null> => {
    // Prevent refreshing too frequently (min 1 second between refreshes)
    const now = Date.now();
    if (now - lastUpdateTime.current < 1000) {
      console.log('[AuthProvider] Skipping refresh - too soon');
      return supabaseUser;
    }
    
    lastUpdateTime.current = now;
    console.log('[AuthProvider] Manually refreshing auth state');
    
    try {
      // Check Supabase auth
      const { data: supabaseData, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[AuthProvider] Supabase session error:', error);
      }
      
      const supabaseUser = supabaseData?.session?.user;
      
      // Use either NextAuth or Supabase user, prioritizing admin users
      const nextAuthUser = session?.user;
      
      // Check admin status
      const isNextAuthAdmin = nextAuthUser?.email?.endsWith('@seomax.com');
      const isSupabaseAdmin = supabaseUser?.email?.endsWith('@seomax.com');
      
      let activeUser: User | null = null;
      let isAdmin = false;
      
      // Validate user function
      const hasValidId = (user: any): boolean => {
        return Boolean(user && user.id && typeof user.id === 'string' && user.id.trim() !== '');
      };
      
      if (isNextAuthAdmin && nextAuthUser && hasValidId(nextAuthUser)) {
        console.log('[AuthProvider] Refresh found NextAuth admin user');
        activeUser = nextAuthUser as User;
        isAdmin = true;
      } else if (isSupabaseAdmin && supabaseUser && hasValidId(supabaseUser)) {
        console.log('[AuthProvider] Refresh found Supabase admin user');
        activeUser = supabaseUser as User;
        isAdmin = true;
      } else if (nextAuthUser && hasValidId(nextAuthUser)) {
        console.log('[AuthProvider] Refresh found NextAuth user');
        activeUser = nextAuthUser as User;
      } else if (supabaseUser && hasValidId(supabaseUser)) {
        console.log('[AuthProvider] Refresh found Supabase user');
        activeUser = supabaseUser as User;
        // Mark as coming from Supabase
        activeUser.__supabase = true;
      } else {
        console.log('[AuthProvider] No valid user found during refresh');
        clearSessionStorage();
        setSupabaseUser(null);
        return null;
      }
      
      // Only update if different to prevent loops
      if (!supabaseUser || supabaseUser.id !== activeUser.id) {
        setSupabaseUser(activeUser);
        
        // Ensure user has valid ID before saving
        if (activeUser.id && typeof activeUser.id === 'string' && activeUser.id.trim() !== '') {
          saveSessionToStorage(activeUser as UserData, isAdmin);
        } else {
          console.error('[AuthProvider] Refusing to save user with invalid ID during refresh');
        }
      }
      
      return activeUser;
    } catch (error) {
      console.error('[AuthProvider] Error refreshing auth state:', error);
      return supabaseUser;
    }
  }, [session, supabaseUser]);

  // Initialize auth state check and set up listeners - but only once
  useEffect(() => {
    // Skip if already initialized
    if (initialized.current) return;
    
    const checkInitialSession = async () => {
      console.log('[AuthProvider] Checking initial session state...');
      setLoading(true);
      
      try {
        // Check if we have a NextAuth session
        if (sessionStatus === 'authenticated' && session?.user) {
          // Log the exact session user value to help diagnose issues
          console.log('[AuthProvider] NextAuth session found with user:', 
            JSON.stringify({
              id: session.user.id,
              email: session.user.email,
              idType: typeof session.user.id
            })
          );
          
          // Enhanced validation to catch empty object IDs and empty strings
          if (!session.user.id || 
              session.user.id === "" ||
              typeof session.user.id === 'object' || 
              (typeof session.user.id === 'string' && session.user.id.trim() === '')) {
            console.error('[AuthProvider] Initial NextAuth user has invalid ID:', JSON.stringify(session.user.id));
            
            // Try to recover from an invalid session by checking Supabase directly
            console.log('[AuthProvider] Attempting recovery by checking Supabase session');
            try {
              const { data: supabaseData, error } = await supabase.auth.getSession();
              
              if (error) {
                console.error('[AuthProvider] Supabase recovery error:', error);
              } else if (supabaseData?.session?.user) {
                // Supabase has a valid session - use it instead
                const supabaseUser = supabaseData.session.user;
                console.log('[AuthProvider] Recovered with Supabase user:', supabaseUser.email);
                
                if (supabaseUser.id && typeof supabaseUser.id === 'string' && supabaseUser.id.trim() !== '') {
                  const markedUser = {
                    ...supabaseUser,
                    __supabase: true
                  };
                  
                  const isUserAdmin = supabaseUser.email?.endsWith('@seomax.com') || false;
                  setSupabaseUser(markedUser as User);
                  saveSessionToStorage(markedUser as UserData, isUserAdmin);
                  
                  setLoading(false);
                  initialized.current = true;
                  return;
                }
              }
            } catch (supabaseRecoveryError) {
              console.error('[AuthProvider] Error during Supabase recovery:', supabaseRecoveryError);
            }
            
            // If recovery failed, clear everything
            clearSessionStorage();
            setSupabaseUser(null);
            setLoading(false);
            initialized.current = true;
            return;
          }
          
          const userId = session.user.id;
          console.log('[AuthProvider] NextAuth session found for user:', session.user.email);
          const isUserAdmin = session.user.email?.endsWith('@seomax.com') || false;
          
          // Ensure user object has a valid ID before saving
          if (userId && typeof userId === 'string' && userId.trim() !== '') {
            // Add a marker to identify this as a NextAuth user
            const markedUser = {
              ...session.user,
              __nextauth: true
            };
            
            setSupabaseUser(markedUser as User);
            saveSessionToStorage(markedUser as UserData, isUserAdmin);
          } else {
            console.error('[AuthProvider] NextAuth user has invalid ID:', userId);
            clearSessionStorage();
            setSupabaseUser(null);
          }
        } 
        // If no NextAuth session, try to get Supabase session
        else if (sessionStatus === 'unauthenticated' || sessionStatus === 'loading') {
          console.log('[AuthProvider] No NextAuth session, checking Supabase');
          
          try {
            const { data: supabaseData, error } = await supabase.auth.getSession();
            
            if (error) {
              console.error('[AuthProvider] Supabase session error:', error);
            }
            
            const supabaseUser = supabaseData?.session?.user;
            
            if (supabaseUser?.id) {
              console.log('[AuthProvider] Supabase session found for user:', supabaseUser.email);
              const isUserAdmin = supabaseUser.email?.endsWith('@seomax.com') || false;
              
              // Ensure user object has a valid ID before saving
              if (supabaseUser.id && typeof supabaseUser.id === 'string' && supabaseUser.id.trim() !== '') {
                setSupabaseUser(supabaseUser as User);
                saveSessionToStorage(supabaseUser as UserData, isUserAdmin);
              } else {
                console.error('[AuthProvider] Supabase user has invalid ID:', supabaseUser.id);
                clearSessionStorage();
                setSupabaseUser(null);
              }
            } else {
              console.log('[AuthProvider] No valid user found in any source');
              clearSessionStorage();
              setSupabaseUser(null);
            }
          } catch (supabaseError) {
            console.error('[AuthProvider] Error getting Supabase session:', supabaseError);
            clearSessionStorage();
            setSupabaseUser(null);
          }
        }
      } catch (error) {
        console.error('[AuthProvider] Error checking initial session:', error);
        clearSessionStorage();
        setSupabaseUser(null);
      } finally {
        setLoading(false);
        initialized.current = true;
      }
    };
    
    checkInitialSession();
  }, [session, sessionStatus]);

  // When NextAuth session changes, update our state
  useEffect(() => {
    // Wait for NextAuth to finish loading
    if (sessionStatus === 'loading') {
      console.log('[AuthProvider] NextAuth session is still loading');
      return;
    }
    
    console.log('[AuthProvider] NextAuth session status changed:', sessionStatus);
    
    // If authenticated, update local state with NextAuth user
    if (sessionStatus === 'authenticated' && session?.user) {
      // Log detailed session information for debugging
      console.log('[AuthProvider] NextAuth authenticated session with user:', 
        JSON.stringify({
          id: session.user.id,
          email: session.user.email,
          idType: typeof session.user.id
        })
      );
      
      const user = session.user as User;
      
      // Enhanced validation to catch empty string IDs and empty objects
      if (!user.id || 
          user.id === "" ||
          typeof user.id === 'object' || 
          (typeof user.id === 'string' && user.id.trim() === '')) {
        console.error('[AuthProvider] NextAuth user has invalid ID:', JSON.stringify(user.id));
        
        // Don't clear existing valid sessions if NextAuth provides invalid data
        if (supabaseUser?.id && typeof supabaseUser.id === 'string' && supabaseUser.id.trim() !== '') {
          console.log('[AuthProvider] Keeping existing valid session despite invalid NextAuth data');
          return;
        }
        
        return;
      }
      
      // Ensure user has valid ID before saving
      if (user.id && typeof user.id === 'string' && user.id.trim() !== '') {
        console.log('[AuthProvider] NextAuth authentication detected for user:', user.email);
        const isUserAdmin = user.email?.endsWith('@seomax.com') || false;
        
        // Add a marker to identify this as a NextAuth user
        const markedUser = {
          ...user,
          __nextauth: true
        };
        
        // Only update if different to prevent loops
        if (!supabaseUser || supabaseUser.id !== user.id) {
          console.log('[AuthProvider] Updating with NextAuth user:', user.email);
          setSupabaseUser(markedUser);
          saveSessionToStorage(markedUser as UserData, isUserAdmin);
        }
      } else {
        console.error('[AuthProvider] NextAuth user has invalid ID:', user);
      }
    } 
    // If unauthenticated and no Supabase session, clear state
    else if (sessionStatus === 'unauthenticated') {
      console.log('[AuthProvider] NextAuth unauthenticated status detected');
      
      // If the user was previously set from NextAuth, clear it
      // Don't clear if it was set from Supabase to avoid clearing valid Supabase sessions
      if (supabaseUser?.id && !supabaseUser.__supabase) {
        console.log('[AuthProvider] Clearing NextAuth user');
        setSupabaseUser(null);
        clearSessionStorage();
      } else {
        console.log('[AuthProvider] Not clearing - user was set from Supabase');
      }
    }
  }, [session, sessionStatus, supabaseUser]);

  const supabaseSignIn = async (email: string, password: string) => {
    console.log('[AuthProvider] Attempting Supabase sign in for:', email);
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      
      if (result.error) {
        console.error('[AuthProvider] Supabase sign in error:', result.error);
        return result;
      }
      
      if (result.data.user) {
        const isUserAdmin = email.endsWith('@seomax.com');
        saveSessionToStorage(result.data.user as UserData, isUserAdmin);
      }
      
      return result;
    } catch (error) {
      console.error('[AuthProvider] Exception during Supabase sign in:', error);
      throw error;
    }
  };

  const supabaseSignOut = async () => {
    console.log('[AuthProvider] Supabase signing out');
    clearSessionStorage();
    return supabase.auth.signOut();
  };

  const isAdmin = () => {
    // Prioritize NextAuth session for admin status
    const userEmail = session?.user?.email || supabaseUser?.email;
    const isUserAdmin = userEmail?.endsWith('@seomax.com') || false;
    
    if (isUserAdmin) {
      console.log('[AuthProvider] User is admin:', userEmail);
    }
    
    return isUserAdmin;
  };
  
  // Function to get the active user from either auth system
  const getActiveUser = (): User | null => {
    // Add validation to ensure we don't return an invalid user
    const isValidUser = (user: any): boolean => {
      return Boolean(
        user && 
        user.id && 
        typeof user.id === 'string' && 
        user.id.trim() !== ''
      );
    };
    
    // First try supabaseUser from state
    if (supabaseUser && isValidUser(supabaseUser)) {
      return supabaseUser;
    }

    // Then try NextAuth session
    if (session?.user && isValidUser(session.user)) {
      return session.user as User;
    }

    // Finally, try localStorage
    try {
      const { user } = getSessionFromStorage();
      if (user && isValidUser(user)) {
        return user as User;
      }
    } catch (e) {
      console.error('[AuthProvider] Error getting user from storage:', e);
    }

    return null;
  };

  return (
    <ExtendedAuthContext.Provider value={{ 
      supabaseUser, 
      loading, 
      supabaseSignIn, 
      supabaseSignOut,
      isAdmin,
      getActiveUser,
      refreshAuth,
      synchronizeSupabaseSession,
      checkProjectAccess
    }}>
      {children}
    </ExtendedAuthContext.Provider>
  );
}

export const useExtendedAuth = () => useContext(ExtendedAuthContext); 