-- Create an RPC to securely delete users who are rejected and NOT YET APPROVED
create or replace function public.delete_rejected_user(target_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  is_target_unapproved boolean;
begin
  -- 1. Ensure the user is actually unapproved. 
  --    This prevents someone from maliciously deleting approved tenants.
  select exists(
    select 1 from public.profiles 
    where auth_uid = target_user_id 
    and is_approved = false
  ) into is_target_unapproved;

  if not is_target_unapproved then
    raise exception 'Unauthorized: User is already approved or does not exist';
  end if;

  -- 2. Delete the user from auth.users (cascades to profiles)
  delete from auth.users where id = target_user_id;

end;
$$;
