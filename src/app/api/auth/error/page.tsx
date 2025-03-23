'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  // Map error codes to user-friendly messages
  const getErrorMessage = (errorCode: string | null) => {
    if (!errorCode) return 'An unknown authentication error occurred';
    
    switch (errorCode) {
      case 'CredentialsSignin':
        return 'Invalid email or password. Please try again.';
      case 'Verification':
        return 'Your email has not been verified. Please check your inbox for a verification email.';
      case 'Configuration':
        return 'There is a problem with the server configuration. Please contact support.';
      case 'AccessDenied':
        return 'You do not have permission to access this resource.';
      case 'Callback':
        return 'There was an error with the authentication callback.';
      default:
        return `Authentication error: ${errorCode}`;
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center">
          <Link href="/" className="font-bold text-2xl">
            SEOMax
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-destructive">Authentication Error</h1>
            <p className="text-muted-foreground">
              {getErrorMessage(error)}
            </p>
          </div>
          
          <div className="flex flex-col gap-4">
            <Button asChild>
              <Link href="/login">
                Return to Login
              </Link>
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              Need help? <Link href="/" className="text-primary hover:underline">Contact support</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 