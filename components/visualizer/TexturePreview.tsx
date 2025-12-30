'use client';

import { useState } from 'react';
import { Check, Star } from 'lucide-react';
import type { Texture } from '@/types';

interface TexturePreviewProps {
  texture: Texture;
  isSelected?: boolean;
  onSelect: (texture: Texture) => void;
  showDetails?: boolean;
}

export function TexturePreview({
  texture,
  isSelected = false,
  onSelect,
  showDetails = true,
}: TexturePreviewProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    onSelect(texture);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative rounded-lg overflow-hidden cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-primary shadow-lg scale-105'
          : 'hover:ring-2 hover:ring-primary/50 hover:shadow-md'
      }`}
    >
      {/* Image */}
      <div className="relative aspect-square bg-muted">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-muted-foreground/20 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <div className="text-center p-4">
              <p className="text-sm">Failed to load</p>
            </div>
          </div>
        )}

        <img
          src={texture.thumbnail_url || texture.image_url}
          alt={texture.name}
          className={`w-full h-full object-cover transition-opacity ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />

        {/* Selected Indicator */}
        {isSelected && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        )}

        {/* Featured Badge */}
        {texture.is_featured && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded-md flex items-center gap-1 shadow-lg">
            <Star className="w-3 h-3 fill-current" />
            Featured
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="text-white text-sm font-medium px-4 py-2 bg-black/50 rounded-md">
            {isSelected ? 'Selected' : 'Select'}
          </div>
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="p-3 bg-card border-t border-border">
          <h3 className="font-medium text-sm truncate" title={texture.name}>
            {texture.name}
          </h3>

          {texture.material_type && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {texture.material_type}
            </p>
          )}

          {texture.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {texture.description}
            </p>
          )}

          {/* Additional Info */}
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            {texture.color && (
              <span className="px-2 py-0.5 bg-muted rounded-full">
                {texture.color}
              </span>
            )}
            {texture.pattern && (
              <span className="px-2 py-0.5 bg-muted rounded-full">
                {texture.pattern}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
