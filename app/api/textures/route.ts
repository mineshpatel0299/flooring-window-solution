import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/textures
 * Get all textures with optional filters
 * Query params: type, category_id, is_featured, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const categoryId = searchParams.get('category_id');
    const isFeatured = searchParams.get('is_featured');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const supabase = await createClient();
    let query = supabase
      .from('textures')
      .select('*, category:categories(*)', { count: 'exact' })
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    // Apply filters
    if (type) {
      query = query.eq('type', type);
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    if (isFeatured !== null) {
      query = query.eq('is_featured', isFeatured === 'true');
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: textures, error, count } = await query;

    if (error) {
      console.error('Error fetching textures:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch textures',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        textures: textures || [],
        total: count || 0,
        page: Math.floor(offset / limit) + 1,
        limit,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/textures:', error);
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
 * POST /api/textures
 * Create a new texture
 * Body: texture data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      slug,
      category_id,
      type,
      image_url,
      thumbnail_url,
      description,
      material_type,
      color,
      pattern,
      width_cm,
      height_cm,
      is_featured = false,
      sort_order = 0,
    } = body;

    // Validation
    if (!name || !slug || !type || !image_url) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, slug, type, image_url',
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

    const supabase = await createClient();
    const { data: texture, error } = await supabase
      .from('textures')
      .insert({
        name,
        slug,
        category_id: category_id || null,
        type,
        image_url,
        thumbnail_url: thumbnail_url || null,
        description: description || null,
        material_type: material_type || null,
        color: color || null,
        pattern: pattern || null,
        width_cm: width_cm || null,
        height_cm: height_cm || null,
        is_featured,
        sort_order,
        is_active: true,
        usage_count: 0,
      })
      .select('*, category:categories(*)')
      .single();

    if (error) {
      console.error('Error creating texture:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to create texture',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: texture,
    });
  } catch (error) {
    console.error('Error in POST /api/textures:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
