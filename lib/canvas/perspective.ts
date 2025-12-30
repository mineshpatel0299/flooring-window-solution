import type { PerspectiveTransform, Point } from '@/types';

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
