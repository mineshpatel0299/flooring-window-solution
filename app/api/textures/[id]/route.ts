import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/textures/[id]
 * Get a single texture by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: texture, error } = await supabase
      .from('textures')
      .select('*, category:categories(*)')
      .eq('id', id)
      .single();

    if (error || !texture) {
      return NextResponse.json(
        {
          success: false,
          error: 'Texture not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: texture,
    });
  } catch (error) {
    console.error('Error in GET /api/textures/[id]:', error);
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
 * PUT /api/textures/[id]
 * Update a texture by ID
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
      is_active,
      is_featured,
      sort_order,
    } = body;

    const supabase = await createClient();

    // Build update object (only include provided fields)
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (type !== undefined) updateData.type = type;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (thumbnail_url !== undefined) updateData.thumbnail_url = thumbnail_url;
    if (description !== undefined) updateData.description = description;
    if (material_type !== undefined) updateData.material_type = material_type;
    if (color !== undefined) updateData.color = color;
    if (pattern !== undefined) updateData.pattern = pattern;
    if (width_cm !== undefined) updateData.width_cm = width_cm;
    if (height_cm !== undefined) updateData.height_cm = height_cm;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (is_featured !== undefined) updateData.is_featured = is_featured;
    if (sort_order !== undefined) updateData.sort_order = sort_order;

    const { data: texture, error } = await supabase
      .from('textures')
      .update(updateData)
      .eq('id', id)
      .select('*, category:categories(*)')
      .single();

    if (error) {
      console.error('Error updating texture:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to update texture',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: texture,
    });
  } catch (error) {
    console.error('Error in PUT /api/textures/[id]:', error);
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
 * DELETE /api/textures/[id]
 * Delete a texture by ID
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase.from('textures').delete().eq('id', id);

    if (error) {
      console.error('Error deleting texture:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to delete texture',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Texture deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/textures/[id]:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
