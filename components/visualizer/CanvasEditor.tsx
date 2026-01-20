'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Download,
  Image as ImageIcon
} from 'lucide-react';
import { applyTextureOverlay, drawMaskOverlay } from '@/lib/canvas/overlay';
import { downloadCanvas } from '@/lib/canvas/export';
import { DEFAULT_CANVAS_SETTINGS } from '@/lib/constants';
import type { SegmentationData, CanvasSettings, Texture } from '@/types';

interface CanvasEditorProps {
  originalImageUrl: string;
  segmentationMask?: SegmentationData;
  selectedTexture?: Texture | null;
  availableTextures?: Texture[];
  onTextureChange?: (texture: Texture) => void;
  settings?: CanvasSettings;
  onSettingsChange?: (settings: CanvasSettings) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;
}

export function CanvasEditor({
  originalImageUrl,
  segmentationMask,
  selectedTexture,
  availableTextures = [],
  onTextureChange,
  settings: propSettings,
  onSettingsChange,
  onCanvasReady,
}: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const textureImageRef = useRef<HTMLImageElement | null>(null);

  const [settings, setSettings] = useState<CanvasSettings>(() => ({
    ...DEFAULT_CANVAS_SETTINGS,
    blendMode: 'replace', // Default to replace mode for complete floor coverage
    ...propSettings,
  }));

  const [isRendering, setIsRendering] = useState(false);
  const [showMask, setShowMask] = useState(false);
  const [zoom, setZoom] = useState(1);
  const textureScrollRef = useRef<HTMLDivElement>(null);

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

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(3, prev + 0.25));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(0.5, prev - 0.25));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  // Export functions
  const handleExport = async (format: 'jpeg' | 'png' = 'jpeg') => {
    if (!canvasRef.current) return;

    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const extension = format === 'jpeg' ? 'jpg' : 'png';
    const filename = `floor-visualizer-${Date.now()}.${extension}`;

    await downloadCanvas(canvasRef.current, filename, mimeType);
  };

  // Texture carousel scroll functions
  const scrollTextures = useCallback((direction: 'left' | 'right') => {
    if (textureScrollRef.current) {
      const scrollAmount = 200;
      textureScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  }, []);

  // Handle texture selection
  const handleTextureSelect = useCallback((texture: Texture) => {
    if (onTextureChange) {
      onTextureChange(texture);
    }
  }, [onTextureChange]);

  // Notify when canvas is ready
  useEffect(() => {
    if (canvasRef.current && onCanvasReady) {
      onCanvasReady(canvasRef.current);
    }
  }, [onCanvasReady]);

  return (
    <div className="flex flex-col bg-gradient-to-b from-card to-card/95 rounded-2xl overflow-hidden shadow-lg border border-border/50">
      {/* Canvas Preview Area */}
      <div
        ref={containerRef}
        className="relative bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 overflow-auto"
        style={{
          minHeight: '300px',
          maxHeight: '70vh',
        }}
      >
        {/* Canvas wrapper with proper centering */}
        <div
          className="flex items-center justify-center p-4 sm:p-6"
          style={{ minHeight: '300px' }}
        >
          <div
            className="relative transition-transform duration-200 ease-out"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center',
            }}
          >
            <canvas
              ref={canvasRef}
              className="max-w-full h-auto rounded-lg shadow-2xl ring-1 ring-black/10"
              style={{
                maxHeight: '60vh',
                width: 'auto',
              }}
            />
          </div>
        </div>

        {/* Loading Overlay */}
        {isRendering && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3 p-6 bg-card rounded-xl shadow-lg">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm font-medium text-muted-foreground">
                Applying texture...
              </span>
            </div>
          </div>
        )}

        {/* Floating Zoom Controls */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-black/70 backdrop-blur-md rounded-full shadow-lg">
          <button
            onClick={handleZoomOut}
            className="p-2 text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-colors"
            title="Zoom Out"
            disabled={zoom <= 0.5}
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={handleResetZoom}
            className="px-3 py-1.5 text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-colors text-sm font-medium min-w-[60px]"
            title="Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            onClick={handleZoomIn}
            className="p-2 text-white/90 hover:text-white hover:bg-white/20 rounded-full transition-colors"
            title="Zoom In"
            disabled={zoom >= 3}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle Mask Button - Floating */}
        <button
          onClick={() => setShowMask(!showMask)}
          className={`absolute top-4 right-4 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg backdrop-blur-md transition-all ${showMask
              ? 'bg-primary text-primary-foreground'
              : 'bg-black/70 text-white/90 hover:text-white hover:bg-black/80'
            }`}
          title={showMask ? 'Hide Detection Mask' : 'Show Detection Mask'}
        >
          {showMask ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          <span className="text-xs font-medium hidden sm:inline">
            {showMask ? 'Hide Mask' : 'Show Mask'}
          </span>
        </button>
      </div>

      {/* Texture Carousel Section */}
      {availableTextures.length > 0 && (
        <div className="px-4 py-4 border-t border-border/50 bg-card/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Quick Texture Switch
              </span>
            </div>
            {selectedTexture && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {selectedTexture.name}
              </span>
            )}
          </div>

          <div className="relative">
            {/* Left scroll button */}
            <button
              onClick={() => scrollTextures('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-card/95 border border-border rounded-full shadow-md hover:bg-muted transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Texture thumbnails */}
            <div
              ref={textureScrollRef}
              className="flex gap-2 overflow-x-auto scrollbar-hide px-8 py-1"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {availableTextures.map((texture) => (
                <button
                  key={texture.id}
                  onClick={() => handleTextureSelect(texture)}
                  className={`group relative shrink-0 w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden transition-all duration-200 ${selectedTexture?.id === texture.id
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-105'
                      : 'ring-1 ring-border hover:ring-primary/50 hover:scale-105'
                    }`}
                  title={texture.name}
                >
                  <img
                    src={texture.thumbnail_url || texture.image_url}
                    alt={texture.name}
                    className="w-full h-full object-cover"
                  />
                  {selectedTexture?.id === texture.id && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="w-3 h-3 bg-primary rounded-full shadow-lg" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>

            {/* Right scroll button */}
            <button
              onClick={() => scrollTextures('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-card/95 border border-border rounded-full shadow-md hover:bg-muted transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Export Actions */}
      <div className="px-4 py-4 border-t border-border/50 bg-gradient-to-b from-card/50 to-muted/30">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleExport('jpeg')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors font-medium shadow-sm"
            disabled={isRendering}
          >
            <Download className="w-4 h-4" />
            <span>Export JPEG</span>
          </button>
          <button
            onClick={() => handleExport('png')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors font-medium"
            disabled={isRendering}
          >
            <Download className="w-4 h-4" />
            <span>Export PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
