'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { TextureUploader } from '@/components/admin/TextureUploader';

export default function NewTexturePage() {
  const router = useRouter();

  const handleSuccess = () => {
    // Redirect to textures list after successful upload
    router.push('/admin/textures');
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleCancel}
          className="p-2 hover:bg-muted rounded-md transition-colors"
          title="Go Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">Add New Texture</h1>
          <p className="text-muted-foreground mt-1">
            Upload a new floor or window texture to the library
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-muted rounded-lg border border-border">
        <h3 className="font-medium mb-2">Upload Guidelines</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>• Use high-quality images (minimum 1024x1024px recommended)</li>
          <li>• Seamless/tileable textures work best for realistic overlays</li>
          <li>• Supported formats: JPG, PNG, WebP</li>
          <li>• Maximum file size: 10MB</li>
          <li>• Image will be automatically optimized and compressed</li>
        </ul>
      </div>

      {/* Uploader */}
      <TextureUploader onSuccess={handleSuccess} onCancel={handleCancel} />
    </div>
  );
}
