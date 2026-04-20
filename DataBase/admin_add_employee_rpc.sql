-- Create a secure function to insert a service employee as an admin
create or replace function public.admin_add_service_employee(
  admin_req_number text,
  admin_req_password text,
  target_company_id uuid,
  emp_name text,
  emp_phone text,
  emp_password text
)
returns public.service_employees
language plpgsql
security definer
as $$
declare
  admin_exists boolean;
  new_employee public.service_employees;
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

  -- 2. Insert the employee and return it
  -- Note: We use emp_phone as the employee_number (unique ID for login)
  insert into public.service_employees (
    company_id, 
    employee_number, 
    password, 
    full_name, 
    phone
  )
  values (
    target_company_id,
    emp_phone,
    emp_password,
    emp_name,
    emp_phone
  )
  returning * into new_employee;

  return new_employee;

  -- Catch unique constraint violation on employee_number (phone)
exception when unique_violation then
  raise exception 'עובד עם מספר טלפון זה כבר קיים במערכת.';
end;
$$;
