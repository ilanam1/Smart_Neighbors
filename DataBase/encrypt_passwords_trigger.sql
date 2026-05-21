-- 1. Create a function that encrypts the password if it's in plain text
CREATE OR REPLACE FUNCTION public.encrypt_password_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the password is already a bcrypt hash (bcrypt hashes usually start with '$2a$', '$2b$', etc.)
  -- If it doesn't start with '$2', it's likely plain text and needs to be encrypted
  IF NEW.password NOT LIKE '$2a$%' AND NEW.password NOT LIKE '$2b$%' AND NEW.password NOT LIKE '$2y$%' THEN
    NEW.password = crypt(NEW.password, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Attach the trigger to the 'admins' table
DROP TRIGGER IF EXISTS tr_encrypt_admin_password ON public.admins;
CREATE TRIGGER tr_encrypt_admin_password
BEFORE INSERT OR UPDATE OF password ON public.admins
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_password_trigger();

-- 3. Attach the trigger to the 'service_employees' table
DROP TRIGGER IF EXISTS tr_encrypt_employee_password ON public.service_employees;
CREATE TRIGGER tr_encrypt_employee_password
BEFORE INSERT OR UPDATE OF password ON public.service_employees
FOR EACH ROW
EXECUTE FUNCTION public.encrypt_password_trigger();

-- 4. Automatically convert all EXISTING plain text passwords to encrypted hashes!
-- This will run exactly once when you execute this script in Supabase
UPDATE public.admins 
SET password = crypt(password, gen_salt('bf'))
WHERE password NOT LIKE '$2a$%' AND password NOT LIKE '$2b$%' AND password NOT LIKE '$2y$%';

UPDATE public.service_employees 
SET password = crypt(password, gen_salt('bf'))
WHERE password NOT LIKE '$2a$%' AND password NOT LIKE '$2b$%' AND password NOT LIKE '$2y$%';
