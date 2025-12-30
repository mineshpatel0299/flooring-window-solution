'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ImageIcon, FolderTree, TrendingUp, Plus } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/constants';

interface Stats {
  totalTextures: number;
  floorTextures: number;
  windowTextures: number;
  featuredTextures: number;
  totalCategories: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalTextures: 0,
    floorTextures: 0,
    windowTextures: 0,
    featuredTextures: 0,
    totalCategories: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      // Fetch all textures
      const texturesRes = await fetch(API_ENDPOINTS.TEXTURES + '?limit=1000');
      const texturesData = await texturesRes.json();

      // Fetch categories
      const categoriesRes = await fetch(API_ENDPOINTS.CATEGORIES);
      const categoriesData = await categoriesRes.json();

      if (texturesData.success && categoriesData.success) {
        const textures = texturesData.data.textures;
        setStats({
          totalTextures: textures.length,
          floorTextures: textures.filter((t: any) => t.type === 'floor').length,
          windowTextures: textures.filter((t: any) => t.type === 'window').length,
          featuredTextures: textures.filter((t: any) => t.is_featured).length,
          totalCategories: categoriesData.data.length,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage your textures and categories
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Textures */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Textures
              </p>
              <p className="text-3xl font-bold mt-2">
                {isLoading ? '...' : stats.totalTextures}
              </p>
            </div>
            <ImageIcon className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Floor Textures */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Floor Textures
              </p>
              <p className="text-3xl font-bold mt-2">
                {isLoading ? '...' : stats.floorTextures}
              </p>
            </div>
            <ImageIcon className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        {/* Window Textures */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Window Textures
              </p>
              <p className="text-3xl font-bold mt-2">
                {isLoading ? '...' : stats.windowTextures}
              </p>
            </div>
            <ImageIcon className="w-8 h-8 text-green-500" />
          </div>
        </div>

        {/* Featured */}
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Featured
              </p>
              <p className="text-3xl font-bold mt-2">
                {isLoading ? '...' : stats.featuredTextures}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/textures/new"
            className="group rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">
                  Add New Texture
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload a new floor or window texture
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/textures"
            className="group rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <ImageIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">
                  Manage Textures
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  View, edit, and delete textures
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/categories"
            className="group rounded-lg border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <FolderTree className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">
                  Manage Categories
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Organize textures into categories
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <div className="rounded-lg border bg-card p-6">
          <p className="text-muted-foreground text-center py-8">
            Activity tracking coming soon...
          </p>
        </div>
      </div>
    </div>
  );
}
