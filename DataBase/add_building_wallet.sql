-- DataBase/add_building_wallet.sql
-- ===================================================
-- קופת בניין – טבלה וירטואלית לניהול תקבולי ועד הבית
-- ===================================================

-- 1. הפוך את committee_auth_user_id לאופציונלי (הדייר כבר לא בוחר חבר ועד ידנית)
ALTER TABLE public.house_fee_payments
  ALTER COLUMN committee_auth_user_id DROP NOT NULL;

-- 1b. הוסף 'STRIPE' לרשימת שיטות התשלום המורשות
--     (ה-constraint המקורי אפשר רק CASH ו-LINK)
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.house_fee_payments'::regclass
    AND contype = 'c'
    AND conname LIKE '%payment_method%'
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.house_fee_payments DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.house_fee_payments
  ADD CONSTRAINT house_fee_payments_payment_method_check
  CHECK (payment_method IN ('CASH', 'LINK', 'STRIPE'));

-- 2. טבלת קופה לכל בניין (one-per-building)
CREATE TABLE IF NOT EXISTS public.building_wallets (
  id              uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id     uuid    REFERENCES public.buildings(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_collected numeric DEFAULT 0 NOT NULL,  -- סך הכל שנגבה מאז הקמת המערכת
  created_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL,
  updated_at      timestamptz DEFAULT timezone('utc', now()) NOT NULL
);

-- 3. RLS על הטבלה
ALTER TABLE public.building_wallets ENABLE ROW LEVEL SECURITY;

-- ועד בית רואה רק את הקופה של הבניין שלו
CREATE POLICY "Committee sees own building wallet"
  ON public.building_wallets FOR SELECT
  USING (
    building_id IN (
      SELECT building_id FROM public.profiles
      WHERE auth_uid = auth.uid() AND is_house_committee = true
    )
  );

-- דיירים רואים את הקופה של הבניין שלהם (לצורך שקיפות)
CREATE POLICY "Tenants see own building wallet"
  ON public.building_wallets FOR SELECT
  USING (
    building_id IN (
      SELECT building_id FROM public.profiles
      WHERE auth_uid = auth.uid()
    )
  );

-- אדמין רואה הכל
CREATE POLICY "Admins see all wallets"
  ON public.building_wallets FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- 4. פונקציה שמוסיפה לקופת הבניין כשתשלום הופך ל-PAID
CREATE OR REPLACE FUNCTION public.update_building_wallet_on_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- רק כשמצב השתנה ל-PAID
  IF NEW.status = 'PAID' AND (OLD.status IS DISTINCT FROM 'PAID') THEN
    -- הוסף / עדכן שורת קופה לבניין
    INSERT INTO public.building_wallets (building_id, total_collected, updated_at)
    VALUES (NEW.building_id, NEW.amount, timezone('utc', now()))
    ON CONFLICT (building_id) DO UPDATE
      SET total_collected = building_wallets.total_collected + NEW.amount,
          updated_at      = timezone('utc', now());
  END IF;

  -- אם תשלום ש-PAID חזר ל-FAILED – הפחת מהקופה
  IF OLD.status = 'PAID' AND NEW.status = 'FAILED' THEN
    UPDATE public.building_wallets
    SET total_collected = GREATEST(0, total_collected - OLD.amount),
        updated_at      = timezone('utc', now())
    WHERE building_id = OLD.building_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 5. הצמד את הטריגר לטבלת התשלומים
DROP TRIGGER IF EXISTS trg_update_building_wallet ON public.house_fee_payments;
CREATE TRIGGER trg_update_building_wallet
  AFTER UPDATE OF status ON public.house_fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_building_wallet_on_payment();

-- גם על INSERT (למקרה שתשלום נוצר ישירות עם PAID)
DROP TRIGGER IF EXISTS trg_insert_building_wallet ON public.house_fee_payments;
CREATE TRIGGER trg_insert_building_wallet
  AFTER INSERT ON public.house_fee_payments
  FOR EACH ROW
  WHEN (NEW.status = 'PAID')
  EXECUTE FUNCTION public.update_building_wallet_on_payment();

-- 6. view נוחה לסיכום קופה חודשית לכל בניין
CREATE OR REPLACE VIEW public.building_monthly_summary AS
SELECT
  p.building_id,
  p.month_year,
  COUNT(*) FILTER (WHERE p.status = 'PAID')                     AS paid_count,
  COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'PAID'), 0)   AS paid_total,
  COUNT(*) FILTER (WHERE p.status = 'CASH_REQUESTED')           AS pending_cash_count,
  COUNT(*) FILTER (WHERE p.status NOT IN ('PAID','FAILED'))      AS pending_count
FROM public.house_fee_payments p
GROUP BY p.building_id, p.month_year;
