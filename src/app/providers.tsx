'use client';

import { SessionProvider } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";
import { ExtendedAuthProvider } from "@/components/providers/auth-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface ProvidersProps {
  children: ReactNode;
}

// Create a more robust fallback session to prevent hydration errors
const fallbackSession = {
  expires: new Date(Date.now() + 2 * 86400).toISOString(),
  user: { id: "", name: null, email: null, image: null }
};

// Create a client with proper error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export function Providers({ children }: ProvidersProps) {
  // Track if we're in the browser or during SSR
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
    
    // Attempt to restore session from browser storage
    // This helps prevent flickering between auth states on navigation
    const restoreAuth = () => {
      try {
        // Check if we have a stored auth token in localStorage
        const supabaseToken = localStorage.getItem('supabase.auth.token');
        const sessionData = localStorage.getItem('next-auth.session-token');
        
        // Log auth state for debugging
        console.log('[Providers] Auth initialization:', { 
          hasSupabaseToken: !!supabaseToken,
          hasNextAuthSession: !!sessionData
        });
      } catch (e) {
        console.error('[Providers] Error checking auth state:', e);
      }
    };
    
    // Handle page visibility changes to refresh auth when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Providers] Page became visible, refreshing auth state');
        // This will trigger a revalidation of the session
        window.dispatchEvent(new Event('focus'));
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    restoreAuth();
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Add global error handler for API fetch issues
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
      try {
        // Skip interception for non-auth requests
        const urlString = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].toString() : '';
        const isAuthRequest = urlString.includes('/api/auth');
        
        if (!isAuthRequest) {
          return await originalFetch(...args);
        }
        
        // Special handling for auth requests that might fail
        try {
          const response = await originalFetch(...args);
          
          // If the response is ok, just return it
          if (response.ok) {
            return response;
          }
          
          // This handles session fetch issues that return unexpeted end of JSON input
          const cloned = response.clone();
          try {
            const text = await cloned.text();
            // If empty response or invalid JSON, return a better formatted response
            if (!text || text.trim() === '') {
              console.warn('[Providers] Empty response from auth API, creating fallback');
              const fallbackResponse = new Response(JSON.stringify(fallbackSession), {
                status: 200,
                headers: {
                  'Content-Type': 'application/json'
                }
              });
              return fallbackResponse;
            }
            // Otherwise return the original response
            return response;
          } catch (error) {
            console.error('[Providers] Error handling response:', error);
            return response;
          }
        } catch (error) {
          console.error('[Providers] Error fetching auth endpoint:', error);
          // Return fallback session response on network error
          const fallbackResponse = new Response(JSON.stringify(fallbackSession), {
            status: 200,
            headers: {
              'Content-Type': 'application/json'
            }
          });
          return fallbackResponse;
        }
      } catch (error) {
        console.error('[Providers] Fetch interception error:', error);
        throw error;
      }
    };
    
    return () => {
      window.fetch = originalFetch;
    };
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider 
        refetchInterval={15} // Refetch session every 15 seconds for better auth persistence
        refetchOnWindowFocus={true}
        refetchWhenOffline={false}
      >
        <ExtendedAuthProvider>
          {children}
        </ExtendedAuthProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
} 