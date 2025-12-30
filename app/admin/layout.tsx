import Link from 'next/link';
import { LayoutDashboard, ImageIcon, FolderTree, Home } from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2 font-semibold text-lg">
              <LayoutDashboard className="w-5 h-5" />
              Admin Dashboard
            </Link>

            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/admin"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Overview
              </Link>
              <Link
                href="/admin/textures"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Textures
              </Link>
              <Link
                href="/admin/categories"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Categories
              </Link>
            </nav>
          </div>

          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-4 h-4" />
            Back to App
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        {children}
      </main>
    </div>
  );
}
