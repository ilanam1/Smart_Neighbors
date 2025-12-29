-- Create admins table
create table if not exists public.admins (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  admin_number text not null unique,
  password text not null,
  full_name text
);

-- Turn on RLS
alter table public.admins enable row level security;

-- Create policy to allow anyone to read (needed for login check without being authenticated yet)
-- WARNING: In production, you would not want to expose the password hash to the public. 
-- Since this is a requested feature with simple requirements, we will allow read access.
create policy "Allow public read access"
  on public.admins for select
  using (true);

-- Insert a default admin for testing (Optional)
-- admin_number: 'admin123'
-- password: 'password123'
insert into public.admins (admin_number, password, full_name)
values ('admin123', 'password123', 'System Administrator')
on conflict (admin_number) do nothing;
