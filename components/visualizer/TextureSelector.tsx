'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Grid3x3, List, Star, Loader2 } from 'lucide-react';
import { TexturePreview } from './TexturePreview';
import { useTextures } from '@/hooks/useTextures';
import type { Texture, VisualizationType } from '@/types';

interface TextureSelectorProps {
  textures?: Texture[];
  selectedId?: string | null;
  onSelect: (texture: Texture) => void;
  mode: VisualizationType;
  isLoading?: boolean;
}

export function TextureSelector({
  textures: propTextures,
  selectedId,
  onSelect,
  mode,
  isLoading: propIsLoading,
}: TextureSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFeatured, setShowFeatured] = useState(false);

  // Fetch textures if not provided
  const {
    textures: fetchedTextures,
    isLoading: isFetching,
    error,
    loadMore,
    hasMore,
  } = useTextures({
    type: mode,
    categoryId: categoryFilter || undefined,
    isFeatured: showFeatured || undefined,
    enabled: !propTextures,
  });

  const textures = propTextures || fetchedTextures;
  const isLoading = propIsLoading !== undefined ? propIsLoading : isFetching;

  // Filter textures by search query
  const filteredTextures = useMemo(() => {
    if (!searchQuery) return textures;

    const query = searchQuery.toLowerCase();
    return textures.filter(
      (texture) =>
        texture.name.toLowerCase().includes(query) ||
        texture.description?.toLowerCase().includes(query) ||
        texture.material_type?.toLowerCase().includes(query) ||
        texture.color?.toLowerCase().includes(query) ||
        texture.pattern?.toLowerCase().includes(query)
    );
  }, [textures, searchQuery]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    textures.forEach((texture) => {
      if (texture.material_type) {
        cats.add(texture.material_type);
      }
    });
    return Array.from(cats).sort();
  }, [textures]);

  // Separate featured textures
  const featuredTextures = useMemo(() => {
    return filteredTextures.filter((t) => t.is_featured);
  }, [filteredTextures]);

  const regularTextures = useMemo(() => {
    return filteredTextures.filter((t) => !t.is_featured);
  }, [filteredTextures]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-2 sm:p-4 border-b border-border space-y-2 sm:space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search textures..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Featured Filter */}
          <button
            onClick={() => setShowFeatured(!showFeatured)}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-md transition-colors flex items-center gap-1 sm:gap-1.5 ${
              showFeatured
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            <Star className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${showFeatured ? 'fill-current' : ''}`} />
            <span className="hidden xs:inline">Featured</span>
            <span className="xs:hidden">★</span>
          </button>

          {/* Category Filters */}
          {categories.length > 0 && (
            <>
              <button
                onClick={() => setCategoryFilter(null)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-md transition-colors ${
                  !categoryFilter
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                All
              </button>
              {categories.slice(0, 3).map((category) => (
                <button
                  key={category}
                  onClick={() => setCategoryFilter(category)}
                  className={`px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm rounded-md transition-colors truncate max-w-20 sm:max-w-none ${
                    categoryFilter === category
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {category}
                </button>
              ))}
              {categories.length > 3 && (
                <span className="text-xs text-muted-foreground">+{categories.length - 3}</span>
              )}
            </>
          )}

          {/* View Mode Toggle */}
          <div className="ml-auto flex gap-0.5 sm:gap-1 bg-secondary rounded-md p-0.5 sm:p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 sm:p-1.5 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-background/50'
              }`}
              title="Grid View"
            >
              <Grid3x3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 sm:p-1.5 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-background shadow-sm'
                  : 'hover:bg-background/50'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-xs sm:text-sm text-muted-foreground">
          {filteredTextures.length} {filteredTextures.length === 1 ? 'texture' : 'textures'} found
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-4">
        {isLoading && textures.length === 0 ? (
          <div className="flex items-center justify-center h-48 sm:h-64">
            <div className="text-center space-y-2 sm:space-y-3">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-primary mx-auto" />
              <p className="text-xs sm:text-sm text-muted-foreground">Loading textures...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-48 sm:h-64">
            <div className="text-center space-y-2 sm:space-y-3 max-w-md px-4">
              <p className="text-destructive font-medium text-sm sm:text-base">Failed to load textures</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{error.message}</p>
            </div>
          </div>
        ) : filteredTextures.length === 0 ? (
          <div className="flex items-center justify-center h-48 sm:h-64">
            <div className="text-center space-y-2">
              <p className="text-muted-foreground text-sm">No textures found</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs sm:text-sm text-primary hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {/* Featured Section */}
            {featuredTextures.length > 0 && !showFeatured && (
              <div>
                <h3 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                  <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500 fill-current" />
                  Featured Textures
                </h3>
                <div
                  className={`grid gap-2 sm:gap-4 ${
                    viewMode === 'grid'
                      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                      : 'grid-cols-1'
                  }`}
                >
                  {featuredTextures.map((texture) => (
                    <TexturePreview
                      key={texture.id}
                      texture={texture}
                      isSelected={selectedId === texture.id}
                      onSelect={onSelect}
                      showDetails={viewMode === 'list'}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Regular Textures */}
            {regularTextures.length > 0 && (
              <div>
                {featuredTextures.length > 0 && !showFeatured && (
                  <h3 className="text-xs sm:text-sm font-semibold mb-2 sm:mb-3">All Textures</h3>
                )}
                <div
                  className={`grid gap-2 sm:gap-4 ${
                    viewMode === 'grid'
                      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
                      : 'grid-cols-1'
                  }`}
                >
                  {regularTextures.map((texture) => (
                    <TexturePreview
                      key={texture.id}
                      texture={texture}
                      isSelected={selectedId === texture.id}
                      onSelect={onSelect}
                      showDetails={viewMode === 'list'}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Load More */}
            {!propTextures && hasMore && (
              <div className="flex justify-center py-2 sm:py-4">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
