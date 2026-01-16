import { scaleMask } from './segmentation';
import type { SegmentationData } from '@/types';

/**
 * Detect floor area using multiple strategies with improved precision
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

    // Strategy 1: Flood fill from bottom with conservative threshold
    let mask = floodFillFromBottom(data, width, height);
    let coverage = calculateCoverage(mask);
    console.log(`Flood fill coverage: ${(coverage * 100).toFixed(1)}%`);

    // Strategy 2: If flood fill didn't find enough, use bottom region detection
    if (coverage < 0.08) {
      console.log('Flood fill insufficient, using bottom region strategy...');
      mask = detectBottomRegion(data, width, height);
      coverage = calculateCoverage(mask);
      console.log(`Bottom region coverage: ${(coverage * 100).toFixed(1)}%`);
    }

    // Strategy 3: If still not enough, use horizontal band from bottom (last resort)
    if (coverage < 0.05) {
      console.log('Using fallback horizontal band strategy...');
      mask = createBottomBandMask(width, height, 0.25); // Bottom 25% only
      coverage = calculateCoverage(mask);
    }

    // Edge detection to exclude furniture legs and sharp edges
    console.log('Detecting edges to exclude furniture...');
    const edges = detectEdges(data, width, height);
    mask = removeEdgePixels(mask, edges, 0.25); // Balanced threshold

    // Gentle erosion to remove thin furniture legs without losing floor
    mask = erode(mask, 2);
    mask = dilate(mask, 2); // Restore floor area

    // Remove small components (likely furniture legs or small objects)
    const minComponentSize = Math.floor(width * height * 0.015); // 1.5% - balanced filter
    mask = removeSmallComponents(mask, width, height, minComponentSize);

    // Fill gaps with reduced dilation
    mask = dilate(mask, 3);
    mask = erode(mask, 2);

    // Keep largest component
    mask = keepLargestComponent(mask, width, height);

    // Fill holes
    mask = fillHoles(mask, width, height);

    // Smooth edges
    mask = dilate(mask, 2);
    mask = erode(mask, 1);

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
 * Detect bottom region based on color similarity with improved precision
 */
function detectBottomRegion(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number[][] {
  const mask: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));

  // Sample colors from multiple points at the very bottom (bottom 15%)
  const sampleStartY = Math.floor(height * 0.85);
  const samplePoints: { r: number, g: number, b: number }[] = [];

  // Sample from multiple rows and columns in bottom region
  for (let y = sampleStartY; y < height; y += 2) {
    for (const pct of [0.2, 0.35, 0.5, 0.65, 0.8]) {
      const x = Math.floor(width * pct);
      const i = (y * width + x) * 4;
      samplePoints.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }
  }

  // Calculate median color (more robust than average)
  const sortedR = samplePoints.map(c => c.r).sort((a, b) => a - b);
  const sortedG = samplePoints.map(c => c.g).sort((a, b) => a - b);
  const sortedB = samplePoints.map(c => c.b).sort((a, b) => a - b);
  const mid = Math.floor(samplePoints.length / 2);

  const floorColor = {
    r: sortedR[mid],
    g: sortedG[mid],
    b: sortedB[mid],
  };

  // More conservative threshold
  const threshold = 60;

  // Mark pixels similar to floor color, only in bottom 60% of image
  const minY = Math.floor(height * 0.4);

  for (let y = minY; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];

      const dist = Math.sqrt(
        Math.pow(r - floorColor.r, 2) +
        Math.pow(g - floorColor.g, 2) +
        Math.pow(b - floorColor.b, 2)
      );

      if (dist < threshold) {
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
 * Flood fill from bottom of image with improved precision
 */
function floodFillFromBottom(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number[][] {
  const mask: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  const visited: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));

  // More conservative color threshold for precise detection
  const colorThreshold = 50;

  // Only fill in bottom 60% of image (floor should be here)
  const minY = Math.floor(height * 0.4);

  // Get pixel color helper
  const getColor = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return { r: data[i], g: data[i + 1], b: data[i + 2] };
  };

  // Color distance
  const colorDist = (c1: { r: number, g: number, b: number }, c2: { r: number, g: number, b: number }) => {
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
    );
  };

  // Flood fill function with vertical constraint
  const fill = (startX: number, startY: number, seedColor: { r: number, g: number, b: number }) => {
    const stack: [number, number, { r: number, g: number, b: number }][] = [[startX, startY, seedColor]];

    while (stack.length > 0) {
      const [x, y, parentColor] = stack.pop()!;

      if (x < 0 || x >= width || y < minY || y >= height) continue; // Enforce vertical constraint
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
 * Detect edges using Sobel operator
 * Returns edge magnitude map (0-1 normalized)
 */
function detectEdges(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number[][] {
  // Convert to grayscale first
  const gray: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      // Grayscale using luminance formula
      gray[y][x] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
  }

  // Sobel kernels
  const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

  const edges: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  let maxMagnitude = 0;

  // Apply Sobel operator
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;

      // Convolve with Sobel kernels
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixel = gray[y + ky][x + kx];
          gx += pixel * sobelX[ky + 1][kx + 1];
          gy += pixel * sobelY[ky + 1][kx + 1];
        }
      }

      // Calculate magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[y][x] = magnitude;
      maxMagnitude = Math.max(maxMagnitude, magnitude);
    }
  }

  // Normalize to 0-1
  if (maxMagnitude > 0) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        edges[y][x] /= maxMagnitude;
      }
    }
  }

  return edges;
}

/**
 * Remove pixels near strong edges from mask
 */
function removeEdgePixels(
  mask: number[][],
  edges: number[][],
  threshold: number
): number[][] {
  const height = mask.length;
  const width = mask[0].length;
  const result = mask.map(row => [...row]);

  // Remove pixels where edge strength exceeds threshold
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (edges[y][x] > threshold) {
        // Remove neighboring pixels around edges (1 pixel radius for balance)
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              result[ny][nx] = 0;
            }
          }
        }
      }
    }
  }

  return result;
}

/**
 * Remove small connected components (furniture legs, small objects)
 */
function removeSmallComponents(
  mask: number[][],
  width: number,
  height: number,
  minSize: number
): number[][] {
  const visited: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));
  const result: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));

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

  // Find all components
  const components: [number, number][][] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y][x] === 1 && !visited[y][x]) {
        const component = floodFill(y, x);
        if (component.length > 0) {
          components.push(component);
        }
      }
    }
  }

  // Keep only components larger than minSize
  for (const component of components) {
    if (component.length >= minSize) {
      for (const [y, x] of component) {
        result[y][x] = 1;
      }
    }
  }

  return result;
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
