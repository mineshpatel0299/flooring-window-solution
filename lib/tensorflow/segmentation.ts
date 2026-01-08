import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import { loadSegmentationModel } from './models';
import { SEGMENTATION_CONFIDENCE_THRESHOLD, INFERENCE_MAX_DIMENSION } from '@/lib/constants';
import type { SegmentationData } from '@/types';

/**
 * Resize image to max dimension while maintaining aspect ratio
 */
function resizeImage(
  image: HTMLImageElement,
  maxDimension: number
): { canvas: HTMLCanvasElement; scale: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const aspectRatio = image.width / image.height;
  let targetWidth = image.width;
  let targetHeight = image.height;

  if (image.width > maxDimension || image.height > maxDimension) {
    if (image.width > image.height) {
      targetWidth = maxDimension;
      targetHeight = maxDimension / aspectRatio;
    } else {
      targetHeight = maxDimension;
      targetWidth = maxDimension * aspectRatio;
    }
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

  const scale = image.width / targetWidth;

  return { canvas, scale };
}

/**
 * Convert segmentation result to binary mask
 * Returns a 2D array where 1 = surface, 0 = not surface
 */
async function createBinaryMask(
  segmentation: bodySegmentation.Segmentation,
  width: number,
  height: number,
  invertMask: boolean = false
): Promise<number[][]> {
  const mask: number[][] = [];
  // Use toImageData() instead of toCanvasImageSource() to get ImageData
  const maskData = await segmentation.mask.toImageData();

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      // The mask data is in RGBA format, we use the alpha channel
      const value = maskData.data[index + 3] / 255;

      // For floor/window detection, we want the background (inverse of person)
      const binaryValue = invertMask ? (value < 0.5 ? 1 : 0) : (value > 0.5 ? 1 : 0);
      row.push(binaryValue);
    }
    mask.push(row);
  }

  return mask;
}

/**
 * Apply morphological operations to clean up the mask
 */
function morphologicalCleanup(mask: number[][], kernelSize: number = 5): number[][] {
  const height = mask.length;
  const width = mask[0].length;
  const cleaned: number[][] = [];

  const halfKernel = Math.floor(kernelSize / 2);

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;

      // Apply kernel
      for (let ky = -halfKernel; ky <= halfKernel; ky++) {
        for (let kx = -halfKernel; kx <= halfKernel; kx++) {
          const ny = y + ky;
          const nx = x + kx;

          if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
            sum += mask[ny][nx];
            count++;
          }
        }
      }

      // Threshold: if more than 50% of kernel is positive, mark as 1
      const value = sum / count > 0.5 ? 1 : 0;
      row.push(value);
    }
    cleaned.push(row);
  }

  return cleaned;
}

/**
 * Find the largest connected component in the mask
 */
function findLargestComponent(mask: number[][]): number[][] {
  const height = mask.length;
  const width = mask[0].length;
  const visited: boolean[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(false));

  let largestComponent: [number, number][] = [];
  let largestSize = 0;

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

      // Add neighbors
      stack.push([y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]);
    }

    return component;
  }

  // Find all connected components
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y][x] === 1 && !visited[y][x]) {
        const component = floodFill(y, x);
        if (component.length > largestSize) {
          largestSize = component.length;
          largestComponent = component;
        }
      }
    }
  }

  // Create new mask with only the largest component
  const resultMask: number[][] = Array(height)
    .fill(null)
    .map(() => Array(width).fill(0));

  for (const [y, x] of largestComponent) {
    resultMask[y][x] = 1;
  }

  return resultMask;
}

/**
 * Calculate average confidence score from the mask
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

  return count > 0 ? sum / count : 0;
}

/**
 * Main segmentation function
 * Processes an image and returns a segmentation mask
 */
export async function segmentImage(
  image: HTMLImageElement,
  invertMask: boolean = true // true for floor/window (background), false for foreground
): Promise<SegmentationData> {
  try {
    // Load the segmentation model
    const segmenter = await loadSegmentationModel();

    // Resize image for faster inference
    const { canvas, scale } = resizeImage(image, INFERENCE_MAX_DIMENSION);

    console.log(`Processing image: ${canvas.width}x${canvas.height} (scale: ${scale})`);

    // Run segmentation
    const segmentations = await segmenter.segmentPeople(canvas, {
      flipHorizontal: false,
      multiSegmentation: false,
      segmentBodyParts: false,
    });

    if (segmentations.length === 0) {
      throw new Error('No segmentation result');
    }

    const segmentation = segmentations[0];

    // Create binary mask
    let mask = await createBinaryMask(
      segmentation,
      canvas.width,
      canvas.height,
      invertMask
    );

    // Clean up mask with morphological operations
    mask = morphologicalCleanup(mask, 5);

    // Find largest connected component
    mask = findLargestComponent(mask);

    // Calculate confidence
    const confidence = calculateConfidence(mask);

    console.log(`Segmentation complete. Confidence: ${(confidence * 100).toFixed(2)}%`);

    // Return segmentation data
    return {
      mask,
      width: canvas.width,
      height: canvas.height,
      confidence,
    };
  } catch (error) {
    console.error('Error during segmentation:', error);
    throw error;
  }
}

/**
 * Convert mask data to ImageData for canvas rendering
 */
export function maskToImageData(mask: number[][], opacity: number = 1): ImageData {
  const height = mask.length;
  const width = mask[0].length;
  const imageData = new ImageData(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const value = mask[y][x];

      // White for mask area
      imageData.data[index] = 255; // R
      imageData.data[index + 1] = 255; // G
      imageData.data[index + 2] = 255; // B
      imageData.data[index + 3] = value * 255 * opacity; // A
    }
  }

  return imageData;
}

/**
 * Scale mask to match target dimensions
 */
export function scaleMask(
  mask: number[][],
  targetWidth: number,
  targetHeight: number
): number[][] {
  const srcHeight = mask.length;
  const srcWidth = mask[0].length;

  const scaleX = targetWidth / srcWidth;
  const scaleY = targetHeight / srcHeight;

  const scaledMask: number[][] = [];

  for (let y = 0; y < targetHeight; y++) {
    const row: number[] = [];
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.floor(x / scaleX);
      const srcY = Math.floor(y / scaleY);

      const value = mask[srcY] && mask[srcY][srcX] !== undefined ? mask[srcY][srcX] : 0;
      row.push(value);
    }
    scaledMask.push(row);
  }

  return scaledMask;
}
