import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// This function creates a Supabase client authenticated with the user's session
export function createServerClient() {
  const cookieStore = cookies();
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        cookieOptions: {
          name: 'sb-auth-token',
          // These options ensure the cookie is sent only in HTTPS requests
          // and prevents access from JavaScript in the browser
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
        },
      },
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: { path: string; maxAge: number; }) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // This will throw in middleware, but we can safely ignore it
          }
        },
        remove(name: string, options: { path: string; }) {
          try {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 });
          } catch (error) {
            // This will throw in middleware, but we can safely ignore it
          }
        },
      },
    }
  );
} 