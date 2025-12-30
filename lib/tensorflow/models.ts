import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-wasm';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import { TF_BACKEND, MODEL_CACHE_ENABLED } from '@/lib/constants';

// Model cache
let cachedSegmenter: bodySegmentation.BodySegmenter | null = null;
let isInitialized = false;

/**
 * Initialize TensorFlow.js with the WASM backend
 */
export async function initializeTensorFlow() {
  if (isInitialized) {
    return;
  }

  try {
    // Set WASM backend for better performance
    if (TF_BACKEND === 'wasm') {
      await tf.setBackend('wasm');
      // Set WASM path for loading WebAssembly files
      await tf.ready();
      console.log('TensorFlow.js initialized with WASM backend');
    } else {
      await tf.ready();
      console.log('TensorFlow.js initialized with default backend');
    }

    isInitialized = true;
  } catch (error) {
    console.error('Error initializing TensorFlow.js:', error);
    throw error;
  }
}

/**
 * Load the body segmentation model
 * Uses MediaPipe SelfieSegmentation for accurate surface detection
 */
export async function loadSegmentationModel(): Promise<bodySegmentation.BodySegmenter> {
  // Return cached model if available
  if (MODEL_CACHE_ENABLED && cachedSegmenter) {
    return cachedSegmenter;
  }

  try {
    // Initialize TensorFlow.js if not already done
    await initializeTensorFlow();

    console.log('Loading body segmentation model...');

    // Create segmenter with MediaPipe SelfieSegmentation
    // This model is good at detecting backgrounds (floors, walls, etc.)
    const model = bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation;
    const segmenterConfig: bodySegmentation.MediaPipeSelfieSegmentationMediaPipeModelConfig = {
      runtime: 'mediapipe',
      solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation',
      modelType: 'general', // 'general' works better for varied scenes
    };

    const segmenter = await bodySegmentation.createSegmenter(
      model,
      segmenterConfig
    );

    // Cache the model
    if (MODEL_CACHE_ENABLED) {
      cachedSegmenter = segmenter;
    }

    console.log('Body segmentation model loaded successfully');
    return segmenter;
  } catch (error) {
    console.error('Error loading segmentation model:', error);
    throw error;
  }
}

/**
 * Dispose of the segmentation model to free up memory
 */
export function disposeSegmentationModel() {
  if (cachedSegmenter) {
    cachedSegmenter.dispose();
    cachedSegmenter = null;
    console.log('Segmentation model disposed');
  }
}

/**
 * Get current TensorFlow.js backend info
 */
export function getBackendInfo() {
  return {
    backend: tf.getBackend(),
    isInitialized,
    modelCached: cachedSegmenter !== null,
    memoryInfo: tf.memory(),
  };
}

/**
 * Preload the model in the background (optional optimization)
 */
export async function preloadModel() {
  try {
    await loadSegmentationModel();
    console.log('Model preloaded successfully');
  } catch (error) {
    console.error('Error preloading model:', error);
  }
}
