'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { validateImageFile, formatFileSize, createPreviewURL, revokePreviewURL } from '@/lib/utils/image-processing';
import type { VisualizationType } from '@/types';

interface ImageUploaderProps {
  onImageSelected: (file: File | Blob) => void;
  maxSize?: number;
  acceptedFormats?: string[];
  mode: VisualizationType;
  currentImage?: string | null;
  onClear?: () => void;
}

export function ImageUploader({
  onImageSelected,
  maxSize,
  acceptedFormats,
  mode,
  currentImage,
  onClear,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      // Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        return;
      }

      // Create preview
      const previewUrl = createPreviewURL(file);
      if (preview && preview !== currentImage) {
        revokePreviewURL(preview);
      }
      setPreview(previewUrl);

      // Notify parent
      onImageSelected(file);
    },
    [onImageSelected, preview, currentImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleClear = useCallback(() => {
    if (preview && preview !== currentImage) {
      revokePreviewURL(preview);
    }
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClear?.();
  }, [preview, currentImage, onClear]);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="w-full">
      {!preview ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={openFilePicker}
          className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileInput}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Upload className="w-8 h-8 text-primary" />
            </div>

            <div className="space-y-2">
              <p className="text-lg font-medium">
                Drop your {mode} image here
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse files
              </p>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>Supported formats: JPG, PNG, WebP</p>
              {maxSize && (
                <p>Maximum size: {formatFileSize(maxSize)}</p>
              )}
            </div>
          </div>

          {isDragging && (
            <div className="absolute inset-0 bg-primary/10 rounded-lg flex items-center justify-center">
              <p className="text-lg font-medium text-primary">
                Drop image here
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="relative group">
          <div className="relative rounded-lg overflow-hidden border border-border">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-auto max-h-96 object-contain bg-muted"
            />

            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={openFilePicker}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Change Image
              </button>
              <button
                onClick={handleClear}
                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
          {error}
        </div>
      )}
    </div>
  );
}
