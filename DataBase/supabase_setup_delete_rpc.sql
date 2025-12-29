-- Create a stored procedure to allow admins to delete users
-- This function runs with security definer privileges to allow deleting from auth.users
create or replace function public.delete_user_as_admin(
  target_user_id uuid,
  admin_req_number text,
  admin_req_password text
)
returns text
language plpgsql
security definer
as $$
declare
  admin_exists boolean;
begin
  -- 1. Verify Admin Credentials
  select exists(
    select 1 from public.admins 
    where admin_number = admin_req_number 
    and password = admin_req_password
  ) into admin_exists;

  if not admin_exists then
    raise exception 'Unauthorized: Invalid Admin Credentials';
  end if;

  -- 2. Delete the user from auth.users
  --    This should CASCADE to public.profiles if the Foreign Key is set up correctly.
  --    If not, we can explicit delete from profiles first:
  --    delete from public.profiles where auth_uid = target_user_id; 
  delete from auth.users where id = target_user_id;

  return 'User deleted successfully';
end;
$$;
