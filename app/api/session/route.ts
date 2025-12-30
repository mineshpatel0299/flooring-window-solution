import { NextResponse } from 'next/server';
import { getOrCreateSession, getCurrentSession } from '@/lib/session/anonymous-session';

/**
 * GET /api/session
 * Get the current session or create a new one
 */
export async function GET() {
  try {
    const session = await getOrCreateSession();

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get or create session',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/session
 * Create a new session (force create even if one exists)
 */
export async function POST() {
  try {
    const session = await getOrCreateSession();

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create session',
      },
      { status: 500 }
    );
  }
}
