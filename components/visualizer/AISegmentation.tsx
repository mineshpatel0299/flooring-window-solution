'use client';

import { useState, useEffect } from 'react';
import { detectFloor, detectFloorBoundaries } from '@/lib/tensorflow/floor-detector';
import { detectWindow, detectWindowBoundaries } from '@/lib/tensorflow/window-detector';
import type { SegmentationData, VisualizationType } from '@/types';

interface AISegmentationProps {
  image: HTMLImageElement;
  mode: VisualizationType;
  onSegmentationComplete: (data: SegmentationData, confidence: number) => void;
  onError: (error: Error) => void;
  autoRun?: boolean;
}

export function AISegmentation({
  image,
  mode,
  onSegmentationComplete,
  onError,
  autoRun = true,
}: AISegmentationProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (autoRun && image) {
      runSegmentation();
    }
  }, [image, mode, autoRun]);

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

      if (mode === 'floor') {
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
      onSegmentationComplete(segmentationData, segmentationData.confidence);

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
