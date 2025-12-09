-- טבלת עדכוני בניין
create table if not exists public.building_updates (
    id uuid primary key default gen_random_uuid(),

    -- מי פרסם את העדכון (auth.users)
    created_by uuid references auth.users(id) on delete set null,

    -- תוכן העדכון
    title text not null,
    body text not null,

    -- סוג/קטגוריה של העדכון
    category text not null check (category in (
        'GENERAL',
        'MAINTENANCE',
        'ALERT'
    )) default 'GENERAL',

    -- האם זה עדכון חשוב במיוחד
    is_important boolean not null default false,

    -- מתי נוצר
    created_at timestamptz not null default now()
);

-- אינדקסים שימושיים
create index if not exists idx_building_updates_created_at
    on public.building_updates (created_at desc);

create index if not exists idx_building_updates_category
    on public.building_updates (category);
