-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('floor', 'window')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Textures table
CREATE TABLE textures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('floor', 'window')),

  -- Storage paths
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Metadata
  description TEXT,
  material_type VARCHAR(100),
  color VARCHAR(50),
  pattern VARCHAR(50),

  -- Dimensions (for realistic scaling)
  width_cm DECIMAL(10, 2),
  height_cm DECIMAL(10, 2),

  -- Display options
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,

  -- Statistics
  usage_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Anonymous sessions table (for MVP without auth)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_token VARCHAR(500) NOT NULL UNIQUE,
  fingerprint TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,

  -- Project info
  name VARCHAR(200) DEFAULT 'Untitled Project',
  type VARCHAR(20) NOT NULL CHECK (type IN ('floor', 'window')),

  -- Image data
  original_image_url TEXT NOT NULL,
  processed_image_url TEXT,
  thumbnail_url TEXT,

  -- Segmentation data (stored as JSON)
  segmentation_data JSONB,

  -- Applied texture
  texture_id UUID REFERENCES textures(id) ON DELETE SET NULL,

  -- Canvas settings (perspective, blend mode, etc.)
  canvas_settings JSONB,

  -- Metadata
  is_public BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_textures_category ON textures(category_id);
CREATE INDEX idx_textures_type ON textures(type);
CREATE INDEX idx_textures_active ON textures(is_active);
CREATE INDEX idx_textures_featured ON textures(is_featured);
CREATE INDEX idx_textures_sort_order ON textures(sort_order);
CREATE INDEX idx_projects_session ON projects(session_id);
CREATE INDEX idx_projects_texture ON projects(texture_id);
CREATE INDEX idx_projects_type ON projects(type);
CREATE INDEX idx_projects_public ON projects(is_public);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_categories_type ON categories(type);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to update updated_at automatically
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_textures_updated_at
  BEFORE UPDATE ON textures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment texture usage count
CREATE OR REPLACE FUNCTION increment_texture_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.texture_id IS NOT NULL THEN
    UPDATE textures
    SET usage_count = usage_count + 1
    WHERE id = NEW.texture_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to increment usage count when project is created
CREATE TRIGGER increment_texture_usage_trigger
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION increment_texture_usage();
