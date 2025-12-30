# Floor & Window Visualizer

An AI-powered SaaS application that allows users to visualize different flooring and window film options on their own photos using advanced computer vision and image processing.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8)
![Supabase](https://img.shields.io/badge/Supabase-Backend-00C896)

## ✨ Features

### Core Functionality
- 🤖 **AI-Powered Surface Detection** - Automatic floor and window surface detection using TensorFlow.js
- 🎨 **Real-Time Texture Overlay** - Instant preview with photorealistic blending
- 📸 **Multiple Input Methods** - Upload images or capture directly from camera
- 💾 **Project Management** - Save and manage visualization projects
- 🎯 **Advanced Canvas Editor** - Adjust opacity, blend modes, and perspective
- 📤 **Export Options** - Download as JPEG or PNG, copy to clipboard

### User Experience
- 🌓 **Dark/Light Mode Support** - Automatic theme switching
- 📱 **Fully Responsive** - Works seamlessly on desktop, tablet, and mobile
- ⚡ **Fast Performance** - Client-side AI processing with WASM backend
- 🔄 **Undo/Redo** - 20-step history for canvas operations
- 🎨 **Extensive Texture Library** - Browse hundreds of textures with search and filters

### Admin Features
- 📊 **Admin Dashboard** - Comprehensive texture and category management
- 🖼️ **Texture Management** - Upload, edit, and organize textures
- 🏷️ **Category System** - Organize textures by type and material
- 📈 **Usage Analytics** - Track texture popularity and usage statistics

## 🏗️ Architecture

### Tech Stack

**Frontend**
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library

**AI/Computer Vision**
- **TensorFlow.js** - Client-side machine learning
- **MediaPipe Segmentation** - Background/surface detection
- **WASM Backend** - 2-3x performance boost

**Backend**
- **Supabase** - PostgreSQL database
- **Supabase Storage** - Image storage and CDN
- **Row Level Security** - Database security

**Image Processing**
- **Canvas API** - Image manipulation and overlay
- **Custom Blend Modes** - Multiply, overlay, normal
- **Perspective Transformation** - Realistic texture application

### Project Structure

```
floor-window-visualizer/
├── app/                          # Next.js App Router
│   ├── (main)/                   # Main application routes
│   │   ├── visualizer/
│   │   │   ├── floor/           # Floor visualizer page
│   │   │   └── window/          # Window visualizer page
│   │   └── projects/            # Projects gallery
│   ├── admin/                   # Admin dashboard
│   │   ├── textures/           # Texture management
│   │   └── categories/         # Category management
│   ├── api/                    # API routes
│   │   ├── textures/          # Texture CRUD
│   │   ├── projects/          # Project CRUD
│   │   ├── categories/        # Category CRUD
│   │   ├── upload/            # File upload
│   │   └── session/           # Session management
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Landing page
├── components/
│   ├── admin/                 # Admin components
│   ├── visualizer/            # Visualizer components
│   ├── ui/                    # Reusable UI components
│   └── ErrorBoundary.tsx
├── lib/
│   ├── canvas/               # Canvas utilities
│   ├── supabase/             # Supabase client
│   ├── tensorflow/           # AI models
│   ├── session/              # Session management
│   ├── utils/                # Utilities
│   └── constants/            # Constants
├── hooks/                    # Custom React hooks
├── types/                    # TypeScript types
└── supabase/                 # Database migrations
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd floor-window-visualizer
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Supabase**

Create a new Supabase project at [supabase.com](https://supabase.com)

Run the SQL migrations from `supabase/migrations/`:
- `001_initial_schema.sql` - Database schema
- `002_rls_policies.sql` - Row Level Security policies
- `003_storage_buckets.sql` - Storage configuration

Refer to `supabase/README.md` for detailed setup instructions.

4. **Configure environment variables**

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Update with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

5. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage Guide

### For End Users

1. **Choose Visualization Type**
   - Navigate to homepage
   - Select "Visualize Floor" or "Visualize Window"

2. **Upload Image**
   - Drag and drop an image
   - Or click to browse files
   - Or use camera to capture

3. **AI Detection**
   - System automatically detects floor/window surface
   - View confidence score and segmentation mask

4. **Select Texture**
   - Browse texture library
   - Use search and filters
   - Click to apply texture

5. **Adjust & Export**
   - Fine-tune opacity and blend mode
   - Zoom and pan for detail
   - Export as JPEG/PNG or save project

### For Administrators

1. **Access Admin Dashboard**
   - Navigate to `/admin`

2. **Manage Textures**
   - Upload new textures with metadata
   - Edit existing textures
   - Toggle featured status
   - Delete textures

3. **Manage Categories**
   - Create categories for organization
   - Assign textures to categories
   - Edit and delete categories

4. **View Analytics**
   - Monitor texture usage
   - Track popular textures
   - View statistics

## 🎨 Canvas Overlay System

### How It Works

1. **Segmentation Mask** - AI generates pixel-level mask of surface area
2. **Perspective Detection** - Calculates vanishing points for realistic perspective
3. **Texture Tiling** - Repeats texture to cover large areas seamlessly
4. **Blend Modes** - Applies texture while preserving original lighting:
   - **Multiply** (default) - Preserves shadows and highlights
   - **Overlay** - Enhances contrast
   - **Normal** - Simple alpha blending
5. **Edge Feathering** - Smooths boundaries for natural transitions

### Blend Mode Details

**Multiply Mode** (Recommended)
```
result = (base × overlay) / 255
```
Preserves lighting and shadows from original image.

**Overlay Mode**
```
result = base < 128
  ? (2 × base × overlay) / 255
  : 255 - (2 × (255 - base) × (255 - overlay)) / 255
```
Enhances contrast and vibrancy.

## 🔧 Configuration

### Image Processing

Configure in `lib/constants/index.ts`:
- `MAX_IMAGE_DIMENSION` - Max dimension for processing (default: 2048px)
- `MAX_UPLOAD_SIZE` - Max file size (default: 10MB)
- `COMPRESSION_QUALITY` - JPEG compression (default: 0.85)

### TensorFlow.js

Configure in `lib/tensorflow/models.ts`:
- Model type: MediaPipe SelfieSegmentation
- Backend: WASM (2-3x faster than CPU)
- Confidence threshold: 0.6

### Canvas Settings

Default settings in visualizer pages:
```typescript
{
  opacity: 0.8,          // Texture opacity (0-1)
  blendMode: 'multiply', // Blend mode
  tileSize: 512,         // Texture tile size (px)
  featherEdges: true,    // Smooth mask edges
  preserveLighting: true // Preserve original lighting
}
```

## 🚢 Deployment

### Deploy to Vercel

1. **Connect to Vercel**
```bash
npm i -g vercel
vercel
```

2. **Set Environment Variables**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Add all variables from `.env.local`

3. **Deploy**
```bash
vercel --prod
```

### Environment Variables for Production

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Post-Deployment

1. Update Supabase CORS settings
2. Configure custom domain (optional)
3. Set up monitoring and analytics
4. Test all features in production

## 📊 Database Schema

### Tables

**textures** - Texture assets
- id, name, type (floor/window), image_url, thumbnail_url
- category_id, material_type, description
- is_featured, is_active, usage_count
- sort_order, created_at

**categories** - Texture categories
- id, name, slug, type, description
- created_at

**sessions** - Anonymous user sessions
- id, session_token, fingerprint
- expires_at, created_at

**projects** - Saved projects
- id, session_id, name, type
- original_image_url, processed_image_url, thumbnail_url
- segmentation_data (JSONB), texture_id
- canvas_settings (JSONB), is_public
- created_at

### Storage Buckets

- `texture-assets` - Texture images (public)
- `user-uploads` - User uploaded images (private)
- `processed-images` - Generated visualizations (private)

## 🔐 Security

- **Row Level Security** - Enabled on all tables
- **Anonymous Sessions** - UUID-based session tokens
- **Storage Policies** - Bucket-level access control
- **CORS Configuration** - Restricted to allowed origins
- **Input Validation** - Server-side validation on all endpoints
- **Rate Limiting** - API route protection (recommended)

## 🎯 Performance Optimizations

- ⚡ **Client-Side AI** - No server processing costs
- 🚀 **WASM Backend** - 2-3x faster than CPU
- 📦 **Code Splitting** - Dynamic imports for heavy components
- 🖼️ **Image Optimization** - Next.js Image component
- 💾 **Model Caching** - In-memory AI model storage
- 🔄 **Progressive Loading** - Lazy load textures
- 📱 **Responsive Images** - Optimized for all devices

## 🐛 Troubleshooting

### AI Segmentation Fails
- Ensure image has clear floor/window surface
- Try better lighting conditions
- Check browser console for errors
- Verify TensorFlow.js is loaded

### Upload Fails
- Check file size (< 10MB)
- Verify format (JPG, PNG, WebP)
- Check Supabase storage bucket policies
- Verify environment variables

### Texture Not Applying
- Check segmentation completed successfully
- Verify texture loaded (check network tab)
- Try different blend mode
- Check browser console for canvas errors

## 📝 Development Tips

### Adding New Textures Programmatically

Use the seed script in `supabase/migrations/seed.sql` as a template.

### Custom Blend Modes

Add new blend modes in `lib/canvas/blend-modes.ts`:
```typescript
case 'custom':
  blendedR = // your formula
  break;
```

### Testing AI Models

Use development mode for detailed logging:
```typescript
// In lib/tensorflow/segmentation.ts
console.log('Segmentation confidence:', confidence);
```

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- TensorFlow.js team for MediaPipe models
- Supabase for backend infrastructure
- Next.js team for the amazing framework
- Tailwind CSS for utility-first styling

## 📞 Support

For issues and questions:
- Open a GitHub issue
- Check existing documentation
- Review troubleshooting section

---

Built with ❤️ using Next.js 14, TensorFlow.js, and Supabase
