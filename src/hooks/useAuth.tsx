import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';
import { signIn as supabaseSignIn, signOut as supabaseSignOut, signUp as supabaseSignUp } from '../lib/auth/auth-service';

export function useAuth() {
  const { data: session, status } = useSession();
  const loading = status === 'loading';
  
  const user = session?.user ?? null;
  
  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    try {
      // First sign in with Supabase
      const result = await supabaseSignIn(email, password);
      
      if (!result.success) {
        return { error: new Error(result.error || 'Sign in failed') };
      }
      
      // Then sign in with NextAuth
      const nextAuthResult = await nextAuthSignIn('credentials', {
        email,
        password,
        redirect: false,
      });
      
      if (nextAuthResult?.error) {
        return { error: new Error(nextAuthResult.error) };
      }
      
      return { error: null };
    } catch (error) {
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
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };
  
  /**
   * Sign out the user
   */
  const signOut = async () => {
    // Sign out from Supabase
    await supabaseSignOut();
    
    // Sign out from NextAuth
    await nextAuthSignOut();
  };
  
  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };
} 