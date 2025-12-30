'use client';

import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useProject } from '@/hooks/useProject';
import type { SegmentationData, CanvasSettings, VisualizationType } from '@/types';

interface ProjectSaverProps {
  type: VisualizationType;
  originalImageUrl: string;
  processedImageUrl?: string;
  thumbnailUrl?: string;
  segmentationData: SegmentationData;
  textureId: string;
  canvasSettings: CanvasSettings;
  onSuccess?: (projectId: string) => void;
}

export function ProjectSaver({
  type,
  originalImageUrl,
  processedImageUrl,
  thumbnailUrl,
  segmentationData,
  textureId,
  canvasSettings,
  onSuccess,
}: ProjectSaverProps) {
  const [projectName, setProjectName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const { saveProject, isSaving, error } = useProject();

  const handleSave = async () => {
    if (!projectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    const project = await saveProject({
      name: projectName.trim(),
      type,
      original_image_url: originalImageUrl,
      processed_image_url: processedImageUrl,
      thumbnail_url: thumbnailUrl,
      segmentation_data: segmentationData,
      texture_id: textureId,
      canvas_settings: canvasSettings,
    });

    if (project) {
      setShowSaveDialog(false);
      setProjectName('');
      onSuccess?.(project.id);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowSaveDialog(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        <Save className="w-4 h-4" />
        Save Project
      </button>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Save Project</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Living Room Oak Floor"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                  disabled={isSaving}
                />
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                  {error.message}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving || !projectName.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowSaveDialog(false)}
                  disabled={isSaving}
                  className="px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
