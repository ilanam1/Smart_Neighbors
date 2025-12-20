
-- יצירת טבלת מסמכי בניין
create table if not exists public.building_documents (
  id bigserial primary key,              -- מפתח ראשי
  building_id text,                      -- מזהה בניין (אפשר להשאיר null כרגע)
  title text not null,                   -- כותרת המסמך
  file_path text not null,               -- הנתיב לקובץ ב-Storage
  uploaded_by uuid references auth.users (id) on delete set null, -- מי העלה
  created_at timestamptz not null default now()                   -- תאריך יצירה
);

-- הפעלת Row Level Security
alter table public.building_documents enable row level security;

-- מדיניות: כל משתמש מחובר (authenticated) יכול לקרוא מסמכים
create policy "Allow authenticated read building_documents"
on public.building_documents
for select
to authenticated
using (true);

-- מדיניות: כל משתמש מחובר (authenticated) יכול להוסיף מסמך
-- (בהמשך אפשר להגביל את זה רק לוועד הבית)
create policy "Allow authenticated insert building_documents"
on public.building_documents
for insert
to authenticated
with check (true);
