'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from '@/lib/constants';
import type { Texture, VisualizationType } from '@/types';

interface UseTexturesResult {
  textures: Texture[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  total: number;
}

interface UseTexturesOptions {
  type?: VisualizationType;
  categoryId?: string;
  isFeatured?: boolean;
  limit?: number;
  enabled?: boolean;
}

export function useTextures(options: UseTexturesOptions = {}): UseTexturesResult {
  const {
    type,
    categoryId,
    isFeatured,
    limit = 20,
    enabled = true,
  } = options;

  const [textures, setTextures] = useState<Texture[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchTextures = useCallback(
    async (reset: boolean = false) => {
      if (!enabled) return;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (type) params.append('type', type);
        if (categoryId) params.append('category_id', categoryId);
        if (isFeatured !== undefined) params.append('is_featured', String(isFeatured));
        params.append('limit', String(limit));
        params.append('offset', String(reset ? 0 : offset));

        const response = await fetch(`${API_ENDPOINTS.TEXTURES}?${params}`);

        if (!response.ok) {
          throw new Error('Failed to fetch textures');
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch textures');
        }

        if (reset) {
          setTextures(data.data.textures);
          setOffset(limit);
        } else {
          setTextures((prev) => [...prev, ...data.data.textures]);
          setOffset((prev) => prev + limit);
        }

        setTotal(data.data.total);
        setHasMore(data.data.hasMore);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch textures');
        setError(error);
      } finally {
        setIsLoading(false);
      }
    },
    [type, categoryId, isFeatured, limit, offset, enabled]
  );

  const refetch = useCallback(async () => {
    setOffset(0);
    await fetchTextures(true);
  }, [fetchTextures]);

  const loadMore = useCallback(async () => {
    if (!isLoading && hasMore) {
      await fetchTextures(false);
    }
  }, [isLoading, hasMore, fetchTextures]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      refetch();
    }
  }, [type, categoryId, isFeatured, enabled]);

  return {
    textures,
    isLoading,
    error,
    refetch,
    hasMore,
    loadMore,
    total,
  };
}
