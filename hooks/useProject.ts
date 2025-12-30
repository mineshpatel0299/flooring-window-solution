'use client';

import { useState, useCallback } from 'react';
import { API_ENDPOINTS } from '@/lib/constants';
import type { Project, SegmentationData, CanvasSettings } from '@/types';

interface UseProjectResult {
  saveProject: (data: SaveProjectData) => Promise<Project | null>;
  loadProject: (id: string) => Promise<Project | null>;
  updateProject: (id: string, data: Partial<SaveProjectData>) => Promise<boolean>;
  deleteProject: (id: string) => Promise<boolean>;
  isSaving: boolean;
  isLoading: boolean;
  error: Error | null;
}

interface SaveProjectData {
  name: string;
  type: 'floor' | 'window';
  original_image_url: string;
  processed_image_url?: string;
  thumbnail_url?: string;
  segmentation_data: SegmentationData;
  texture_id: string;
  canvas_settings: CanvasSettings;
}

export function useProject(): UseProjectResult {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const saveProject = useCallback(async (data: SaveProjectData): Promise<Project | null> => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(API_ENDPOINTS.PROJECTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save project');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to save project');
      }

      return result.data.project;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save project');
      setError(error);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const loadProject = useCallback(async (id: string): Promise<Project | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_ENDPOINTS.PROJECTS}/${id}`);

      if (!response.ok) {
        throw new Error('Failed to load project');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load project');
      }

      return result.data.project;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load project');
      setError(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateProject = useCallback(
    async (id: string, data: Partial<SaveProjectData>): Promise<boolean> => {
      setIsSaving(true);
      setError(null);

      try {
        const response = await fetch(`${API_ENDPOINTS.PROJECTS}/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Failed to update project');
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Failed to update project');
        }

        return true;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update project');
        setError(error);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    setError(null);

    try {
      const response = await fetch(`${API_ENDPOINTS.PROJECTS}/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete project');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete project');
      }

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete project');
      setError(error);
      return false;
    }
  }, []);

  return {
    saveProject,
    loadProject,
    updateProject,
    deleteProject,
    isSaving,
    isLoading,
    error,
  };
}
