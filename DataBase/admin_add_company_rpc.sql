-- Create a secure function to insert a service company as an admin
create or replace function public.admin_add_service_company(
  admin_req_number text,
  admin_req_password text,
  company_name text,
  company_type text
)
returns public.service_companies
language plpgsql
security definer
as $$
declare
  admin_exists boolean;
  new_company public.service_companies;
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

  -- 2. Insert the company and return it
  insert into public.service_companies (name, service_type)
  values (company_name, company_type)
  returning * into new_company;

  return new_company;
end;
$$;
