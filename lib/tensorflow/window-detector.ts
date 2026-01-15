import { segmentImage, scaleMask } from './segmentation';
import type { SegmentationData } from '@/types';

/**
 * Detect window area in an image
 * Uses body segmentation combined with edge detection and brightness analysis
 * Windows are typically bright rectangular regions in the upper/middle of images
 */
export async function detectWindow(
  image: HTMLImageElement
): Promise<SegmentationData> {
  try {
    console.log('Detecting window area...');

    // Segment the image (invert mask to get background/window)
    const segmentationData = await segmentImage(image, true);

    // Get brightness map (windows are typically bright due to light)
    const brightnessMap = analyzeBrightness(image);

    // Get edge map to detect window frames and boundaries
    const edgeMap = detectEdges(image);

    // Additional window-specific processing
    // Focus on rectangular areas that might be windows
    const enhancedMask = enhanceWindowDetection(
      segmentationData.mask,
      brightnessMap,
      edgeMap,
      segmentationData.width,
      segmentationData.height
    );

    // Apply window-specific cleanup to keep only window-like regions
    const cleanedMask = cleanupWindowMask(enhancedMask);

    // Scale mask to original image dimensions
    const scaledMask = scaleMask(cleanedMask, image.width, image.height);

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
 * Analyze brightness of the image
 * Windows tend to be brighter due to light coming through
 */
function analyzeBrightness(image: HTMLImageElement): number[][] {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const maxDim = 512;
  const scale = Math.min(maxDim / image.width, maxDim / image.height, 1);
  const width = Math.floor(image.width * scale);
  const height = Math.floor(image.height * scale);

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const brightness: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // Calculate perceived brightness
      const b = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      row.push(b);
    }
    brightness.push(row);
  }

  return brightness;
}

/**
 * Detect edges in the image using Sobel-like filter
 * Windows have distinct rectangular edges
 */
function detectEdges(image: HTMLImageElement): number[][] {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const maxDim = 512;
  const scale = Math.min(maxDim / image.width, maxDim / image.height, 1);
  const width = Math.floor(image.width * scale);
  const height = Math.floor(image.height * scale);

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Convert to grayscale
  const gray: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      row.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    gray.push(row);
  }

  // Apply edge detection
  const edges: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        row.push(0);
        continue;
      }

      const gx = -gray[y - 1][x - 1] - 2 * gray[y][x - 1] - gray[y + 1][x - 1] +
                  gray[y - 1][x + 1] + 2 * gray[y][x + 1] + gray[y + 1][x + 1];
      const gy = -gray[y - 1][x - 1] - 2 * gray[y - 1][x] - gray[y - 1][x + 1] +
                  gray[y + 1][x - 1] + 2 * gray[y + 1][x] + gray[y + 1][x + 1];

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      row.push(Math.min(magnitude / 255, 1));
    }
    edges.push(row);
  }

  return edges;
}

/**
 * Enhance window detection by looking for bright rectangular patterns
 * and excluding non-window areas
 */
function enhanceWindowDetection(
  mask: number[][],
  brightnessMap: number[][],
  edgeMap: number[][],
  width: number,
  height: number
): number[][] {
  const enhanced: number[][] = [];

  // Scale factors
  const brightHeight = brightnessMap.length;
  const brightWidth = brightnessMap[0].length;
  const edgeHeight = edgeMap.length;
  const edgeWidth = edgeMap[0].length;
  const scaleXB = brightWidth / width;
  const scaleYB = brightHeight / height;
  const scaleXE = edgeWidth / width;
  const scaleYE = edgeHeight / height;

  // Windows are typically in the upper/middle portion of images (10% to 80%)
  const windowFocusStartY = Math.floor(height * 0.05);
  const windowFocusEndY = Math.floor(height * 0.85);

  // Calculate average brightness to determine threshold
  let totalBrightness = 0;
  let count = 0;
  for (let y = 0; y < brightHeight; y++) {
    for (let x = 0; x < brightWidth; x++) {
      totalBrightness += brightnessMap[y][x];
      count++;
    }
  }
  const avgBrightness = totalBrightness / count;
  const brightnessThreshold = avgBrightness * 0.9; // Windows should be brighter than average

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      let value = mask[y][x];

      // Get brightness at this position
      const brightY = Math.min(Math.floor(y * scaleYB), brightHeight - 1);
      const brightX = Math.min(Math.floor(x * scaleXB), brightWidth - 1);
      const brightness = brightnessMap[brightY]?.[brightX] || 0;

      // Get edge value
      const edgeY = Math.min(Math.floor(y * scaleYE), edgeHeight - 1);
      const edgeX = Math.min(Math.floor(x * scaleXE), edgeWidth - 1);
      const edgeValue = edgeMap[edgeY]?.[edgeX] || 0;

      // Window focus area weight
      let positionWeight = 1;
      if (y >= windowFocusStartY && y <= windowFocusEndY) {
        positionWeight = 1.3;
      } else {
        positionWeight = 0.3;
      }

      // Boost for bright areas (windows let light through)
      if (brightness > brightnessThreshold) {
        value = value * (1 + (brightness - brightnessThreshold) * 2);
      } else {
        // Reduce confidence for dark areas
        value = value * 0.5;
      }

      // Windows typically have less internal texture/edges (smooth glass)
      // But they have strong edges at boundaries (frames)
      // We want areas that are smooth inside
      if (edgeValue > 0.3) {
        // High edge - could be frame or object, slightly reduce
        value = value * 0.8;
      }

      // Apply position weight
      value = value * positionWeight;

      row.push(value > 0.5 ? 1 : 0);
    }
    enhanced.push(row);
  }

  return enhanced;
}

/**
 * Cleanup window mask to keep only window-like regions
 * Windows are typically rectangular with decent size
 */
function cleanupWindowMask(mask: number[][]): number[][] {
  const height = mask.length;
  const width = mask[0].length;

  // Find connected components
  const visited: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));
  const components: { pixels: [number, number][]; bounds: { minX: number; maxX: number; minY: number; maxY: number } }[] = [];

  function floodFill(startY: number, startX: number): { pixels: [number, number][]; bounds: { minX: number; maxX: number; minY: number; maxY: number } } {
    const stack: [number, number][] = [[startY, startX]];
    const pixels: [number, number][] = [];
    let minX = width, maxX = 0, minY = height, maxY = 0;

    while (stack.length > 0) {
      const [y, x] = stack.pop()!;

      if (y < 0 || y >= height || x < 0 || x >= width || visited[y][x] || mask[y][x] === 0) {
        continue;
      }

      visited[y][x] = true;
      pixels.push([y, x]);

      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      stack.push([y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]);
    }

    return { pixels, bounds: { minX, maxX, minY, maxY } };
  }

  // Find all components
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y][x] === 1 && !visited[y][x]) {
        components.push(floodFill(y, x));
      }
    }
  }

  // Filter components - keep those that look like windows
  const minComponentSize = (width * height) * 0.02; // At least 2% of image
  const result: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));

  for (const component of components) {
    const { pixels, bounds } = component;
    const componentWidth = bounds.maxX - bounds.minX;
    const componentHeight = bounds.maxY - bounds.minY;

    // Calculate aspect ratio and rectangularity
    const aspectRatio = componentWidth / Math.max(componentHeight, 1);
    const boundingArea = componentWidth * componentHeight;
    const fillRatio = pixels.length / Math.max(boundingArea, 1);

    // Windows are typically:
    // - Large enough (more than 2% of image)
    // - Somewhat rectangular (fill ratio > 0.5)
    // - Have reasonable aspect ratio (0.3 to 3.0)
    const isLargeEnough = pixels.length > minComponentSize;
    const isRectangular = fillRatio > 0.4;
    const hasGoodAspect = aspectRatio > 0.2 && aspectRatio < 5;
    const isVeryLarge = pixels.length > (width * height) * 0.1;

    if ((isLargeEnough && isRectangular && hasGoodAspect) || isVeryLarge) {
      for (const [y, x] of pixels) {
        result[y][x] = 1;
      }
    }
  }

  return result;
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
