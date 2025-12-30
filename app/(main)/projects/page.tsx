'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Eye, Calendar, Layers } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/constants';
import { useProject } from '@/hooks/useProject';
import type { Project } from '@/types';

export default function ProjectsGalleryPage() {
  const router = useRouter();
  const { deleteProject } = useProject();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(API_ENDPOINTS.PROJECTS);
      const data = await response.json();

      if (data.success) {
        setProjects(data.data.projects);
      } else {
        setError(data.error || 'Failed to fetch projects');
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to fetch projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }

    setDeletingId(id);
    const success = await deleteProject(id);

    if (success) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } else {
      alert('Failed to delete project');
    }

    setDeletingId(null);
  };

  const handleView = (project: Project) => {
    // Navigate to appropriate visualizer with project data
    const visualizerPath = `/visualizer/${project.type}?project=${project.id}`;
    router.push(visualizerPath);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Projects</h1>
          <p className="text-muted-foreground mt-2">
            View and manage your saved visualizations
          </p>
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
            <p className="font-medium">Error loading projects</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={fetchProjects}
              className="mt-3 px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && projects.length === 0 && (
          <div className="text-center py-12">
            <Layers className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
            <p className="text-muted-foreground mb-6">
              Start creating visualizations and save them as projects
            </p>
            <div className="flex gap-3 justify-center">
              <a
                href="/visualizer/floor"
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Visualize Floor
              </a>
              <a
                href="/visualizer/window"
                className="px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
              >
                Visualize Window
              </a>
            </div>
          </div>
        )}

        {/* Projects Grid */}
        {!isLoading && !error && projects.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group rounded-lg border bg-card overflow-hidden hover:shadow-lg transition-all"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-muted">
                  <img
                    src={project.thumbnail_url || project.processed_image_url || project.original_image_url}
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Type Badge */}
                  <div className="absolute top-2 left-2">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-md ${
                        project.type === 'floor'
                          ? 'bg-blue-500 text-white'
                          : 'bg-green-500 text-white'
                      }`}
                    >
                      {project.type}
                    </span>
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleView(project)}
                      className="p-2 bg-white text-foreground rounded-md hover:bg-white/90 transition-colors"
                      title="View Project"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      disabled={deletingId === project.id}
                      className="p-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 space-y-3">
                  <h3 className="font-semibold truncate" title={project.name}>
                    {project.name}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(project.created_at)}</span>
                  </div>

                  <button
                    onClick={() => handleView(project)}
                    className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                  >
                    Open Project
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Projects Count */}
        {!isLoading && !error && projects.length > 0 && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Showing {projects.length} project{projects.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
