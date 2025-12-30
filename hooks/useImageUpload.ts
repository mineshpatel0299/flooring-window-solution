'use client';

import { useState, useCallback } from 'react';
import { resizeImage, compressImage, fixImageOrientation } from '@/lib/utils/image-processing';
import { API_ENDPOINTS, STORAGE_BUCKETS } from '@/lib/constants';

interface UseImageUploadResult {
  upload: (file: File | Blob, bucket?: string) => Promise<UploadResult>;
  isUploading: boolean;
  progress: number;
  error: Error | null;
  uploadedUrl: string | null;
}

interface UploadResult {
  url: string;
  path: string;
  bucket: string;
}

export function useImageUpload(): UseImageUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File | Blob, bucket: string = STORAGE_BUCKETS.USER_UPLOADS): Promise<UploadResult> => {
      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        // Step 1: Preprocess image
        setProgress(20);
        let processedFile = file;

        // Resize if needed
        processedFile = await resizeImage(processedFile);
        setProgress(40);

        // Compress
        processedFile = await compressImage(processedFile, 0.85);
        setProgress(60);

        // Fix orientation
        if (file instanceof File) {
          processedFile = await fixImageOrientation(processedFile);
        }
        setProgress(70);

        // Step 2: Upload to server
        const formData = new FormData();
        formData.append('file', processedFile);
        formData.append('bucket', bucket);

        const response = await fetch(API_ENDPOINTS.UPLOAD, {
          method: 'POST',
          body: formData,
        });

        setProgress(90);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Upload failed');
        }

        setProgress(100);
        setUploadedUrl(data.data.url);
        setIsUploading(false);

        return {
          url: data.data.url,
          path: data.data.path,
          bucket: data.data.bucket,
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Upload failed');
        setError(error);
        setIsUploading(false);
        setProgress(0);
        throw error;
      }
    },
    []
  );

  return {
    upload,
    isUploading,
    progress,
    error,
    uploadedUrl,
  };
}
