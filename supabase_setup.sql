-- supabase_setup.sql
-- Run this in the Supabase SQL editor for your project.
-- 1) Create a simple users table to store profiles (if you don't already have it)
create table if not exists public.users (
  id uuid default gen_random_uuid() primary key,
  auth_uid uuid,
  email text,
  created_at timestamptz default now(),
  constraint fk_auth_user foreign key (auth_uid) references auth.users(id) on delete cascade
);

-- 2) Optional: enable row level security and add a policy allowing authenticated inserts
--    (This policy lets authenticated users insert rows for themselves; adjust for production.)
alter table public.users enable row level security;

create policy "Allow authenticated inserts" on public.users
  for insert using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- 3) Create a trigger so a profile row is automatically created when a user is added to auth.users
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer as $$
begin
  -- Insert a profile row for the new auth user, avoid duplicates
  insert into public.users (auth_uid, email, created_at)
  values (new.id, new.email, now())
  on conflict (auth_uid) do nothing;
  return new;
end;
$$;

-- Attach the trigger to the auth.users table
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- 4) Quick verification query you can run after applying the SQL:
-- select * from public.users order by created_at desc limit 10;

-- Notes:
-- - If you don't want automatic profile creation, omit the trigger section and instead create profiles
--   from your backend after a successful sign-up.
-- - If email confirmations are enabled, the auth.signUp call may return session=null until the user
--   confirms their email. The trigger above runs when auth.users receives a new user record, which
--   should happen regardless of confirmation state (auth.users gets the user record immediately).
-- - Make sure your "auth" schema is accessible and that triggers on auth.users are allowed in your
--   Supabase project (they generally are for self-hosted Postgres and Supabase-managed projects).
