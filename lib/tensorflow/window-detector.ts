import { segmentImage, scaleMask } from './segmentation';
import type { SegmentationData } from '@/types';

/**
 * Detect window area in an image
 * Uses body segmentation combined with edge detection
 */
export async function detectWindow(
  image: HTMLImageElement
): Promise<SegmentationData> {
  try {
    console.log('Detecting window area...');

    // Segment the image (invert mask to get background/window)
    const segmentationData = await segmentImage(image, true);

    // Additional window-specific processing
    // Focus on rectangular areas that might be windows
    const enhancedMask = enhanceWindowDetection(
      segmentationData.mask,
      segmentationData.width,
      segmentationData.height
    );

    // Scale mask to original image dimensions
    const scaledMask = scaleMask(enhancedMask, image.width, image.height);

    return {
      ...segmentationData,
      mask: scaledMask,
      width: image.width,
      height: image.height,
    };
  } catch (error) {
    console.error('Error detecting window:', error);
    throw error;
  }
}

/**
 * Enhance window detection by looking for rectangular patterns
 */
function enhanceWindowDetection(
  mask: number[][],
  width: number,
  height: number
): number[][] {
  const enhanced: number[][] = [];

  // Windows are typically in the upper/middle portion of images
  const windowFocusStartY = Math.floor(height * 0.1);
  const windowFocusEndY = Math.floor(height * 0.7);

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      let value = mask[y][x];

      // Boost confidence for pixels in the window focus area
      if (y >= windowFocusStartY && y <= windowFocusEndY) {
        value = Math.min(value * 1.2, 1);
      } else {
        // Reduce confidence outside focus area
        value = value * 0.7;
      }

      row.push(value > 0.5 ? 1 : 0);
    }
    enhanced.push(row);
  }

  return enhanced;
}

/**
 * Detect rectangular window boundaries
 */
export function detectWindowBoundaries(mask: number[][]): {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
} | null {
  const height = mask.length;
  const width = mask[0].length;

  // Find bounding box of the mask
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y][x] === 1) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (minX === width || maxX === 0) {
    return null;
  }

  // Return corners of the bounding rectangle
  return {
    topLeft: { x: minX, y: minY },
    topRight: { x: maxX, y: minY },
    bottomLeft: { x: minX, y: maxY },
    bottomRight: { x: maxX, y: maxY },
  };
}

/**
 * Detect if the window has perspective distortion
 * Returns true if the window appears to be viewed at an angle
 */
export function hasPerspectiveDistortion(
  boundaries: {
    topLeft: { x: number; y: number };
    topRight: { x: number; y: number };
    bottomLeft: { x: number; y: number };
    bottomRight: { x: number; y: number };
  }
): boolean {
  const topWidth = boundaries.topRight.x - boundaries.topLeft.x;
  const bottomWidth = boundaries.bottomRight.x - boundaries.bottomLeft.x;
  const leftHeight = boundaries.bottomLeft.y - boundaries.topLeft.y;
  const rightHeight = boundaries.bottomRight.y - boundaries.topRight.y;

  // Check if sides are significantly different (indicating perspective)
  const widthDiff = Math.abs(topWidth - bottomWidth);
  const heightDiff = Math.abs(leftHeight - rightHeight);

  const widthRatio = widthDiff / Math.max(topWidth, bottomWidth);
  const heightRatio = heightDiff / Math.max(leftHeight, rightHeight);

  // If difference is more than 10%, it has perspective
  return widthRatio > 0.1 || heightRatio > 0.1;
}
