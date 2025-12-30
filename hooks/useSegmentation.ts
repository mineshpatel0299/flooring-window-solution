'use client';

import { useState, useCallback } from 'react';
import { detectFloor } from '@/lib/tensorflow/floor-detector';
import { detectWindow } from '@/lib/tensorflow/window-detector';
import type { SegmentationData, VisualizationType } from '@/types';

interface UseSegmentationResult {
  segment: (image: HTMLImageElement) => Promise<SegmentationData>;
  isLoading: boolean;
  error: Error | null;
  confidence: number | null;
  progress: number;
  status: string;
}

export function useSegmentation(mode: VisualizationType): UseSegmentationResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const segment = useCallback(
    async (image: HTMLImageElement): Promise<SegmentationData> => {
      setIsLoading(true);
      setError(null);
      setProgress(0);
      setStatus('Initializing...');

      try {
        setProgress(20);
        setStatus('Loading AI model...');

        setProgress(40);
        setStatus('Analyzing image...');

        // Run appropriate detection based on mode
        let result: SegmentationData;
        if (mode === 'floor') {
          result = await detectFloor(image);
        } else {
          result = await detectWindow(image);
        }

        setProgress(90);
        setStatus('Finalizing...');

        setConfidence(result.confidence);
        setProgress(100);
        setStatus('Complete');
        setIsLoading(false);

        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        setIsLoading(false);
        setStatus('Error');
        throw error;
      }
    },
    [mode]
  );

  return {
    segment,
    isLoading,
    error,
    confidence,
    progress,
    status,
  };
}
