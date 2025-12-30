'use client';

import { useState, useEffect } from 'react';
import { Edit, Trash2, Plus } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/constants';
import type { TextureCategory, VisualizationType } from '@/types';

interface CategoryManagerProps {
  onUpdate?: () => void;
}

export function CategoryManager({ onUpdate }: CategoryManagerProps) {
  const [categories, setCategories] = useState<TextureCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    type: 'floor' as VisualizationType,
    description: '',
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(API_ENDPOINTS.CATEGORIES);
      const data = await response.json();

      if (data.success) {
        setCategories(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch categories');
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to fetch categories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingId
        ? `${API_ENDPOINTS.CATEGORIES}/${editingId}`
        : API_ENDPOINTS.CATEGORIES;
      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        await fetchCategories();
        resetForm();
        onUpdate?.();
      } else {
        alert(data.error || 'Failed to save category');
      }
    } catch (err) {
      console.error('Error saving category:', err);
      alert('Failed to save category');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will affect all associated textures.')) {
      return;
    }

    setDeletingId(id);

    try {
      const response = await fetch(`${API_ENDPOINTS.CATEGORIES}/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await fetchCategories();
        onUpdate?.();
      } else {
        alert(data.error || 'Failed to delete category');
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Failed to delete category');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (category: TextureCategory) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      slug: category.slug,
      type: category.type,
      description: category.description || '',
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      type: 'floor',
      description: '',
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => {
      const newData = { ...prev, name };
      // Auto-generate slug from name if not editing
      if (!editingId && !prev.slug) {
        newData.slug = name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
      }
      return newData;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-muted-foreground/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
        <p className="font-medium">Error loading categories</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add/Edit Form */}
      {showAddForm ? (
        <div className="p-6 bg-card border border-border rounded-lg">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Edit Category' : 'Add New Category'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., Hardwood, Ceramic Tile"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Slug <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, slug: e.target.value }))
                }
                required
                pattern="[a-z0-9-]+"
                className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., hardwood, ceramic-tile"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lowercase letters, numbers, and hyphens only
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Type <span className="text-destructive">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: e.target.value as VisualizationType,
                  }))
                }
                className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="floor">Floor</option>
                <option value="window">Window</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Optional description..."
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                {editingId ? 'Update Category' : 'Add Category'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New Category
        </button>
      )}

      {/* Categories List */}
      <div className="space-y-3">
        {categories.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No categories found
          </div>
        ) : (
          categories.map((category) => (
            <div
              key={category.id}
              className="p-4 bg-card border border-border rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{category.name}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        category.type === 'floor'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      }`}
                    >
                      {category.type}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {category.slug}
                  </p>
                  {category.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {category.description}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-2 hover:bg-muted rounded-md transition-colors"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    disabled={deletingId === category.id}
                    className="p-2 hover:bg-destructive/10 text-destructive rounded-md transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
