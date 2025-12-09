-- supabase_setup_for_Requests.sql
-- Run this in the Supabase SQL editor.

-- טבלת בקשות עזרה בין שכנים
create table if not exists public.requests (
    id uuid primary key default gen_random_uuid(),

    -- מי פרסם את הבקשה (מזהה משתמש ב-auth.users)
    auth_user_id uuid not null
        references auth.users (id)
        on delete cascade,

    -- שדות הבקשה כפי שהגדרת
    title text not null,
    description text not null,

    -- קטגוריה ורמת דחיפות מתוך רשימה (נשמור כ-text עם CHECK)
    category text not null check (category in (
        'ITEM_LOAN',     -- השאלת ציוד
        'PHYSICAL_HELP', -- עזרה פיזית
        'INFO',          -- מידע
        'OTHER'          -- אחר
    )),

    urgency text not null check (urgency in (
        'LOW',
        'MEDIUM',
        'HIGH'
    )),

    -- סטטוס מנוהל ע"י המערכת בלבד
    status text not null default 'OPEN' check (status in (
        'OPEN',      -- פתוחה
        'CANCELLED', -- בוטלה ע"י הדייר
        'EXPIRED',   -- נסגרה אוטומטית אחרי זמן
        'COMPLETED'  -- טופלה / הסתיימה
    )),

    -- זמני יצירה/עדכון/תפוגה/סגירה
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    expires_at timestamptz null, -- עד מתי הבקשה רלוונטית
    closed_at timestamptz null   -- מתי הבקשה נסגרה בפועל
);

-- אינדקסים שימושיים
create index if not exists idx_requests_auth_user
    on public.requests (auth_user_id);

create index if not exists idx_requests_status_created
    on public.requests (status, created_at desc);

-- פונקציה וטריגר לעדכון אוטומטי של updated_at בכל שינוי
create or replace function public.set_requests_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_set_requests_updated_at on public.requests;

create trigger trg_set_requests_updated_at
before update on public.requests
for each row
execute procedure public.set_requests_updated_at();
