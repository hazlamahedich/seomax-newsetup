'use client';

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

// Create a fallback session to prevent hydration errors and "Unexpected end of JSON input"
const fallbackSession = {
  expires: new Date(Date.now() + 2 * 86400).toISOString(),
  user: { id: "", name: null, email: null, image: null }
};

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider session={fallbackSession}>
      {children}
    </SessionProvider>
  );
} 