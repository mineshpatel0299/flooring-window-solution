/**
 * Script to seed the database with sample textures
 * Run with: npx tsx scripts/seed-textures.ts
 */

const SAMPLE_TEXTURES = [
  // Floor textures
  {
    name: 'Oak Hardwood',
    slug: 'oak-hardwood',
    type: 'floor',
    image_url: 'https://images.unsplash.com/photo-1562813733-b31f71025d54?w=800&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1562813733-b31f71025d54?w=400&q=80',
    description: 'Classic oak hardwood flooring with natural grain',
    material_type: 'Hardwood',
    color: 'Brown',
    pattern: 'Wood Grain',
    width_cm: 20,
    height_cm: 120,
    is_featured: true,
    sort_order: 1,
  },
  {
    name: 'Light Oak Flooring',
    slug: 'light-oak',
    type: 'floor',
    image_url: 'https://images.unsplash.com/photo-1615875474908-c4e80139e0e6?w=800&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1615875474908-c4e80139e0e6?w=400&q=80',
    description: 'Light-colored oak flooring for modern spaces',
    material_type: 'Hardwood',
    color: 'Light Brown',
    pattern: 'Wood Grain',
    is_featured: true,
    sort_order: 2,
  },
  {
    name: 'Dark Walnut',
    slug: 'dark-walnut',
    type: 'floor',
    image_url: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=800&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=400&q=80',
    description: 'Rich dark walnut hardwood flooring',
    material_type: 'Hardwood',
    color: 'Dark Brown',
    pattern: 'Wood Grain',
    is_featured: true,
    sort_order: 3,
  },
  {
    name: 'White Marble',
    slug: 'white-marble',
    type: 'floor',
    image_url: 'https://images.unsplash.com/photo-1564053489984-317bbd824340?w=800&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1564053489984-317bbd824340?w=400&q=80',
    description: 'Elegant white marble with grey veining',
    material_type: 'Marble',
    color: 'White',
    pattern: 'Veined',
    is_featured: true,
    sort_order: 4,
  },
  {
    name: 'Grey Tile',
    slug: 'grey-tile',
    type: 'floor',
    image_url: 'https://images.unsplash.com/photo-1560185127-6a7a1d3f20f7?w=800&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1560185127-6a7a1d3f20f7?w=400&q=80',
    description: 'Modern grey ceramic tile',
    material_type: 'Ceramic',
    color: 'Grey',
    pattern: 'Solid',
    is_featured: false,
    sort_order: 5,
  },

  // Window film textures
  {
    name: 'Frosted Glass',
    slug: 'frosted-glass',
    type: 'window',
    image_url: 'https://images.unsplash.com/photo-1545259742-12f0cb78e9a7?w=800&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1545259742-12f0cb78e9a7?w=400&q=80',
    description: 'Privacy frosted glass film',
    material_type: 'Film',
    color: 'Clear',
    pattern: 'Frosted',
    is_featured: true,
    sort_order: 1,
  },
  {
    name: 'Stained Glass Pattern',
    slug: 'stained-glass',
    type: 'window',
    image_url: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&q=80',
    description: 'Decorative stained glass pattern film',
    material_type: 'Film',
    color: 'Multicolor',
    pattern: 'Decorative',
    is_featured: true,
    sort_order: 2,
  },
  {
    name: 'Modern Geometric',
    slug: 'modern-geometric',
    type: 'window',
    image_url: 'https://images.unsplash.com/photo-1542345812-d98b5cd6cf98?w=800&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1542345812-d98b5cd6cf98?w=400&q=80',
    description: 'Modern geometric pattern window film',
    material_type: 'Film',
    color: 'Clear',
    pattern: 'Geometric',
    is_featured: true,
    sort_order: 3,
  },
  {
    name: 'Privacy Dots',
    slug: 'privacy-dots',
    type: 'window',
    image_url: 'https://images.unsplash.com/photo-1618220048045-10661e8600fa?w=800&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1618220048045-10661e8600fa?w=400&q=80',
    description: 'Dotted pattern privacy film',
    material_type: 'Film',
    color: 'Clear',
    pattern: 'Dotted',
    is_featured: false,
    sort_order: 4,
  },
];

async function seedTextures() {
  try {
    console.log('Starting texture seeding...');
    console.log(`Will add ${SAMPLE_TEXTURES.length} sample textures`);

    for (const texture of SAMPLE_TEXTURES) {
      console.log(`\nAdding: ${texture.name} (${texture.type})`);

      const response = await fetch('http://localhost:3000/api/textures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(texture),
      });

      const result = await response.json();

      if (result.success) {
        console.log(`  ✓ Added successfully (ID: ${result.data.id})`);
      } else {
        console.log(`  ✗ Failed: ${result.error}`);
      }
    }

    console.log('\n✅ Texture seeding complete!');
  } catch (error) {
    console.error('❌ Error seeding textures:', error);
    process.exit(1);
  }
}

seedTextures();
