import { Layers, Sparkles, Camera, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Visualize Your Space
              <span className="block text-primary mt-2">Before You Buy</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              See how different flooring and window films look in your space with AI-powered
              visualization. Upload a photo and transform it instantly.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <a
                href="/visualizer/floor"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-lg font-semibold"
              >
                <Layers className="w-5 h-5" />
                Visualize Floor
              </a>
              <a
                href="/visualizer/window"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-lg font-semibold"
              >
                <Sparkles className="w-5 h-5" />
                Visualize Window
              </a>
            </div>

            {/* Secondary Links */}
            <div className="flex gap-6 justify-center text-sm text-muted-foreground">
              <a href="/projects" className="hover:text-foreground transition-colors">
                My Projects
              </a>
              <a href="/admin" className="hover:text-foreground transition-colors">
                Admin Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-muted/30 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Transform your space in three simple steps using advanced AI technology
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Photo</h3>
              <p className="text-muted-foreground">
                Take or upload a photo of your floor or window. Works with any standard image.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. AI Detection</h3>
              <p className="text-muted-foreground">
                Our AI automatically detects and segments the surface area in your photo.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Choose & Preview</h3>
              <p className="text-muted-foreground">
                Browse textures, see real-time previews, and export when you&apos;re satisfied.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Our Visualizer</h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mx-auto mb-3">
                <Zap className="w-6 h-6" />
              </div>
              <h4 className="font-semibold mb-2">Instant Results</h4>
              <p className="text-sm text-muted-foreground">
                See your visualization in seconds with AI-powered processing
              </p>
            </div>

            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="font-semibold mb-2">Realistic Preview</h4>
              <p className="text-sm text-muted-foreground">
                Advanced blending preserves lighting and shadows for photorealistic results
              </p>
            </div>

            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mx-auto mb-3">
                <Layers className="w-6 h-6" />
              </div>
              <h4 className="font-semibold mb-2">Extensive Library</h4>
              <p className="text-sm text-muted-foreground">
                Choose from hundreds of flooring and window film options
              </p>
            </div>

            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-lg flex items-center justify-center mx-auto mb-3">
                <Camera className="w-6 h-6" />
              </div>
              <h4 className="font-semibold mb-2">Save Projects</h4>
              <p className="text-sm text-muted-foreground">
                Save and compare multiple visualizations for later reference
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary text-primary-foreground py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Space?</h2>
          <p className="text-lg mb-8 opacity-90">
            Start visualizing now - no signup required, completely free
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/visualizer/floor"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary-foreground text-primary rounded-lg hover:bg-primary-foreground/90 transition-colors font-semibold"
            >
              <Layers className="w-5 h-5" />
              Start with Floor
            </a>
            <a
              href="/visualizer/window"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary-foreground/10 text-primary-foreground border border-primary-foreground/20 rounded-lg hover:bg-primary-foreground/20 transition-colors font-semibold"
            >
              <Sparkles className="w-5 h-5" />
              Start with Window
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Floor & Window Visualizer - Powered by AI
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="/projects" className="hover:text-foreground transition-colors">
                Projects
              </a>
              <a href="/admin" className="hover:text-foreground transition-colors">
                Admin
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
