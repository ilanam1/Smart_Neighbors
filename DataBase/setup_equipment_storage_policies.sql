-- setup_equipment_storage_policies.sql
-- Run this in the Supabase SQL editor for your project.

-- 1. Create the 'equipment-images' bucket if it doesn't exist, and make it public
INSERT INTO storage.buckets (id, name, public)
VALUES ('equipment-images', 'equipment-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Enable Row-Level Security on storage.objects (commented out as it is enabled by default and requires owner privileges)
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for the 'equipment-images' bucket

-- Policy for SELECT (Allow anyone to view/read equipment images)
DROP POLICY IF EXISTS "Allow public read access to equipment images" ON storage.objects;
CREATE POLICY "Allow public read access to equipment images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'equipment-images');

-- Policy for INSERT (Allow authenticated users to upload new equipment images)
DROP POLICY IF EXISTS "Allow authenticated users to upload equipment images" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload equipment images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'equipment-images');

-- Policy for UPDATE (Allow authenticated users to update/overwrite their own equipment images)
DROP POLICY IF EXISTS "Allow authenticated users to update equipment images" ON storage.objects;
CREATE POLICY "Allow authenticated users to update equipment images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'equipment-images')
WITH CHECK (bucket_id = 'equipment-images');

-- Policy for DELETE (Allow authenticated users to delete equipment images)
DROP POLICY IF EXISTS "Allow authenticated users to delete equipment images" ON storage.objects;
CREATE POLICY "Allow authenticated users to delete equipment images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'equipment-images');
