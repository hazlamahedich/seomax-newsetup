'use client';

import { SessionProvider } from "next-auth/react";
import { ReactNode, useEffect, useState, useRef } from "react";
import { ExtendedAuthProvider } from "@/components/providers/auth-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

interface ProvidersProps {
  children: ReactNode;
}

// Create a more robust fallback session to prevent hydration errors
const fallbackSession = {
  expires: new Date(Date.now() + 2 * 86400).toISOString(),
  user: { id: "", name: null, email: null, image: null }
};

// Store the latest session for fallback usage
const sessionCache: {
  data: { expires: string; user: any } | null;
  timestamp: number;
  staleTime: number;
} = {
  data: null,
  timestamp: 0,
  // Timeout after which we consider the cache stale (5 minutes)
  staleTime: 5 * 60 * 1000
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
  // Network status tracking
  const [isOnline, setIsOnline] = useState(true);
  // Last successful fetch time
  const lastSuccessfulFetch = useRef(0);
  // Global fetch timeout (3 seconds)
  const FETCH_TIMEOUT = 3000;
  
  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Providers] Network is online');
      setIsOnline(true);
    };
    
    const handleOffline = () => {
      console.log('[Providers] Network is offline');
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial status
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
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
        
        // If we have session data stored in localStorage, use it to update the session cache
        if (sessionData) {
          try {
            // Try to parse the JWT to get session info
            const base64Url = sessionData.split('.')[1];
            if (base64Url) {
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
              }).join(''));
              
              const parsedData = JSON.parse(jsonPayload);
              if (parsedData && parsedData.exp) {
                // Update session cache with data from JWT
                sessionCache.data = {
                  expires: new Date(parsedData.exp * 1000).toISOString(),
                  user: parsedData.user || fallbackSession.user
                };
                sessionCache.timestamp = Date.now();
                console.log('[Providers] Updated session cache from JWT');
              }
            }
          } catch (e) {
            console.error('[Providers] Error parsing session token:', e);
          }
        }
      } catch (e) {
        console.error('[Providers] Error checking auth state:', e);
      }
    };
    
    // Handle page visibility changes to refresh auth when tab becomes visible
    // But only if we haven't checked recently to avoid hammering the server
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const timeSinceLastFetch = now - lastSuccessfulFetch.current;
        
        // Only refresh if it's been more than 30 seconds since last success
        if (timeSinceLastFetch > 30000) {
          console.log('[Providers] Page became visible, refreshing auth state');
          // This will trigger a revalidation of the session
          window.dispatchEvent(new Event('focus'));
          lastSuccessfulFetch.current = now;
        } else {
          console.log('[Providers] Skipping refresh - too soon since last success');
        }
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
        // Get the URL string for checking
        const urlString = typeof args[0] === 'string' ? args[0] : args[0] instanceof URL ? args[0].toString() : '';
        const isAuthRequest = urlString.includes('/api/auth');
        
        // Skip interception for non-auth requests
        if (!isAuthRequest) {
          return await originalFetch(...args);
        }
        
        // For auth requests, add timeout and handle errors
        console.log('[Providers] Auth API request intercepted:', urlString);
        
        try {
          // Create abort controller with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
          
          // If we're offline and have cached session, return it immediately
          if (!isOnline && sessionCache.data) {
            console.log('[Providers] Offline mode - using cached session');
            clearTimeout(timeoutId);
            return new Response(JSON.stringify(sessionCache.data), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Only add signal to existing options, don't create a new Request object
          // as that can break NextAuth parameter handling
          if (args[1] && typeof args[1] === 'object') {
            // Add timeout to existing options without losing any context
            args[1] = {
              ...args[1],
              signal: controller.signal
            };
          } else {
            // Otherwise create RequestInit
            args[1] = { signal: controller.signal };
          }
          
          // Make the request with timeout
          const response = await originalFetch(...args);
          clearTimeout(timeoutId);
          
          // If response is successful and not empty, update our cache
          if (response.ok) {
            try {
              const clonedResponse = response.clone();
              const text = await clonedResponse.text();
              
              if (text && text.trim() !== '') {
                try {
                  const sessionData = JSON.parse(text);
                  if (sessionData && sessionData.expires) {
                    sessionCache.data = sessionData;
                    sessionCache.timestamp = Date.now();
                    lastSuccessfulFetch.current = Date.now();
                    console.log('[Providers] Updated session cache with fresh data');
                  }
                } catch (parseError) {
                  console.error('[Providers] Error parsing session JSON:', parseError);
                }
              }
              
              // Return a new response with the text we already read
              return new Response(text, {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
              });
            } catch (readError) {
              console.error('[Providers] Error reading response:', readError);
              // If we can't read the response for some reason, return original
              return response;
            }
          }
          
          // Handle error responses
          const cloned = response.clone();
          try {
            const text = await cloned.text();
            
            // If empty response or invalid JSON, return a better formatted response
            if (!text || text.trim() === '') {
              console.warn('[Providers] Empty response from auth API, creating fallback');
              
              // Check if we have a valid cached session to use
              if (sessionCache.data && (Date.now() - sessionCache.timestamp < sessionCache.staleTime)) {
                console.log('[Providers] Using cached session data');
                return new Response(JSON.stringify(sessionCache.data), {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' }
                });
              }
              
              // Fall back to default session if no cached session
              return new Response(JSON.stringify(fallbackSession), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
              });
            }
            
            // Otherwise return the original response
            return response;
          } catch (error) {
            console.error('[Providers] Error handling response:', error);
            return response;
          }
        } catch (fetchError: any) {
          console.error('[Providers] Error fetching auth endpoint:', fetchError);
          
          // Check if it's an abort error (timeout)
          if (fetchError.name === 'AbortError') {
            console.warn('[Providers] Auth request timed out after', FETCH_TIMEOUT, 'ms');
          }
          
          // Check if we have a valid cached session to use first
          if (sessionCache.data && (Date.now() - sessionCache.timestamp < sessionCache.staleTime)) {
            console.log('[Providers] Network error - using cached session data');
            return new Response(JSON.stringify(sessionCache.data), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
          
          // Return fallback session response on network error
          return new Response(JSON.stringify(fallbackSession), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        console.error('[Providers] Fetch interception error:', error);
        throw error;
      }
    };
    
    return () => {
      window.fetch = originalFetch;
    };
  }, [isOnline]);
  
  // Add diagnostic database query
  useEffect(() => {
    const checkDatabaseConnectivity = async () => {
      try {
        console.log("Running diagnostic query to check database connectivity");
        const { count, error: diagError } = await createClient()
          .from('llm_models')
          .select('id', { count: 'exact', head: true });
          
        if (diagError) {
          console.error("Database diagnostic failed:", diagError);
        } else {
          console.log("Database diagnostic successful, model count:", count);
        }
      } catch (diagErr) {
        console.error("Exception during database diagnostic:", diagErr);
      }
    };
    
    checkDatabaseConnectivity();
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider 
        refetchInterval={60} // Reduced frequency - refetch session every 60 seconds
        refetchOnWindowFocus={true}
        refetchWhenOffline={false}
        // Add fallback session to prevent errors when session fetch fails
        session={isClient && sessionCache.data ? sessionCache.data : fallbackSession}
      >
        <ExtendedAuthProvider>
          {children}
        </ExtendedAuthProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
} 