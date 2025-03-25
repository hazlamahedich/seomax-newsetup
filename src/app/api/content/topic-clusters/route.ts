import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { checkProjectAccess } from '@/lib/auth/project-access';
import { TopicClusterService } from '@/lib/services/TopicClusterService';

// POST: Create a new topic cluster
export async function POST(req: NextRequest) {
  try {
    // Check auth
    const session = await getServerSession(authOptions);
    console.log("[API:topic-clusters] Session check:", session ? `Authenticated as ${session.user.email}` : "No session");
    
    if (!session || !session.user?.id) {
      console.error("[API:topic-clusters] Authentication failure:", !session ? "No session" : "No user ID in session");
      return new NextResponse(JSON.stringify({ 
        error: 'Unauthorized', 
        details: 'Please sign in to create a topic cluster'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const body = await req.json();
    const { projectId, name, mainKeyword, description } = body;
    
    console.log(`[API:topic-clusters] Request data:`, {
      projectId,
      name, 
      mainKeyword,
      description: description ? 'Provided' : 'Not provided',
      userId: session.user.id
    });

    // Validate required fields
    if (!projectId || !name || !mainKeyword) {
      return new NextResponse(JSON.stringify({ 
        error: 'Missing required fields',
        details: !projectId ? 'Project ID is required' : !name ? 'Name is required' : 'Main keyword is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check project access
    console.log(`[API:topic-clusters] Checking project access for user ${session.user.id} to project ${projectId}`);
    
    const accessCheck = await checkProjectAccess(session.user.id, projectId);
    
    if (!accessCheck.success) {
      console.error(`[API:topic-clusters] Project access error:`, accessCheck.error);
      return new NextResponse(JSON.stringify({ 
        error: 'Project not found or access denied',
        details: accessCheck.error,
        userId: session.user.id,
        projectId
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create topic cluster using the service
    const cluster = await TopicClusterService.createTopicCluster({
      name,
      description,
      mainKeyword,
      projectId,
      userId: session.user.id
    });

    if (!cluster) {
      return new NextResponse(JSON.stringify({ 
        error: 'Failed to create topic cluster',
        details: 'An error occurred while creating the cluster'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[API:topic-clusters] Created new topic cluster ${cluster.id} for project ${projectId}`);
    
    return new NextResponse(JSON.stringify(cluster), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Unexpected error in topic cluster creation:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// GET: Fetch topic clusters
export async function GET(req: NextRequest) {
  try {
    // Check auth
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return new NextResponse(JSON.stringify({ 
        error: 'Unauthorized',
        details: 'Please sign in to access topic clusters'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get parameters from URL
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const clusterId = searchParams.get('clusterId');

    if (!projectId && !clusterId) {
      return new NextResponse(JSON.stringify({ 
        error: 'Missing parameters', 
        details: 'Either projectId or clusterId is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // For projectId, first check access permissions
    if (projectId) {
      const accessCheck = await checkProjectAccess(session.user.id, projectId);
      if (!accessCheck.success) {
        console.log(`[API:topic-clusters] Project access check failed: ${accessCheck.error}`);
        return new NextResponse(JSON.stringify({ 
          error: 'Project not found or access denied',
          details: accessCheck.error
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Fetch all clusters for this project
      const clusters = await TopicClusterService.getTopicClustersByProject(projectId);
      
      return new NextResponse(JSON.stringify(clusters), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If we get here, we're fetching by cluster ID
    const cluster = await TopicClusterService.getTopicClusterById(clusterId!);
    
    if (!cluster) {
      return new NextResponse(JSON.stringify({
        error: 'Topic cluster not found',
        details: 'The requested topic cluster could not be found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Verify current user has access to the project this cluster belongs to
    const accessCheck = await checkProjectAccess(session.user.id, cluster.projectId);
    if (!accessCheck.success) {
      return new NextResponse(JSON.stringify({ 
        error: 'Access denied to this cluster',
        details: 'You do not have permission to view this topic cluster'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new NextResponse(JSON.stringify(cluster), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching topic clusters:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// PATCH: Update a topic cluster
export async function PATCH(req: NextRequest) {
  try {
    // Check auth
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return new NextResponse(JSON.stringify({ 
        error: 'Unauthorized',
        details: 'Please sign in to update topic clusters'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const body = await req.json();
    const { id, name, description, mainKeyword } = body;
    
    if (!id) {
      return new NextResponse(JSON.stringify({ 
        error: 'Missing cluster ID',
        details: 'A cluster ID is required to update a topic cluster'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get the cluster to check permissions
    const existingCluster = await TopicClusterService.getTopicClusterById(id);
    
    if (!existingCluster) {
      return new NextResponse(JSON.stringify({ 
        error: 'Topic cluster not found',
        details: 'The requested topic cluster could not be found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check project access
    const accessCheck = await checkProjectAccess(session.user.id, existingCluster.projectId);
    if (!accessCheck.success) {
      return new NextResponse(JSON.stringify({ 
        error: 'Access denied',
        details: 'You do not have permission to update this topic cluster'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Update the cluster
    const updatedCluster = await TopicClusterService.updateTopicCluster(id, {
      name,
      description,
      mainKeyword,
      projectId: existingCluster.projectId,
      userId: session.user.id
    });
    
    if (!updatedCluster) {
      return new NextResponse(JSON.stringify({ 
        error: 'Update failed',
        details: 'Failed to update the topic cluster'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new NextResponse(JSON.stringify(updatedCluster), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating topic cluster:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE: Delete a topic cluster
export async function DELETE(req: NextRequest) {
  try {
    // Check auth
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return new NextResponse(JSON.stringify({ 
        error: 'Unauthorized',
        details: 'Please sign in to delete topic clusters'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get parameters from URL
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return new NextResponse(JSON.stringify({ 
        error: 'Missing cluster ID',
        details: 'A cluster ID is required to delete a topic cluster'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get the cluster to check permissions
    const existingCluster = await TopicClusterService.getTopicClusterById(id);
    
    if (!existingCluster) {
      return new NextResponse(JSON.stringify({ 
        error: 'Topic cluster not found',
        details: 'The requested topic cluster could not be found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check project access
    const accessCheck = await checkProjectAccess(session.user.id, existingCluster.projectId);
    if (!accessCheck.success) {
      return new NextResponse(JSON.stringify({ 
        error: 'Access denied',
        details: 'You do not have permission to delete this topic cluster'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Delete the cluster
    const success = await TopicClusterService.deleteTopicCluster(id);
    
    if (!success) {
      return new NextResponse(JSON.stringify({ 
        error: 'Delete failed',
        details: 'Failed to delete the topic cluster'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting topic cluster:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 