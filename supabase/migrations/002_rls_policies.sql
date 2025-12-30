-- Enable Row Level Security on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE textures ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Categories: Public read access
CREATE POLICY "Public read categories"
  ON categories FOR SELECT
  USING (true);

CREATE POLICY "Admin insert categories"
  ON categories FOR INSERT
  WITH CHECK (true); -- TODO: Add admin check when auth is implemented

CREATE POLICY "Admin update categories"
  ON categories FOR UPDATE
  USING (true); -- TODO: Add admin check when auth is implemented

CREATE POLICY "Admin delete categories"
  ON categories FOR DELETE
  USING (true); -- TODO: Add admin check when auth is implemented

-- Textures: Public read active textures, admin manage all
CREATE POLICY "Public read active textures"
  ON textures FOR SELECT
  USING (is_active = true OR true); -- Allow reading all for now

CREATE POLICY "Admin insert textures"
  ON textures FOR INSERT
  WITH CHECK (true); -- TODO: Add admin check when auth is implemented

CREATE POLICY "Admin update textures"
  ON textures FOR UPDATE
  USING (true); -- TODO: Add admin check when auth is implemented

CREATE POLICY "Admin delete textures"
  ON textures FOR DELETE
  USING (true); -- TODO: Add admin check when auth is implemented

-- Sessions: Anyone can create, users can read own session
CREATE POLICY "Anyone can create session"
  ON sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users read own session"
  ON sessions FOR SELECT
  USING (true); -- For now, allow reading all sessions (will be restricted with auth)

CREATE POLICY "Users update own session"
  ON sessions FOR UPDATE
  USING (true);

-- Projects: Users can CRUD own projects, public can read public projects
CREATE POLICY "Anyone can read public projects"
  ON projects FOR SELECT
  USING (is_public = true OR true); -- For now, allow reading all projects

CREATE POLICY "Anyone can create projects"
  ON projects FOR INSERT
  WITH CHECK (true); -- For now, anyone can create projects

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (true); -- For now, allow updating all projects

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (true); -- For now, allow deleting all projects

-- Note: The policies above are permissive for MVP without authentication.
-- When authentication is implemented, update these policies to check:
-- - auth.uid() for user identification
-- - Custom roles table for admin checks
-- - session_token matching for anonymous users
