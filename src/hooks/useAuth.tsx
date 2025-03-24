import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import { signIn as supabaseSignIn, signOut as supabaseSignOut, signUp as supabaseSignUp } from '../lib/auth/auth-service';
import { useExtendedAuth } from '@/components/providers/auth-provider';

export function useAuth() {
  const { data: session, status } = useSession();
  const { supabaseUser, isAdmin: checkIsAdmin } = useExtendedAuth();
  const loading = status === 'loading';
  
  // Prefer NextAuth user but fallback to Supabase user
  const user = session?.user ?? supabaseUser ?? null;
  
  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    try {
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
      
      return { error: null };
    } catch (error) {
      console.error('Authentication error:', error);
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
      // Sign out from Supabase
      await supabaseSignOut();
      
      // Sign out from NextAuth (with redirect)
      return await nextAuthSignOut({ callbackUrl: '/' });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };
  
  /**
   * Check if the current user is an admin
   */
  const isAdmin = () => {
    return checkIsAdmin();
  };
  
  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    isAdmin,
  };
} 