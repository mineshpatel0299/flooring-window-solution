'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2 } from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { API_ENDPOINTS, STORAGE_BUCKETS } from '@/lib/constants';
import type { VisualizationType } from '@/types';

interface TextureFormData {
  name: string;
  slug: string;
  type: VisualizationType;
  category_id: string;
  description: string;
  material_type: string;
  color: string;
  pattern: string;
  is_featured: boolean;
  sort_order: number;
}

export function TextureUploader() {
  const router = useRouter();
  const { upload, isUploading, progress } = useImageUpload();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<TextureFormData>({
    name: '',
    slug: '',
    type: 'floor',
    category_id: '',
    description: '',
    material_type: '',
    color: '',
    pattern: '',
    is_featured: false,
    sort_order: 0,
  });

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));

      // Auto-fill name from filename
      if (!formData.name) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        const cleanName = nameWithoutExt.replace(/[_-]/g, ' ');
        setFormData((prev) => ({
          ...prev,
          name: cleanName,
          slug: nameWithoutExt.toLowerCase().replace(/\s+/g, '-'),
        }));
      }
    }
  }, [formData.name]);

  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));

      // Auto-generate slug from name
      if (name === 'name' && !formData.slug) {
        const slug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        setFormData((prev) => ({ ...prev, slug }));
      }
    }
  }, [formData.slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError('Please select an image file');
      return;
    }

    if (!formData.name || !formData.slug || !formData.type) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload image to storage
      const uploadResult = await upload(selectedFile, STORAGE_BUCKETS.TEXTURE_ASSETS);

      // Create texture record
      const response = await fetch(API_ENDPOINTS.TEXTURES, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          image_url: uploadResult.url,
          category_id: formData.category_id || null,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create texture');
      }

      // Success - redirect to textures list
      router.push('/admin/textures');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload texture');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Texture Image *
        </label>
        {!preview ? (
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-12 h-12 mb-4 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, or WebP (MAX. 10MB)
              </p>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        ) : (
          <div className="relative">
            <img
              src={preview}
              alt="Preview"
              className="w-full h-64 object-cover rounded-lg"
            />
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                setPreview(null);
              }}
              className="absolute top-2 right-2 px-3 py-1 bg-destructive text-destructive-foreground text-sm rounded-md hover:opacity-90"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {/* Basic Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-2">
            Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Slug *
          </label>
          <input
            type="text"
            name="slug"
            value={formData.slug}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Type and Category */}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-2">
            Type *
          </label>
          <select
            name="type"
            value={formData.type}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="floor">Floor</option>
            <option value="window">Window</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Material Type
          </label>
          <input
            type="text"
            name="material_type"
            value={formData.material_type}
            onChange={handleInputChange}
            placeholder="e.g., Hardwood, Vinyl, Frosted"
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleInputChange}
          rows={3}
          className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Additional Properties */}
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium mb-2">
            Color
          </label>
          <input
            type="text"
            name="color"
            value={formData.color}
            onChange={handleInputChange}
            placeholder="e.g., Brown, Gray"
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Pattern
          </label>
          <input
            type="text"
            name="pattern"
            value={formData.pattern}
            onChange={handleInputChange}
            placeholder="e.g., Wood grain, Geometric"
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Sort Order
          </label>
          <input
            type="number"
            name="sort_order"
            value={formData.sort_order}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Featured Checkbox */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_featured"
          name="is_featured"
          checked={formData.is_featured}
          onChange={handleInputChange}
          className="w-4 h-4 border-input rounded"
        />
        <label htmlFor="is_featured" className="text-sm font-medium">
          Mark as Featured
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
          {error}
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Uploading image...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Texture'
          )}
        </button>

        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
