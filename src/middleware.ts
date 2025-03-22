import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Configure which paths require authentication
const protectedPaths = ['/dashboard', '/api/protected'];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  
  // Check if the path is protected
  const isProtectedPath = protectedPaths.some(protectedPath => 
    path === protectedPath || path.startsWith(`${protectedPath}/`)
  );
  
  if (!isProtectedPath) {
    return NextResponse.next();
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
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect these paths
    '/dashboard/:path*',
    '/api/protected/:path*',
    
    // Exclude the following paths
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 