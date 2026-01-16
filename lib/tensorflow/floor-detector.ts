import { scaleMask } from './segmentation';
import type { SegmentationData } from '@/types';

/**
 * Detect floor area using multiple strategies
 */
export async function detectFloor(
  image: HTMLImageElement
): Promise<SegmentationData> {
  try {
    console.log('Detecting floor area...');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const maxDim = 500;
    const scale = Math.min(maxDim / image.width, maxDim / image.height, 1);
    const width = Math.floor(image.width * scale);
    const height = Math.floor(image.height * scale);

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Strategy 1: Flood fill from bottom with very generous threshold
    let mask = floodFillFromBottom(data, width, height);
    let coverage = calculateCoverage(mask);
    console.log(`Flood fill coverage: ${(coverage * 100).toFixed(1)}%`);

    // Strategy 2: If flood fill didn't find enough, use bottom region detection
    if (coverage < 0.15) {
      console.log('Flood fill insufficient, using bottom region strategy...');
      mask = detectBottomRegion(data, width, height);
      coverage = calculateCoverage(mask);
      console.log(`Bottom region coverage: ${(coverage * 100).toFixed(1)}%`);
    }

    // Strategy 3: If still not enough, use horizontal band from bottom
    if (coverage < 0.1) {
      console.log('Using fallback horizontal band strategy...');
      mask = createBottomBandMask(width, height, 0.4); // Bottom 40%
      coverage = calculateCoverage(mask);
    }

    // Fill gaps
    mask = dilate(mask, 5);
    mask = erode(mask, 3);

    // Keep largest component
    mask = keepLargestComponent(mask, width, height);

    // Fill holes
    mask = fillHoles(mask, width, height);

    // Smooth
    mask = dilate(mask, 3);
    mask = erode(mask, 2);

    coverage = calculateCoverage(mask);
    console.log(`Floor detection complete. Final coverage: ${(coverage * 100).toFixed(1)}%`);

    const scaledMask = scaleMask(mask, image.width, image.height);

    return {
      mask: scaledMask,
      width: image.width,
      height: image.height,
      confidence: 0.85,
    };
  } catch (error) {
    console.error('Error detecting floor:', error);
    throw error;
  }
}

/**
 * Detect bottom region based on color similarity
 */
function detectBottomRegion(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number[][] {
  const mask: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));

  // Sample colors from multiple points at the bottom
  const sampleY = height - 3;
  const samplePoints = [0.2, 0.35, 0.5, 0.65, 0.8];
  const floorColors: {r: number, g: number, b: number}[] = [];

  for (const pct of samplePoints) {
    const x = Math.floor(width * pct);
    const i = (sampleY * width + x) * 4;
    floorColors.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
  }

  // Calculate average floor color
  const avgColor = {
    r: floorColors.reduce((s, c) => s + c.r, 0) / floorColors.length,
    g: floorColors.reduce((s, c) => s + c.g, 0) / floorColors.length,
    b: floorColors.reduce((s, c) => s + c.b, 0) / floorColors.length,
  };

  // Very generous threshold
  const threshold = 100;

  // Mark pixels similar to floor color
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];

      const dist = Math.sqrt(
        Math.pow(r - avgColor.r, 2) +
        Math.pow(g - avgColor.g, 2) +
        Math.pow(b - avgColor.b, 2)
      );

      // Only consider bottom 70% of image for floor
      if (dist < threshold && y > height * 0.3) {
        mask[y][x] = 1;
      }
    }
  }

  return mask;
}

/**
 * Create a simple bottom band mask as fallback
 */
function createBottomBandMask(
  width: number,
  height: number,
  percentage: number
): number[][] {
  const mask: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  const startY = Math.floor(height * (1 - percentage));

  for (let y = startY; y < height; y++) {
    for (let x = 0; x < width; x++) {
      mask[y][x] = 1;
    }
  }

  return mask;
}

/**
 * Flood fill from bottom of image
 */
function floodFillFromBottom(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number[][] {
  const mask: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  const visited: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));

  // Very generous color threshold
  const colorThreshold = 80;

  // Get pixel color helper
  const getColor = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return { r: data[i], g: data[i + 1], b: data[i + 2] };
  };

  // Color distance
  const colorDist = (c1: {r:number,g:number,b:number}, c2: {r:number,g:number,b:number}) => {
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
    );
  };

  // Flood fill function
  const fill = (startX: number, startY: number, seedColor: {r:number,g:number,b:number}) => {
    const stack: [number, number, {r:number,g:number,b:number}][] = [[startX, startY, seedColor]];

    while (stack.length > 0) {
      const [x, y, parentColor] = stack.pop()!;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited[y][x]) continue;

      visited[y][x] = true;

      const currentColor = getColor(x, y);
      const dist = colorDist(currentColor, parentColor);

      if (dist <= colorThreshold) {
        mask[y][x] = 1;

        // Add neighbors - use current color as reference for smooth gradient following
        stack.push([x - 1, y, currentColor]);
        stack.push([x + 1, y, currentColor]);
        stack.push([x, y - 1, currentColor]);
        stack.push([x, y + 1, currentColor]);
      }
    }
  };

  // Start flood fill from multiple points along the bottom
  const bottomY = height - 2;
  const step = Math.max(1, Math.floor(width / 20));

  for (let x = step; x < width - step; x += step) {
    if (!visited[bottomY][x]) {
      const seedColor = getColor(x, bottomY);
      fill(x, bottomY, seedColor);
    }
  }

  // Also fill from bottom corners and center
  const seeds = [
    { x: Math.floor(width * 0.1), y: bottomY },
    { x: Math.floor(width * 0.25), y: bottomY },
    { x: Math.floor(width * 0.5), y: bottomY },
    { x: Math.floor(width * 0.75), y: bottomY },
    { x: Math.floor(width * 0.9), y: bottomY },
    { x: Math.floor(width * 0.5), y: height - 5 },
    { x: Math.floor(width * 0.3), y: height - 5 },
    { x: Math.floor(width * 0.7), y: height - 5 },
  ];

  for (const seed of seeds) {
    if (!visited[seed.y][seed.x]) {
      const seedColor = getColor(seed.x, seed.y);
      fill(seed.x, seed.y, seedColor);
    }
  }

  return mask;
}

/**
 * Dilate
 */
function dilate(mask: number[][], size: number): number[][] {
  const height = mask.length;
  const width = mask[0].length;
  const result: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  const half = Math.floor(size / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      outer: for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const ny = y + ky;
          const nx = x + kx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width && mask[ny][nx] === 1) {
            result[y][x] = 1;
            break outer;
          }
        }
      }
    }
  }

  return result;
}

/**
 * Erode
 */
function erode(mask: number[][], size: number): number[][] {
  const height = mask.length;
  const width = mask[0].length;
  const result: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  const half = Math.floor(size / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let allOnes = true;
      outer: for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const ny = y + ky;
          const nx = x + kx;
          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            if (mask[ny][nx] === 0) {
              allOnes = false;
              break outer;
            }
          }
        }
      }
      result[y][x] = allOnes ? 1 : 0;
    }
  }

  return result;
}

/**
 * Keep largest connected component
 */
function keepLargestComponent(mask: number[][], width: number, height: number): number[][] {
  const visited: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));
  let largest: [number, number][] = [];

  const floodFill = (startY: number, startX: number): [number, number][] => {
    const stack: [number, number][] = [[startY, startX]];
    const component: [number, number][] = [];

    while (stack.length > 0) {
      const [y, x] = stack.pop()!;
      if (y < 0 || y >= height || x < 0 || x >= width) continue;
      if (visited[y][x] || mask[y][x] === 0) continue;

      visited[y][x] = true;
      component.push([y, x]);

      stack.push([y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]);
    }

    return component;
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y][x] === 1 && !visited[y][x]) {
        const component = floodFill(y, x);
        if (component.length > largest.length) {
          largest = component;
        }
      }
    }
  }

  const result: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  for (const [y, x] of largest) {
    result[y][x] = 1;
  }

  return result;
}

/**
 * Fill holes
 */
function fillHoles(mask: number[][], width: number, height: number): number[][] {
  const result = mask.map(row => [...row]);
  const visited: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));

  const markOutside = (startY: number, startX: number) => {
    const stack: [number, number][] = [[startY, startX]];

    while (stack.length > 0) {
      const [y, x] = stack.pop()!;
      if (y < 0 || y >= height || x < 0 || x >= width) continue;
      if (visited[y][x] || mask[y][x] === 1) continue;

      visited[y][x] = true;
      stack.push([y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]);
    }
  };

  // Mark all outside pixels (connected to edges)
  for (let x = 0; x < width; x++) {
    markOutside(0, x);
    markOutside(height - 1, x);
  }
  for (let y = 0; y < height; y++) {
    markOutside(y, 0);
    markOutside(y, width - 1);
  }

  // Fill unvisited zeros (holes)
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
 * Calculate coverage
 */
function calculateCoverage(mask: number[][]): number {
  let count = 0;
  let total = 0;
  for (const row of mask) {
    for (const val of row) {
      count += val;
      total++;
    }
  }
  return count / total;
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
