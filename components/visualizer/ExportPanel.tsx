'use client';

import { useState } from 'react';
import { Download, Image, FileImage, Copy, Check } from 'lucide-react';
import { exportAsJPEG, exportAsPNG, copyToClipboard } from '@/lib/canvas/export';

interface ExportPanelProps {
  canvas: HTMLCanvasElement | null;
  projectName?: string;
}

type ExportFormat = 'jpeg' | 'png';
type ExportQuality = 0.6 | 0.8 | 0.92 | 1.0;

export function ExportPanel({ canvas, projectName = 'visualization' }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('jpeg');
  const [quality, setQuality] = useState<ExportQuality>(0.92);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    if (!canvas) {
      alert('No visualization to export');
      return;
    }

    setIsExporting(true);

    try {
      const filename = `${projectName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;

      if (format === 'jpeg') {
        await exportAsJPEG(canvas, filename, quality);
      } else {
        await exportAsPNG(canvas, filename);
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export image');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!canvas) {
      alert('No visualization to copy');
      return;
    }

    try {
      const success = await copyToClipboard(canvas);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        alert('Failed to copy to clipboard');
      }
    } catch (err) {
      console.error('Copy failed:', err);
      alert('Failed to copy to clipboard');
    }
  };

  if (!canvas) {
    return (
      <div className="p-3 sm:p-4 bg-muted rounded-lg border border-border">
        <p className="text-xs sm:text-sm text-muted-foreground text-center">
          Complete the visualization to export
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 bg-card border border-border rounded-lg">
      <h3 className="text-sm sm:text-base font-semibold">Export Options</h3>

      {/* Format Selection */}
      <div>
        <label className="block text-xs sm:text-sm font-medium mb-2">Format</label>
        <div className="flex gap-2">
          <button
            onClick={() => setFormat('jpeg')}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm rounded-md transition-colors ${
              format === 'jpeg'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <Image className="w-4 h-4" />
            <span className="hidden sm:inline">JPEG</span>
            <span className="sm:hidden">JPG</span>
          </button>
          <button
            onClick={() => setFormat('png')}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm rounded-md transition-colors ${
              format === 'png'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            <FileImage className="w-4 h-4" />
            PNG
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          {format === 'jpeg'
            ? 'Smaller file size, good for sharing'
            : 'Higher quality, larger file size'}
        </p>
      </div>

      {/* Quality Selection (JPEG only) */}
      {format === 'jpeg' && (
        <div>
          <label className="block text-xs sm:text-sm font-medium mb-2">
            Quality: {Math.round(quality * 100)}%
          </label>
          <div className="space-y-2">
            <input
              type="range"
              min="0.6"
              max="1.0"
              step="0.1"
              value={quality}
              onChange={(e) => setQuality(parseFloat(e.target.value) as ExportQuality)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Smaller</span>
              <span>Better Quality</span>
            </div>
          </div>
        </div>
      )}

      {/* Export Buttons */}
      <div className="space-y-2 pt-2">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isExporting ? 'Exporting...' : `Download ${format.toUpperCase()}`}
        </button>

        <button
          onClick={handleCopyToClipboard}
          disabled={isExporting}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors disabled:opacity-50"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">Copy to Clipboard</span>
              <span className="sm:hidden">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Info */}
      <div className="pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground break-all">
          {canvas.width} × {canvas.height}px
        </p>
      </div>
    </div>
  );
}
