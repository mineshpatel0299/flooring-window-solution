# TensorFlow.js AI Segmentation

This module provides AI-powered image segmentation for detecting floor and window surfaces in uploaded images.

## Architecture

### Core Files

1. **models.ts** - Model loading and management
   - Initializes TensorFlow.js with WASM backend
   - Loads MediaPipe SelfieSegmentation model
   - Handles model caching for performance

2. **segmentation.ts** - Core segmentation logic
   - Image preprocessing and resizing
   - Binary mask generation
   - Morphological operations for cleanup
   - Connected component analysis
   - Mask scaling and conversion utilities

3. **floor-detector.ts** - Floor-specific detection
   - Focuses on bottom portion of images
   - Perspective boundary detection
   - Floor area enhancement

4. **window-detector.ts** - Window-specific detection
   - Focuses on upper/middle portion of images
   - Rectangular pattern detection
   - Perspective distortion analysis

## How It Works

### 1. Model Loading

```typescript
import { loadSegmentationModel } from '@/lib/tensorflow/models';

// Load the model (cached automatically)
const segmenter = await loadSegmentationModel();
```

The system uses MediaPipe's SelfieSegmentation model, which is excellent at separating foreground (people) from background (floors, walls, windows).

### 2. Image Segmentation

```typescript
import { segmentImage } from '@/lib/tensorflow/segmentation';

// Segment an image
const result = await segmentImage(image, true); // true = invert mask for background

// Result contains:
// - mask: 2D array of 0s and 1s
// - width: mask width
// - height: mask height
// - confidence: overall confidence score (0-1)
```

### 3. Surface Detection

#### Floor Detection

```typescript
import { detectFloor } from '@/lib/tensorflow/floor-detector';

const segmentationData = await detectFloor(image);

// Automatically:
// - Segments the image
// - Enhances floor areas (bottom 60% of image)
// - Detects perspective boundaries
// - Scales to original image size
```

#### Window Detection

```typescript
import { detectWindow } from '@/lib/tensorflow/window-detector';

const segmentationData = await detectWindow(image);

// Automatically:
// - Segments the image
// - Enhances window areas (upper/middle of image)
// - Detects rectangular boundaries
// - Checks for perspective distortion
```

### 4. Processing Pipeline

```
1. Image Upload
   ↓
2. Resize (max 1024px) for performance
   ↓
3. Run MediaPipe Segmentation
   ↓
4. Create Binary Mask (0 = not surface, 1 = surface)
   ↓
5. Morphological Cleanup (remove noise)
   ↓
6. Find Largest Component (main surface)
   ↓
7. Detect Boundaries/Perspective
   ↓
8. Scale to Original Size
   ↓
9. Return SegmentationData
```

## React Integration

### Using the AISegmentation Component

```typescript
import { AISegmentation } from '@/components/visualizer/AISegmentation';

function MyComponent() {
  const handleComplete = (data, confidence) => {
    console.log('Segmentation complete!', data);
    console.log('Confidence:', confidence);
  };

  const handleError = (error) => {
    console.error('Segmentation failed:', error);
  };

  return (
    <AISegmentation
      image={imageElement}
      mode="floor" // or "window"
      onSegmentationComplete={handleComplete}
      onError={handleError}
      autoRun={true}
    />
  );
}
```

### Using the useSegmentation Hook

```typescript
import { useSegmentation } from '@/hooks/useSegmentation';

function MyComponent() {
  const { segment, isLoading, error, confidence, progress, status } =
    useSegmentation('floor');

  const handleSegment = async () => {
    try {
      const result = await segment(imageElement);
      console.log('Result:', result);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  return (
    <div>
      <button onClick={handleSegment} disabled={isLoading}>
        Detect Floor
      </button>
      {isLoading && <p>{status} - {progress}%</p>}
      {confidence && <p>Confidence: {(confidence * 100).toFixed(1)}%</p>}
    </div>
  );
}
```

## Performance Optimization

### WASM Backend

The system uses TensorFlow.js with the WASM backend for 2-3x faster inference compared to the default WebGL backend.

### Model Caching

Models are cached in memory after the first load, making subsequent segmentations much faster.

### Image Resizing

Images are automatically resized to a maximum of 1024px on the longest side before processing, significantly improving performance without sacrificing accuracy.

### Progressive Loading

The UI shows progress updates during segmentation:
- 0-20%: Initializing
- 20-40%: Loading model
- 40-70%: Running inference
- 70-90%: Post-processing
- 90-100%: Finalizing

## Confidence Scores

The system returns a confidence score (0-1) for each segmentation:

- **< 0.3**: Low confidence - Manual adjustment highly recommended
- **0.3-0.6**: Medium confidence - Manual adjustment suggested
- **0.6-0.8**: Good confidence - Minor adjustments may be needed
- **> 0.8**: High confidence - Segmentation is likely accurate

## Mask Format

Segmentation masks are represented as 2D arrays:

```typescript
type Mask = number[][]; // Array of rows, each containing 0 or 1

// Example 3x3 mask:
const mask = [
  [0, 0, 0],  // Top row (not surface)
  [1, 1, 1],  // Middle row (surface)
  [1, 1, 1],  // Bottom row (surface)
];
```

## Utility Functions

### Convert Mask to ImageData

```typescript
import { maskToImageData } from '@/lib/tensorflow/segmentation';

const imageData = maskToImageData(mask, 0.8); // 80% opacity
// Can be drawn directly to canvas
ctx.putImageData(imageData, 0, 0);
```

### Scale Mask

```typescript
import { scaleMask } from '@/lib/tensorflow/segmentation';

const scaledMask = scaleMask(mask, targetWidth, targetHeight);
```

## Troubleshooting

### Model Loading Issues

If the model fails to load:
1. Check internet connection (model loads from CDN)
2. Check browser console for errors
3. Try clearing browser cache
4. Verify WASM is supported in the browser

### Poor Segmentation Quality

If segmentation is inaccurate:
1. Ensure good lighting in the image
2. Avoid cluttered backgrounds
3. Take photo from appropriate angle:
   - Floors: Slightly elevated, looking down
   - Windows: Face-on, minimal angle
4. Use the manual adjustment tools to refine

### Performance Issues

If segmentation is slow:
1. Reduce image size before upload
2. Check if WASM backend is active (`getBackendInfo()`)
3. Ensure model caching is enabled
4. Close other browser tabs to free memory

## Browser Compatibility

- **Chrome/Edge**: Full support ✅
- **Firefox**: Full support ✅
- **Safari**: Full support ✅ (iOS 16.4+)
- **Mobile**: Full support on modern devices

Requires:
- WebAssembly support
- ES2017+ JavaScript
- 512MB+ available RAM

## Future Enhancements

Potential improvements for future versions:

1. **Custom Model Training**
   - Train on floor/window-specific dataset
   - Improve accuracy for edge cases

2. **Multiple Surfaces**
   - Detect multiple floors/windows in one image
   - Support for walls and other surfaces

3. **Real-time Processing**
   - Live camera segmentation
   - AR preview mode

4. **Advanced Post-processing**
   - Automatic perspective correction
   - Shadow detection and removal
   - Texture alignment suggestions

## References

- [TensorFlow.js Documentation](https://www.tensorflow.org/js)
- [MediaPipe Segmentation](https://google.github.io/mediapipe/solutions/selfie_segmentation)
- [Body Segmentation Models](https://github.com/tensorflow/tfjs-models/tree/master/body-segmentation)
