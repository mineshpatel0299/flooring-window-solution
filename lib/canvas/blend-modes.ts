import type { BlendMode } from '@/types';

/**
 * Apply blend mode between base and overlay images
 */
export function applyBlendMode(
  base: ImageData,
  overlay: ImageData,
  mask: number[][],
  blendMode: BlendMode,
  opacity: number = 1
): ImageData {
  const result = new ImageData(base.width, base.height);

  for (let y = 0; y < base.height; y++) {
    for (let x = 0; x < base.width; x++) {
      const index = (y * base.width + x) * 4;

      // Get mask value (0-1)
      const maskValue = mask[y] && mask[y][x] !== undefined ? mask[y][x] : 0;

      if (maskValue === 0) {
        // No overlay, use base
        result.data[index] = base.data[index];
        result.data[index + 1] = base.data[index + 1];
        result.data[index + 2] = base.data[index + 2];
        result.data[index + 3] = base.data[index + 3];
        continue;
      }

      // Get base and overlay colors
      const baseR = base.data[index];
      const baseG = base.data[index + 1];
      const baseB = base.data[index + 2];
      const baseA = base.data[index + 3];

      const overlayR = overlay.data[index];
      const overlayG = overlay.data[index + 1];
      const overlayB = overlay.data[index + 2];
      const overlayA = overlay.data[index + 3];

      // Apply blend mode
      let blendedR, blendedG, blendedB;

      switch (blendMode) {
        case 'multiply':
          blendedR = (baseR * overlayR) / 255;
          blendedG = (baseG * overlayG) / 255;
          blendedB = (baseB * overlayB) / 255;
          break;

        case 'overlay':
          blendedR = overlayBlend(baseR, overlayR);
          blendedG = overlayBlend(baseG, overlayG);
          blendedB = overlayBlend(baseB, overlayB);
          break;

        case 'replace':
          // Complete replacement - texture fully replaces the floor
          if (maskValue > 0.5) {
            // Inside the mask - fully replace with texture (use overlay directly)
            if (opacity >= 1) {
              // Full opacity - direct replacement, no blending with original
              result.data[index] = overlayR;
              result.data[index + 1] = overlayG;
              result.data[index + 2] = overlayB;
            } else {
              // Partial opacity - blend with original
              result.data[index] = Math.round(baseR * (1 - opacity) + overlayR * opacity);
              result.data[index + 1] = Math.round(baseG * (1 - opacity) + overlayG * opacity);
              result.data[index + 2] = Math.round(baseB * (1 - opacity) + overlayB * opacity);
            }
            result.data[index + 3] = baseA;
          } else if (maskValue > 0) {
            // Edge pixels - blend for anti-aliasing
            const edgeFactor = maskValue * 2 * opacity;
            result.data[index] = Math.round(baseR * (1 - edgeFactor) + overlayR * edgeFactor);
            result.data[index + 1] = Math.round(baseG * (1 - edgeFactor) + overlayG * edgeFactor);
            result.data[index + 2] = Math.round(baseB * (1 - edgeFactor) + overlayB * edgeFactor);
            result.data[index + 3] = baseA;
          } else {
            // Outside mask - keep original
            result.data[index] = baseR;
            result.data[index + 1] = baseG;
            result.data[index + 2] = baseB;
            result.data[index + 3] = baseA;
          }
          continue;

        case 'normal':
        default:
          blendedR = overlayR;
          blendedG = overlayG;
          blendedB = overlayB;
          break;
      }

      // Apply opacity and mask
      const finalOpacity = opacity * maskValue * (overlayA / 255);

      result.data[index] = Math.round(baseR * (1 - finalOpacity) + blendedR * finalOpacity);
      result.data[index + 1] = Math.round(baseG * (1 - finalOpacity) + blendedG * finalOpacity);
      result.data[index + 2] = Math.round(baseB * (1 - finalOpacity) + blendedB * finalOpacity);
      result.data[index + 3] = baseA;
    }
  }

  return result;
}

/**
 * Overlay blend mode formula
 */
function overlayBlend(base: number, overlay: number): number {
  const b = base / 255;
  const o = overlay / 255;

  if (b < 0.5) {
    return 2 * b * o * 255;
  } else {
    return (1 - 2 * (1 - b) * (1 - o)) * 255;
  }
}

/**
 * Create ImageData from an image element
 */
export function imageToImageData(image: HTMLImageElement | HTMLCanvasElement): ImageData {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  canvas.width = image.width;
  canvas.height = image.height;

  ctx.drawImage(image, 0, 0);

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Create a tiled texture pattern
 */
export function createTiledTexture(
  textureImage: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const textureWidth = textureImage.width;
  const textureHeight = textureImage.height;

  // Tile the texture
  for (let y = 0; y < targetHeight; y += textureHeight) {
    for (let x = 0; x < targetWidth; x += textureWidth) {
      ctx.drawImage(textureImage, x, y);
    }
  }

  return canvas;
}

/**
 * Adjust texture brightness to match lighting
 */
export function adjustBrightness(
  imageData: ImageData,
  brightness: number // -1 to 1
): ImageData {
  const result = new ImageData(imageData.width, imageData.height);
  const adjustment = brightness * 255;

  for (let i = 0; i < imageData.data.length; i += 4) {
    result.data[i] = Math.max(0, Math.min(255, imageData.data[i] + adjustment));
    result.data[i + 1] = Math.max(0, Math.min(255, imageData.data[i + 1] + adjustment));
    result.data[i + 2] = Math.max(0, Math.min(255, imageData.data[i + 2] + adjustment));
    result.data[i + 3] = imageData.data[i + 3];
  }

  return result;
}

/**
 * Preserve lighting from original image in overlay
 */
export function preserveLighting(
  overlay: ImageData,
  original: ImageData,
  strength: number = 0.5
): ImageData {
  const result = new ImageData(overlay.width, overlay.height);

  for (let i = 0; i < overlay.data.length; i += 4) {
    // Calculate luminance of original pixel
    const origR = original.data[i];
    const origG = original.data[i + 1];
    const origB = original.data[i + 2];
    const origLuminance = 0.299 * origR + 0.587 * origG + 0.114 * origB;

    // Calculate luminance adjustment factor
    const factor = (origLuminance / 127.5 - 1) * strength + 1;

    // Apply to overlay
    result.data[i] = Math.max(0, Math.min(255, overlay.data[i] * factor));
    result.data[i + 1] = Math.max(0, Math.min(255, overlay.data[i + 1] * factor));
    result.data[i + 2] = Math.max(0, Math.min(255, overlay.data[i + 2] * factor));
    result.data[i + 3] = overlay.data[i + 3];
  }

  return result;
}

/**
 * Feather/blur the edges of the mask for smoother blending
 */
export function featherMask(mask: number[][], radius: number = 3): number[][] {
  const height = mask.length;
  const width = mask[0].length;
  const feathered: number[][] = [];

  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;

      // Average with neighbors
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

      row.push(sum / count);
    }
    feathered.push(row);
  }

  return feathered;
}
