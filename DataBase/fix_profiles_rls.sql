-- Run this directly in the Supabase SQL Editor to allow users to see other residents in the app!

-- Enable RLS just in case it isn't strictly enforced
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop an old overly-restrictive select policy if one exists to prevent duplicates (optional)
-- DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;

-- Create a policy that allows ANY authenticated user to read profiles
-- This ensures the chat list can populate building members
CREATE POLICY "Allow authenticated users to read profiles" 
ON public.profiles
FOR SELECT 
USING ( auth.role() = 'authenticated' );

-- Note: we restrict to 'authenticated' so anonymous users cannot scrape your users
