-- RPC to securely delete an entire service company and all its employees
create or replace function public.admin_delete_service_company(
  target_company_id uuid,
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
  -- 1. Validate Admin credentials
  select exists(
    select 1 from public.admins 
    where admin_number = admin_req_number 
    and password = admin_req_password
  ) into admin_exists;

  if not admin_exists then
    raise exception 'Unauthorized: Invalid Admin Credentials';
  end if;

  -- 2. Delete the company.
  -- Thanks to ON DELETE CASCADE on service_employees (company_id) 
  -- and employee_buildings (employee_id), this single statement 
  -- propagates down and cleans up all related records seamlessly.
  delete from public.service_companies where id = target_company_id;

  return 'Company and all associated employees deleted successfully.';
end;
$$;


-- RPC to securely delete an individual service employee
create or replace function public.admin_delete_service_employee(
  target_employee_id uuid,
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
  -- 1. Validate Admin credentials
  select exists(
    select 1 from public.admins 
    where admin_number = admin_req_number 
    and password = admin_req_password
  ) into admin_exists;

  if not admin_exists then
    raise exception 'Unauthorized: Invalid Admin Credentials';
  end if;

  -- 2. Delete the employee.
  -- ON DELETE CASCADE handles cleaning up `employee_buildings`.
  delete from public.service_employees where id = target_employee_id;

  return 'Employee removed effectively.';
end;
$$;
