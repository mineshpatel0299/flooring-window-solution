'use client';

import { useState } from 'react';
import { Edit, Trash2, Star, Eye } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/constants';
import type { Texture } from '@/types';

interface TextureListProps {
  textures: Texture[];
  onUpdate: () => void;
}

export function TextureList({ textures, onUpdate }: TextureListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this texture?')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`${API_ENDPOINTS.TEXTURES}/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        onUpdate();
      } else {
        alert(data.error || 'Failed to delete texture');
      }
    } catch (error) {
      console.error('Error deleting texture:', error);
      alert('Failed to delete texture');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleFeatured = async (texture: Texture) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.TEXTURES}/${texture.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_featured: !texture.is_featured,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onUpdate();
      } else {
        alert(data.error || 'Failed to update texture');
      }
    } catch (error) {
      console.error('Error updating texture:', error);
      alert('Failed to update texture');
    }
  };

  if (textures.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No textures found
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {textures.map((texture) => (
        <div
          key={texture.id}
          className="group rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow"
        >
          {/* Image */}
          <div className="relative aspect-square bg-muted">
            <img
              src={texture.thumbnail_url || texture.image_url}
              alt={texture.name}
              className="w-full h-full object-cover"
            />

            {/* Featured Badge */}
            {texture.is_featured && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded-md flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                Featured
              </div>
            )}

            {/* Hover Actions */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => handleToggleFeatured(texture)}
                className="p-2 bg-white text-foreground rounded-md hover:bg-white/90 transition-colors"
                title={texture.is_featured ? 'Unfeature' : 'Feature'}
              >
                <Star
                  className={`w-4 h-4 ${
                    texture.is_featured ? 'fill-current text-yellow-500' : ''
                  }`}
                />
              </button>

              <button
                onClick={() => window.open(texture.image_url, '_blank')}
                className="p-2 bg-white text-foreground rounded-md hover:bg-white/90 transition-colors"
                title="View Full Image"
              >
                <Eye className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleDelete(texture.id)}
                disabled={deletingId === texture.id}
                className="p-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Details */}
          <div className="p-3 space-y-2">
            <h3 className="font-medium truncate" title={texture.name}>
              {texture.name}
            </h3>

            <div className="flex items-center gap-2 text-xs">
              <span
                className={`px-2 py-0.5 rounded-full ${
                  texture.type === 'floor'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                }`}
              >
                {texture.type}
              </span>
              {texture.material_type && (
                <span className="px-2 py-0.5 bg-muted rounded-full">
                  {texture.material_type}
                </span>
              )}
            </div>

            {texture.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {texture.description}
              </p>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
              <span>Used: {texture.usage_count || 0}x</span>
              <span>Order: {texture.sort_order}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
