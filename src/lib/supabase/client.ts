import { createClient } from '@supabase/supabase-js';

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
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co', 
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: async (url, options) => {
        // Use our default fetch implementation
        const response = await fetch(url, {
          ...options,
          // Set timeouts to prevent hanging requests
          signal: options?.signal || (AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined),
        });
        
        return response;
      }
    }
  }
);

// Export the createClient function for other services to use
export { createClient };

// Create a client function that can be used to create new instances
export const createSupabaseClient = () => {
  return createClient(
    supabaseUrl || 'https://placeholder-url.supabase.co', 
    supabaseAnonKey || 'placeholder-key',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    }
  );
};

// Create a client that uses the session pooler for database-intensive operations
export const createPooledSupabaseClient = () => {
  if (!supabasePoolerUrl) {
    console.warn('Supabase Pooler URL not found, using regular client instead');
    return createSupabaseClient();
  }

  return createClient(
    supabaseUrl || 'https://placeholder-url.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      db: {
        schema: 'seomax',
      },
      global: {
        headers: {
          'x-connection-pool': supabasePoolerUrl
        },
        fetch: async (url, options) => {
          const response = await fetch(url, {
            ...options,
            signal: options?.signal || (AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined),
          });
          
          return response;
        }
      }
    }
  );
}; 