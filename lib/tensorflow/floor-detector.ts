import { scaleMask } from './segmentation';
import type { SegmentationData } from '@/types';

/**
 * Detect floor area using SAM 2 API with fallback to local detection
 */
export async function detectFloor(
  image: HTMLImageElement
): Promise<SegmentationData> {
  try {
    console.log('Detecting floor area...');

    // Try SAM 2 API first
    try {
      const sam2Result = await detectFloorWithSAM2(image);
      if (sam2Result) {
        console.log('SAM 2 detection successful');
        return sam2Result;
      }
    } catch (apiError) {
      console.log('SAM 2 API not available, using local detection:', apiError);
    }

    // Fallback to local detection
    return detectFloorLocal(image);
  } catch (error) {
    console.error('Error detecting floor:', error);
    throw error;
  }
}

/**
 * Detect floor using SAM 2 API
 */
async function detectFloorWithSAM2(
  image: HTMLImageElement
): Promise<SegmentationData | null> {
  // Convert image to base64
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, 0, 0);
  const base64Image = canvas.toDataURL('image/jpeg', 0.9);

  // Multiple click points on the floor area (normalized 0-1)
  const floorPoints = [
    [0.5, 0.85],   // Center bottom
    [0.3, 0.85],   // Left bottom
    [0.7, 0.85],   // Right bottom
    [0.5, 0.75],   // Center lower
    [0.2, 0.9],    // Far left bottom
    [0.8, 0.9],    // Far right bottom
  ];

  const response = await fetch('/api/segment-floor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: base64Image,
      points: floorPoints,
    }),
  });

  const result = await response.json();

  // If API says to use local detection, return null to trigger fallback
  if (result.useLocalDetection || !result.success || !result.mask) {
    console.log('SAM 2 API unavailable, falling back to local detection');
    return null;
  }

  // Process SAM 2 mask output
  const mask = await processSAM2Mask(result.mask, image.width, image.height);

  return {
    mask,
    width: image.width,
    height: image.height,
    confidence: 0.95,
  };
}

/**
 * Process SAM 2 mask output (can be URL or base64)
 */
async function processSAM2Mask(
  maskData: string | { combined_mask?: string; masks?: string[] },
  targetWidth: number,
  targetHeight: number
): Promise<number[][]> {
  let maskUrl: string;

  if (typeof maskData === 'string') {
    maskUrl = maskData;
  } else if (maskData.combined_mask) {
    maskUrl = maskData.combined_mask;
  } else if (maskData.masks && maskData.masks.length > 0) {
    maskUrl = maskData.masks[0];
  } else {
    throw new Error('Invalid mask data from SAM 2');
  }

  // Load the mask image
  const maskImage = await loadImage(maskUrl);

  // Convert to mask array
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(maskImage, 0, 0, targetWidth, targetHeight);

  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const data = imageData.data;

  const mask: number[][] = Array(targetHeight).fill(null).map(() => Array(targetWidth).fill(0));

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const i = (y * targetWidth + x) * 4;
      // SAM 2 masks are typically white (255) for segmented area
      mask[y][x] = data[i] > 128 ? 1 : 0;
    }
  }

  return mask;
}

/**
 * Load image from URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Local floor detection fallback
 * Handles images of all sizes from phones and cameras
 * Improved to exclude walls and detect complete floor area
 */
async function detectFloorLocal(
  image: HTMLImageElement
): Promise<SegmentationData> {
  console.log(`Using local floor detection for image: ${image.width}x${image.height}`);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Adaptive scaling based on image size
  // Use larger processing size for better quality on high-res images
  const maxDim = Math.min(800, Math.max(400, Math.min(image.width, image.height) / 2));
  const scale = Math.min(maxDim / Math.max(image.width, image.height), 1);
  const width = Math.max(100, Math.floor(image.width * scale));
  const height = Math.max(100, Math.floor(image.height * scale));

  console.log(`Processing at ${width}x${height} (scale: ${scale.toFixed(3)})`);

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // STEP 1: Detect wall regions to exclude them
  console.log('Detecting wall regions to exclude...');
  const wallMask = detectWallRegions(data, width, height);
  const wallCoverage = calculateCoverage(wallMask);
  console.log(`Wall coverage detected: ${(wallCoverage * 100).toFixed(1)}%`);

  // STEP 2: Flood fill from bottom with adaptive threshold (floor-only region)
  let mask = floodFillFromBottomFloorOnly(data, width, height, wallMask);
  let coverage = calculateCoverage(mask);
  console.log(`Flood fill (wall-excluded) coverage: ${(coverage * 100).toFixed(1)}%`);

  // Strategy 2: If flood fill didn't find enough, use bottom region detection
  if (coverage < 0.10) {
    console.log('Flood fill insufficient, using bottom region strategy...');
    mask = detectBottomRegionFloorOnly(data, width, height, wallMask);
    coverage = calculateCoverage(mask);
    console.log(`Bottom region coverage: ${(coverage * 100).toFixed(1)}%`);
  }

  // Strategy 3: Try with more relaxed color matching (still excluding walls)
  if (coverage < 0.08) {
    console.log('Trying relaxed color matching...');
    mask = detectBottomRegionRelaxedFloorOnly(data, width, height, wallMask);
    coverage = calculateCoverage(mask);
    console.log(`Relaxed detection coverage: ${(coverage * 100).toFixed(1)}%`);
  }

  // Strategy 4: If still not enough, use horizontal band from bottom (last resort)
  if (coverage < 0.05) {
    console.log('Using fallback horizontal band strategy...');
    mask = createBottomBandMask(width, height, 0.35);
    // Still apply wall exclusion to the fallback
    mask = excludeWallsFromMask(mask, wallMask);
    coverage = calculateCoverage(mask);
  }

  // Edge detection to exclude furniture legs and sharp edges
  console.log('Detecting edges to exclude furniture...');
  const edges = detectEdges(data, width, height);
  mask = removeEdgePixels(mask, edges, 0.25);

  // Gentle erosion to remove thin furniture legs without losing floor
  mask = erode(mask, 2);
  mask = dilate(mask, 2);

  // Remove small components (likely furniture legs or small objects)
  const minComponentSize = Math.floor(width * height * 0.015);
  mask = removeSmallComponents(mask, width, height, minComponentSize);

  // Fill gaps with reduced dilation
  mask = dilate(mask, 3);
  mask = erode(mask, 2);

  // Keep largest component that touches the bottom of the image
  mask = keepLargestBottomComponent(mask, width, height);

  // Fill holes
  mask = fillHoles(mask, width, height);

  // Smooth edges
  mask = dilate(mask, 2);
  mask = erode(mask, 1);

  // Final wall exclusion pass to ensure no wall pixels remain
  mask = excludeWallsFromMask(mask, wallMask);

  coverage = calculateCoverage(mask);
  console.log(`Floor detection complete. Final coverage: ${(coverage * 100).toFixed(1)}%`);

  const scaledMask = scaleMask(mask, image.width, image.height);

  return {
    mask: scaledMask,
    width: image.width,
    height: image.height,
    confidence: 0.85,
  };
}

/**
 * Detect wall regions based on position only (simpler, more reliable)
 * Walls are typically in the upper portion of the image
 * We use a conservative approach - only mark the upper 40% as definite wall
 */
function detectWallRegions(
  data: Uint8ClampedArray,
  width: number,
  height: number
): number[][] {
  const wallMask: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));

  // Sample floor color from the very bottom of the image
  const floorSampleY = height - 5;
  const floorColors: { r: number, g: number, b: number }[] = [];

  for (const pct of [0.2, 0.35, 0.5, 0.65, 0.8]) {
    const x = Math.floor(width * pct);
    const i = (floorSampleY * width + x) * 4;
    floorColors.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
  }

  // Calculate median floor color
  const sortedR = floorColors.map(c => c.r).sort((a, b) => a - b);
  const sortedG = floorColors.map(c => c.g).sort((a, b) => a - b);
  const sortedB = floorColors.map(c => c.b).sort((a, b) => a - b);
  const mid = Math.floor(floorColors.length / 2);

  const floorColor = {
    r: sortedR[mid],
    g: sortedG[mid],
    b: sortedB[mid],
  };

  // Sample wall color from upper portion
  const wallSampleY = Math.floor(height * 0.15);
  const wallColors: { r: number, g: number, b: number }[] = [];

  for (const pct of [0.2, 0.35, 0.5, 0.65, 0.8]) {
    const x = Math.floor(width * pct);
    const i = (wallSampleY * width + x) * 4;
    wallColors.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
  }

  const wallSortedR = wallColors.map(c => c.r).sort((a, b) => a - b);
  const wallSortedG = wallColors.map(c => c.g).sort((a, b) => a - b);
  const wallSortedB = wallColors.map(c => c.b).sort((a, b) => a - b);

  const wallColor = {
    r: wallSortedR[mid],
    g: wallSortedG[mid],
    b: wallSortedB[mid],
  };

  // Check if wall and floor colors are significantly different
  const wallFloorDiff = Math.sqrt(
    Math.pow(wallColor.r - floorColor.r, 2) +
    Math.pow(wallColor.g - floorColor.g, 2) +
    Math.pow(wallColor.b - floorColor.b, 2)
  );

  console.log(`Wall-floor color difference: ${wallFloorDiff.toFixed(1)}`);

  // If colors are too similar, don't try to detect walls by color
  // Just use position-based wall detection (upper 30% is wall) - less aggressive
  if (wallFloorDiff < 40) {
    console.log('Wall and floor colors similar - using position-only wall detection');
    const wallEndY = Math.floor(height * 0.30);
    for (let y = 0; y < wallEndY; y++) {
      for (let x = 0; x < width; x++) {
        wallMask[y][x] = 1;
      }
    }
    return wallMask;
  }

  // Colors are different enough - use color-based detection
  // Only mark pixels as wall if they're in upper 40% AND match wall color better than floor
  const maxWallY = Math.floor(height * 0.40);

  for (let y = 0; y < maxWallY; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];

      const distToWall = Math.sqrt(
        Math.pow(r - wallColor.r, 2) +
        Math.pow(g - wallColor.g, 2) +
        Math.pow(b - wallColor.b, 2)
      );

      const distToFloor = Math.sqrt(
        Math.pow(r - floorColor.r, 2) +
        Math.pow(g - floorColor.g, 2) +
        Math.pow(b - floorColor.b, 2)
      );

      // Mark as wall if closer to wall color than floor color
      // And wall color match is reasonably good (more permissive threshold)
      if (distToWall < distToFloor && distToWall < 70) {
        wallMask[y][x] = 1;
      }
    }
  }

  return wallMask;
}

/**
 * Exclude wall pixels from a mask
 */
function excludeWallsFromMask(mask: number[][], wallMask: number[][]): number[][] {
  const height = mask.length;
  const width = mask[0].length;
  const result: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Only include pixel if it's in the mask AND not in the wall mask
      result[y][x] = (mask[y][x] === 1 && wallMask[y][x] === 0) ? 1 : 0;
    }
  }

  return result;
}

/**
 * Flood fill from bottom, excluding wall regions
 */
function floodFillFromBottomFloorOnly(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  wallMask: number[][]
): number[][] {
  const mask: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  const visited: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));

  // More permissive color threshold to detect complete floor across all resolutions
  const colorThreshold = 80;

  // Allow floor detection in bottom 80% of image
  const minY = Math.floor(height * 0.20);

  const getColor = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return { r: data[i], g: data[i + 1], b: data[i + 2] };
  };

  const colorDist = (c1: { r: number, g: number, b: number }, c2: { r: number, g: number, b: number }) => {
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
    );
  };

  const fill = (startX: number, startY: number, seedColor: { r: number, g: number, b: number }) => {
    const stack: [number, number, { r: number, g: number, b: number }][] = [[startX, startY, seedColor]];

    while (stack.length > 0) {
      const [x, y, parentColor] = stack.pop()!;

      // Check bounds and wall exclusion
      if (x < 0 || x >= width || y < minY || y >= height) continue;
      if (visited[y][x]) continue;
      if (wallMask[y][x] === 1) continue; // Skip wall pixels

      visited[y][x] = true;

      const currentColor = getColor(x, y);
      const dist = colorDist(currentColor, parentColor);

      if (dist <= colorThreshold) {
        mask[y][x] = 1;
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
    if (!visited[bottomY][x] && wallMask[bottomY][x] === 0) {
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
    if (seed.y >= minY && !visited[seed.y][seed.x] && wallMask[seed.y][seed.x] === 0) {
      const seedColor = getColor(seed.x, seed.y);
      fill(seed.x, seed.y, seedColor);
    }
  }

  return mask;
}

/**
 * Detect bottom region, excluding wall pixels
 */
function detectBottomRegionFloorOnly(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  wallMask: number[][]
): number[][] {
  const mask: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));

  // Sample colors from the very bottom (bottom 15%)
  const sampleStartY = Math.floor(height * 0.85);
  const samplePoints: { r: number, g: number, b: number }[] = [];

  for (let y = sampleStartY; y < height; y += 2) {
    for (const pct of [0.2, 0.35, 0.5, 0.65, 0.8]) {
      const x = Math.floor(width * pct);
      if (wallMask[y][x] === 0) { // Only sample non-wall pixels
        const i = (y * width + x) * 4;
        samplePoints.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
      }
    }
  }

  if (samplePoints.length === 0) {
    return mask;
  }

  const sortedR = samplePoints.map(c => c.r).sort((a, b) => a - b);
  const sortedG = samplePoints.map(c => c.g).sort((a, b) => a - b);
  const sortedB = samplePoints.map(c => c.b).sort((a, b) => a - b);
  const mid = Math.floor(samplePoints.length / 2);

  const floorColor = {
    r: sortedR[mid],
    g: sortedG[mid],
    b: sortedB[mid],
  };

  // More permissive threshold to detect complete floor across all resolutions
  const threshold = 85;

  // Allow floor detection in bottom 80% of image
  const minY = Math.floor(height * 0.20);

  for (let y = minY; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Skip wall pixels
      if (wallMask[y][x] === 1) continue;

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
 * Detect bottom region with relaxed matching, excluding walls
 */
function detectBottomRegionRelaxedFloorOnly(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  wallMask: number[][]
): number[][] {
  const mask: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));

  const sampleStartY = Math.floor(height * 0.75);
  const samplePoints: { r: number, g: number, b: number }[] = [];

  for (let y = sampleStartY; y < height; y += 3) {
    for (const pct of [0.15, 0.3, 0.45, 0.55, 0.7, 0.85]) {
      const x = Math.floor(width * pct);
      if (wallMask[y][x] === 0) {
        const i = (y * width + x) * 4;
        samplePoints.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
      }
    }
  }

  if (samplePoints.length === 0) {
    return mask;
  }

  const sortedR = samplePoints.map(c => c.r).sort((a, b) => a - b);
  const sortedG = samplePoints.map(c => c.g).sort((a, b) => a - b);
  const sortedB = samplePoints.map(c => c.b).sort((a, b) => a - b);
  const mid = Math.floor(samplePoints.length / 2);

  const floorColor = {
    r: sortedR[mid],
    g: sortedG[mid],
    b: sortedB[mid],
  };

  // Very permissive threshold for relaxed detection across all resolutions
  const threshold = 100;

  // Allow floor detection in bottom 85% of image
  const minY = Math.floor(height * 0.15);

  for (let y = minY; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (wallMask[y][x] === 1) continue;

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
 * Keep the largest component that touches the bottom of the image
 * This ensures we only keep the actual floor, not floating artifacts
 */
function keepLargestBottomComponent(mask: number[][], width: number, height: number): number[][] {
  const visited: boolean[][] = Array(height).fill(null).map(() => Array(width).fill(false));
  let largest: [number, number][] = [];
  let largestTouchesBottom = false;

  const floodFill = (startY: number, startX: number): { pixels: [number, number][], touchesBottom: boolean } => {
    const stack: [number, number][] = [[startY, startX]];
    const component: [number, number][] = [];
    let touchesBottom = false;

    while (stack.length > 0) {
      const [y, x] = stack.pop()!;
      if (y < 0 || y >= height || x < 0 || x >= width) continue;
      if (visited[y][x] || mask[y][x] === 0) continue;

      visited[y][x] = true;
      component.push([y, x]);

      // Check if this component touches the bottom 5% of the image
      if (y >= height * 0.95) {
        touchesBottom = true;
      }

      stack.push([y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]);
    }

    return { pixels: component, touchesBottom };
  };

  // Find all components and prefer ones that touch the bottom
  const components: { pixels: [number, number][], touchesBottom: boolean }[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y][x] === 1 && !visited[y][x]) {
        components.push(floodFill(y, x));
      }
    }
  }

  // First, try to find the largest component that touches the bottom
  for (const comp of components) {
    if (comp.touchesBottom) {
      if (comp.pixels.length > largest.length || !largestTouchesBottom) {
        largest = comp.pixels;
        largestTouchesBottom = true;
      }
    } else if (!largestTouchesBottom && comp.pixels.length > largest.length) {
      largest = comp.pixels;
    }
  }

  const result: number[][] = Array(height).fill(null).map(() => Array(width).fill(0));
  for (const [y, x] of largest) {
    result[y][x] = 1;
  }

  return result;
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
