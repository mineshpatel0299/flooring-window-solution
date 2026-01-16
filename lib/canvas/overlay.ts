import {
  applyBlendMode,
  imageToImageData,
  createTiledTexture,
  preserveLighting,
  featherMask,
} from './blend-modes';
import { applyPerspectiveTransform } from './perspective';
import type { SegmentationData, CanvasSettings, Texture } from '@/types';

/**
 * Apply texture overlay to an image with segmentation mask
 */
export async function applyTextureOverlay(
  originalImage: HTMLImageElement,
  textureImage: HTMLImageElement,
  segmentationData: SegmentationData,
  settings: CanvasSettings
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  canvas.width = originalImage.width;
  canvas.height = originalImage.height;

  // Draw original image
  ctx.drawImage(originalImage, 0, 0);

  // Get original image data
  const originalData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Create tiled texture to match image dimensions
  const tiledTexture = createTiledTexture(
    textureImage,
    canvas.width,
    canvas.height
  );

  // Apply perspective if specified
  let transformedTexture = tiledTexture;
  if (settings.perspective && segmentationData.perspective) {
    // For now, use the tiled texture as-is
    // Full perspective transform would be implemented here
    transformedTexture = tiledTexture;
  }

  // Get texture image data
  let textureData = imageToImageData(transformedTexture);

  // For "replace" mode, use pure texture without lighting preservation
  // For other modes, preserve some lighting from the original image for realism
  if (settings.blendMode !== 'replace') {
    textureData = preserveLighting(textureData, originalData, 0.5);
  }

  // Feather the mask edges for smoother blending (skip for replace mode)
  const finalMask = settings.blendMode === 'replace'
    ? segmentationData.mask
    : featherMask(segmentationData.mask, 2);

  // Apply blend mode
  const blendedData = applyBlendMode(
    originalData,
    textureData,
    finalMask,
    settings.blendMode,
    settings.opacity
  );

  // Put blended data back on canvas
  ctx.putImageData(blendedData, 0, 0);

  return canvas;
}

/**
 * Create a preview of the texture overlay (lower resolution for performance)
 */
export async function createPreview(
  originalImage: HTMLImageElement,
  textureImage: HTMLImageElement,
  segmentationData: SegmentationData,
  settings: CanvasSettings,
  maxDimension: number = 800
): Promise<HTMLCanvasElement> {
  // Scale down for preview
  const scale =
    Math.max(originalImage.width, originalImage.height) > maxDimension
      ? maxDimension / Math.max(originalImage.width, originalImage.height)
      : 1;

  if (scale === 1) {
    return applyTextureOverlay(
      originalImage,
      textureImage,
      segmentationData,
      settings
    );
  }

  // Create scaled versions
  const scaledOriginal = scaleImage(originalImage, scale);
  const scaledTexture = scaleImage(textureImage, 0.5); // Texture can be lower res

  // Scale mask
  const scaledWidth = Math.round(originalImage.width * scale);
  const scaledHeight = Math.round(originalImage.height * scale);
  const scaledMask = scaleMask(
    segmentationData.mask,
    scaledWidth,
    scaledHeight
  );

  const scaledSegmentation = {
    ...segmentationData,
    mask: scaledMask,
    width: scaledWidth,
    height: scaledHeight,
  };

  return applyTextureOverlay(
    scaledOriginal,
    scaledTexture,
    scaledSegmentation,
    settings
  );
}

/**
 * Scale an image element
 */
function scaleImage(image: HTMLImageElement, scale: number): HTMLImageElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const scaledImage = new Image();
  scaledImage.src = canvas.toDataURL();

  return scaledImage;
}

/**
 * Scale a mask to new dimensions
 */
function scaleMask(
  mask: number[][],
  targetWidth: number,
  targetHeight: number
): number[][] {
  const srcHeight = mask.length;
  const srcWidth = mask[0].length;

  const scaleX = srcWidth / targetWidth;
  const scaleY = srcHeight / targetHeight;

  const scaledMask: number[][] = [];

  for (let y = 0; y < targetHeight; y++) {
    const row: number[] = [];
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.floor(x * scaleX);
      const srcY = Math.floor(y * scaleY);

      const value =
        mask[srcY] && mask[srcY][srcX] !== undefined ? mask[srcY][srcX] : 0;
      row.push(value);
    }
    scaledMask.push(row);
  }

  return scaledMask;
}

/**
 * Draw mask overlay on canvas for visualization
 */
export function drawMaskOverlay(
  ctx: CanvasRenderingContext2D,
  mask: number[][],
  color: string = 'rgba(59, 130, 246, 0.3)' // Blue with 30% opacity
): void {
  const canvas = ctx.canvas;
  const imageData = ctx.createImageData(canvas.width, canvas.height);

  // Parse color (simplified - assumes rgba format)
  const colorMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
  const r = colorMatch ? parseInt(colorMatch[1]) : 59;
  const g = colorMatch ? parseInt(colorMatch[2]) : 130;
  const b = colorMatch ? parseInt(colorMatch[3]) : 246;
  const a = colorMatch && colorMatch[4] ? parseFloat(colorMatch[4]) * 255 : 76;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4;
      const maskValue = mask[y] && mask[y][x] !== undefined ? mask[y][x] : 0;

      if (maskValue > 0) {
        imageData.data[index] = r;
        imageData.data[index + 1] = g;
        imageData.data[index + 2] = b;
        imageData.data[index + 3] = a * maskValue;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Draw perspective corners for adjustment
 */
export function drawPerspectiveHandles(
  ctx: CanvasRenderingContext2D,
  corners: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
  },
  handleSize: number = 10
): void {
  ctx.save();

  // Draw lines connecting corners
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(corners.topLeft.x, corners.topLeft.y);
  ctx.lineTo(corners.topRight.x, corners.topRight.y);
  ctx.lineTo(corners.bottomRight.x, corners.bottomRight.y);
  ctx.lineTo(corners.bottomLeft.x, corners.bottomLeft.y);
  ctx.closePath();
  ctx.stroke();

  // Draw corner handles
  ctx.fillStyle = '#3b82f6';
  const drawHandle = (x: number, y: number) => {
    ctx.beginPath();
    ctx.arc(x, y, handleSize, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  drawHandle(corners.topLeft.x, corners.topLeft.y);
  drawHandle(corners.topRight.x, corners.topRight.y);
  drawHandle(corners.bottomRight.x, corners.bottomRight.y);
  drawHandle(corners.bottomLeft.x, corners.bottomLeft.y);

  ctx.restore();
}
