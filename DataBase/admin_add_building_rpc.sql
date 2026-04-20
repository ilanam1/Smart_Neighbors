-- Create a secure function to insert a building as an admin
create or replace function public.admin_add_building(
  admin_req_number text,
  admin_req_password text,
  building_name text,
  building_address text,
  building_city text
)
returns public.buildings
language plpgsql
security definer
as $$
declare
  admin_exists boolean;
  new_building public.buildings;
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

  -- 2. Insert the building and return it
  insert into public.buildings (name, address, city)
  values (building_name, building_address, building_city)
  returning * into new_building;

  return new_building;
end;
$$;
