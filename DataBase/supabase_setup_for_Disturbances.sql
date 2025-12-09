-- supabase_setup_for_Disturbances.sql

create table if not exists public.disturbance_reports (
    id uuid primary key default gen_random_uuid(),

    auth_user_id uuid not null
        references auth.users (id)
        on delete cascade,

    type text not null check (type in (
        'NOISE',        -- רעש
        'CLEANLINESS',  -- לכלוך / אשפה
        'SAFETY',       -- בטיחות / ונדליזם
        'OTHER'         -- אחר
    )),

    severity text not null check (severity in (
        'LOW',
        'MEDIUM',
        'HIGH'
    )),

    description text not null,
    occurred_at timestamptz not null,
    location text null,

    status text not null default 'OPEN' check (status in (
        'OPEN',
        'IN_PROGRESS',
        'RESOLVED',
        'REJECTED'
    )),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_disturbance_user
    on public.disturbance_reports (auth_user_id);

create index if not exists idx_disturbance_status_created
    on public.disturbance_reports (status, created_at desc);

create or replace function public.set_disturbance_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_disturbance_updated_at on public.disturbance_reports;

create trigger trg_set_disturbance_updated_at
before update on public.disturbance_reports
for each row
execute procedure public.set_disturbance_updated_at();

-- (אופציונלי אבל כדאי)
alter table public.disturbance_reports enable row level security;

create policy "insert_own_disturbance"
on public.disturbance_reports
for insert
with check (auth.uid() = auth_user_id);

create policy "select_own_disturbance"
on public.disturbance_reports
for select
using (auth.uid() = auth_user_id);
