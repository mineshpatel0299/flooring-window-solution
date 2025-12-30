/**
 * Export canvas as blob with specified format and quality
 */
export async function exportCanvasAsBlob(
  canvas: HTMLCanvasElement,
  format: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
  quality: number = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to export canvas'));
        }
      },
      format,
      quality
    );
  });
}

/**
 * Export canvas as data URL
 */
export function exportCanvasAsDataURL(
  canvas: HTMLCanvasElement,
  format: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
  quality: number = 0.92
): string {
  return canvas.toDataURL(format, quality);
}

/**
 * Download canvas as image file
 */
export async function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  format: 'image/jpeg' | 'image/png' | 'image/webp' = 'image/jpeg',
  quality: number = 0.92
): Promise<void> {
  const blob = await exportCanvasAsBlob(canvas, format, quality);
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Create thumbnail from canvas
 */
export async function createThumbnail(
  canvas: HTMLCanvasElement,
  maxSize: number = 300
): Promise<Blob> {
  const thumbnailCanvas = document.createElement('canvas');
  const ctx = thumbnailCanvas.getContext('2d')!;

  const scale = Math.min(1, maxSize / Math.max(canvas.width, canvas.height));

  thumbnailCanvas.width = Math.round(canvas.width * scale);
  thumbnailCanvas.height = Math.round(canvas.height * scale);

  ctx.drawImage(canvas, 0, 0, thumbnailCanvas.width, thumbnailCanvas.height);

  return exportCanvasAsBlob(thumbnailCanvas, 'image/jpeg', 0.8);
}

/**
 * Copy canvas to clipboard
 */
export async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<void> {
  if (!navigator.clipboard || !window.ClipboardItem) {
    throw new Error('Clipboard API not supported');
  }

  const blob = await exportCanvasAsBlob(canvas, 'image/png');
  const item = new ClipboardItem({ 'image/png': blob });

  await navigator.clipboard.write([item]);
}

/**
 * Get canvas dimensions info
 */
export function getCanvasInfo(canvas: HTMLCanvasElement): {
  width: number;
  height: number;
  aspectRatio: number;
  megapixels: number;
  estimatedFileSize: string;
} {
  const width = canvas.width;
  const height = canvas.height;
  const aspectRatio = width / height;
  const megapixels = (width * height) / 1000000;

  // Rough estimate: JPEG is about 0.5-1 byte per pixel
  const estimatedBytes = (width * height * 0.7);
  const estimatedFileSize =
    estimatedBytes > 1024 * 1024
      ? `${(estimatedBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(estimatedBytes / 1024).toFixed(2)} KB`;

  return {
    width,
    height,
    aspectRatio,
    megapixels: parseFloat(megapixels.toFixed(2)),
    estimatedFileSize,
  };
}
