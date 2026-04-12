-- SQL to add is_approved column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

-- If you have any existing users who ARE already approved and using the app, you may want to retroactively approve them:
-- UPDATE public.profiles SET is_approved = TRUE WHERE is_approved = FALSE;
