create table if not exists public.equipment_loans (
    id uuid primary key default gen_random_uuid(),

    -- לאיזה בניין הבקשה שייכת
    building_id uuid not null references public.buildings(id) on delete cascade,

    -- הציוד המבוקש
    equipment_id uuid not null references public.building_equipment(id) on delete cascade,

    -- בעל הציוד
    owner_id uuid not null references auth.users(id) on delete cascade,

    -- מי מבקש להשאיל
    borrower_id uuid not null references auth.users(id) on delete cascade,

    -- טווח זמן ההשאלה
    start_date date not null,
    end_date date not null,

    -- סטטוס הבקשה
    status text not null check (status in ('pending', 'approved', 'rejected', 'returned', 'cancelled')) default 'pending',

    created_at timestamptz not null default now(),

    constraint equipment_loans_valid_dates check (end_date >= start_date),
    constraint equipment_loans_no_self_borrow check (owner_id <> borrower_id)
);