-- Create service companies table
CREATE TABLE IF NOT EXISTS public.service_companies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    service_type text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Insert 8 fixed companies
INSERT INTO public.service_companies (name, service_type) VALUES
    ('א.ד ניקיונות', 'CLEANING'),
    ('הברקה שירותי ניקיון', 'CLEANING'),
    ('חשמל ישיר', 'ELECTRICIAN'),
    ('אור ופז חשמלאים', 'ELECTRICIAN'),
    ('השומר הבטחה', 'SECURITY'),
    ('עין הנץ אבטחה', 'SECURITY'),
    ('צינורות המזרח', 'PLUMBER'),
    ('אחזקות העיר', 'GENERAL')
ON CONFLICT DO NOTHING;

-- Create service employees table (Custom Auth like admins)
CREATE TABLE IF NOT EXISTS public.service_employees (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES public.service_companies(id) ON DELETE CASCADE,
    employee_number text NOT NULL UNIQUE,
    password text NOT NULL,
    full_name text NOT NULL,
    phone text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS for service_employees
ALTER TABLE public.service_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to service_employees for auth"
    ON public.service_employees FOR SELECT USING (true);
CREATE POLICY "Allow members to read service_employees"
    ON public.service_employees FOR SELECT USING (true);
CREATE POLICY "Allow members to insert service_employees"
    ON public.service_employees FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow members to update service_employees"
    ON public.service_employees FOR UPDATE USING (true);
CREATE POLICY "Allow members to delete service_employees"
    ON public.service_employees FOR DELETE USING (true);

-- Create employee_buildings mapping table
CREATE TABLE IF NOT EXISTS public.employee_buildings (
    employee_id uuid REFERENCES public.service_employees(id) ON DELETE CASCADE,
    building_id uuid REFERENCES public.buildings(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (employee_id, building_id)
);

-- Enable RLS for employee_buildings
ALTER TABLE public.employee_buildings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all to read employee_buildings"
    ON public.employee_buildings FOR SELECT USING (true);
CREATE POLICY "Allow all to insert employee_buildings"
    ON public.employee_buildings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all to update employee_buildings"
    ON public.employee_buildings FOR UPDATE USING (true);
CREATE POLICY "Allow all to delete employee_buildings"
    ON public.employee_buildings FOR DELETE USING (true);

-- Allow reading service_companies
ALTER TABLE public.service_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all to read service_companies"
    ON public.service_companies FOR SELECT USING (true);


-- -------------------------------------------------------------
-- INSERT MOCK EMPLOYEES
-- -------------------------------------------------------------

-- 1. לאה (מנקה)
INSERT INTO public.service_employees (company_id, employee_number, password, full_name, phone)
SELECT id, '0501111111', '12345678', 'לאה (מנקה)', '0501111111'
FROM public.service_companies WHERE name = 'א.ד ניקיונות' LIMIT 1
ON CONFLICT DO NOTHING;

-- 2. סבטלנה (מנקה)
INSERT INTO public.service_employees (company_id, employee_number, password, full_name, phone)
SELECT id, '0502222222', '12345678', 'סבטלנה (מנקה)', '0502222222'
FROM public.service_companies WHERE name = 'א.ד ניקיונות' LIMIT 1
ON CONFLICT DO NOTHING;

-- 3. רוחמה (מנקה)
INSERT INTO public.service_employees (company_id, employee_number, password, full_name, phone)
SELECT id, '0503333333', '12345678', 'רוחמה (מנקה)', '0503333333'
FROM public.service_companies WHERE name = 'א.ד ניקיונות' LIMIT 1
ON CONFLICT DO NOTHING;

-- 4. יוסי (חשמלאי)
INSERT INTO public.service_employees (company_id, employee_number, password, full_name, phone)
SELECT id, '0504444444', '12345678', 'יוסי (חשמלאי)', '0504444444'
FROM public.service_companies WHERE name = 'חשמל ישיר' LIMIT 1
ON CONFLICT DO NOTHING;

-- 5. מרים (מנקה)
INSERT INTO public.service_employees (company_id, employee_number, password, full_name, phone)
SELECT id, '0505555555', '12345678', 'מרים (מנקה)', '0505555555'
FROM public.service_companies WHERE name = 'הברקה שירותי ניקיון' LIMIT 1
ON CONFLICT DO NOTHING;

-- 6. דני (חשמלאי)
INSERT INTO public.service_employees (company_id, employee_number, password, full_name, phone)
SELECT id, '0506666666', '12345678', 'דני (חשמלאי)', '0506666666'
FROM public.service_companies WHERE name = 'אור ופז חשמלאים' LIMIT 1
ON CONFLICT DO NOTHING;

-- 7. משה (מאבטח)
INSERT INTO public.service_employees (company_id, employee_number, password, full_name, phone)
SELECT id, '0507777777', '12345678', 'משה (מאבטח)', '0507777777'
FROM public.service_companies WHERE name = 'השומר הבטחה' LIMIT 1
ON CONFLICT DO NOTHING;

-- 8. גיל (מאבטח)
INSERT INTO public.service_employees (company_id, employee_number, password, full_name, phone)
SELECT id, '0508888888', '12345678', 'גיל (מאבטח)', '0508888888'
FROM public.service_companies WHERE name = 'עין הנץ אבטחה' LIMIT 1
ON CONFLICT DO NOTHING;

-- 9. איתמר (אינסטלטור)
INSERT INTO public.service_employees (company_id, employee_number, password, full_name, phone)
SELECT id, '0509999999', '12345678', 'איתמר (אינסטלטור)', '0509999999'
FROM public.service_companies WHERE name = 'צינורות המזרח' LIMIT 1
ON CONFLICT DO NOTHING;

-- 10. דוד (תחזוקה)
INSERT INTO public.service_employees (company_id, employee_number, password, full_name, phone)
SELECT id, '0501234567', '12345678', 'דוד (תחזוקה)', '0501234567'
FROM public.service_companies WHERE name = 'אחזקות העיר' LIMIT 1
ON CONFLICT DO NOTHING;
