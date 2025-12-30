'use client';

import { CategoryManager } from '@/components/admin/CategoryManager';

export default function CategoriesManagementPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Manage Categories</h1>
        <p className="text-muted-foreground mt-1">
          Organize textures into categories for easy browsing
        </p>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-muted rounded-lg border border-border">
        <h3 className="font-medium mb-2">About Categories</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>• Categories help users find textures quickly</li>
          <li>• Each category belongs to either Floor or Window type</li>
          <li>• Slug is used in URLs - keep it lowercase and hyphenated</li>
          <li>• Deleting a category will affect all associated textures</li>
        </ul>
      </div>

      {/* Category Manager */}
      <CategoryManager />
    </div>
  );
}
