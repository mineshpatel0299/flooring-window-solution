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
        result[y][x] = 0;
        
        // Also remove neighboring pixels for cleaner edges
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
