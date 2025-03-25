import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@/lib/supabase/client';
import { ensureProjectExists } from '@/lib/auth/project-helper';
import { createAdminClient } from '@/lib/supabase/admin-client';
import { assignProjectToUser } from '@/lib/auth/project-helper';

export async function GET(req: NextRequest) {
  try {
    // Check NextAuth session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return new NextResponse(JSON.stringify({
        success: false,
        error: 'Not authenticated',
        message: 'No active session found'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('[API:auth-sync] GET: Valid session found for user ID:', session.user.id);
    
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    
    // Get the user's projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, created_at')
      .eq('user_id', session.user.id);
      
    if (projectsError) {
      console.error('[API:auth-sync] Error fetching projects:', projectsError);
      return new NextResponse(JSON.stringify({
        success: false,
        error: 'Database error',
        message: 'Failed to fetch user projects',
        details: projectsError.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('[API:auth-sync] GET: Found', projects?.length || 0, 'projects for user ID:', session.user.id);
    
    return new NextResponse(JSON.stringify({
      success: true,
      userInfo: {
        id: session.user.id,
        email: session.user.email,
        isAuthenticated: true
      },
      projects: {
        count: projects?.length || 0,
        ids: projects?.map(p => p.id) || []
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('[API:auth-sync] Unexpected error:', error);
    return new NextResponse(JSON.stringify({
      success: false,
      error: 'Server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('[API:auth-sync] POST: Synchronizing auth session');
    
    // Get the session from NextAuth.js
    const nextauthSession = await getServerSession(authOptions);
    
    // If no session, return unauthorized
    if (!nextauthSession?.user) {
      console.log('[API:auth-sync] POST: Unauthorized, no session');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = nextauthSession.user.id;
    const email = nextauthSession.user.email;
    
    if (!userId || !email) {
      console.log('[API:auth-sync] POST: Invalid user data in session', { userId, email });
      return NextResponse.json({ success: false, error: 'Invalid user data' }, { status: 400 });
    }
    
    console.log('[API:auth-sync] POST: Session user data', { userId, email });
    
    // Get the request body
    const body = await req.json();
    const { projectId } = body;
    
    if (!projectId) {
      console.log('[API:auth-sync] POST: No projectId provided');
      return NextResponse.json({ success: false, error: 'No projectId provided' }, { status: 400 });
    }
    
    try {
      // Try to ensure project exists
      const project = await ensureProjectExists(projectId, userId);
      console.log('[API:auth-sync] POST: Project ensured', project);
      
      return NextResponse.json({ 
        success: true, 
        user: nextauthSession.user,
        project
      });
    } catch (projectError: any) {
      // Special handling for duplicate key error - this means the project exists
      // but we couldn't access it due to concurrent creation or other issues
      if (projectError?.code === '23505' || 
          (projectError?.message && projectError.message.includes('duplicate key'))) {
        console.log('[API:auth-sync] POST: Caught duplicate key error, attempting to fetch project directly');
        
        try {
          // Create admin client to bypass RLS
          const supabaseAdmin = createAdminClient(); // Ensure this is imported at the top
          
          // Try to fetch the project directly
          const { data: project, error: fetchError } = await supabaseAdmin
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .maybeSingle();
            
          if (fetchError) {
            throw fetchError;
          }
          
          if (!project) {
            throw new Error(`Project with ID ${projectId} not found after duplicate key error`);
          }
          
          // If project belongs to a different user, assign it to current user
          if (project.user_id !== userId) {
            console.log('[API:auth-sync] POST: Project belongs to different user, reassigning');
            const updatedProject = await assignProjectToUser(projectId, userId);
            
            return NextResponse.json({
              success: true,
              user: nextauthSession.user,
              project: updatedProject
            });
          }
          
          return NextResponse.json({
            success: true,
            user: nextauthSession.user,
            project
          });
        } catch (recoveryError) {
          console.error('[API:auth-sync] POST: Failed to recover from duplicate key error', recoveryError);
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to ensure project exists after duplicate key error',
            details: recoveryError
          }, { status: 500 });
        }
      }
      
      console.error('[API:auth-sync] POST: Error ensuring project exists:', projectError);
      return NextResponse.json({ 
        success: false, 
        error: 'Error ensuring project exists',
        details: projectError
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[API:auth-sync] POST: Unexpected error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Unexpected error occurred',
      details: error
    }, { status: 500 });
  }
} 