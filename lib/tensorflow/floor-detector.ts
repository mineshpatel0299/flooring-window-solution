import { scaleMask } from './segmentation';
import type { SegmentationData } from '@/types';

/**
 * Detect floor area using region growing from the bottom of the image
 * This approach starts at the bottom (where floors typically are) and
 * grows the region upward based on local color similarity
 */
export async function detectFloor(
  image: HTMLImageElement
): Promise<SegmentationData> {
  try {
    console.log('Detecting floor area with region growing...');

    // Create canvas and get image data
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Use moderate dimensions for processing
    const maxDim = 600;
    const scale = Math.min(maxDim / image.width, maxDim / image.height, 1);
    const width = Math.floor(image.width * scale);
    const height = Math.floor(image.height * scale);

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);

    // Step 1: Region growing from bottom of image
    let mask = regionGrowFromBottom(imageData, width, height);

    // Step 2: Clean up with morphological operations
    mask = morphologicalClose(mask, 7);
    mask = morphologicalOpen(mask, 3);

    // Step 3: Keep largest connected component
    mask = keepLargestComponent(mask, width, height);

    // Step 4: Fill holes
    mask = fillHoles(mask, width, height);

    // Step 5: Smooth the edges
    mask = smoothEdges(mask, 3);

    // Calculate confidence
    const confidence = calculateConfidence(mask, width, height);
    console.log(`Floor detection complete. Coverage: ${(confidence * 100).toFixed(1)}%`);

    // Scale mask to original image dimensions
    const scaledMask = scaleMask(mask, image.width, image.height);

    return {
      mask: scaledMask,
      width: image.width,
      height: image.height,
      confidence: Math.min(0.95, confidence + 0.3),
    };
  } catch (error) {
    console.error('Error detecting floor:', error);
    throw error;
  }
}

/**
 * Get pixel color at position
 */
function getPixel(data: Uint8ClampedArray, width: number, x: number, y: number): { r: number; g: number; b: number } {
  const i = (y * width + x) * 4;
  return {
    r: data[i],
    g: data[i + 1],
    b: data[i + 2],
  };
}

/**
 * Calculate color difference between two pixels (CIE76 approximation)
 */
function colorDifference(c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }): number {
  // Weighted Euclidean distance (accounts for human perception)
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;

  // Weight green more as humans are more sensitive to it
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db) / 3;
}

/**
 * Region growing algorithm starting from the bottom of the image
 */
function regionGrowFromBottom(
  imageData: ImageData,
  width: number,
  height: number
): number[][] {
  const data = imageData.data;
  const mask: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  const visited: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));

  // Adaptive color threshold based on image variance
  const baseThreshold = 35;

  // Create priority queue for region growing (stores [y, x, parentColor])
  type QueueItem = { y: number; x: number; parentColor: { r: number; g: number; b: number }; depth: number };
  const queue: QueueItem[] = [];

  // Seed points from bottom rows (bottom 5% of image)
  const seedRowStart = Math.floor(height * 0.95);
  const seedStep = Math.max(1, Math.floor(width / 30)); // ~30 seed points per row

  for (let y = seedRowStart; y < height; y++) {
    for (let x = seedStep; x < width - seedStep; x += seedStep) {
      const color = getPixel(data, width, x, y);
      queue.push({ y, x, parentColor: color, depth: 0 });
    }
  }

  // Also add seeds from the very bottom row with finer spacing
  const bottomY = height - 1;
  for (let x = 2; x < width - 2; x += Math.max(1, Math.floor(width / 50))) {
    const color = getPixel(data, width, x, bottomY);
    queue.push({ y: bottomY, x, parentColor: color, depth: 0 });
  }

  // Region growing with adaptive threshold
  while (queue.length > 0) {
    const { y, x, parentColor, depth } = queue.shift()!;

    // Bounds check
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited[y][x]) continue;

    visited[y][x] = true;

    const currentColor = getPixel(data, width, x, y);
    const diff = colorDifference(currentColor, parentColor);

    // Adaptive threshold: allow more variation near the seed, less as we grow
    const depthFactor = Math.max(0.5, 1 - depth * 0.002);
    const threshold = baseThreshold * depthFactor;

    // Position factor: be more strict as we go up (floor is at bottom)
    const positionFactor = 0.7 + 0.3 * (y / height);
    const adjustedThreshold = threshold * positionFactor;

    if (diff <= adjustedThreshold) {
      mask[y][x] = 1;

      // Add neighbors (4-connectivity for tighter boundaries)
      const neighbors = [
        { dy: -1, dx: 0 },  // up
        { dy: 1, dx: 0 },   // down
        { dy: 0, dx: -1 },  // left
        { dy: 0, dx: 1 },   // right
      ];

      for (const { dy, dx } of neighbors) {
        const ny = y + dy;
        const nx = x + dx;
        if (ny >= 0 && ny < height && nx >= 0 && nx < width && !visited[ny][nx]) {
          // Use current pixel color as parent for smoother gradient following
          queue.push({ y: ny, x: nx, parentColor: currentColor, depth: depth + 1 });
        }
      }
    }
  }

  return mask;
}

/**
 * Morphological closing (dilate then erode) - fills small gaps
 */
function morphologicalClose(mask: number[][], kernelSize: number): number[][] {
  let result = dilate(mask, kernelSize);
  result = erode(result, kernelSize);
  return result;
}

/**
 * Morphological opening (erode then dilate) - removes small noise
 */
function morphologicalOpen(mask: number[][], kernelSize: number): number[][] {
  let result = erode(mask, kernelSize);
  result = dilate(result, kernelSize);
  return result;
}

/**
 * Dilate operation
 */
function dilate(mask: number[][], kernelSize: number): number[][] {
  const height = mask.length;
  const width = mask[0].length;
  const result: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  const half = Math.floor(kernelSize / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let maxVal = 0;
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const ny = y + ky;
          const nx = x + kx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            maxVal = Math.max(maxVal, mask[ny][nx]);
          }
        }
      }
      result[y][x] = maxVal;
    }
  }

  return result;
}

/**
 * Erode operation
 */
function erode(mask: number[][], kernelSize: number): number[][] {
  const height = mask.length;
  const width = mask[0].length;
  const result: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  const half = Math.floor(kernelSize / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minVal = 1;
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const ny = y + ky;
          const nx = x + kx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            minVal = Math.min(minVal, mask[ny][nx]);
          }
        }
      }
      result[y][x] = minVal;
    }
  }

  return result;
}

/**
 * Keep only the largest connected component
 */
function keepLargestComponent(
  mask: number[][],
  width: number,
  height: number
): number[][] {
  const visited: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));
  let largestComponent: [number, number][] = [];

  function floodFill(startY: number, startX: number): [number, number][] {
    const stack: [number, number][] = [[startY, startX]];
    const component: [number, number][] = [];

    while (stack.length > 0) {
      const [y, x] = stack.pop()!;

      if (y < 0 || y >= height || x < 0 || x >= width || visited[y][x] || mask[y][x] === 0) {
        continue;
      }

      visited[y][x] = true;
      component.push([y, x]);

      stack.push([y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]);
    }

    return component;
  }

  // Find all components and keep the largest
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y][x] === 1 && !visited[y][x]) {
        const component = floodFill(y, x);
        if (component.length > largestComponent.length) {
          largestComponent = component;
        }
      }
    }
  }

  // Create result mask with only largest component
  const result: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  for (const [y, x] of largestComponent) {
    result[y][x] = 1;
  }

  return result;
}

/**
 * Fill holes inside the floor region
 */
function fillHoles(
  mask: number[][],
  width: number,
  height: number
): number[][] {
  const result: number[][] = mask.map(row => [...row]);
  const visited: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));

  // Mark all background pixels connected to the edge
  function markEdgeConnected(startY: number, startX: number): void {
    const stack: [number, number][] = [[startY, startX]];

    while (stack.length > 0) {
      const [y, x] = stack.pop()!;

      if (y < 0 || y >= height || x < 0 || x >= width || visited[y][x] || mask[y][x] === 1) {
        continue;
      }

      visited[y][x] = true;
      stack.push([y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]);
    }
  }

  // Start from all edges
  for (let x = 0; x < width; x++) {
    if (mask[0][x] === 0 && !visited[0][x]) markEdgeConnected(0, x);
    if (mask[height - 1][x] === 0 && !visited[height - 1][x]) markEdgeConnected(height - 1, x);
  }
  for (let y = 0; y < height; y++) {
    if (mask[y][0] === 0 && !visited[y][0]) markEdgeConnected(y, 0);
    if (mask[y][width - 1] === 0 && !visited[y][width - 1]) markEdgeConnected(y, width - 1);
  }

  // Fill unvisited background pixels (holes)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y][x] === 0 && !visited[y][x]) {
        result[y][x] = 1;
      }
    }
  }

  return result;
}

/**
 * Smooth the edges of the mask using averaging
 */
function smoothEdges(mask: number[][], radius: number): number[][] {
  const height = mask.length;
  const width = mask[0].length;
  const result: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            sum += mask[ny][nx];
            count++;
          }
        }
      }

      // Use threshold of 0.5 for binary output
      result[y][x] = sum / count >= 0.5 ? 1 : 0;
    }
  }

  return result;
}

/**
 * Calculate confidence/coverage score
 */
function calculateConfidence(mask: number[][], width: number, height: number): number {
  let floorPixels = 0;
  const totalPixels = width * height;

  for (const row of mask) {
    for (const value of row) {
      floorPixels += value;
    }
  }

  return floorPixels / totalPixels;
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
    if (mask[y].some(v => v === 1)) {
      topY = y;
      break;
    }
  }

  // Find the bottommost row with floor pixels
  let bottomY = -1;
  for (let y = height - 1; y >= 0; y--) {
    if (mask[y].some(v => v === 1)) {
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
