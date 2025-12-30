import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateSession } from '@/lib/session/anonymous-session';
import { STORAGE_BUCKETS, MAX_UPLOAD_SIZE, ACCEPTED_IMAGE_FORMATS } from '@/lib/constants';

/**
 * POST /api/upload
 * Upload a file to Supabase storage
 * Body: multipart/form-data with file and bucket name
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bucket = formData.get('bucket') as string;

    // Validation
    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'No file provided',
        },
        { status: 400 }
      );
    }

    if (!bucket) {
      return NextResponse.json(
        {
          success: false,
          error: 'No bucket specified',
        },
        { status: 400 }
      );
    }

    // Validate bucket name
    const validBuckets = Object.values(STORAGE_BUCKETS);
    if (!validBuckets.includes(bucket)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid bucket. Must be one of: ${validBuckets.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large. Maximum size is ${MAX_UPLOAD_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ACCEPTED_IMAGE_FORMATS.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type. Accepted formats: ${ACCEPTED_IMAGE_FORMATS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Get session for user-specific uploads
    const session = await getOrCreateSession();

    // Generate unique file name
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileExt = file.name.split('.').pop();
    const fileName = `${session.sessionId}/${timestamp}-${randomStr}.${fileExt}`;

    // Upload to Supabase storage
    const supabase = await createClient();
    const fileBuffer = await file.arrayBuffer();
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Error uploading file:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to upload file',
        },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      data: {
        url: publicUrlData.publicUrl,
        path: data.path,
        bucket,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/upload:', error);
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
 * DELETE /api/upload
 * Delete a file from Supabase storage
 * Body: { bucket, path }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { bucket, path } = body;

    // Validation
    if (!bucket || !path) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: bucket, path',
        },
        { status: 400 }
      );
    }

    // Validate bucket name
    const validBuckets = Object.values(STORAGE_BUCKETS);
    if (!validBuckets.includes(bucket)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid bucket. Must be one of: ${validBuckets.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { error } = await supabase.storage.from(bucket).remove([path]);

    if (error) {
      console.error('Error deleting file:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to delete file',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/upload:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
