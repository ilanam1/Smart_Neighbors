-- DataBase/create_wallets_table.sql
-- טבלת משלוח ארנקים עבור אוגדן כספים לוועדי הבתים הרשומים ל-Stripe
create table if not exists public.committee_wallets (
  id uuid default gen_random_uuid() primary key,
  building_id uuid references public.buildings(id) on delete cascade not null,
  committee_auth_uid uuid references auth.users(id) not null,
  stripe_account_id text, -- ישמור את יעד הסליקה (למשל acct_xxxx)
  available_balance numeric default 0.0 not null,
  pending_balance numeric default 0.0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(building_id)
);

-- הוספת עמודת מזהה סליקה לטבלת התשלומים למניעת כפילויות
alter table public.house_fee_payments 
add column if not exists stripe_payment_intent_id text unique;

-- מדיניות אבטחה (RLS) עבור טבלת הארנקים
alter table public.committee_wallets enable row level security;

create policy "Committees can view their own wallet"
  on public.committee_wallets for select
  using (auth.uid() = committee_auth_uid);

create policy "Admins can view all wallets"
  on public.committee_wallets for select
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
