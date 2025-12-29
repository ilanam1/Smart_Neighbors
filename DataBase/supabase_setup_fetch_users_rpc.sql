-- Create a secure function to fetch all profiles as an admin
create or replace function public.get_all_profiles_as_admin(
  admin_req_number text,
  admin_req_password text
)
returns setof public.profiles
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

  -- 2. Return all fields from profiles
  return query select * from public.profiles order by created_at desc;
end;
$$;
