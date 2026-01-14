import { segmentImage, scaleMask } from './segmentation';
import type { SegmentationData } from '@/types';

/**
 * Detect floor area in an image
 * Uses body segmentation to identify the background (floor)
 * Then applies additional filtering to exclude objects and focus on floor surfaces
 */
export async function detectFloor(
  image: HTMLImageElement
): Promise<SegmentationData> {
  try {
    console.log('Detecting floor area...');

    // Segment the image (invert mask to get background/floor)
    const segmentationData = await segmentImage(image, true);

    // Get edge map to detect objects (objects have more edges than flat floors)
    const edgeMap = detectEdges(image);

    // Additional floor-specific processing
    // Focus on the bottom portion of the image where floors typically are
    // and exclude areas with high edge density (likely objects)
    const enhancedMask = enhanceFloorDetection(
      segmentationData.mask,
      edgeMap,
      segmentationData.width,
      segmentationData.height
    );

    // Apply floor-specific cleanup to remove object regions
    const cleanedMask = cleanupFloorMask(enhancedMask);

    // Scale mask to original image dimensions
    const scaledMask = scaleMask(cleanedMask, image.width, image.height);

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
 * Detect edges in the image using Sobel-like filter
 * Returns a 2D array where higher values = more edges
 */
function detectEdges(image: HTMLImageElement): number[][] {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Use smaller dimensions for faster processing
  const maxDim = 512;
  const scale = Math.min(maxDim / image.width, maxDim / image.height, 1);
  const width = Math.floor(image.width * scale);
  const height = Math.floor(image.height * scale);

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Convert to grayscale array
  const gray: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // Luminance formula
      row.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    gray.push(row);
  }

  // Apply simple edge detection (gradient magnitude)
  const edges: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        row.push(0);
        continue;
      }

      // Sobel-like operators
      const gx = -gray[y - 1][x - 1] - 2 * gray[y][x - 1] - gray[y + 1][x - 1] +
                  gray[y - 1][x + 1] + 2 * gray[y][x + 1] + gray[y + 1][x + 1];
      const gy = -gray[y - 1][x - 1] - 2 * gray[y - 1][x] - gray[y - 1][x + 1] +
                  gray[y + 1][x - 1] + 2 * gray[y + 1][x] + gray[y + 1][x + 1];

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      // Normalize to 0-1
      row.push(Math.min(magnitude / 255, 1));
    }
    edges.push(row);
  }

  return edges;
}

/**
 * Enhance floor detection by focusing on bottom portion of image
 * and excluding areas with high edge density (likely objects, not floor)
 */
function enhanceFloorDetection(
  mask: number[][],
  edgeMap: number[][],
  width: number,
  height: number
): number[][] {
  const enhanced: number[][] = [];

  // Scale factors for edge map to mask dimensions
  const edgeHeight = edgeMap.length;
  const edgeWidth = edgeMap[0].length;
  const scaleX = edgeWidth / width;
  const scaleY = edgeHeight / height;

  // Floor is typically in the bottom 70% of the image
  // We'll use a gradient approach - more likely to be floor as we go down
  const floorStartY = Math.floor(height * 0.3);

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      let value = mask[y][x];

      // Get edge value at this position
      const edgeY = Math.min(Math.floor(y * scaleY), edgeHeight - 1);
      const edgeX = Math.min(Math.floor(x * scaleX), edgeWidth - 1);
      const edgeValue = edgeMap[edgeY] ? edgeMap[edgeY][edgeX] || 0 : 0;

      // Calculate position weight - higher weight for bottom of image
      const positionWeight = y >= floorStartY
        ? 1 + ((y - floorStartY) / (height - floorStartY)) * 0.5
        : (y / floorStartY) * 0.5;

      // Reduce confidence for areas with high edge density (objects have more edges)
      // Floors are typically smooth with low edge density
      const edgeThreshold = 0.15;
      if (edgeValue > edgeThreshold) {
        // High edge area - likely an object, not floor
        value = value * Math.max(0, 1 - (edgeValue - edgeThreshold) * 3);
      }

      // Apply position weight
      value = value * positionWeight;

      // Areas above the floor start line are very unlikely to be floor
      if (y < floorStartY * 0.7) {
        value = 0;
      }

      row.push(value > 0.5 ? 1 : 0);
    }
    enhanced.push(row);
  }

  return enhanced;
}

/**
 * Additional cleanup to remove small disconnected regions (likely objects)
 * and keep only the largest floor region connected to the bottom of the image
 */
function cleanupFloorMask(mask: number[][]): number[][] {
  const height = mask.length;
  const width = mask[0].length;

  // Find all connected components
  const visited: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));
  const components: { pixels: [number, number][]; touchesBottom: boolean }[] = [];

  function floodFill(startY: number, startX: number): { pixels: [number, number][]; touchesBottom: boolean } {
    const stack: [number, number][] = [[startY, startX]];
    const pixels: [number, number][] = [];
    let touchesBottom = false;

    while (stack.length > 0) {
      const [y, x] = stack.pop()!;

      if (y < 0 || y >= height || x < 0 || x >= width || visited[y][x] || mask[y][x] === 0) {
        continue;
      }

      visited[y][x] = true;
      pixels.push([y, x]);

      // Check if this component touches the bottom of the image
      if (y >= height - 5) {
        touchesBottom = true;
      }

      stack.push([y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]);
    }

    return { pixels, touchesBottom };
  }

  // Find all components
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y][x] === 1 && !visited[y][x]) {
        components.push(floodFill(y, x));
      }
    }
  }

  // Keep only components that touch the bottom of the image and are large enough
  // This filters out objects that are floating in the middle of the image
  const minComponentSize = (width * height) * 0.01; // At least 1% of image

  const result: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));

  for (const component of components) {
    // Keep if it touches bottom AND is large enough
    // OR if it's very large (more than 10% of image)
    const isLargeEnough = component.pixels.length > minComponentSize;
    const isVeryLarge = component.pixels.length > (width * height) * 0.1;

    if ((component.touchesBottom && isLargeEnough) || isVeryLarge) {
      for (const [y, x] of component.pixels) {
        result[y][x] = 1;
      }
    }
  }

  return result;
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
