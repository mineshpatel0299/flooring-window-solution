-- Create storage buckets for images

-- Texture assets bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('texture-assets', 'texture-assets', true)
ON CONFLICT (id) DO NOTHING;

-- User uploads bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-uploads', 'user-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Processed images bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('processed-images', 'processed-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for texture-assets (public read, authenticated write)
CREATE POLICY "Public texture assets are viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'texture-assets');

CREATE POLICY "Authenticated users can upload texture assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'texture-assets');

CREATE POLICY "Authenticated users can update texture assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'texture-assets');

CREATE POLICY "Authenticated users can delete texture assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'texture-assets');

-- Storage policies for user-uploads (private, session-based)
CREATE POLICY "Users can view their own uploads"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-uploads');

CREATE POLICY "Users can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'user-uploads');

CREATE POLICY "Users can update their own uploads"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'user-uploads');

CREATE POLICY "Users can delete their own uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'user-uploads');

-- Storage policies for processed-images (private, session-based)
CREATE POLICY "Users can view their own processed images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'processed-images');

CREATE POLICY "Users can upload processed images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'processed-images');

CREATE POLICY "Users can update their own processed images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'processed-images');

CREATE POLICY "Users can delete their own processed images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'processed-images');
