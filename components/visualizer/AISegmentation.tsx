'use client';

import { useState, useEffect } from 'react';
import { detectFloor, detectFloorBoundaries } from '@/lib/tensorflow/floor-detector';
import { detectWindow, detectWindowBoundaries } from '@/lib/tensorflow/window-detector';
import type { SegmentationData, VisualizationType } from '@/types';

interface AISegmentationProps {
  imageUrl: string;
  type: VisualizationType;
  onComplete: (data: SegmentationData) => void;
  onError: (error: Error) => void;
  autoRun?: boolean;
}

export function AISegmentation({
  imageUrl,
  type,
  onComplete,
  onError,
  autoRun = true,
}: AISegmentationProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // Load image from URL
  useEffect(() => {
    if (imageUrl) {
      console.log('Loading image from URL:', imageUrl);
      const img = new Image();
      // IMPORTANT: crossOrigin is required for canvas/WebGL operations with TensorFlow.js
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        console.log('Image loaded successfully');
        setImage(img);
      };
      img.onerror = (e) => {
        console.error('Failed to load image from URL:', imageUrl, e);
        onError(new Error(`Failed to load image from: ${imageUrl}`));
      };
      img.src = imageUrl;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  useEffect(() => {
    if (autoRun && image) {
      runSegmentation();
    }
  }, [image, type, autoRun]);

  const runSegmentation = async () => {
    if (!image) {
      onError(new Error('No image provided'));
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setStatus('Loading AI model...');

    try {
      // Step 1: Load model
      setProgress(20);

      // Step 2: Run segmentation
      setStatus('Analyzing image...');
      setProgress(40);

      let segmentationData: SegmentationData;

      if (type === 'floor') {
        segmentationData = await detectFloor(image);

        // Detect floor boundaries for perspective
        setStatus('Detecting perspective...');
        setProgress(70);

        const boundaries = detectFloorBoundaries(segmentationData.mask);
        if (boundaries) {
          segmentationData.perspective = {
            topLeft: boundaries.topLeft,
            topRight: boundaries.topRight,
            bottomLeft: boundaries.bottomLeft,
            bottomRight: boundaries.bottomRight,
          };
        }
      } else {
        segmentationData = await detectWindow(image);

        // Detect window boundaries
        setStatus('Detecting window area...');
        setProgress(70);

        const boundaries = detectWindowBoundaries(segmentationData.mask);
        if (boundaries) {
          segmentationData.perspective = {
            topLeft: boundaries.topLeft,
            topRight: boundaries.topRight,
            bottomLeft: boundaries.bottomLeft,
            bottomRight: boundaries.bottomRight,
          };
        }
      }

      // Step 3: Complete
      setStatus('Processing complete');
      setProgress(100);

      // Call the callback with results
      onComplete(segmentationData);

      setIsProcessing(false);
    } catch (error) {
      console.error('Segmentation error:', error);
      setIsProcessing(false);
      onError(error as Error);
    }
  };

  return (
    <div className="w-full">
      {isProcessing && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{status}</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {!isProcessing && !autoRun && (
        <button
          onClick={runSegmentation}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
        >
          Run AI Detection
        </button>
      )}
    </div>
  );
}
