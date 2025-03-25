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
};

const ExtendedAuthContext = createContext<ExtendedAuthContextType>({
  supabaseUser: null,
  loading: true,
  supabaseSignIn: async () => null,
  supabaseSignOut: async () => null,
  isAdmin: () => false,
  getActiveUser: () => null,
  refreshAuth: async () => null,
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

  // Debug on initial render
  useEffect(() => {
    console.log('[AuthProvider] Initial render with stored session:', 
      initialSession.user?.email, 
      'isAdmin:', initialSession.isAdmin);
  }, []);

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
      const { data: supabaseData } = await supabase.auth.getSession();
      const supabaseUser = supabaseData?.session?.user;
      
      // Use either NextAuth or Supabase user, prioritizing admin users
      const nextAuthUser = session?.user;
      
      // Check admin status
      const isNextAuthAdmin = nextAuthUser?.email?.endsWith('@seomax.com');
      const isSupabaseAdmin = supabaseUser?.email?.endsWith('@seomax.com');
      
      let activeUser: User | null = null;
      let isAdmin = false;
      
      if (isNextAuthAdmin && nextAuthUser) {
        console.log('[AuthProvider] Refresh found NextAuth admin user');
        activeUser = nextAuthUser as User;
        isAdmin = true;
      } else if (isSupabaseAdmin && supabaseUser) {
        console.log('[AuthProvider] Refresh found Supabase admin user');
        activeUser = supabaseUser as User;
        isAdmin = true;
      } else if (nextAuthUser) {
        console.log('[AuthProvider] Refresh found NextAuth user');
        activeUser = nextAuthUser as User;
      } else if (supabaseUser) {
        console.log('[AuthProvider] Refresh found Supabase user');
        activeUser = supabaseUser as User;
      }
      
      if (activeUser) {
        setSupabaseUser(activeUser);
        saveSessionToStorage(activeUser as UserData, isAdmin);
        return activeUser;
      }
      
      setSupabaseUser(null);
      clearSessionStorage();
      return null;
    } catch (error) {
      console.error('[AuthProvider] Error refreshing auth:', error);
      return null;
    }
  }, [session, supabaseUser]);

  // Initialize auth state check and set up listeners - but only once
  useEffect(() => {
    // Prevent multiple initializations
    if (initialized.current) {
      return;
    }
    
    initialized.current = true;
    let isMounted = true;
    console.log('[AuthProvider] Initializing auth state check');
    
    const checkInitialSession = async () => {
      try {
        // Check Supabase auth
        const { data: supabaseSession } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (supabaseSession?.session?.user) {
          const user = supabaseSession.session.user as User;
          const isUserAdmin = user.email?.endsWith('@seomax.com') || false;
          console.log('[AuthProvider] Initial Supabase session user:', user.email);
          
          // Only update if different to prevent loops
          if (!supabaseUser || supabaseUser.id !== user.id) {
            setSupabaseUser(user);
            saveSessionToStorage(user as UserData, isUserAdmin);
          }
        } else if (sessionStatus !== 'loading' && session?.user) {
          // If no Supabase user but NextAuth user exists and is loaded
          const user = session.user as User;
          const isUserAdmin = user.email?.endsWith('@seomax.com') || false;
          console.log('[AuthProvider] Using NextAuth session user:', user.email);
          
          // Only update if different
          if (!supabaseUser || supabaseUser.id !== user.id) {
            setSupabaseUser(user);
            saveSessionToStorage(user as UserData, isUserAdmin);
          }
        } else if (!supabaseUser) {
          // If we have neither and no stored user
          console.log('[AuthProvider] No initial session from any source');
          setSupabaseUser(null);
          clearSessionStorage();
        }
        
        // Set loading to false only if NextAuth session is also done loading
        if (sessionStatus !== 'loading') {
          setLoading(false);
        }
      } catch (error) {
        console.error('[AuthProvider] Error checking initial session:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    // Run initial session check
    checkInitialSession();
    
    // Set up Supabase auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthProvider] Supabase auth state changed:', event);
        if (!isMounted) return;
        
        // Only update storage if there's a meaningful change
        if (session?.user) {
          const user = session.user as User;
          const currentUserEmail = supabaseUser?.email;
          
          if (currentUserEmail !== user.email) {
            console.log('[AuthProvider] Setting Supabase user:', user.email);
            const isUserAdmin = user.email?.endsWith('@seomax.com') || false;
            setSupabaseUser(user);
            saveSessionToStorage(user as UserData, isUserAdmin);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('[AuthProvider] User signed out');
          setSupabaseUser(null);
          clearSessionStorage();
        }
        
        if (sessionStatus !== 'loading') {
          setLoading(false);
        }
      }
    );

    // Add cleanup to our ref
    cleanupFunctions.current.push(() => {
      authListener.subscription.unsubscribe();
    });

    // Refresh session when tab becomes visible - but use a debounce
    let visibilityTimer: NodeJS.Timeout | null = null;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Clear any existing timer
        if (visibilityTimer) {
          clearTimeout(visibilityTimer);
        }
        
        // Set a new timer to debounce the refresh
        visibilityTimer = setTimeout(() => {
          console.log('[AuthProvider] Tab became visible, refreshing auth');
          refreshAuth();
          visibilityTimer = null;
        }, 500);
      }
    };

    // Register visibility listener
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      // Add cleanup
      cleanupFunctions.current.push(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (visibilityTimer) {
          clearTimeout(visibilityTimer);
        }
      });
    }

    // Cleanup
    return () => {
      isMounted = false;
      // Run all cleanup functions
      cleanupFunctions.current.forEach(cleanup => cleanup());
      cleanupFunctions.current = [];
    };
  }, []); // Empty dependency array to run only once

  // When NextAuth session changes, update our state
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    
    // Skip frequent updates
    const now = Date.now();
    if (now - lastUpdateTime.current < 1000) {
      return;
    }
    
    lastUpdateTime.current = now;
    
    if (session?.user) {
      // Only save to storage if our state doesn't already match the session user
      // This prevents unnecessary storage updates that can trigger other listeners
      const currentUserEmail = supabaseUser?.email;
      const sessionUserEmail = session.user.email;
      
      if (currentUserEmail !== sessionUserEmail) {
        console.log('[AuthProvider] NextAuth session updated, new user:', sessionUserEmail);
        const isUserAdmin = sessionUserEmail?.endsWith('@seomax.com') || false;
        
        if (!supabaseUser || isUserAdmin) {
          const user = session.user as User;
          setSupabaseUser(user);
          saveSessionToStorage(user as UserData, isUserAdmin);
        }
      }
    } else if (sessionStatus === 'unauthenticated' && !supabaseUser) {
      // We're explicitly unauthenticated and don't have a user
      console.log('[AuthProvider] NextAuth confirmed unauthenticated and no Supabase user');
      clearSessionStorage();
    }
    
    setLoading(false);
  }, [session, sessionStatus, supabaseUser]);

  const supabaseSignIn = async (email: string, password: string) => {
    console.log('[AuthProvider] Attempting Supabase sign in for:', email);
    const result = await supabase.auth.signInWithPassword({ email, password });
    
    if (result.data.user) {
      const isUserAdmin = email.endsWith('@seomax.com');
      saveSessionToStorage(result.data.user as UserData, isUserAdmin);
    }
    
    return result;
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
    if (session?.user) {
      return session.user as User;
    }
    return supabaseUser;
  };

  return (
    <ExtendedAuthContext.Provider value={{ 
      supabaseUser, 
      loading, 
      supabaseSignIn, 
      supabaseSignOut,
      isAdmin,
      getActiveUser,
      refreshAuth
    }}>
      {children}
    </ExtendedAuthContext.Provider>
  );
}

export const useExtendedAuth = () => useContext(ExtendedAuthContext); 