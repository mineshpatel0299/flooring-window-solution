import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

export async function POST(request: NextRequest) {
  try {
    const { image, points } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Check if Replicate API token is configured and valid
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken || apiToken === 'your_replicate_api_token_here' || apiToken.length < 20) {
      // Return a signal to use local detection instead
      console.log('Replicate API token not configured, using local detection');
      return NextResponse.json({
        success: false,
        useLocalDetection: true,
        message: 'API token not configured'
      });
    }

    const replicate = new Replicate({
      auth: apiToken,
    });

    const floorPoints = points || [[0.5, 0.85]];
    console.log('Running SAM 2 segmentation with points:', floorPoints);

    const input: Record<string, unknown> = {
      image: image,
      input_points: JSON.stringify(floorPoints.map((p: number[]) => [
        Math.round(p[0] * 1000),
        Math.round(p[1] * 1000)
      ])),
      input_labels: JSON.stringify(floorPoints.map(() => 1)),
    };

    try {
      const output = await replicate.run(
        'meta/sam-2-image:fe97b453f6455861e3bac769b441ca1f1086110da7466dbb65cf1eecfd60dc83',
        { input }
      );

      console.log('SAM 2 output type:', typeof output);

      return NextResponse.json({
        success: true,
        mask: output,
      });
    } catch (sam2Error) {
      console.log('SAM 2 failed:', sam2Error);

      // Return signal to use local detection on API error
      return NextResponse.json({
        success: false,
        useLocalDetection: true,
        message: 'SAM 2 API failed, using local detection'
      });
    }
  } catch (error) {
    console.error('Floor segmentation error:', error);
    // Return signal to use local detection on any error
    return NextResponse.json({
      success: false,
      useLocalDetection: true,
      message: String(error)
    });
  }
}
