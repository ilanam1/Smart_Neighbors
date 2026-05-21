-- Create a secure function to login as an admin
create or replace function public.login_admin(
  p_admin_number text,
  p_password text
)
returns setof public.admins
language plpgsql
security definer
as $$
begin
  return query
  select *
  from public.admins
  where admin_number = p_admin_number
    and password = crypt(p_password, password);
end;
$$;

-- Create a secure function to login as a service employee
create or replace function public.login_employee(
  p_employee_number text,
  p_password text
)
returns setof public.service_employees
language plpgsql
security definer
as $$
begin
  return query
  select *
  from public.service_employees
  where employee_number = p_employee_number
    and password = crypt(p_password, password);
end;
$$;
