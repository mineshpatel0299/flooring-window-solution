import { scaleMask } from './segmentation';
import type { SegmentationData } from '@/types';

/**
 * Detect floor area using region growing with edge-aware stopping
 * Excludes furniture legs and other vertical objects
 */
export async function detectFloor(
  image: HTMLImageElement
): Promise<SegmentationData> {
  try {
    console.log('Detecting floor area...');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Process at moderate resolution
    const maxDim = 600;
    const scale = Math.min(maxDim / image.width, maxDim / image.height, 1);
    const width = Math.floor(image.width * scale);
    const height = Math.floor(image.height * scale);

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);

    // Step 1: Detect edges (furniture legs have strong edges)
    const edgeMap = detectEdges(imageData, width, height);

    // Step 2: Region grow from bottom, stopping at edges
    let mask = regionGrowWithEdges(imageData, edgeMap, width, height);

    // Step 3: Fill gaps first before removing structures
    mask = morphologicalClose(mask, 7); // Fill gaps between detected regions

    // Step 4: Remove thin vertical structures (furniture legs)
    mask = removeThinStructures(mask, width, height);

    // Step 5: Keep largest component
    mask = keepLargestComponent(mask, width, height);

    // Step 6: Remove narrow vertical protrusions
    mask = removeVerticalProtrusions(mask, width, height);

    // Step 7: Fill holes
    mask = fillHoles(mask, width, height);

    // Step 8: Final cleanup - small opening to remove noise, then close to fill small gaps
    mask = morphologicalOpen(mask, 3);
    mask = morphologicalClose(mask, 5);

    // Step 9: Smooth edges
    mask = smoothEdges(mask, 2);

    const confidence = calculateConfidence(mask, width, height);
    console.log(`Floor detection complete. Coverage: ${(confidence * 100).toFixed(1)}%`);

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
 * Detect edges using Sobel filter
 */
function detectEdges(
  imageData: ImageData,
  width: number,
  height: number
): number[][] {
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

  // Sobel edge detection
  const edges: number[][] = [];
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        row.push(0);
        continue;
      }

      // Sobel kernels
      const gx =
        -gray[y - 1][x - 1] - 2 * gray[y][x - 1] - gray[y + 1][x - 1] +
        gray[y - 1][x + 1] + 2 * gray[y][x + 1] + gray[y + 1][x + 1];
      const gy =
        -gray[y - 1][x - 1] - 2 * gray[y - 1][x] - gray[y - 1][x + 1] +
        gray[y + 1][x - 1] + 2 * gray[y + 1][x] + gray[y + 1][x + 1];

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      row.push(Math.min(magnitude / 200, 1)); // Normalize
    }
    edges.push(row);
  }

  return edges;
}

/**
 * Get pixel color
 */
function getPixel(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number
): { r: number; g: number; b: number } {
  const i = (y * width + x) * 4;
  return { r: data[i], g: data[i + 1], b: data[i + 2] };
}

/**
 * Color difference (perceptually weighted)
 */
function colorDiff(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number }
): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db) / 3;
}

/**
 * Region growing that stops at edges
 */
function regionGrowWithEdges(
  imageData: ImageData,
  edgeMap: number[][],
  width: number,
  height: number
): number[][] {
  const data = imageData.data;
  const mask: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  const visited: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));

  const colorThreshold = 40; // Increased for more coverage
  const edgeThreshold = 0.35; // Higher = less sensitive to edges, captures more floor

  type QueueItem = {
    y: number;
    x: number;
    parentColor: { r: number; g: number; b: number };
    depth: number;
  };

  const queue: QueueItem[] = [];

  // Seed from bottom rows - wider area
  const seedStartY = Math.floor(height * 0.85); // Start higher
  for (let y = seedStartY; y < height; y++) {
    for (let x = Math.floor(width * 0.05); x < Math.floor(width * 0.95); x += 2) {
      // Skip only very strong edges
      if (edgeMap[y][x] > edgeThreshold * 1.5) continue;

      const color = getPixel(data, width, x, y);
      queue.push({ y, x, parentColor: color, depth: 0 });
    }
  }

  while (queue.length > 0) {
    const { y, x, parentColor, depth } = queue.shift()!;

    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited[y][x]) continue;

    visited[y][x] = true;

    // Stop at very strong edges only
    if (edgeMap[y][x] > edgeThreshold) continue;

    const currentColor = getPixel(data, width, x, y);
    const diff = colorDiff(currentColor, parentColor);

    // Adaptive threshold - more lenient overall
    const positionFactor = 0.7 + 0.3 * (y / height);
    const depthFactor = Math.max(0.7, 1 - depth * 0.0005);
    const threshold = colorThreshold * positionFactor * depthFactor;

    if (diff <= threshold) {
      mask[y][x] = 1;

      // Add all neighbors
      const neighbors = [
        { dy: -1, dx: 0 },
        { dy: 1, dx: 0 },
        { dy: 0, dx: -1 },
        { dy: 0, dx: 1 },
      ];

      for (const { dy, dx } of neighbors) {
        const ny = y + dy;
        const nx = x + dx;

        if (ny >= 0 && ny < height && nx >= 0 && nx < width && !visited[ny][nx]) {
          // Allow crossing weaker edges
          if (edgeMap[ny][nx] <= edgeThreshold) {
            queue.push({ y: ny, x: nx, parentColor: currentColor, depth: depth + 1 });
          }
        }
      }
    }
  }

  return mask;
}

/**
 * Remove thin vertical structures (furniture legs)
 * Only removes very narrow, tall structures that are clearly legs
 */
function removeThinStructures(
  mask: number[][],
  width: number,
  height: number
): number[][] {
  const result: number[][] = mask.map(row => [...row]);
  const minWidth = Math.max(10, Math.floor(width * 0.025)); // Narrower threshold - 2.5% of image

  // For each column, check if it's part of a thin vertical structure
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      if (mask[y][x] === 0) continue;

      // Measure horizontal extent at this point
      let leftExtent = 0;
      let rightExtent = 0;

      for (let dx = 1; dx <= minWidth * 2 && x - dx >= 0; dx++) {
        if (mask[y][x - dx] === 1) leftExtent++;
        else break;
      }

      for (let dx = 1; dx <= minWidth * 2 && x + dx < width; dx++) {
        if (mask[y][x + dx] === 1) rightExtent++;
        else break;
      }

      const totalWidth = leftExtent + 1 + rightExtent;

      // Only remove if VERY narrow (likely a leg)
      if (totalWidth < minWidth) {
        // Check if this narrow section extends significantly vertically
        let verticalExtent = 0;
        for (let dy = 1; dy <= 50 && y - dy >= 0; dy++) {
          if (mask[y - dy][x] === 1) verticalExtent++;
          else break;
        }

        // Only remove if it's narrow AND extends vertically more than 3x its width
        // This ensures we only remove clear furniture legs
        if (verticalExtent > totalWidth * 3) {
          result[y][x] = 0;
        }
      }
    }
  }

  return result;
}

/**
 * Remove vertical protrusions from the top of the floor mask
 * Only removes very narrow isolated segments that are clearly not floor
 */
function removeVerticalProtrusions(
  mask: number[][],
  width: number,
  height: number
): number[][] {
  const result: number[][] = mask.map(row => [...row]);

  // Only check the top portion of the image where protrusions would be
  const checkUntilY = Math.floor(height * 0.6);

  for (let y = 0; y < checkUntilY; y++) {
    // Count continuous horizontal segments in this row
    const segments: { start: number; end: number }[] = [];
    let inSegment = false;
    let segStart = 0;

    for (let x = 0; x < width; x++) {
      if (mask[y][x] === 1 && !inSegment) {
        inSegment = true;
        segStart = x;
      } else if (mask[y][x] === 0 && inSegment) {
        inSegment = false;
        segments.push({ start: segStart, end: x - 1 });
      }
    }
    if (inSegment) {
      segments.push({ start: segStart, end: width - 1 });
    }

    // Only remove VERY narrow segments (< 3% of width)
    const minSegmentWidth = Math.max(12, Math.floor(width * 0.03));

    for (const seg of segments) {
      const segWidth = seg.end - seg.start + 1;

      if (segWidth < minSegmentWidth) {
        // Check if this connects to a wider area below
        let connectsToWider = false;

        for (let checkY = y + 1; checkY < Math.min(y + 30, height); checkY++) {
          let belowWidth = 0;
          for (let x = Math.max(0, seg.start - 15); x <= Math.min(width - 1, seg.end + 15); x++) {
            if (mask[checkY][x] === 1) belowWidth++;
          }
          if (belowWidth > minSegmentWidth * 2) {
            connectsToWider = true;
            break;
          }
        }

        // If it doesn't connect to a wider floor area, remove it
        if (!connectsToWider) {
          for (let x = seg.start; x <= seg.end; x++) {
            result[y][x] = 0;
          }
        }
      }
    }
  }

  return result;
}

/**
 * Morphological opening (erode then dilate)
 */
function morphologicalOpen(mask: number[][], kernelSize: number): number[][] {
  let result = erode(mask, kernelSize);
  result = dilate(result, kernelSize);
  return result;
}

/**
 * Morphological closing (dilate then erode)
 */
function morphologicalClose(mask: number[][], kernelSize: number): number[][] {
  let result = dilate(mask, kernelSize);
  result = erode(result, kernelSize);
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

  const result: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  for (const [y, x] of largestComponent) {
    result[y][x] = 1;
  }

  return result;
}

/**
 * Fill holes inside the floor
 */
function fillHoles(mask: number[][], width: number, height: number): number[][] {
  const result: number[][] = mask.map(row => [...row]);
  const visited: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));

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

  // Mark background connected to edges
  for (let x = 0; x < width; x++) {
    if (mask[0][x] === 0) markEdgeConnected(0, x);
    if (mask[height - 1][x] === 0) markEdgeConnected(height - 1, x);
  }
  for (let y = 0; y < height; y++) {
    if (mask[y][0] === 0) markEdgeConnected(y, 0);
    if (mask[y][width - 1] === 0) markEdgeConnected(y, width - 1);
  }

  // Fill unvisited background (holes)
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
 * Smooth edges
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

      result[y][x] = sum / count >= 0.5 ? 1 : 0;
    }
  }

  return result;
}

/**
 * Calculate coverage confidence
 */
function calculateConfidence(mask: number[][], width: number, height: number): number {
  let floorPixels = 0;
  for (const row of mask) {
    for (const value of row) {
      floorPixels += value;
    }
  }
  return floorPixels / (width * height);
}

/**
 * Detect floor boundaries
 */
export function detectFloorBoundaries(mask: number[][]): {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
  bottomRight: { x: number; y: number };
} | null {
  const height = mask.length;
  const width = mask[0].length;

  let topY = -1;
  for (let y = 0; y < height; y++) {
    if (mask[y].some(v => v === 1)) {
      topY = y;
      break;
    }
  }

  let bottomY = -1;
  for (let y = height - 1; y >= 0; y--) {
    if (mask[y].some(v => v === 1)) {
      bottomY = y;
      break;
    }
  }

  if (topY === -1 || bottomY === -1) return null;

  let topLeftX = -1, topRightX = -1;
  for (let x = 0; x < width; x++) {
    if (mask[topY][x] === 1) {
      if (topLeftX === -1) topLeftX = x;
      topRightX = x;
    }
  }

  let bottomLeftX = -1, bottomRightX = -1;
  for (let x = 0; x < width; x++) {
    if (mask[bottomY][x] === 1) {
      if (bottomLeftX === -1) bottomLeftX = x;
      bottomRightX = x;
    }
  }

  if (topLeftX === -1 || bottomLeftX === -1) return null;

  return {
    topLeft: { x: topLeftX, y: topY },
    topRight: { x: topRightX, y: topY },
    bottomLeft: { x: bottomLeftX, y: bottomY },
    bottomRight: { x: bottomRightX, y: bottomY },
  };
}
