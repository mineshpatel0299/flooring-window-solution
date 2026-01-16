import { scaleMask } from './segmentation';
import type { SegmentationData } from '@/types';

/**
 * Detect floor area in an image using color-based segmentation
 * This approach samples colors from the bottom of the image (likely floor)
 * and finds similar colored regions while excluding objects
 */
export async function detectFloor(
  image: HTMLImageElement
): Promise<SegmentationData> {
  try {
    console.log('Detecting floor area with color-based segmentation...');

    // Create canvas and get image data
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Use smaller dimensions for faster processing
    const maxDim = 800;
    const scale = Math.min(maxDim / image.width, maxDim / image.height, 1);
    const width = Math.floor(image.width * scale);
    const height = Math.floor(image.height * scale);

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);

    // Step 1: Sample floor colors from bottom portion of image
    const floorColors = sampleFloorColors(imageData, width, height);
    console.log(`Sampled ${floorColors.length} floor color clusters`);

    // Step 2: Create initial mask based on color similarity
    let mask = createColorBasedMask(imageData, width, height, floorColors);

    // Step 3: Apply edge detection to exclude objects
    const edgeMap = detectEdges(imageData, width, height);
    mask = applyEdgeFilter(mask, edgeMap, width, height);

    // Step 4: Apply position weighting (floor is at bottom)
    mask = applyPositionWeighting(mask, width, height);

    // Step 5: Morphological cleanup
    mask = morphologicalClose(mask, 5);
    mask = morphologicalOpen(mask, 3);

    // Step 6: Keep only floor-connected components
    mask = keepFloorComponents(mask, width, height);

    // Step 7: Fill holes in the floor mask
    mask = fillHoles(mask, width, height);

    // Calculate confidence
    const confidence = calculateConfidence(mask);
    console.log(`Floor detection complete. Confidence: ${(confidence * 100).toFixed(2)}%`);

    // Scale mask to original image dimensions
    const scaledMask = scaleMask(mask, image.width, image.height);

    return {
      mask: scaledMask,
      width: image.width,
      height: image.height,
      confidence,
    };
  } catch (error) {
    console.error('Error detecting floor:', error);
    throw error;
  }
}

/**
 * Color cluster for floor detection
 */
interface ColorCluster {
  r: number;
  g: number;
  b: number;
  h: number;
  s: number;
  l: number;
  count: number;
}

/**
 * Sample colors from the bottom portion of the image (likely floor area)
 */
function sampleFloorColors(
  imageData: ImageData,
  width: number,
  height: number
): ColorCluster[] {
  const data = imageData.data;
  const colors: ColorCluster[] = [];

  // Sample from bottom 25% of image, middle 60% horizontally
  const startY = Math.floor(height * 0.75);
  const endY = height;
  const startX = Math.floor(width * 0.2);
  const endX = Math.floor(width * 0.8);

  // Collect color samples
  const samples: { r: number; g: number; b: number }[] = [];
  const step = 4; // Sample every 4th pixel for speed

  for (let y = startY; y < endY; y += step) {
    for (let x = startX; x < endX; x += step) {
      const i = (y * width + x) * 4;
      samples.push({
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
      });
    }
  }

  // Cluster similar colors using simple k-means-like approach
  const clusters = clusterColors(samples, 5);

  // Convert to HSL and filter out very dark or very bright clusters
  for (const cluster of clusters) {
    const hsl = rgbToHsl(cluster.r, cluster.g, cluster.b);
    cluster.h = hsl.h;
    cluster.s = hsl.s;
    cluster.l = hsl.l;

    // Keep clusters that have reasonable brightness (not too dark/bright)
    if (cluster.l > 0.1 && cluster.l < 0.95) {
      colors.push(cluster);
    }
  }

  // Sort by count (most common colors first)
  colors.sort((a, b) => b.count - a.count);

  // Return top 3 most common floor colors
  return colors.slice(0, 3);
}

/**
 * Simple color clustering algorithm
 */
function clusterColors(
  samples: { r: number; g: number; b: number }[],
  numClusters: number
): ColorCluster[] {
  if (samples.length === 0) {
    return [];
  }

  // Initialize clusters with random samples
  const clusters: ColorCluster[] = [];
  const step = Math.floor(samples.length / numClusters);

  for (let i = 0; i < numClusters; i++) {
    const sample = samples[i * step] || samples[0];
    clusters.push({
      r: sample.r,
      g: sample.g,
      b: sample.b,
      h: 0,
      s: 0,
      l: 0,
      count: 0,
    });
  }

  // Run a few iterations of k-means
  for (let iter = 0; iter < 5; iter++) {
    // Reset counts
    for (const cluster of clusters) {
      cluster.count = 0;
    }

    const sums = clusters.map(() => ({ r: 0, g: 0, b: 0, count: 0 }));

    // Assign samples to nearest cluster
    for (const sample of samples) {
      let minDist = Infinity;
      let nearestIdx = 0;

      for (let i = 0; i < clusters.length; i++) {
        const dist = colorDistance(sample, clusters[i]);
        if (dist < minDist) {
          minDist = dist;
          nearestIdx = i;
        }
      }

      sums[nearestIdx].r += sample.r;
      sums[nearestIdx].g += sample.g;
      sums[nearestIdx].b += sample.b;
      sums[nearestIdx].count++;
    }

    // Update cluster centers
    for (let i = 0; i < clusters.length; i++) {
      if (sums[i].count > 0) {
        clusters[i].r = Math.round(sums[i].r / sums[i].count);
        clusters[i].g = Math.round(sums[i].g / sums[i].count);
        clusters[i].b = Math.round(sums[i].b / sums[i].count);
        clusters[i].count = sums[i].count;
      }
    }
  }

  return clusters.filter((c) => c.count > 0);
}

/**
 * Calculate color distance in RGB space
 */
function colorDistance(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number }
): number {
  // Use weighted Euclidean distance (human perception weighted)
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
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
 * Create mask based on color similarity to floor colors
 */
function createColorBasedMask(
  imageData: ImageData,
  width: number,
  height: number,
  floorColors: ColorCluster[]
): number[][] {
  const data = imageData.data;
  const mask: number[][] = [];

  // Color distance threshold (adjust for sensitivity)
  const threshold = 60;

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const pixel = {
        r: data[i],
        g: data[i + 1],
        b: data[i + 2],
      };

      // Check if pixel matches any floor color
      let isFloor = false;
      for (const floorColor of floorColors) {
        const dist = colorDistance(pixel, floorColor);
        if (dist < threshold) {
          isFloor = true;
          break;
        }
      }

      row.push(isFloor ? 1 : 0);
    }
    mask.push(row);
  }

  return mask;
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

  // Apply Sobel filter
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
      row.push(Math.min(magnitude / 255, 1));
    }
    edges.push(row);
  }

  return edges;
}

/**
 * Filter out areas with high edge density (likely objects)
 */
function applyEdgeFilter(
  mask: number[][],
  edgeMap: number[][],
  width: number,
  height: number
): number[][] {
  const result: number[][] = [];
  const edgeThreshold = 0.2;

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const edgeValue = edgeMap[y][x];

      // If high edge density, reduce likelihood of being floor
      if (edgeValue > edgeThreshold) {
        row.push(0);
      } else {
        row.push(mask[y][x]);
      }
    }
    result.push(row);
  }

  return result;
}

/**
 * Apply position weighting - floor is typically at the bottom
 */
function applyPositionWeighting(
  mask: number[][],
  width: number,
  height: number
): number[][] {
  const result: number[][] = [];

  // Floor typically starts around 30-40% from top
  const floorStartRatio = 0.35;
  const floorStartY = Math.floor(height * floorStartRatio);

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      if (y < floorStartY) {
        // Above floor line - unlikely to be floor
        row.push(0);
      } else {
        // Below floor line - keep the mask value
        row.push(mask[y][x]);
      }
    }
    result.push(row);
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
  const result: number[][] = [];
  const half = Math.floor(kernelSize / 2);

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
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
      row.push(maxVal);
    }
    result.push(row);
  }

  return result;
}

/**
 * Erode operation
 */
function erode(mask: number[][], kernelSize: number): number[][] {
  const height = mask.length;
  const width = mask[0].length;
  const result: number[][] = [];
  const half = Math.floor(kernelSize / 2);

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
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
      row.push(minVal);
    }
    result.push(row);
  }

  return result;
}

/**
 * Keep only components that are connected to the bottom of the image
 * This filters out floating objects
 */
function keepFloorComponents(
  mask: number[][],
  width: number,
  height: number
): number[][] {
  const visited: boolean[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));

  const result: number[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(0));

  // Flood fill from bottom edge to find floor-connected pixels
  function floodFill(startY: number, startX: number): [number, number][] {
    const stack: [number, number][] = [[startY, startX]];
    const component: [number, number][] = [];

    while (stack.length > 0) {
      const [y, x] = stack.pop()!;

      if (
        y < 0 ||
        y >= height ||
        x < 0 ||
        x >= width ||
        visited[y][x] ||
        mask[y][x] === 0
      ) {
        continue;
      }

      visited[y][x] = true;
      component.push([y, x]);

      stack.push([y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]);
    }

    return component;
  }

  // Start flood fill from bottom row
  const bottomRow = height - 1;
  const components: [number, number][][] = [];

  for (let x = 0; x < width; x++) {
    if (mask[bottomRow][x] === 1 && !visited[bottomRow][x]) {
      const component = floodFill(bottomRow, x);
      if (component.length > 0) {
        components.push(component);
      }
    }
  }

  // Also check near-bottom rows (last 5%)
  const nearBottom = Math.floor(height * 0.95);
  for (let y = nearBottom; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y][x] === 1 && !visited[y][x]) {
        const component = floodFill(y, x);
        if (component.length > 0) {
          components.push(component);
        }
      }
    }
  }

  // Keep components that are large enough (at least 5% of image)
  const minSize = (width * height) * 0.05;

  for (const component of components) {
    if (component.length >= minSize) {
      for (const [y, x] of component) {
        result[y][x] = 1;
      }
    }
  }

  // If no floor found from bottom, find largest component overall
  if (components.length === 0 || components.every((c) => c.length < minSize)) {
    // Reset visited
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        visited[y][x] = false;
      }
    }

    let largestComponent: [number, number][] = [];

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

    for (const [y, x] of largestComponent) {
      result[y][x] = 1;
    }
  }

  return result;
}

/**
 * Fill small holes in the floor mask
 */
function fillHoles(
  mask: number[][],
  width: number,
  height: number
): number[][] {
  const result: number[][] = mask.map((row) => [...row]);

  // Find holes (background pixels surrounded by floor pixels)
  const visited: boolean[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));

  // Mark all background pixels connected to edge as visited
  function markEdgeConnected(startY: number, startX: number): void {
    const stack: [number, number][] = [[startY, startX]];

    while (stack.length > 0) {
      const [y, x] = stack.pop()!;

      if (
        y < 0 ||
        y >= height ||
        x < 0 ||
        x >= width ||
        visited[y][x] ||
        mask[y][x] === 1
      ) {
        continue;
      }

      visited[y][x] = true;
      stack.push([y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]);
    }
  }

  // Start from all edges
  for (let x = 0; x < width; x++) {
    if (mask[0][x] === 0) markEdgeConnected(0, x);
    if (mask[height - 1][x] === 0) markEdgeConnected(height - 1, x);
  }
  for (let y = 0; y < height; y++) {
    if (mask[y][0] === 0) markEdgeConnected(y, 0);
    if (mask[y][width - 1] === 0) markEdgeConnected(y, width - 1);
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
 * Calculate confidence score
 */
function calculateConfidence(mask: number[][]): number {
  let sum = 0;
  let count = 0;

  for (const row of mask) {
    for (const value of row) {
      sum += value;
      count++;
    }
  }

  // Confidence based on coverage (floor typically covers 30-70% of image)
  const coverage = count > 0 ? sum / count : 0;

  // Optimal coverage is around 40-50%
  if (coverage >= 0.2 && coverage <= 0.7) {
    return 0.8 + (0.2 * (1 - Math.abs(coverage - 0.45) / 0.45));
  }

  return Math.max(0.3, coverage);
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
