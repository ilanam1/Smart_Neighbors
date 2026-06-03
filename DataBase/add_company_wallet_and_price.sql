-- DataBase/add_company_wallet_and_price.sql
-- 1. Add columns to public.service_companies
ALTER TABLE public.service_companies
  ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS balance numeric DEFAULT 0 NOT NULL;

-- 2. Create the company payments transaction table
CREATE TABLE IF NOT EXISTS public.company_payments (
  id             uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id    uuid    REFERENCES public.buildings(id) ON DELETE CASCADE NOT NULL,
  company_id     uuid    REFERENCES public.service_companies(id) ON DELETE CASCADE NOT NULL,
  amount         numeric NOT NULL,
  employee_count integer NOT NULL,
  month_year     text    NOT NULL, -- format: YYYY-MM
  processed_at   timestamptz DEFAULT now() NOT NULL,
  UNIQUE(building_id, company_id, month_year)
);

-- Enable RLS for company_payments
ALTER TABLE public.company_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to company_payments"
  ON public.company_payments FOR SELECT USING (true);

-- 3. Billing process function
CREATE OR REPLACE FUNCTION public.process_monthly_company_payments(p_month_year text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month_year text;
  r RECORD;
BEGIN
  -- Default to previous month if NULL
  IF p_month_year IS NULL THEN
    v_month_year := to_char(now() - interval '1 month', 'YYYY-MM');
  ELSE
    v_month_year := p_month_year;
  END IF;

  -- Loop through buildings and companies linked by employee_buildings mapping
  FOR r IN (
    SELECT 
      eb.building_id,
      se.company_id,
      sc.price,
      COUNT(eb.employee_id) as employee_count,
      (sc.price * COUNT(eb.employee_id)) as total_amount
    FROM public.employee_buildings eb
    JOIN public.service_employees se ON eb.employee_id = se.id
    JOIN public.service_companies sc ON se.company_id = sc.id
    GROUP BY eb.building_id, se.company_id, sc.price
  ) LOOP
    
    -- Check if payment already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.company_payments
      WHERE building_id = r.building_id
        AND company_id = r.company_id
        AND month_year = v_month_year
    ) THEN
      
      -- Deduct from building's wallet
      INSERT INTO public.building_wallets (building_id, total_collected, updated_at)
      VALUES (r.building_id, -r.total_amount, now())
      ON CONFLICT (building_id) DO UPDATE
        SET total_collected = building_wallets.total_collected - r.total_amount,
            updated_at = now();

      -- Add to company's balance
      UPDATE public.service_companies
      SET balance = balance + r.total_amount
      WHERE id = r.company_id;

      -- Log transaction
      INSERT INTO public.company_payments (
        building_id,
        company_id,
        amount,
        employee_count,
        month_year
      ) VALUES (
        r.building_id,
        r.company_id,
        r.total_amount,
        r.employee_count,
        v_month_year
      );

    END IF;

  END LOOP;
END;
$$;

-- 4. Enable pg_cron extension if not active and schedule the monthly billing
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing schedule if any
SELECT cron.unschedule('monthly-service-company-billing') 
FROM cron.job 
WHERE jobname = 'monthly-service-company-billing';

-- Schedule for the 10th of every month at 00:00 (midnight)
-- It runs the billing function, defaulting to the previous month
SELECT cron.schedule(
  'monthly-service-company-billing',
  '0 0 10 * *',
  'SELECT public.process_monthly_company_payments();'
);
