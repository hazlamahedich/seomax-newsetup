'use client';

import { SessionProvider } from "next-auth/react";
import { ReactNode, useEffect } from "react";
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

// Create a client
const queryClient = new QueryClient();

export function Providers({ children }: ProvidersProps) {
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
              console.warn('Empty response from auth API, creating fallback');
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
            console.error('Error handling response:', error);
            return response;
          }
        } catch (error) {
          console.error('Error fetching auth endpoint:', error);
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
        console.error('Fetch interception error:', error);
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
        refetchInterval={5 * 60} // Refetch session every 5 minutes
        refetchOnWindowFocus={true}
        session={fallbackSession}
      >
        <ExtendedAuthProvider>
          {children}
        </ExtendedAuthProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
} 