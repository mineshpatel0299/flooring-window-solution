'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, RefreshCw, CircleDot } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Start camera
  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Check for multiple cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((device) => device.kind === 'videoinput');
      setHasMultipleCameras(videoDevices.length > 1);

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Camera error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to access camera. Please ensure camera permissions are granted.'
      );
      setIsLoading(false);
    }
  }, [facingMode]);

  // Initialize camera on mount
  useEffect(() => {
    startCamera();

    // Cleanup on unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // Switch camera
  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    // Convert to blob
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob);
          handleClose();
        }
      },
      'image/jpeg',
      0.92
    );
  }, [onCapture]);

  // Handle close
  const handleClose = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    onClose();
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-lg font-medium flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Camera Capture
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Video Preview */}
      <div className="relative w-full h-full flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-white text-center space-y-4">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
              <p>Starting camera...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="text-white text-center space-y-4 max-w-md px-4">
              <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
                <X className="w-8 h-8 text-destructive" />
              </div>
              <p className="text-lg font-medium">Camera Error</p>
              <p className="text-sm text-white/70">{error}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
        />

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Controls */}
      {!isLoading && !error && (
        <div className="absolute bottom-0 left-0 right-0 z-10 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-center gap-8">
            {/* Switch Camera Button */}
            {hasMultipleCameras && (
              <button
                onClick={switchCamera}
                className="p-4 text-white hover:bg-white/10 rounded-full transition-colors"
                title="Switch Camera"
              >
                <RefreshCw className="w-6 h-6" />
              </button>
            )}

            {/* Capture Button */}
            <button
              onClick={capturePhoto}
              className="relative p-4 bg-white rounded-full hover:bg-white/90 transition-all transform hover:scale-105"
              title="Capture Photo"
            >
              <CircleDot className="w-12 h-12 text-primary" />
            </button>

            {/* Spacer */}
            {hasMultipleCameras && <div className="w-14" />}
          </div>

          <p className="text-center text-white/70 text-sm mt-4">
            Position your {facingMode === 'user' ? 'device' : 'floor or window'} and tap to capture
          </p>
        </div>
      )}
    </div>
  );
}
