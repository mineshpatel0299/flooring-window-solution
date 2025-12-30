// Application constants

export const APP_NAME = "Floor & Window Visualizer";
export const APP_DESCRIPTION = "Visualize flooring mats and window films in your space using AI";

// Image upload constraints
export const MAX_UPLOAD_SIZE = parseInt(process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE || '10485760'); // 10MB
export const MAX_IMAGE_DIMENSION = parseInt(process.env.NEXT_PUBLIC_MAX_IMAGE_DIMENSION || '2048');
export const ACCEPTED_IMAGE_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// TensorFlow.js configuration
export const TF_BACKEND = process.env.NEXT_PUBLIC_TF_BACKEND || 'wasm';
export const MODEL_CACHE_ENABLED = process.env.NEXT_PUBLIC_MODEL_CACHE_ENABLED === 'true';

// Segmentation settings
export const SEGMENTATION_CONFIDENCE_THRESHOLD = 0.6;
export const INFERENCE_MAX_DIMENSION = 1024; // Max dimension for model inference

// Session settings
export const SESSION_EXPIRY_DAYS = parseInt(process.env.NEXT_PUBLIC_SESSION_EXPIRY_DAYS || '30');

// Supabase storage buckets
export const STORAGE_BUCKETS = {
  TEXTURE_ASSETS: 'texture-assets',
  USER_UPLOADS: 'user-uploads',
  PROCESSED_IMAGES: 'processed-images',
  THUMBNAILS: 'thumbnails',
} as const;

// Visualization types
export const VISUALIZATION_TYPES = {
  FLOOR: 'floor',
  WINDOW: 'window',
} as const;

// Blend modes for canvas overlay
export const BLEND_MODES = {
  MULTIPLY: 'multiply',
  OVERLAY: 'overlay',
  NORMAL: 'normal',
} as const;

// Default canvas settings
export const DEFAULT_CANVAS_SETTINGS = {
  opacity: 0.85,
  blendMode: BLEND_MODES.MULTIPLY,
  zoom: 1,
  pan: { x: 0, y: 0 },
};

// API endpoints
export const API_ENDPOINTS = {
  TEXTURES: '/api/textures',
  PROJECTS: '/api/projects',
  UPLOAD: '/api/upload',
  SESSION: '/api/session',
  CATEGORIES: '/api/categories',
} as const;
