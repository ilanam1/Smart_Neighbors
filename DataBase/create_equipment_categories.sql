create table if not exists public.equipment_categories (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    description text null,
    image_url text null,
    created_at timestamptz not null default now()
);