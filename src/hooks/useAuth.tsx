import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import { signIn as supabaseSignIn, signOut as supabaseSignOut, signUp as supabaseSignUp } from '../lib/auth/auth-service';
import { useExtendedAuth } from '@/components/providers/auth-provider';
import { useEffect, useState, useRef, useCallback } from 'react';

// Define a generic user type that works with both auth systems
type GenericUser = {
  id: string;
  email?: string;
  name?: string;
  [key: string]: any; // Allow for any additional properties
};

export function useAuth() {
  const { data: session, status } = useSession();
  const { supabaseUser, loading: extLoading, refreshAuth } = useExtendedAuth();
  const loading = status === 'loading' || extLoading;
  
  // Store consistent user in local state to prevent flickering between auth systems
  const [stableUser, setStableUser] = useState<GenericUser | null>(null);
  const [stableIsAdmin, setStableIsAdmin] = useState(false);
  const didInitialCheck = useRef(false);
  
  // Refreshes authentication manually in case of issues
  const forceRefreshAuth = useCallback(async () => {
    console.log('[useAuth] Manually refreshing authentication');
    const user = await refreshAuth();
    if (user) {
      console.log('[useAuth] Manual refresh successful, found user:', user.email);
      setStableUser(user);
      setStableIsAdmin(user.email?.endsWith('@seomax.com') || false);
      return true;
    } else {
      console.log('[useAuth] Manual refresh found no user');
      return false;
    }
  }, [refreshAuth]);
  
  // Effect to update stable user when auth changes
  useEffect(() => {
    // Don't change stable user when loading to prevent flicker
    if (loading && didInitialCheck.current) return;
    
    // Prioritize authenticated users and prefer admin user
    const nextAuthEmail = session?.user?.email;
    const supabaseEmail = supabaseUser?.email;
    
    const isNextAuthAdmin = nextAuthEmail?.endsWith('@seomax.com');
    const isSupabaseAdmin = supabaseEmail?.endsWith('@seomax.com');
    
    // Always prefer admin user if available
    if (isNextAuthAdmin && session?.user) {
      console.log('[useAuth] Setting stable user from NextAuth (admin)');
      setStableUser(session.user as GenericUser);
      setStableIsAdmin(true);
    } else if (isSupabaseAdmin && supabaseUser) {
      console.log('[useAuth] Setting stable user from Supabase (admin)');
      setStableUser(supabaseUser as unknown as GenericUser);
      setStableIsAdmin(true);
    } else if (session?.user) {
      console.log('[useAuth] Setting stable user from NextAuth');
      setStableUser(session.user as GenericUser);
      setStableIsAdmin(false);
    } else if (supabaseUser) {
      console.log('[useAuth] Setting stable user from Supabase');
      setStableUser(supabaseUser as unknown as GenericUser);
      setStableIsAdmin(false);
    } else if (!loading || !didInitialCheck.current) {
      console.log('[useAuth] No user found, clearing stable user');
      setStableUser(null);
      setStableIsAdmin(false);
    }
    
    didInitialCheck.current = true;
  }, [session, supabaseUser, loading]);
  
  // Force initial page load auth check in case we navigated from another page
  useEffect(() => {
    if (typeof window !== 'undefined' && !loading && !stableUser) {
      console.log('[useAuth] No user after initial load, trying forced refresh');
      forceRefreshAuth();
    }
  }, [loading, stableUser, forceRefreshAuth]);
  
  // Use stable user instead of directly from auth providers
  const user = stableUser;
  
  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    try {
      console.log('[useAuth] Attempting to sign in user:', email);
      // First sign in with Supabase
      const result = await supabaseSignIn(email, password);
      
      if (!result.success) {
        let errorMessage = result.error || 'Sign in failed';
        // Add more context for email confirmation errors
        if (errorMessage.includes('Email not confirmed')) {
          errorMessage = 'Please check your email to confirm your account before signing in.';
        }
        return { error: new Error(errorMessage) };
      }
      
      // Then sign in with NextAuth
      const nextAuthResult = await nextAuthSignIn('credentials', {
        email,
        password,
        redirect: false,
      });
      
      if (nextAuthResult?.error) {
        // Handle specific NextAuth errors
        let errorMessage = nextAuthResult.error;
        if (errorMessage.includes('CredentialsSignin')) {
          errorMessage = 'Invalid email or password. Please try again.';
        }
        return { error: new Error(errorMessage) };
      }
      
      // Success - force refresh our auth state
      await forceRefreshAuth();
      return { error: null };
    } catch (error) {
      console.error('[useAuth] Authentication error:', error);
      return { error: error as Error };
    }
  };
  
  /**
   * Sign up with email and password
   */
  const signUp = async (email: string, password: string, name?: string) => {
    try {
      const result = await supabaseSignUp(email, password, name);
      
      if (!result.success) {
        return { error: new Error(result.error || 'Sign up failed') };
      }
      
      return { error: null, emailConfirmationRequired: true };
    } catch (error) {
      return { error: error as Error };
    }
  };
  
  /**
   * Sign out the user
   */
  const signOut = async () => {
    try {
      console.log('[useAuth] Signing out user');
      // Clear our stable state
      setStableUser(null);
      setStableIsAdmin(false);
      
      // Sign out from Supabase
      await supabaseSignOut();
      
      // Sign out from NextAuth (with redirect)
      return await nextAuthSignOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('[useAuth] Sign out error:', error);
    }
  };
  
  /**
   * Check if the current user is an admin - use stable admin state
   */
  const isAdmin = () => {
    return stableIsAdmin;
  };
  
  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin,
    forceRefreshAuth,
  };
} 