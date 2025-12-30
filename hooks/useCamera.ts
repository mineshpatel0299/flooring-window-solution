'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseCameraResult {
  startCamera: (facingMode?: 'user' | 'environment') => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => Promise<Blob | null>;
  switchCamera: () => void;
  stream: MediaStream | null;
  isActive: boolean;
  error: Error | null;
  facingMode: 'user' | 'environment';
  hasMultipleCameras: boolean;
}

export function useCamera(): UseCameraResult {
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Check for multiple cameras on mount
  useEffect(() => {
    const checkCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((device) => device.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      } catch (err) {
        console.error('Error checking cameras:', err);
      }
    };

    checkCameras();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = useCallback(
    async (mode: 'user' | 'environment' = facingMode) => {
      setError(null);

      try {
        // Stop existing stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        // Request camera access
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: mode,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        streamRef.current = mediaStream;
        setStream(mediaStream);
        setIsActive(true);
        setFacingMode(mode);
      } catch (err) {
        const error =
          err instanceof Error
            ? err
            : new Error('Failed to access camera');
        setError(error);
        setIsActive(false);
        throw error;
      }
    },
    [facingMode]
  );

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
      setIsActive(false);
    }
  }, []);

  const capturePhoto = useCallback(async (): Promise<Blob | null> => {
    if (!streamRef.current) {
      throw new Error('Camera not started');
    }

    try {
      // Get video track
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error('No video track found');
      }

      // Use ImageCapture API if available
      if ('ImageCapture' in window) {
        const imageCapture = new (window as any).ImageCapture(videoTrack);
        const blob = await imageCapture.takePhoto();
        return blob;
      }

      // Fallback: use canvas to capture frame
      const video = document.createElement('video');
      video.srcObject = streamRef.current;
      video.muted = true;
      await video.play();

      // Wait for video to be ready
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.92);
      });

      video.pause();
      video.srcObject = null;

      return blob;
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to capture photo');
      setError(error);
      throw error;
    }
  }, []);

  const switchCamera = useCallback(() => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    if (isActive) {
      startCamera(newMode);
    }
  }, [facingMode, isActive, startCamera]);

  return {
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
    stream,
    isActive,
    error,
    facingMode,
    hasMultipleCameras,
  };
}
