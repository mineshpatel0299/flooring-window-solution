'use client';

import { useRef, useState, useCallback } from 'react';
import { applyTextureOverlay } from '@/lib/canvas/overlay';
import { exportCanvasAsBlob, downloadCanvas, createThumbnail } from '@/lib/canvas/export';
import { DEFAULT_CANVAS_SETTINGS } from '@/lib/constants';
import type { SegmentationData, CanvasSettings, Texture } from '@/types';

interface UseCanvasResult {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  settings: CanvasSettings;
  updateSettings: (updates: Partial<CanvasSettings>) => void;
  applyTexture: (
    originalImage: HTMLImageElement,
    textureImage: HTMLImageElement,
    segmentationData: SegmentationData
  ) => Promise<void>;
  exportImage: (format?: 'jpeg' | 'png') => Promise<Blob>;
  downloadImage: (filename: string, format?: 'jpeg' | 'png') => Promise<void>;
  createThumb: () => Promise<Blob>;
  reset: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isProcessing: boolean;
  zoom: number;
  setZoom: (zoom: number) => void;
  pan: { x: number; y: number };
  setPan: (pan: { x: number; y: number }) => void;
}

export function useCanvas(): UseCanvasResult {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [settings, setSettings] = useState<CanvasSettings>(DEFAULT_CANVAS_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // History for undo/redo
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const updateSettings = useCallback((updates: Partial<CanvasSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  const saveToHistory = useCallback(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d')!;
    const imageData = ctx.getImageData(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(imageData);
      // Limit history to 20 items
      if (newHistory.length > 20) {
        newHistory.shift();
      }
      return newHistory;
    });

    setHistoryIndex((prev) => Math.min(prev + 1, 19));
  }, [historyIndex]);

  const applyTexture = useCallback(
    async (
      originalImage: HTMLImageElement,
      textureImage: HTMLImageElement,
      segmentationData: SegmentationData
    ) => {
      if (!canvasRef.current) {
        throw new Error('Canvas not initialized');
      }

      setIsProcessing(true);

      try {
        const resultCanvas = await applyTextureOverlay(
          originalImage,
          textureImage,
          segmentationData,
          settings
        );

        const ctx = canvasRef.current.getContext('2d')!;
        canvasRef.current.width = resultCanvas.width;
        canvasRef.current.height = resultCanvas.height;

        ctx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
        ctx.drawImage(resultCanvas, 0, 0);

        saveToHistory();
      } catch (error) {
        console.error('Error applying texture:', error);
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [settings, saveToHistory]
  );

  const exportImage = useCallback(
    async (format: 'jpeg' | 'png' = 'jpeg'): Promise<Blob> => {
      if (!canvasRef.current) {
        throw new Error('Canvas not initialized');
      }

      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      return exportCanvasAsBlob(canvasRef.current, mimeType);
    },
    []
  );

  const downloadImage = useCallback(
    async (filename: string, format: 'jpeg' | 'png' = 'jpeg') => {
      if (!canvasRef.current) {
        throw new Error('Canvas not initialized');
      }

      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      await downloadCanvas(canvasRef.current, filename, mimeType);
    },
    []
  );

  const createThumb = useCallback(async (): Promise<Blob> => {
    if (!canvasRef.current) {
      throw new Error('Canvas not initialized');
    }

    return createThumbnail(canvasRef.current);
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULT_CANVAS_SETTINGS);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevImageData = history[historyIndex - 1];
      if (canvasRef.current && prevImageData) {
        const ctx = canvasRef.current.getContext('2d')!;
        ctx.putImageData(prevImageData, 0, 0);
        setHistoryIndex((prev) => prev - 1);
      }
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextImageData = history[historyIndex + 1];
      if (canvasRef.current && nextImageData) {
        const ctx = canvasRef.current.getContext('2d')!;
        ctx.putImageData(nextImageData, 0, 0);
        setHistoryIndex((prev) => prev + 1);
      }
    }
  }, [history, historyIndex]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    canvasRef,
    settings,
    updateSettings,
    applyTexture,
    exportImage,
    downloadImage,
    createThumb,
    reset,
    undo,
    redo,
    canUndo,
    canRedo,
    isProcessing,
    zoom,
    setZoom,
    pan,
    setPan,
  };
}
