import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Configure which paths require authentication
const protectedPaths = [
  '/dashboard',
  '/projects',
  '/analytics',
  '/settings',
  '/api/protected'
];

// Public routes that don't need authentication checks
const publicPaths = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
  '/api/public',
  '/',
  '/about',
  '/contact',
  '/pricing'
];

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  
  // Skip middleware for static assets, favicon, etc.
  if (
    path.startsWith('/_next') || 
    path.startsWith('/static') || 
    path.includes('favicon') ||
    path.includes('.ico') ||
    path.includes('.svg') ||
    path.includes('.png') ||
    path.includes('.jpg')
  ) {
    return NextResponse.next();
  }
  
  // In development mode, bypass auth checks for testing
  if (process.env.NODE_ENV === 'development') {
    console.log('[Middleware] Development mode: bypassing auth check for', path);
    
    // Special handling for content page - log more details
    if (path === '/dashboard/content' || path.startsWith('/dashboard/content/')) {
      console.log('[Middleware] Special handling for content page in development mode');
    }
    
    return NextResponse.next();
  }
  
  // Check if path is in public paths - these don't need auth checks
  const isPublicPath = publicPaths.some(publicPath => 
    path === publicPath || path.startsWith(`${publicPath}/`)
  );
  
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // Check if the path is protected
  const isProtectedPath = protectedPaths.some(protectedPath => 
    path === protectedPath || path.startsWith(`${protectedPath}/`)
  );
  
  // Validate NEXTAUTH_SECRET before proceeding
  if (!process.env.NEXTAUTH_SECRET) {
    console.error('NEXTAUTH_SECRET is not set in environment variables');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  // Get the user's session token with error handling
  let token;
  try {
    token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === 'production'
    });
  } catch (error) {
    console.error('Error getting session token:', error);
    if (isProtectedPath) {
      const url = new URL('/login', req.url);
      url.searchParams.set('error', 'SessionError');
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  
  // If there is no session token and the path is protected, redirect to the login page
  if (!token && isProtectedPath) {
    const url = new URL('/login', req.url);
    url.searchParams.set('callbackUrl', encodeURIComponent(path));
    return NextResponse.redirect(url);
  }
  
  // If user is logged in and tries to access login page, redirect to dashboard
  if (token && (path === '/login' || path === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  return NextResponse.next();
}

// Configure matcher to include all relevant paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 