import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Configure which paths require authentication
const protectedPaths = ['/dashboard', '/api/protected'];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  
  // Add fallback session header to prevent client errors
  // This is just to prevent hydration errors, not for actual authentication
  const response = NextResponse.next();
  response.headers.set('x-session-fallback', 'true');
  
  // Check if the path is protected
  const isProtectedPath = protectedPaths.some(protectedPath => 
    path === protectedPath || path.startsWith(`${protectedPath}/`)
  );
  
  if (!isProtectedPath) {
    return response;
  }
  
  // Get the user's session token
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  // If there is no session token and the path is protected, redirect to the login page
  if (!token) {
    const url = new URL('/login', req.url);
    
    // Add the current path as a redirect parameter
    url.searchParams.set('callbackUrl', path);
    
    return NextResponse.redirect(url);
  }
  
  return response;
}

// Simplify the matcher to avoid infinite loops
export const config = {
  matcher: [
    // Only protect these specific paths
    '/dashboard/:path*',
    '/api/protected/:path*',
  ],
}; 