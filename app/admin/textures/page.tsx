'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Search } from 'lucide-react';
import { TextureList } from '@/components/admin/TextureList';
import { useTextures } from '@/hooks/useTextures';
import type { VisualizationType } from '@/types';

export default function TexturesManagementPage() {
  const [selectedType, setSelectedType] = useState<VisualizationType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const { textures, isLoading, error, refetch } = useTextures({
    type: selectedType === 'all' ? undefined : selectedType,
    enabled: true,
    limit: 100, // Load all for admin
  });

  const filteredTextures = useMemo(() => {
    if (!searchQuery) return textures;

    const query = searchQuery.toLowerCase();
    return textures.filter(
      (texture) =>
        texture.name.toLowerCase().includes(query) ||
        texture.material_type?.toLowerCase().includes(query) ||
        texture.description?.toLowerCase().includes(query)
    );
  }, [textures, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Manage Textures</h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage floor and window textures
          </p>
        </div>
        <a
          href="/admin/textures/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New Texture
        </a>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search textures..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-4 py-2 rounded-md transition-colors ${
              selectedType === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedType('floor')}
            className={`px-4 py-2 rounded-md transition-colors ${
              selectedType === 'floor'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Floor
          </button>
          <button
            onClick={() => setSelectedType('window')}
            className={`px-4 py-2 rounded-md transition-colors ${
              selectedType === 'window'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Window
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>
          Showing: <strong>{filteredTextures.length}</strong> textures
        </span>
        {searchQuery && (
          <span>
            Matching: <strong>&quot;{searchQuery}&quot;</strong>
          </span>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-muted-foreground/20 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          <p className="font-medium">Error loading textures</p>
          <p className="text-sm mt-1">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-3 px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Texture List */}
      {!isLoading && !error && (
        <TextureList textures={filteredTextures} onUpdate={refetch} />
      )}
    </div>
  );
}
