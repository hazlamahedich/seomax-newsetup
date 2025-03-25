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
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials. Using placeholder values which will fail.');
  }

  const client = createClient(
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
          console.log(`Supabase client request to: ${url}`);
          try {
            // Use our default fetch implementation with timeouts
            const response = await fetch(url, {
              ...options,
              // Set timeouts to prevent hanging requests
              signal: options?.signal || (AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined),
            });
            
            if (!response.ok) {
              console.warn(`Supabase request failed with status ${response.status}: ${url}`);
              try {
                const textResponse = await response.clone().text();
                console.warn(`Response body: ${textResponse.substring(0, 200)}${textResponse.length > 200 ? '...' : ''}`);
              } catch (err) {
                console.warn('Could not read response body:', err);
              }
            }
            
            return response;
          } catch (error) {
            console.error(`Supabase client fetch error for ${url}:`, error);
            throw error;
          }
        }
      }
    }
  );

  // Test connection by making a simple query
  if (typeof window === 'undefined') { // Only on server-side
    (async () => {
      try {
        console.log('Testing Supabase connection...');
        const { data, error } = await client.from('llm_models').select('count(*)', { count: 'exact' });
        if (error) {
          console.error('Supabase connection test failed:', error);
        } else {
          console.log('Supabase connection successful, returned count:', data);
        }
      } catch (err) {
        console.error('Supabase connection test exception:', err);
      }
    })();
  }

  return client;
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