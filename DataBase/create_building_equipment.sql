create table if not exists public.building_equipment (
    id uuid primary key default gen_random_uuid(),

    -- לאיזה בניין הציוד שייך
    building_id uuid not null references public.buildings(id) on delete cascade,

    -- מי פרסם את הציוד
    owner_id uuid not null references auth.users(id) on delete cascade,

    -- קטגוריה
    category_id uuid not null references public.equipment_categories(id) on delete restrict,

    -- פרטי הציוד
    title text not null,
    description text null,

    -- האם הציוד זמין כרגע באופן כללי
    is_available boolean not null default true,

    -- תמונה של הפריט עצמו (לא חובה)
    item_image_url text null,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);