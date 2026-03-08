-- create_buildings.sql
-- Run this in the Supabase SQL editor for your project.

-- 1) Create a buildings table
CREATE TABLE IF NOT EXISTS public.buildings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  address text,
  city text,
  created_at timestamptz DEFAULT now()
);

-- 2) Option to insert a sample building so the picker isn't empty:
INSERT INTO public.buildings (name, address, city) VALUES 
  ('Main Tower', '123 Main St', 'Tel Aviv'),
  ('Sun Tower', '45 Allenby St', 'Tel Aviv'),
  ('Moon Building', '12 Herzl St', 'Ramat Gan'),
  ('Star Complex', '80 Jabotinsky St', 'Ramat Gan'),
  ('Sea View', '5 Herbert Samuel St', 'Tel Aviv'),
  ('Park Plaza', '15 HaYarkon St', 'Tel Aviv'),
  ('Green House', '22 Rothschild Blvd', 'Tel Aviv'),
  ('City Center Building', '10 Dizengoff St', 'Tel Aviv');

-- 3) Add building_id column to profiles table
-- Assuming public.profiles exists (or whichever table your app maps to auth.users if it's users).
-- NOTE: In your codebase AuthScreen.js references 'profiles' table.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS building_id uuid REFERENCES public.buildings(id);

-- 4) If you have RLS policies on profiles, you might need to update them, and also enable RLS for buildings
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to buildings" ON public.buildings
  FOR SELECT USING (true);
