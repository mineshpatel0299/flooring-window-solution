import type { PerspectiveTransform, Point } from '@/types';

export interface FloorPlane {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
  vanishingPoint?: Point;
  perspectiveRatio: number;
}

/**
 * Detect floor plane boundaries from segmentation mask
 */
export function detectFloorPlane(mask: number[][]): FloorPlane | null {
  const height = mask.length;
  const width = mask[0].length;

  // Find floor boundaries
  let topY = -1, bottomY = -1;

  for (let y = 0; y < height; y++) {
    if (mask[y].some(v => v > 0.5)) {
      if (topY === -1) topY = y;
      bottomY = y;
    }
  }

  if (topY === -1 || bottomY === -1) return null;

  // Find edges at top and bottom
  let topLeftX = -1, topRightX = -1;
  for (let x = 0; x < width; x++) {
    if (mask[topY][x] > 0.5) {
      if (topLeftX === -1) topLeftX = x;
      topRightX = x;
    }
  }

  let bottomLeftX = -1, bottomRightX = -1;
  for (let x = 0; x < width; x++) {
    if (mask[bottomY][x] > 0.5) {
      if (bottomLeftX === -1) bottomLeftX = x;
      bottomRightX = x;
    }
  }

  if (topLeftX === -1 || bottomLeftX === -1) return null;

  const topWidth = topRightX - topLeftX;
  const bottomWidth = bottomRightX - bottomLeftX;
  const perspectiveRatio = bottomWidth > 0 ? Math.max(0, Math.min(1, 1 - (topWidth / bottomWidth))) : 0;

  return {
    topLeft: { x: topLeftX, y: topY },
    topRight: { x: topRightX, y: topY },
    bottomLeft: { x: bottomLeftX, y: bottomY },
    bottomRight: { x: bottomRightX, y: bottomY },
    perspectiveRatio,
  };
}

/**
 * Apply perspective-aware texture mapping
 * Stretches the texture to fit the entire floor area with perspective correction
 */
export function applyPerspectiveTexture(
  textureData: ImageData,
  mask: number[][],
  floorPlane: FloorPlane,
  _tileScale: number = 1 // Kept for compatibility but not used
): ImageData {
  const height = mask.length;
  const width = mask[0].length;
  const output = new ImageData(width, height);

  const texWidth = textureData.width;
  const texHeight = textureData.height;

  // Calculate floor bounds
  const topY = floorPlane.topLeft.y;
  const bottomY = floorPlane.bottomLeft.y;
  const floorHeight = Math.max(1, bottomY - topY);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      if (mask[y][x] < 0.5) {
        output.data[idx + 3] = 0;
        continue;
      }

      // Calculate normalized position within floor bounds (0-1)
      const normalizedY = Math.max(0, Math.min(1, (y - topY) / floorHeight));

      // Calculate row width at this Y position (perspective)
      const leftX = lerp(floorPlane.topLeft.x, floorPlane.bottomLeft.x, normalizedY);
      const rightX = lerp(floorPlane.topRight.x, floorPlane.bottomRight.x, normalizedY);
      const rowWidth = Math.max(1, rightX - leftX);
      const normalizedX = Math.max(0, Math.min(1, (x - leftX) / rowWidth));

      // Map normalized coordinates directly to texture coordinates
      // This stretches the texture to fit the entire floor
      let texX = normalizedX * (texWidth - 1);
      let texY = normalizedY * (texHeight - 1);

      // Clamp to valid range
      texX = Math.max(0, Math.min(texWidth - 1, texX));
      texY = Math.max(0, Math.min(texHeight - 1, texY));

      // Bilinear interpolation for smooth texture sampling
      const x0 = Math.floor(texX);
      const y0 = Math.floor(texY);
      const x1 = Math.min(x0 + 1, texWidth - 1);
      const y1 = Math.min(y0 + 1, texHeight - 1);
      const fx = texX - x0;
      const fy = texY - y0;

      const getPixel = (px: number, py: number) => {
        const i = (py * texWidth + px) * 4;
        return [
          textureData.data[i],
          textureData.data[i + 1],
          textureData.data[i + 2],
          textureData.data[i + 3]
        ];
      };

      const p00 = getPixel(x0, y0);
      const p10 = getPixel(x1, y0);
      const p01 = getPixel(x0, y1);
      const p11 = getPixel(x1, y1);

      // Interpolate RGB channels
      for (let c = 0; c < 3; c++) {
        output.data[idx + c] = Math.round(
          p00[c] * (1 - fx) * (1 - fy) + p10[c] * fx * (1 - fy) +
          p01[c] * (1 - fx) * fy + p11[c] * fx * fy
        );
      }
      // Force alpha to 255 for floor pixels (fully opaque)
      output.data[idx + 3] = 255;
    }
  }

  return output;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Apply lighting adjustments to match room lighting
 */
export function applyLightingAdjustment(
  textureData: ImageData,
  originalData: ImageData,
  mask: number[][],
  intensity: number = 0.4
): ImageData {
  const width = originalData.width;
  const height = originalData.height;
  const output = new ImageData(width, height);

  // Calculate average brightness of original floor
  let totalBrightness = 0;
  let count = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y]?.[x] > 0.5) {
        const idx = (y * width + x) * 4;
        totalBrightness += (originalData.data[idx] + originalData.data[idx + 1] + originalData.data[idx + 2]) / 3;
        count++;
      }
    }
  }

  const avgBrightness = count > 0 ? totalBrightness / count : 128;
  const globalFactor = avgBrightness / 128;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      if (!mask[y] || mask[y][x] < 0.5) {
        output.data[idx] = originalData.data[idx];
        output.data[idx + 1] = originalData.data[idx + 1];
        output.data[idx + 2] = originalData.data[idx + 2];
        output.data[idx + 3] = originalData.data[idx + 3];
        continue;
      }

      // Local brightness adjustment
      const localBrightness = (originalData.data[idx] + originalData.data[idx + 1] + originalData.data[idx + 2]) / 3;
      const localFactor = avgBrightness > 0 ? localBrightness / avgBrightness : 1;
      const adjustment = 1 + (localFactor - 1) * intensity;

      output.data[idx] = Math.min(255, Math.max(0, Math.round(textureData.data[idx] * globalFactor * adjustment)));
      output.data[idx + 1] = Math.min(255, Math.max(0, Math.round(textureData.data[idx + 1] * globalFactor * adjustment)));
      output.data[idx + 2] = Math.min(255, Math.max(0, Math.round(textureData.data[idx + 2] * globalFactor * adjustment)));
      output.data[idx + 3] = textureData.data[idx + 3];
    }
  }

  return output;
}

/**
 * Blend edges seamlessly
 */
export function blendEdges(
  textureData: ImageData,
  originalData: ImageData,
  mask: number[][],
  blendWidth: number = 4
): ImageData {
  const width = originalData.width;
  const height = originalData.height;
  const output = new ImageData(width, height);

  // Create edge distance map
  const distanceMap = createDistanceMap(mask, width, height, blendWidth);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const maskValue = mask[y]?.[x] ?? 0;
      const distance = distanceMap[y]?.[x] ?? blendWidth;

      if (maskValue < 0.5) {
        output.data[idx] = originalData.data[idx];
        output.data[idx + 1] = originalData.data[idx + 1];
        output.data[idx + 2] = originalData.data[idx + 2];
        output.data[idx + 3] = originalData.data[idx + 3];
      } else if (distance < blendWidth) {
        const t = distance / blendWidth;
        const smooth = t * t * (3 - 2 * t); // Smoothstep

        output.data[idx] = Math.round(originalData.data[idx] * (1 - smooth) + textureData.data[idx] * smooth);
        output.data[idx + 1] = Math.round(originalData.data[idx + 1] * (1 - smooth) + textureData.data[idx + 1] * smooth);
        output.data[idx + 2] = Math.round(originalData.data[idx + 2] * (1 - smooth) + textureData.data[idx + 2] * smooth);
        output.data[idx + 3] = originalData.data[idx + 3];
      } else {
        output.data[idx] = textureData.data[idx];
        output.data[idx + 1] = textureData.data[idx + 1];
        output.data[idx + 2] = textureData.data[idx + 2];
        output.data[idx + 3] = originalData.data[idx + 3];
      }
    }
  }

  return output;
}

function createDistanceMap(mask: number[][], width: number, height: number, maxDist: number): number[][] {
  const distMap: number[][] = Array(height).fill(null).map(() => Array(width).fill(maxDist));

  // Find edge pixels
  const queue: [number, number][] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if ((mask[y]?.[x] ?? 0) > 0.5) {
        const neighbors = [[y-1, x], [y+1, x], [y, x-1], [y, x+1]];
        for (const [ny, nx] of neighbors) {
          if (ny < 0 || ny >= height || nx < 0 || nx >= width || (mask[ny]?.[nx] ?? 0) < 0.5) {
            distMap[y][x] = 0;
            queue.push([y, x]);
            break;
          }
        }
      }
    }
  }

  // BFS for distance
  while (queue.length > 0) {
    const [y, x] = queue.shift()!;
    const dist = distMap[y][x];
    if (dist >= maxDist) continue;

    for (const [dy, dx] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const ny = y + dy, nx = x + dx;
      if (ny >= 0 && ny < height && nx >= 0 && nx < width &&
          (mask[ny]?.[nx] ?? 0) > 0.5 && distMap[ny][nx] > dist + 1) {
        distMap[ny][nx] = dist + 1;
        queue.push([ny, nx]);
      }
    }
  }

  return distMap;
}

/**
 * Calculate perspective transformation matrix
 * Maps source quad to destination quad
 */
export function calculatePerspectiveMatrix(
  src: PerspectiveTransform,
  dst: PerspectiveTransform
): number[] {
  // Source points
  const x1 = src.topLeft.x;
  const y1 = src.topLeft.y;
  const x2 = src.topRight.x;
  const y2 = src.topRight.y;
  const x3 = src.bottomRight.x;
  const y3 = src.bottomRight.y;
  const x4 = src.bottomLeft.x;
  const y4 = src.bottomLeft.y;

  // Destination points
  const X1 = dst.topLeft.x;
  const Y1 = dst.topLeft.y;
  const X2 = dst.topRight.x;
  const Y2 = dst.topRight.y;
  const X3 = dst.bottomRight.x;
  const Y3 = dst.bottomRight.y;
  const X4 = dst.bottomLeft.x;
  const Y4 = dst.bottomLeft.y;

  // Build the matrix (simplified homography)
  const matrix = [
    [x1, y1, 1, 0, 0, 0, -X1 * x1, -X1 * y1],
    [0, 0, 0, x1, y1, 1, -Y1 * x1, -Y1 * y1],
    [x2, y2, 1, 0, 0, 0, -X2 * x2, -X2 * y2],
    [0, 0, 0, x2, y2, 1, -Y2 * x2, -Y2 * y2],
    [x3, y3, 1, 0, 0, 0, -X3 * x3, -X3 * y3],
    [0, 0, 0, x3, y3, 1, -Y3 * x3, -Y3 * y3],
    [x4, y4, 1, 0, 0, 0, -X4 * x4, -X4 * y4],
    [0, 0, 0, x4, y4, 1, -Y4 * x4, -Y4 * y4],
  ];

  const b = [X1, Y1, X2, Y2, X3, Y3, X4, Y4];

  // Solve using Gaussian elimination (simplified)
  const result = solveLinearSystem(matrix, b);

  return [...result, 1]; // Add homogeneous coordinate
}

/**
 * Simplified linear system solver
 */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  const aug = A.map((row, i) => [...row, b[i]]);

  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
        maxRow = k;
      }
    }
    [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];

    // Eliminate column
    for (let k = i + 1; k < n; k++) {
      const factor = aug[k][i] / aug[i][i];
      for (let j = i; j <= n; j++) {
        aug[k][j] -= factor * aug[i][j];
      }
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n];
    for (let j = i + 1; j < n; j++) {
      x[i] -= aug[i][j] * x[j];
    }
    x[i] /= aug[i][i];
  }

  return x;
}

/**
 * Apply perspective transform to a point
 */
export function transformPoint(point: Point, matrix: number[]): Point {
  const [a, b, c, d, e, f, g, h] = matrix;
  const { x, y } = point;

  const denominator = g * x + h * y + 1;
  const newX = (a * x + b * y + c) / denominator;
  const newY = (d * x + e * y + f) / denominator;

  return { x: newX, y: newY };
}

/**
 * Create a perspective-transformed canvas from source image
 * Uses CSS transform for hardware acceleration
 */
export function applyPerspectiveTransform(
  sourceCanvas: HTMLCanvasElement,
  corners: PerspectiveTransform
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Calculate bounding box of the transformed quad
  const xs = [
    corners.topLeft.x,
    corners.topRight.x,
    corners.bottomLeft.x,
    corners.bottomRight.x,
  ];
  const ys = [
    corners.topLeft.y,
    corners.topRight.y,
    corners.bottomLeft.y,
    corners.bottomRight.y,
  ];

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  canvas.width = maxX - minX;
  canvas.height = maxY - minY;

  // Use setTransform for perspective (approximation)
  // For true perspective, we'd need to use WebGL or manual pixel mapping
  const tlX = corners.topLeft.x - minX;
  const tlY = corners.topLeft.y - minY;
  const trX = corners.topRight.x - minX;
  const brX = corners.bottomRight.x - minX;
  const brY = corners.bottomRight.y - minY;

  // Simple affine transform (good enough for most cases)
  const scaleX = (trX - tlX) / sourceCanvas.width;
  const scaleY = (brY - tlY) / sourceCanvas.height;

  ctx.save();
  ctx.translate(tlX, tlY);
  ctx.scale(scaleX, scaleY);
  ctx.drawImage(sourceCanvas, 0, 0);
  ctx.restore();

  return canvas;
}

/**
 * Get default corners for a rectangle (no perspective)
 */
export function getDefaultCorners(width: number, height: number): PerspectiveTransform {
  return {
    topLeft: { x: 0, y: 0 },
    topRight: { x: width, y: 0 },
    bottomLeft: { x: 0, y: height },
    bottomRight: { x: width, y: height },
  };
}

/**
 * Check if perspective transform is approximately rectangular
 */
export function isRectangular(corners: PerspectiveTransform, threshold: number = 5): boolean {
  const topWidth = corners.topRight.x - corners.topLeft.x;
  const bottomWidth = corners.bottomRight.x - corners.bottomLeft.x;
  const leftHeight = corners.bottomLeft.y - corners.topLeft.y;
  const rightHeight = corners.bottomRight.y - corners.topRight.y;

  const widthDiff = Math.abs(topWidth - bottomWidth);
  const heightDiff = Math.abs(leftHeight - rightHeight);

  return widthDiff < threshold && heightDiff < threshold;
}

/**
 * Adjust corners to maintain aspect ratio
 */
export function adjustCornersForAspectRatio(
  corners: PerspectiveTransform,
  aspectRatio: number
): PerspectiveTransform {
  const width = corners.topRight.x - corners.topLeft.x;
  const height = corners.bottomLeft.y - corners.topLeft.y;
  const currentRatio = width / height;

  if (Math.abs(currentRatio - aspectRatio) < 0.1) {
    return corners; // Already close enough
  }

  // Adjust to match aspect ratio
  let newWidth = width;
  let newHeight = height;

  if (currentRatio > aspectRatio) {
    newHeight = width / aspectRatio;
  } else {
    newWidth = height * aspectRatio;
  }

  const centerX = (corners.topLeft.x + corners.topRight.x) / 2;
  const centerY = (corners.topLeft.y + corners.bottomLeft.y) / 2;

  return {
    topLeft: { x: centerX - newWidth / 2, y: centerY - newHeight / 2 },
    topRight: { x: centerX + newWidth / 2, y: centerY - newHeight / 2 },
    bottomLeft: { x: centerX - newWidth / 2, y: centerY + newHeight / 2 },
    bottomRight: { x: centerX + newWidth / 2, y: centerY + newHeight / 2 },
  };
}
