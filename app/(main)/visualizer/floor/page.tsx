'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Upload, Camera, Sparkles, Palette, Download } from 'lucide-react';
import { ImageUploader } from '@/components/visualizer/ImageUploader';
import { CameraCapture } from '@/components/visualizer/CameraCapture';
import { AISegmentation } from '@/components/visualizer/AISegmentation';
import { TextureSelector } from '@/components/visualizer/TextureSelector';
import { TexturePreviewCanvas } from '@/components/visualizer/TexturePreviewCanvas';
import { CanvasEditor } from '@/components/visualizer/CanvasEditor';
import { ExportPanel } from '@/components/visualizer/ExportPanel';
import { ProjectSaver } from '@/components/visualizer/ProjectSaver';
import { useProject } from '@/hooks/useProject';
import { useImageUpload } from '@/hooks/useImageUpload';
import type { SegmentationData, Texture, CanvasSettings } from '@/types';

type WorkflowStep = 'upload' | 'segment' | 'select-texture' | 'edit' | 'export';

function FloorVisualizerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');

  const { loadProject } = useProject();
  const { upload: uploadImage } = useImageUpload();

  // Workflow state
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  const [showCameraModal, setShowCameraModal] = useState(false);

  // Image state
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);

  // Segmentation state
  const [segmentationData, setSegmentationData] = useState<SegmentationData | null>(null);

  // Texture state
  const [selectedTexture, setSelectedTexture] = useState<Texture | null>(null);

  // Canvas state
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null);
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>({
    opacity: 0.8,
    blendMode: 'multiply',
    zoom: 1,
    pan: { x: 0, y: 0 },
    tileSize: 512,
    featherEdges: true,
    preserveLighting: true,
  });

  const loadExistingProject = useCallback(async (id: string) => {
    const project = await loadProject(id);
    if (project) {
      setOriginalImageUrl(project.original_image_url);
      setProcessedImageUrl(project.processed_image_url || null);
      setSegmentationData(project.segmentation_data || null);
      if (project.canvas_settings) {
        setCanvasSettings(project.canvas_settings);
      }
      // Load texture by ID if available
      if (project.texture_id) {
        // Will be set when texture is loaded from TextureSelector
      }
      setCurrentStep('edit');
    }
  }, []);

  // Load project if projectId is provided
  useEffect(() => {
    if (projectId) {
      loadExistingProject(projectId);
    }
  }, [projectId, loadExistingProject]);

  const handleImageSelected = async (file: Blob | File) => {
    // Convert Blob to File if needed
    const imageFile = file instanceof File ? file : new File([file], 'image.jpg', { type: file.type });
    setOriginalImageFile(imageFile);

    // Upload image
    try {
      const result = await uploadImage(imageFile);
      setOriginalImageUrl(result.url);
      setCurrentStep('segment');
    } catch (err) {
      console.error('Failed to upload image:', err);
      alert('Failed to upload image');
    }
  };

  const handleCameraCapture = async (blob: Blob) => {
    const file = new File([blob], `floor-capture-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    });
    await handleImageSelected(file);
    setShowCameraModal(false);
  };

  const handleSegmentationComplete = useCallback((data: SegmentationData) => {
    setSegmentationData(data);
    setCurrentStep('select-texture');
  }, []);

  const handleTextureSelected = (texture: Texture) => {
    setSelectedTexture(texture);
    if (segmentationData) {
      setCurrentStep('edit');
    }
  };

  const handleCanvasReady = (canvas: HTMLCanvasElement) => {
    setCanvasRef(canvas);
  };

  const handleStartOver = () => {
    if (confirm('Start over? This will clear your current work.')) {
      setOriginalImageFile(null);
      setOriginalImageUrl(null);
      setProcessedImageUrl(null);
      setSegmentationData(null);
      setSelectedTexture(null);
      setCanvasRef(null);
      setCurrentStep('upload');
      router.push('/visualizer/floor');
    }
  };

  const handleSaveSuccess = (savedProjectId: string) => {
    alert('Project saved successfully!');
    router.push('/projects');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <button
                onClick={() => router.push('/')}
                className="p-2 hover:bg-muted rounded-md transition-colors shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold truncate">Floor Visualizer</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Upload a photo and visualize different flooring options
                </p>
              </div>
            </div>
            {currentStep !== 'upload' && (
              <button
                onClick={handleStartOver}
                className="px-3 py-2 text-xs sm:text-sm bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors shrink-0"
              >
                <span className="hidden sm:inline">Start Over</span>
                <span className="sm:hidden">Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="border-b border-border bg-muted/30">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-3">
          {/* Desktop view - horizontal */}
          <div className="hidden md:flex items-center justify-center gap-2">
            {[
              { step: 'upload', icon: Upload, label: 'Upload' },
              { step: 'segment', icon: Sparkles, label: 'AI Detection' },
              { step: 'select-texture', icon: Palette, label: 'Select Texture' },
              { step: 'edit', icon: Camera, label: 'Edit & Preview' },
              { step: 'export', icon: Download, label: 'Export' },
            ].map(({ step, icon: Icon, label }, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors ${
                    currentStep === step
                      ? 'bg-primary text-primary-foreground'
                      : ['upload', 'segment', 'select-texture', 'edit'].indexOf(currentStep) >
                        ['upload', 'segment', 'select-texture', 'edit'].indexOf(step as WorkflowStep)
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                {index < 4 && (
                  <div className="w-8 h-0.5 bg-border mx-1" />
                )}
              </div>
            ))}
          </div>

          {/* Mobile view - only show icons with current step highlighted */}
          <div className="flex md:hidden items-center justify-center gap-1.5 overflow-x-auto">
            {[
              { step: 'upload', icon: Upload, label: 'Upload' },
              { step: 'segment', icon: Sparkles, label: 'AI' },
              { step: 'select-texture', icon: Palette, label: 'Texture' },
              { step: 'edit', icon: Camera, label: 'Edit' },
              { step: 'export', icon: Download, label: 'Export' },
            ].map(({ step, icon: Icon, label }, index) => (
              <div key={step} className="flex items-center shrink-0">
                <div
                  className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-md transition-colors min-w-15 ${
                    currentStep === step
                      ? 'bg-primary text-primary-foreground'
                      : ['upload', 'segment', 'select-texture', 'edit'].indexOf(currentStep) >
                        ['upload', 'segment', 'select-texture', 'edit'].indexOf(step as WorkflowStep)
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{label}</span>
                </div>
                {index < 4 && (
                  <div className="w-2 h-0.5 bg-border mx-0.5" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Step 1: Upload Image */}
        {currentStep === 'upload' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Upload a Floor Photo</h2>
              <p className="text-muted-foreground">
                Take or upload a photo of your floor to get started
              </p>
            </div>

            <ImageUploader
              onImageSelected={handleImageSelected}
              mode="floor"
            />

            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">or</p>
              <button
                onClick={() => setShowCameraModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Camera className="w-5 h-5" />
                Open Camera
              </button>
            </div>

            {showCameraModal && (
              <CameraCapture
                onCapture={handleCameraCapture}
                onClose={() => setShowCameraModal(false)}
              />
            )}
          </div>
        )}

        {/* Step 2: AI Segmentation */}
        {currentStep === 'segment' && originalImageUrl && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Detecting Floor Surface</h2>
              <p className="text-muted-foreground">
                Our AI is analyzing your image to identify the floor area
              </p>
            </div>

            <AISegmentation
              imageUrl={originalImageUrl}
              type="floor"
              onComplete={handleSegmentationComplete}
              onError={(error) => {
                console.error('Segmentation failed:', error);
                alert('Failed to detect floor. Please try a different image.');
                setCurrentStep('upload');
              }}
            />
          </div>
        )}

        {/* Step 3: Select Texture */}
        {currentStep === 'select-texture' && originalImageUrl && segmentationData && (
          <div className="space-y-4 sm:space-y-6">
            <div className="text-center mb-4 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-2">Choose a Floor Texture</h2>
              <p className="text-sm text-muted-foreground px-4">
                Browse and select from our collection of flooring options
              </p>
            </div>

            <div className="grid lg:grid-cols-[400px_1fr] gap-4 sm:gap-6">
              {/* Texture Selector */}
              <div className="h-125 sm:h-150 lg:h-150 border border-border rounded-lg overflow-hidden bg-card">
                <TextureSelector
                  mode="floor"
                  selectedId={selectedTexture?.id || null}
                  onSelect={handleTextureSelected}
                />
              </div>

              {/* Live Preview */}
              <div className="h-100 sm:h-125 lg:h-150 border border-border rounded-lg overflow-hidden bg-card p-3 sm:p-4">
                <div className="h-full flex flex-col">
                  <div className="mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-semibold">Live Preview</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {selectedTexture
                        ? `Previewing: ${selectedTexture.name}`
                        : 'Select a texture to see preview'}
                    </p>
                  </div>
                  <div className="flex-1 min-h-0">
                    <TexturePreviewCanvas
                      originalImageUrl={originalImageUrl}
                      segmentationData={segmentationData}
                      texture={selectedTexture}
                      opacity={0.8}
                      blendMode="multiply"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Continue Button */}
            {selectedTexture && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setCurrentStep('edit')}
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-primary text-primary-foreground rounded-md hover:opacity-90 font-medium"
                >
                  Continue to Editor
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Canvas Editor */}
        {currentStep === 'edit' && originalImageUrl && segmentationData && selectedTexture && (
          <div className="flex flex-col lg:grid lg:grid-cols-[1fr_320px] gap-4 sm:gap-6">
            <div className="space-y-3 sm:space-y-4 order-2 lg:order-1">
              <div className="text-center lg:text-left">
                <h2 className="text-xl sm:text-2xl font-bold mb-2">Preview & Adjust</h2>
                <p className="text-sm text-muted-foreground">
                  Fine-tune the visualization to your liking
                </p>
              </div>

              <CanvasEditor
                originalImageUrl={originalImageUrl}
                segmentationMask={segmentationData}
                selectedTexture={selectedTexture}
                settings={canvasSettings}
                onSettingsChange={setCanvasSettings}
                onCanvasReady={handleCanvasReady}
              />
            </div>

            <div className="space-y-3 sm:space-y-4 order-1 lg:order-2">
              {/* Export Panel */}
              <ExportPanel
                canvas={canvasRef}
                projectName={`floor-${selectedTexture.name}`}
              />

              {/* Project Saver */}
              {originalImageUrl && segmentationData && selectedTexture && (
                <div className="p-3 sm:p-4 bg-card border border-border rounded-lg">
                  <h3 className="text-sm sm:text-base font-semibold mb-3">Save Project</h3>
                  <ProjectSaver
                    type="floor"
                    originalImageUrl={originalImageUrl}
                    processedImageUrl={processedImageUrl}
                    segmentationData={segmentationData}
                    textureId={selectedTexture.id}
                    canvasSettings={canvasSettings}
                    onSuccess={handleSaveSuccess}
                  />
                </div>
              )}

              {/* Change Texture */}
              <div className="p-3 sm:p-4 bg-card border border-border rounded-lg">
                <h3 className="text-sm sm:text-base font-semibold mb-3">Change Texture</h3>
                <button
                  onClick={() => setCurrentStep('select-texture')}
                  className="w-full px-4 py-2 text-sm bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
                >
                  Browse Textures
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FloorVisualizerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>}>
      <FloorVisualizerContent />
    </Suspense>
  );
}
