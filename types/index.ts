// Core application types

export type VisualizationType = 'floor' | 'window';
export type BlendMode = 'multiply' | 'overlay' | 'normal' | 'replace';

// Texture types
export interface Texture {
  id: string;
  name: string;
  slug: string;
  category_id?: string;
  type: VisualizationType;
  image_url: string;
  thumbnail_url?: string;
  description?: string;
  material_type?: string;
  color?: string;
  pattern?: string;
  width_cm?: number;
  height_cm?: number;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  usage_count: number;
  created_at: string;
  updated_at?: string;
}

export interface TextureCategory {
  id: string;
  name: string;
  slug: string;
  type: VisualizationType;
  description?: string;
  created_at: string;
}

// Session types
export interface Session {
  id: string;
  session_token: string;
  fingerprint?: string;
  expires_at?: string;
  created_at: string;
}

// Project types
export interface Project {
  id: string;
  session_id?: string;
  name: string;
  type: VisualizationType;
  original_image_url: string;
  processed_image_url?: string;
  thumbnail_url?: string;
  segmentation_data?: SegmentationData;
  texture_id?: string;
  texture?: Texture;
  canvas_settings?: CanvasSettings;
  is_public: boolean;
  created_at: string;
  updated_at?: string;
}

// Segmentation types
export interface SegmentationData {
  mask: number[][]; // 2D array of confidence values (0-1)
  width: number;
  height: number;
  confidence: number; // Overall confidence score
  perspective?: PerspectiveTransform;
}

export interface PerspectiveTransform {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
}

export interface Point {
  x: number;
  y: number;
}

// Canvas types
export interface CanvasSettings {
  opacity: number;
  blendMode: BlendMode;
  zoom: number;
  pan: Point;
  perspective?: PerspectiveTransform;
  tileSize?: number;
  featherEdges?: boolean;
  preserveLighting?: boolean;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Upload types
export interface UploadResponse {
  url: string;
  path: string;
}

// Form types
export interface TextureFormData {
  name: string;
  type: VisualizationType;
  category_id?: string;
  description?: string;
  material_type?: string;
  color?: string;
  pattern?: string;
  width_cm?: number;
  height_cm?: number;
  is_featured?: boolean;
  image: File;
}

export interface ProjectFormData {
  name?: string;
  type: VisualizationType;
  original_image: File | Blob;
  texture_id: string;
  segmentation_data: SegmentationData;
  canvas_settings: CanvasSettings;
}

// Component prop types
export interface ImageUploaderProps {
  onImageSelected: (file: File | Blob) => void;
  maxSize?: number;
  acceptedFormats?: string[];
  mode: VisualizationType;
}

export interface CameraCaptureProps {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
}

export interface CanvasEditorProps {
  originalImage: string;
  segmentationMask?: ImageData;
  selectedTexture?: Texture | null;
  mode: VisualizationType;
  onSave?: (result: Blob) => void;
}

export interface TextureSelectorProps {
  textures: Texture[];
  selectedId?: string | null;
  onSelect: (texture: Texture) => void;
  mode: VisualizationType;
  isLoading?: boolean;
}
