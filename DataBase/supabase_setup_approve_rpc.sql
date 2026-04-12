-- Create an RPC to securely approve users, bypassing tight RLS restrictions
create or replace function public.approve_user(target_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- Update the profiles table and set the user as approved
  -- target_user_id maps to auth_uid (Auth Identity)
  update public.profiles
  set is_approved = true
  where auth_uid = target_user_id;
end;
$$;
