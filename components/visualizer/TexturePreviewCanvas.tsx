'use client';

import { useRef, useEffect, useState } from 'react';
import { applyTextureOverlay } from '@/lib/canvas/overlay';
import type { SegmentationData, Texture } from '@/types';

interface TexturePreviewCanvasProps {
  originalImageUrl: string;
  segmentationData: SegmentationData;
  texture: Texture | null;
  opacity?: number;
  blendMode?: 'multiply' | 'overlay' | 'normal';
}

export function TexturePreviewCanvas({
  originalImageUrl,
  segmentationData,
  texture,
  opacity = 0.8,
  blendMode = 'multiply',
}: TexturePreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const textureImageRef = useRef<HTMLImageElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load original image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      originalImageRef.current = img;
      renderCanvas();
    };
    img.onerror = () => setError('Failed to load original image');
    img.src = originalImageUrl;
  }, [originalImageUrl]);

  // Load texture image
  useEffect(() => {
    if (!texture) {
      textureImageRef.current = null;
      renderCanvas();
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      textureImageRef.current = img;
      setError(null);
      renderCanvas();
    };
    img.onerror = () => setError('Failed to load texture');
    img.src = texture.image_url;
  }, [texture]);

  // Re-render when settings change
  useEffect(() => {
    renderCanvas();
  }, [opacity, blendMode]);

  // Render the canvas
  const renderCanvas = async () => {
    if (!canvasRef.current || !originalImageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const originalImg = originalImageRef.current;

    // Set canvas size to match container while maintaining aspect ratio
    const containerWidth = canvas.parentElement?.clientWidth || 800;
    const aspectRatio = originalImg.height / originalImg.width;
    const canvasWidth = Math.min(containerWidth, originalImg.width);
    const canvasHeight = canvasWidth * aspectRatio;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    setIsRendering(true);

    try {
      if (texture && textureImageRef.current && segmentationData) {
        // Apply texture overlay
        const resultCanvas = await applyTextureOverlay(
          originalImg,
          textureImageRef.current,
          segmentationData,
          {
            opacity,
            blendMode,
            zoom: 1,
            pan: { x: 0, y: 0 },
          }
        );

        // Scale down to canvas size if needed
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(resultCanvas, 0, 0, canvas.width, canvas.height);
      } else {
        // Just show original image (scaled)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalImg, 0, 0, canvas.width, canvas.height);
      }
    } catch (err) {
      console.error('Error rendering preview:', err);
      setError('Failed to render preview');
      // Fallback to original image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalImg, 0, 0, canvas.width, canvas.height);
    } finally {
      setIsRendering(false);
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-muted rounded-lg overflow-hidden">
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
          <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute top-2 sm:top-4 left-2 sm:left-4 right-2 sm:right-4 bg-destructive/10 border border-destructive text-destructive px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm">
          {error}
        </div>
      )}

      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full object-contain"
        style={{
          imageRendering: 'high-quality',
        }}
      />

      {!texture && !isRendering && (
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <p className="text-muted-foreground text-xs sm:text-sm text-center">
            Select a texture to preview
          </p>
        </div>
      )}
    </div>
  );
}
