import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  try {
    // Check NextAuth session
    const session = await getServerSession(authOptions);
    
    // Session data to return (safe to expose)
    const sessionInfo = {
      nextAuth: {
        isAuthenticated: !!session,
        userId: session?.user?.id || null,
        email: session?.user?.email || null,
        hasValidId: !!(session?.user?.id && typeof session.user.id === 'string' && session.user.id.trim() !== '')
      },
      environment: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        nodeEnv: process.env.NODE_ENV,
      }
    };

    // Check if we can access Supabase
    if (session?.user?.id) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        );
        
        // Try to get user's projects
        const { data: projects, error } = await supabase
          .from('projects')
          .select('id, created_at')
          .eq('user_id', session.user.id)
          .limit(5);
          
        if (error) {
          return new NextResponse(JSON.stringify({
            ...sessionInfo,
            supabase: {
              connectionSuccessful: false,
              error: error.message,
              hint: "Database connection failed. Check Supabase credentials and user permissions."
            }
          }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        return new NextResponse(JSON.stringify({
          ...sessionInfo,
          supabase: {
            connectionSuccessful: true,
            projectsFound: projects.length,
            projectSample: projects.map(p => ({ id: p.id }))
          }
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (dbError) {
        return new NextResponse(JSON.stringify({
          ...sessionInfo,
          supabase: {
            connectionSuccessful: false,
            error: dbError instanceof Error ? dbError.message : "Unknown database error",
            hint: "Unexpected error connecting to database. Check server logs."
          }
        }), { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new NextResponse(JSON.stringify({
      ...sessionInfo,
      supabase: {
        connectionSuccessful: false,
        error: "Not authenticated",
        hint: "User must be authenticated to test database connection."
      }
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new NextResponse(JSON.stringify({
      error: "Server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 