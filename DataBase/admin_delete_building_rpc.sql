-- Create an RPC to securely delete a building and ALL associated users/data
create or replace function public.admin_delete_building(
  target_building_id uuid,
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
  -- 1. Ensure caller is a valid admin
  select exists(
    select 1 from public.admins 
    where admin_number = admin_req_number 
    and password = admin_req_password
  ) into admin_exists;

  if not admin_exists then
    raise exception 'Unauthorized: Invalid Admin Credentials';
  end if;

  -- 2. Delete all Auth Users bound to this building's profiles
  -- This is the most critical step as it removes login ability.
  -- It will cascade to public.profiles if foreign key is configured as ON DELETE CASCADE.
  delete from auth.users 
  where id in (
    select auth_uid from public.profiles 
    where building_id = target_building_id 
    and auth_uid is not null
  );

  -- 3. Explicitly delete profiles referencing this building
  -- (To handle cases where ON DELETE CASCADE is missing on the profiles fk_auth_user)
  delete from public.profiles where building_id = target_building_id;

  -- 4. Explicitly delete conversations referencing this building 
  delete from public.conversations where building_id = target_building_id;

  -- 5. Delete the building itself
  -- If there are other tables like building_documents or equipment that lack ON DELETE CASCADE,
  -- this statement will fail and you will need to add explicit DELETE statements for them here before this line.
  delete from public.buildings where id = target_building_id;

  return 'Building and all associated data effectively deleted.';
end;
$$;
