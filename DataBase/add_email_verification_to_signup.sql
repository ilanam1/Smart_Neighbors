-- add_email_verification_to_signup.sql
-- Run this in the Supabase SQL editor for your project.

-- 1. Add is_email_verified column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;

-- 2. Mark all existing users as verified so they don't lose access
UPDATE public.profiles 
SET is_email_verified = TRUE 
WHERE is_email_verified = FALSE OR is_email_verified IS NULL;

-- 3. Create/Replace the trigger function to automatically verify profile emails when confirmed in auth.users
CREATE OR REPLACE FUNCTION public.handle_auth_user_email_confirmation()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if email has been confirmed
    IF NEW.email_confirmed_at IS NOT NULL AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at <> NEW.email_confirmed_at) THEN
        UPDATE public.profiles
        SET is_email_verified = TRUE
        WHERE auth_uid = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach the trigger to auth.users table
DROP TRIGGER IF EXISTS trigger_handle_auth_user_email_confirmation ON auth.users;

CREATE TRIGGER trigger_handle_auth_user_email_confirmation
AFTER UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_auth_user_email_confirmation();
