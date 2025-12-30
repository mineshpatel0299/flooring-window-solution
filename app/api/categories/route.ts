import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/categories
 * Get all categories with optional type filter
 * Query params: type
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    const supabase = await createClient();
    let query = supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    // Apply type filter
    if (type) {
      query = query.eq('type', type);
    }

    const { data: categories, error } = await query;

    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch categories',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: categories || [],
    });
  } catch (error) {
    console.error('Error in GET /api/categories:', error);
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
 * POST /api/categories
 * Create a new category
 * Body: category data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, type, description } = body;

    // Validation
    if (!name || !slug || !type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, slug, type',
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
    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        name,
        slug,
        type,
        description: description || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to create category',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('Error in POST /api/categories:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
