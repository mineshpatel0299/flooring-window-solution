# Supabase Setup Guide

This guide will help you set up Supabase for the Floor & Window Visualizer application.

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- Supabase CLI installed (optional, for local development)

## Setup Steps

### 1. Create a New Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in the project details:
   - **Name**: floor-window-visualizer (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Select the closest region to your users
4. Click "Create new project"
5. Wait for the project to be created (this may take a few minutes)

### 2. Get Your Project Credentials

1. Once the project is created, go to **Settings** > **API**
2. Copy the following values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon/public key**: This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Go to **Settings** > **Database** > **Connection String**
4. Go back to **Settings** > **API** and scroll to **Service Role**
5. Copy the **service_role** key (keep this secret!)

### 3. Update Environment Variables

1. Open `.env.local` in the project root
2. Update the following values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 4. Run Database Migrations

#### Option A: Using Supabase Dashboard (Recommended for beginners)

1. Go to your project dashboard
2. Click on **SQL Editor** in the left sidebar
3. Click **+ New Query**
4. Copy the contents of `migrations/001_initial_schema.sql`
5. Paste into the SQL editor and click **Run**
6. Repeat for `migrations/002_rls_policies.sql`
7. (Optional) Run `seed.sql` to add sample data

#### Option B: Using Supabase CLI (Advanced)

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-id

# Run migrations
supabase db push

# Run seed (optional)
supabase db seed
```

### 5. Create Storage Buckets

1. Go to **Storage** in the Supabase dashboard
2. Click **New bucket**
3. Create the following buckets:

#### Bucket 1: texture-assets
- **Name**: `texture-assets`
- **Public**: ✅ Yes
- **File size limit**: 10 MB
- **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`

#### Bucket 2: user-uploads
- **Name**: `user-uploads`
- **Public**: ❌ No
- **File size limit**: 10 MB
- **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`

#### Bucket 3: processed-images
- **Name**: `processed-images`
- **Public**: ✅ Yes
- **File size limit**: 10 MB
- **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`

#### Bucket 4: thumbnails
- **Name**: `thumbnails`
- **Public**: ✅ Yes
- **File size limit**: 2 MB
- **Allowed MIME types**: `image/jpeg`, `image/png`, `image/webp`

### 6. Configure Storage Policies

For each bucket, set up the following policies in **Storage** > **Policies**:

#### texture-assets (Public Read)
```sql
-- Allow public read
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'texture-assets');

-- Allow authenticated insert (for admin)
CREATE POLICY "Authenticated insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'texture-assets');
```

#### user-uploads (Private)
```sql
-- Allow users to upload
CREATE POLICY "Users can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-uploads');

-- Allow users to read own uploads
CREATE POLICY "Users can read own uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-uploads');
```

#### processed-images (Public Read)
```sql
-- Allow public read
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'processed-images');

-- Allow users to upload
CREATE POLICY "Users can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'processed-images');
```

#### thumbnails (Public Read)
```sql
-- Allow public read
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'thumbnails');

-- Allow users to upload
CREATE POLICY "Users can upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'thumbnails');
```

### 7. Verify Setup

1. Check that all tables are created:
   - Go to **Database** > **Tables**
   - You should see: `categories`, `textures`, `sessions`, `projects`

2. Check that all storage buckets are created:
   - Go to **Storage**
   - You should see: `texture-assets`, `user-uploads`, `processed-images`, `thumbnails`

3. Test the connection:
   ```bash
   npm run dev
   ```
   - The app should start without database connection errors

### 8. Upload Sample Textures (Optional)

1. Go to **Storage** > **texture-assets**
2. Upload some sample texture images for testing
3. Update the seed data in `seed.sql` with the actual image URLs
4. Run the updated seed file to populate the database

## Troubleshooting

### Connection Errors
- Verify that environment variables are correctly set
- Check that the Supabase project is active and not paused
- Ensure the anon key and service role key are correct

### Migration Errors
- Make sure to run migrations in order (001, then 002)
- Check the SQL Editor for error messages
- Verify that the UUID extension is enabled

### Storage Upload Errors
- Check bucket policies are correctly configured
- Verify file size limits
- Ensure MIME types are allowed

## Next Steps

After setup is complete:
1. Upload real texture images to `texture-assets` bucket
2. Update texture records in the database with actual image URLs
3. Start developing the application features

## Useful Commands

```bash
# Start development server
npm run dev

# Generate TypeScript types from Supabase
npx supabase gen types typescript --project-id your-project-id > lib/supabase/types.ts

# View Supabase logs
supabase logs

# Reset database (⚠️ WARNING: This will delete all data!)
supabase db reset
```

## Support

For more information:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
