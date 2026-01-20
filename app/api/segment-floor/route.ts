import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Use local detection - it's more reliable and works offline
    // The local floor detector has been improved with wall exclusion
    console.log('Using local floor detection (improved algorithm)');

    return NextResponse.json({
      success: false,
      useLocalDetection: true,
      message: 'Using local detection for better accuracy'
    });

  } catch (error) {
    console.error('Floor segmentation error:', error);
    return NextResponse.json({
      success: false,
      useLocalDetection: true,
      message: String(error)
    });
  }
}
