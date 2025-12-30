import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentSession } from '@/lib/session/anonymous-session';

/**
 * GET /api/projects/[id]
 * Get a single project by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: project, error } = await supabase
      .from('projects')
      .select('*, texture:textures(*)')
      .eq('id', id)
      .single();

    if (error || !project) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found',
        },
        { status: 404 }
      );
    }

    // Check if user has access to this project (owns it or it's public)
    const session = await getCurrentSession();
    if (!project.is_public && (!session || project.session_id !== session.sessionId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied',
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Error in GET /api/projects/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/projects/[id]
 * Update a project by ID
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      name,
      type,
      original_image_url,
      processed_image_url,
      thumbnail_url,
      segmentation_data,
      texture_id,
      canvas_settings,
      is_public,
    } = body;

    const supabase = await createClient();

    // Check if user owns this project
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'No session found',
        },
        { status: 401 }
      );
    }

    const { data: existingProject } = await supabase
      .from('projects')
      .select('session_id')
      .eq('id', id)
      .single();

    if (!existingProject || existingProject.session_id !== session.sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied',
        },
        { status: 403 }
      );
    }

    // Build update object (only include provided fields)
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (original_image_url !== undefined) updateData.original_image_url = original_image_url;
    if (processed_image_url !== undefined) updateData.processed_image_url = processed_image_url;
    if (thumbnail_url !== undefined) updateData.thumbnail_url = thumbnail_url;
    if (segmentation_data !== undefined) updateData.segmentation_data = segmentation_data;
    if (texture_id !== undefined) updateData.texture_id = texture_id;
    if (canvas_settings !== undefined) updateData.canvas_settings = canvas_settings;
    if (is_public !== undefined) updateData.is_public = is_public;

    const { data: project, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select('*, texture:textures(*)')
      .single();

    if (error) {
      console.error('Error updating project:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to update project',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Error in PUT /api/projects/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]
 * Delete a project by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check if user owns this project
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'No session found',
        },
        { status: 401 }
      );
    }

    const { data: existingProject } = await supabase
      .from('projects')
      .select('session_id')
      .eq('id', id)
      .single();

    if (!existingProject || existingProject.session_id !== session.sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied',
        },
        { status: 403 }
      );
    }

    const { error } = await supabase.from('projects').delete().eq('id', id);

    if (error) {
      console.error('Error deleting project:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to delete project',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/projects/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
