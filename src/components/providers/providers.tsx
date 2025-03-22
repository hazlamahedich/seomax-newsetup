'use client';

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Set refetchInterval to 0 to prevent continuous fetching
  // Set refetchOnWindowFocus to false to prevent fetching when window gains focus
  return (
    <SessionProvider 
      refetchInterval={0}
      refetchOnWindowFocus={false}
      // Use a default session object to avoid the "Unexpected end of JSON" error
      // when loading as fallback until actual session is fetched
      session={{
        expires: new Date(Date.now() + 2 * 86400).toISOString(),
        user: { id: "", name: null, email: null, image: null }
      }}
    >
      {children}
    </SessionProvider>
  );
} 