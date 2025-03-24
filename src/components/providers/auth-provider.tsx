'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useSession } from 'next-auth/react';

// Create a Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type ExtendedAuthContextType = {
  supabaseUser: any | null;
  loading: boolean;
  supabaseSignIn: (email: string, password: string) => Promise<any>;
  supabaseSignOut: () => Promise<any>;
  isAdmin: () => boolean;
};

const ExtendedAuthContext = createContext<ExtendedAuthContextType>({
  supabaseUser: null,
  loading: true,
  supabaseSignIn: async () => null,
  supabaseSignOut: async () => null,
  isAdmin: () => false,
});

export function ExtendedAuthProvider({ children }: { children: React.ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSupabaseUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSupabaseUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const supabaseSignIn = (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const supabaseSignOut = () => {
    return supabase.auth.signOut();
  };

  const isAdmin = () => {
    // Use either NextAuth session or Supabase user based on availability
    const userEmail = session?.user?.email || supabaseUser?.email;
    return userEmail?.endsWith('@seomax.com') || false;
  };

  return (
    <ExtendedAuthContext.Provider value={{ 
      supabaseUser, 
      loading, 
      supabaseSignIn, 
      supabaseSignOut,
      isAdmin
    }}>
      {children}
    </ExtendedAuthContext.Provider>
  );
}

export const useExtendedAuth = () => useContext(ExtendedAuthContext); 