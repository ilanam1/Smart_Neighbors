-- fix_profiles_upsert_rls.sql
-- Run this in your Supabase SQL editor to allow users to sign up and save their profiles.

-- 1. Enable RLS on profiles (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies on profiles if they conflict or need cleanup
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public insert to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow individual insert" ON public.profiles;

-- 3. Create SELECT policy (Allow all authenticated users to view profiles)
CREATE POLICY "Allow authenticated users to read profiles" 
ON public.profiles
FOR SELECT 
USING ( auth.role() = 'authenticated' );

-- 4. Create INSERT policy (Allow anyone, including anonymous visitors registering, to create a profile)
CREATE POLICY "Allow public insert to profiles"
ON public.profiles
FOR INSERT
WITH CHECK ( true );

-- 5. Create UPDATE policy (Allow users to update only their own profile)
CREATE POLICY "Allow users to update their own profile"
ON public.profiles
FOR UPDATE
USING ( auth.uid() = auth_uid )
WITH CHECK ( auth.uid() = auth_uid );
