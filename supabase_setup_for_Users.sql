-- supabase_setup_for_Users.sql
-- Run this in the Supabase SQL editor for your project.
-- This targets an existing table named exactly "Users" (capital U) in the public schema.

-- 1) Add columns we need to link auth users to profile rows
alter table public."Users"
  add column if not exists auth_uid uuid,
  add column if not exists created_at timestamptz default now();

-- 2) Optional: add a foreign key to auth.users (safe if auth.users exists)
alter table public."Users"
  add constraint if not exists fk_auth_user
  foreign key (auth_uid) references auth.users(id) on delete cascade;

-- 3) Create a trigger function that will insert a row into public."Users"
--    whenever a new auth user is created. This avoids client-side permission issues.
create or replace function public.handle_new_auth_user_to_Users()
returns trigger language plpgsql security definer as $$
begin
  -- Try to insert a profile row for the new auth user. If a row already exists for that auth_uid, do nothing.
  insert into public."Users" (auth_uid, email, created_at)
  values (new.id, new.email, now())
  on conflict (auth_uid) do nothing;
  return new;
end;
$$;

-- 4) Attach the trigger to auth.users
create trigger on_auth_user_created_into_Users
after insert on auth.users
for each row execute procedure public.handle_new_auth_user_to_Users();

-- Verification query you can run after applying the SQL:
-- select id, auth_uid, email, created_at from public."Users" order by created_at desc limit 10;

-- Notes:
-- - This will create profile rows server-side, so you don't need the client to insert into the Users table.
-- - If your Users table has NOT NULL constraints (other than id/email/password) you may need to adapt the insert to provide defaults.
-- - If you prefer the profile to be created only after email confirmation, use a different mechanism (for example, a webhook or a scheduled job that matches auth.users with Users). This trigger runs immediately when the auth.users row is created.
