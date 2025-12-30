import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateSession } from '@/lib/session/anonymous-session';

/**
 * GET /api/projects
 * Get all projects for the current session or public projects
 * Query params: type, is_public, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const isPublic = searchParams.get('is_public');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const session = await getOrCreateSession();
    const supabase = await createClient();

    let query = supabase
      .from('projects')
      .select('*, texture:textures(*)', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Filter by session or public projects
    if (isPublic === 'true') {
      query = query.eq('is_public', true);
    } else {
      // Get user's own projects or public projects
      query = query.or(`session_id.eq.${session.sessionId},is_public.eq.true`);
    }

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: projects, error, count } = await query;

    if (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch projects',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        projects: projects || [],
        total: count || 0,
        page: Math.floor(offset / limit) + 1,
        limit,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/projects:', error);
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
 * POST /api/projects
 * Create a new project
 * Body: project data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name = 'Untitled Project',
      type,
      original_image_url,
      processed_image_url,
      thumbnail_url,
      segmentation_data,
      texture_id,
      canvas_settings,
      is_public = false,
    } = body;

    // Validation
    if (!type || !original_image_url) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: type, original_image_url',
        },
        { status: 400 }
      );
    }

    if (!['floor', 'window'].includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid type. Must be "floor" or "window"',
        },
        { status: 400 }
      );
    }

    // Get or create session
    const session = await getOrCreateSession();

    const supabase = await createClient();
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        session_id: session.sessionId,
        name,
        type,
        original_image_url,
        processed_image_url: processed_image_url || null,
        thumbnail_url: thumbnail_url || null,
        segmentation_data: segmentation_data || null,
        texture_id: texture_id || null,
        canvas_settings: canvas_settings || null,
        is_public,
      })
      .select('*, texture:textures(*)')
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to create project',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Error in POST /api/projects:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
