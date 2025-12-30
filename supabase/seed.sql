-- Seed data for development and testing

-- Insert sample categories
INSERT INTO categories (name, slug, type, description) VALUES
  ('Hardwood', 'hardwood', 'floor', 'Premium hardwood flooring options'),
  ('Vinyl', 'vinyl', 'floor', 'Durable vinyl flooring materials'),
  ('Tile', 'tile', 'floor', 'Ceramic and porcelain tile options'),
  ('Carpet', 'carpet', 'floor', 'Soft carpet flooring'),
  ('Frosted', 'frosted', 'window', 'Frosted privacy window films'),
  ('Tinted', 'tinted', 'window', 'Solar tinted window films'),
  ('Decorative', 'decorative', 'window', 'Decorative pattern window films'),
  ('Security', 'security', 'window', 'Security and safety window films');

-- Note: Texture image URLs will need to be added after uploading actual texture images to Supabase storage
-- For now, we'll use placeholder values

-- Sample floor textures (add real image URLs after upload)
INSERT INTO textures (name, slug, category_id, type, image_url, description, material_type, is_active, is_featured, sort_order) VALUES
  (
    'Oak Hardwood',
    'oak-hardwood',
    (SELECT id FROM categories WHERE slug = 'hardwood'),
    'floor',
    'placeholder/oak-hardwood.jpg',
    'Classic oak hardwood flooring with natural grain',
    'Oak',
    true,
    true,
    1
  ),
  (
    'Walnut Hardwood',
    'walnut-hardwood',
    (SELECT id FROM categories WHERE slug = 'hardwood'),
    'floor',
    'placeholder/walnut-hardwood.jpg',
    'Rich walnut hardwood with deep tones',
    'Walnut',
    true,
    true,
    2
  ),
  (
    'Light Wood Vinyl',
    'light-wood-vinyl',
    (SELECT id FROM categories WHERE slug = 'vinyl'),
    'floor',
    'placeholder/light-wood-vinyl.jpg',
    'Light wood-look luxury vinyl plank',
    'Vinyl',
    true,
    false,
    3
  ),
  (
    'Gray Tile',
    'gray-tile',
    (SELECT id FROM categories WHERE slug = 'tile'),
    'floor',
    'placeholder/gray-tile.jpg',
    'Modern gray ceramic tile',
    'Ceramic',
    true,
    false,
    4
  ),
  (
    'Beige Carpet',
    'beige-carpet',
    (SELECT id FROM categories WHERE slug = 'carpet'),
    'floor',
    'placeholder/beige-carpet.jpg',
    'Soft beige textured carpet',
    'Carpet',
    true,
    false,
    5
  );

-- Sample window film textures (add real image URLs after upload)
INSERT INTO textures (name, slug, category_id, type, image_url, description, material_type, is_active, is_featured, sort_order) VALUES
  (
    'Privacy Frost',
    'privacy-frost',
    (SELECT id FROM categories WHERE slug = 'frosted'),
    'window',
    'placeholder/privacy-frost.jpg',
    'Full privacy frosted window film',
    'Frosted',
    true,
    true,
    1
  ),
  (
    'Light Tint',
    'light-tint',
    (SELECT id FROM categories WHERE slug = 'tinted'),
    'window',
    'placeholder/light-tint.jpg',
    'Light solar tint for heat reduction',
    'Tinted',
    true,
    true,
    2
  ),
  (
    'Bamboo Pattern',
    'bamboo-pattern',
    (SELECT id FROM categories WHERE slug = 'decorative'),
    'window',
    'placeholder/bamboo-pattern.jpg',
    'Decorative bamboo pattern film',
    'Decorative',
    true,
    false,
    3
  ),
  (
    'Clear Security',
    'clear-security',
    (SELECT id FROM categories WHERE slug = 'security'),
    'window',
    'placeholder/clear-security.jpg',
    'Clear security film for glass protection',
    'Security',
    true,
    false,
    4
  );

-- Note: After setting up Supabase and uploading real texture images:
-- 1. Upload texture images to the 'texture-assets' storage bucket
-- 2. Update the image_url and thumbnail_url columns with actual Supabase storage URLs
-- 3. Example: UPDATE textures SET image_url = 'https://your-project.supabase.co/storage/v1/object/public/texture-assets/oak-hardwood.jpg' WHERE slug = 'oak-hardwood';
