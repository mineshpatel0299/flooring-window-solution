import { segmentImage, scaleMask } from './segmentation';
import type { SegmentationData } from '@/types';

/**
 * Detect floor area in an image
 * Uses body segmentation to identify the background (floor)
 */
export async function detectFloor(
  image: HTMLImageElement
): Promise<SegmentationData> {
  try {
    console.log('Detecting floor area...');

    // Segment the image (invert mask to get background/floor)
    const segmentationData = await segmentImage(image, true);

    // Additional floor-specific processing
    // Focus on the bottom portion of the image where floors typically are
    const enhancedMask = enhanceFloorDetection(
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
    console.error('Error detecting floor:', error);
    throw error;
  }
}

/**
 * Enhance floor detection by focusing on bottom portion of image
 */
function enhanceFloorDetection(
  mask: number[][],
  width: number,
  height: number
): number[][] {
  const enhanced: number[][] = [];

  // Floor is typically in the bottom 60% of the image
  const floorStartY = Math.floor(height * 0.4);

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      let value = mask[y][x];

      // Boost confidence for pixels in the bottom portion
      if (y >= floorStartY) {
        value = Math.min(value * 1.2, 1);
      } else {
        // Reduce confidence for top portion (less likely to be floor)
        value = value * 0.8;
      }

      row.push(value > 0.5 ? 1 : 0);
    }
    enhanced.push(row);
  }

  return enhanced;
}

/**
 * Detect floor boundaries for perspective calculation
 */
export function detectFloorBoundaries(mask: number[][]): {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
} | null {
  const height = mask.length;
  const width = mask[0].length;

  // Find the topmost row with floor pixels
  let topY = -1;
  for (let y = 0; y < height; y++) {
    if (mask[y].some((v) => v === 1)) {
      topY = y;
      break;
    }
  }

  // Find the bottommost row with floor pixels
  let bottomY = -1;
  for (let y = height - 1; y >= 0; y--) {
    if (mask[y].some((v) => v === 1)) {
      bottomY = y;
      break;
    }
  }

  if (topY === -1 || bottomY === -1) {
    return null;
  }

  // Find leftmost and rightmost pixels in top row
  let topLeftX = -1;
  let topRightX = -1;
  for (let x = 0; x < width; x++) {
    if (mask[topY][x] === 1) {
      if (topLeftX === -1) topLeftX = x;
      topRightX = x;
    }
  }

  // Find leftmost and rightmost pixels in bottom row
  let bottomLeftX = -1;
  let bottomRightX = -1;
  for (let x = 0; x < width; x++) {
    if (mask[bottomY][x] === 1) {
      if (bottomLeftX === -1) bottomLeftX = x;
      bottomRightX = x;
    }
  }

  if (topLeftX === -1 || bottomLeftX === -1) {
    return null;
  }

  return {
    topLeft: { x: topLeftX, y: topY },
    topRight: { x: topRightX, y: topY },
    bottomLeft: { x: bottomLeftX, y: bottomY },
    bottomRight: { x: bottomRightX, y: bottomY },
  };
}
