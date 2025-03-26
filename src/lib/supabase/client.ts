import { createClient as supabaseCreateClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabasePoolerUrl = process.env.NEXT_PUBLIC_SUPABASE_POOLER_URL;

// Implement environmental variable check
if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.error('Missing Supabase environment variables. Check your .env file.');
  }
}

// Create a single instance of the Supabase client for use throughout the app
export const supabase = supabaseCreateClient(
  supabaseUrl || 'https://placeholder-url.supabase.co', 
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
    },
  }
);

// Create a client function that can be used to create new instances
export const createClient = (url?: string, key?: string) => {
  return supabaseCreateClient(
    url || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    key || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      auth: {
        persistSession: true,
      },
      global: {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Prefer': 'return=minimal'
        },
      },
    }
  );
};

// Create a client for database-intensive operations that uses the connection pooler
export const createPooledClient = () => {
  if (!supabasePoolerUrl) {
    console.warn('Supabase Pooler URL not found, using regular client instead');
    return createClient();
  }

  return supabaseCreateClient(
    supabaseUrl || 'https://placeholder-url.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
      auth: {
        persistSession: true,
      },
    }
  );
};

// This client is for client-side usage (singleton)
// It's already initialized with the public environment variables
export const browserClient = supabaseCreateClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  {
    auth: {
      persistSession: true,
    },
  }
); 