import { scaleMask } from './segmentation';
import type { SegmentationData } from '@/types';

/**
 * Detect floor area using color sampling and matching
 * Samples colors from the bottom of the image and finds all matching areas
 */
export async function detectFloor(
  image: HTMLImageElement
): Promise<SegmentationData> {
  try {
    console.log('Detecting floor area...');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const maxDim = 600;
    const scale = Math.min(maxDim / image.width, maxDim / image.height, 1);
    const width = Math.floor(image.width * scale);
    const height = Math.floor(image.height * scale);

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);

    // Step 1: Sample floor colors from bottom portion
    const floorColors = sampleFloorColors(imageData, width, height);
    console.log(`Sampled ${floorColors.length} floor colors`);

    // Step 2: Create mask based on color matching
    let mask = createColorMask(imageData, width, height, floorColors);

    // Step 3: Apply position weighting - floor is at bottom
    mask = applyPositionWeight(mask, width, height);

    // Step 4: Detect and remove furniture legs (thin vertical structures)
    const edgeMap = detectEdges(imageData, width, height);
    mask = removeObjectsByEdges(mask, edgeMap, width, height);

    // Step 5: Morphological operations
    mask = morphologicalClose(mask, 9); // Fill large gaps
    mask = morphologicalOpen(mask, 3);  // Remove small noise

    // Step 6: Keep largest connected component
    mask = keepLargestComponent(mask, width, height);

    // Step 7: Fill holes
    mask = fillHoles(mask, width, height);

    // Step 8: Final smoothing
    mask = morphologicalClose(mask, 5);
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

interface FloorColor {
  r: number;
  g: number;
  b: number;
  h: number;
  s: number;
  l: number;
}

/**
 * Sample colors from the bottom portion of the image
 */
function sampleFloorColors(
  imageData: ImageData,
  width: number,
  height: number
): FloorColor[] {
  const data = imageData.data;
  const colors: Map<string, { color: FloorColor; count: number }> = new Map();

  // Sample from bottom 30% of image
  const startY = Math.floor(height * 0.7);

  for (let y = startY; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Quantize colors to reduce variations (group similar colors)
      const qr = Math.round(r / 16) * 16;
      const qg = Math.round(g / 16) * 16;
      const qb = Math.round(b / 16) * 16;

      const key = `${qr},${qg},${qb}`;
      const hsl = rgbToHsl(r, g, b);

      if (colors.has(key)) {
        colors.get(key)!.count++;
      } else {
        colors.set(key, {
          color: { r: qr, g: qg, b: qb, ...hsl },
          count: 1,
        });
      }
    }
  }

  // Sort by frequency and get top colors
  const sorted = Array.from(colors.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) // Top 10 colors
    .map((c) => c.color);

  return sorted;
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h, s, l };
}

/**
 * Create mask based on color matching
 */
function createColorMask(
  imageData: ImageData,
  width: number,
  height: number,
  floorColors: FloorColor[]
): number[][] {
  const data = imageData.data;
  const mask: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));

  // Color distance threshold - generous for full coverage
  const threshold = 50;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Check if pixel matches any floor color
      for (const floorColor of floorColors) {
        const dist = colorDistance(r, g, b, floorColor.r, floorColor.g, floorColor.b);
        if (dist < threshold) {
          mask[y][x] = 1;
          break;
        }
      }
    }
  }

  return mask;
}

/**
 * Calculate color distance
 */
function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  // Weighted for human perception
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db) / 3;
}

/**
 * Apply position weighting - floor is typically in bottom portion
 */
function applyPositionWeight(
  mask: number[][],
  width: number,
  height: number
): number[][] {
  const result: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));

  // Floor typically starts around 25-35% from top
  const floorStartY = Math.floor(height * 0.25);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (y < floorStartY) {
        // Above likely floor line - much stricter
        // Only keep if there's strong horizontal continuity
        if (mask[y][x] === 1) {
          let horizCount = 0;
          for (let dx = -10; dx <= 10; dx++) {
            const nx = x + dx;
            if (nx >= 0 && nx < width && mask[y][nx] === 1) {
              horizCount++;
            }
          }
          // Keep only if part of wide horizontal area
          if (horizCount > 15) {
            result[y][x] = 1;
          }
        }
      } else {
        // Below floor line - keep as is
        result[y][x] = mask[y][x];
      }
    }
  }

  return result;
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

      const gx =
        -gray[y - 1][x - 1] - 2 * gray[y][x - 1] - gray[y + 1][x - 1] +
        gray[y - 1][x + 1] + 2 * gray[y][x + 1] + gray[y + 1][x + 1];
      const gy =
        -gray[y - 1][x - 1] - 2 * gray[y - 1][x] - gray[y - 1][x + 1] +
        gray[y + 1][x - 1] + 2 * gray[y + 1][x] + gray[y + 1][x + 1];

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      row.push(Math.min(magnitude / 200, 1));
    }
    edges.push(row);
  }

  return edges;
}

/**
 * Remove objects detected by strong vertical edges (furniture legs)
 */
function removeObjectsByEdges(
  mask: number[][],
  edgeMap: number[][],
  width: number,
  height: number
): number[][] {
  const result: number[][] = mask.map((row) => [...row]);
  const edgeThreshold = 0.4;

  // Find vertical edge columns (furniture legs have strong vertical edges)
  for (let x = 0; x < width; x++) {
    // Count strong vertical edges in this column
    let verticalEdgeCount = 0;
    let edgeStartY = -1;
    let edgeEndY = -1;

    for (let y = 0; y < height; y++) {
      if (edgeMap[y][x] > edgeThreshold) {
        verticalEdgeCount++;
        if (edgeStartY === -1) edgeStartY = y;
        edgeEndY = y;
      }
    }

    // If there's a strong vertical edge column (likely furniture leg)
    const edgeHeight = edgeEndY - edgeStartY;
    if (verticalEdgeCount > 20 && edgeHeight > height * 0.15) {
      // Check if this is a narrow structure
      let isNarrow = true;
      for (let checkX = x - 8; checkX <= x + 8; checkX++) {
        if (checkX < 0 || checkX >= width) continue;
        let hasStrongEdge = false;
        for (let y = edgeStartY; y <= edgeEndY; y++) {
          if (edgeMap[y][checkX] > edgeThreshold) {
            hasStrongEdge = true;
            break;
          }
        }
        if (!hasStrongEdge && checkX !== x) {
          // Found a gap - this might be wider than a leg
          if (Math.abs(checkX - x) > 5) {
            isNarrow = false;
            break;
          }
        }
      }

      // Remove narrow vertical structures
      if (isNarrow) {
        for (let y = edgeStartY; y <= Math.min(edgeEndY + 10, height - 1); y++) {
          for (let dx = -5; dx <= 5; dx++) {
            const nx = x + dx;
            if (nx >= 0 && nx < width) {
              result[y][nx] = 0;
            }
          }
        }
      }
    }
  }

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
 * Morphological opening (erode then dilate)
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
  const result: number[][] = mask.map((row) => [...row]);
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
 * Calculate confidence
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
    if (mask[y].some((v) => v === 1)) {
      topY = y;
      break;
    }
  }

  let bottomY = -1;
  for (let y = height - 1; y >= 0; y--) {
    if (mask[y].some((v) => v === 1)) {
      bottomY = y;
      break;
    }
  }

  if (topY === -1 || bottomY === -1) return null;

  let topLeftX = -1,
    topRightX = -1;
  for (let x = 0; x < width; x++) {
    if (mask[topY][x] === 1) {
      if (topLeftX === -1) topLeftX = x;
      topRightX = x;
    }
  }

  let bottomLeftX = -1,
    bottomRightX = -1;
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
