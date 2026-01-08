'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { applyTextureOverlay, drawMaskOverlay, drawPerspectiveHandles } from '@/lib/canvas/overlay';
import { downloadCanvas } from '@/lib/canvas/export';
import { DEFAULT_CANVAS_SETTINGS } from '@/lib/constants';
import type { SegmentationData, CanvasSettings, Texture } from '@/types';

interface CanvasEditorProps {
  originalImageUrl: string;
  segmentationMask?: SegmentationData;
  selectedTexture?: Texture | null;
  settings?: CanvasSettings;
  onSettingsChange?: (settings: CanvasSettings) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export function CanvasEditor({
  originalImageUrl,
  segmentationMask,
  selectedTexture,
  settings: propSettings,
  onSettingsChange,
  onCanvasReady,
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const textureImageRef = useRef<HTMLImageElement | null>(null);

  const [settings, setSettings] = useState<CanvasSettings>(() => ({
    ...DEFAULT_CANVAS_SETTINGS,
    ...propSettings,
  }));

  const [isRendering, setIsRendering] = useState(false);
  const [showMask, setShowMask] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Sync settings from props
  useEffect(() => {
    if (propSettings) {
      setSettings((prev) => ({
        ...prev,
        ...propSettings,
      }));
    }
  }, [propSettings]);

  // Load original image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      originalImageRef.current = img;
      renderCanvas();
    };
    img.src = originalImageUrl;
  }, [originalImageUrl]);

  // Load texture image
  useEffect(() => {
    if (!selectedTexture) {
      textureImageRef.current = null;
      renderCanvas();
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      textureImageRef.current = img;
      renderCanvas();
    };
    img.src = selectedTexture.image_url;
  }, [selectedTexture]);

  // Re-render when settings change
  useEffect(() => {
    renderCanvas();
  }, [settings, showMask, segmentationMask]);

  // Render the canvas
  const renderCanvas = useCallback(async () => {
    if (!canvasRef.current || !originalImageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const originalImg = originalImageRef.current;

    // Set canvas size
    canvas.width = originalImg.width;
    canvas.height = originalImg.height;

    setIsRendering(true);

    try {
      if (selectedTexture && textureImageRef.current && segmentationMask) {
        // Apply texture overlay
        const resultCanvas = await applyTextureOverlay(
          originalImg,
          textureImageRef.current,
          segmentationMask,
          settings
        );

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(resultCanvas, 0, 0);

        // Optionally show mask overlay
        if (showMask) {
          drawMaskOverlay(ctx, segmentationMask.mask);
        }

        // Draw perspective handles if available
        if (segmentationMask.perspective) {
          drawPerspectiveHandles(ctx, segmentationMask.perspective);
        }
      } else {
        // Just show original image
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalImg, 0, 0);

        // Show mask if available and enabled
        if (showMask && segmentationMask) {
          drawMaskOverlay(ctx, segmentationMask.mask);
        }
      }
    } catch (error) {
      console.error('Error rendering canvas:', error);
      // Fallback to original image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(originalImg, 0, 0);
    } finally {
      setIsRendering(false);
    }
  }, [selectedTexture, segmentationMask, settings, showMask]);

  // Handle zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.1, Math.min(5, prev * delta)));
  }, []);

  // Handle pan start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      // Left click
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  // Handle pan move
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPan({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart]
  );

  // Handle pan end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  }, [pan]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        const touch = e.touches[0];
        setPan({
          x: touch.clientX - dragStart.x,
          y: touch.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Export functions
  const handleExport = async (format: 'jpeg' | 'png' = 'jpeg') => {
    if (!canvasRef.current) return;

    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const extension = format === 'jpeg' ? 'jpg' : 'png';
    const filename = `floor-visualizer-${Date.now()}.${extension}`;

    await downloadCanvas(canvasRef.current, filename, mimeType);
  };

  // Update settings
  const updateSettings = useCallback((updates: Partial<CanvasSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    if (onSettingsChange) {
      // Use setTimeout to avoid updating parent during render
      setTimeout(() => {
        onSettingsChange(newSettings);
      }, 0);
    }
  }, [settings, onSettingsChange]);

  // Notify when canvas is ready
  useEffect(() => {
    if (canvasRef.current && onCanvasReady) {
      onCanvasReady(canvasRef.current);
    }
  }, [onCanvasReady]);

  return (
    <div className="flex flex-col h-full border border-border rounded-lg overflow-hidden bg-card">
      {/* Controls */}
      <div className="p-3 sm:p-4 bg-card border-b border-border space-y-3 sm:space-y-4">
        {/* Opacity Control */}
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-medium">
            Opacity: {Math.round(settings.opacity * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.opacity * 100}
            onChange={(e) =>
              updateSettings({ opacity: parseInt(e.target.value) / 100 })
            }
            className="w-full"
          />
        </div>

        {/* Blend Mode */}
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-medium">Blend Mode</label>
          <select
            value={settings.blendMode}
            onChange={(e) =>
              updateSettings({ blendMode: e.target.value as any })
            }
            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md"
          >
            <option value="multiply">Multiply (Recommended)</option>
            <option value="overlay">Overlay</option>
            <option value="normal">Normal</option>
          </select>
        </div>

        {/* View Options */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowMask(!showMask)}
            className={`flex-1 min-w-30 px-3 py-2 text-xs sm:text-sm rounded-md transition-colors ${
              showMask
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {showMask ? 'Hide' : 'Show'} Mask
          </button>

          <button
            onClick={() => setZoom(1)}
            className="flex-1 min-w-30 px-3 py-2 text-xs sm:text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
          >
            Reset Zoom
          </button>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => handleExport('jpeg')}
            className="flex-1 px-4 py-2.5 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 font-medium"
            disabled={isRendering}
          >
            Export JPEG
          </button>
          <button
            onClick={() => handleExport('png')}
            className="flex-1 px-4 py-2.5 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 font-medium"
            disabled={isRendering}
          >
            Export PNG
          </button>
        </div>

        {isRendering && (
          <div className="text-xs sm:text-sm text-muted-foreground">Rendering...</div>
        )}
      </div>

      {/* Canvas Container */}
      <div
        className="flex-1 overflow-hidden bg-muted relative min-h-75 sm:min-h-100 lg:min-h-125 touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="absolute inset-0 flex items-center justify-center p-2 sm:p-4"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        >
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full shadow-lg"
            style={{
              imageRendering: 'high-quality',
            }}
          />
        </div>

        {/* Zoom indicator */}
        <div className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 px-2 sm:px-3 py-1 sm:py-1.5 bg-black/50 text-white text-xs sm:text-sm rounded-md">
          {Math.round(zoom * 100)}%
        </div>
      </div>
    </div>
  );
}
