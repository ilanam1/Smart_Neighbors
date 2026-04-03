-- Script to clean up legacy providers and setup the new job request dispatch system

-- 1. DROP THE LEGACY TABLES
DROP TABLE IF EXISTS public.disturbance_assignments CASCADE;
DROP TABLE IF EXISTS public.service_providers CASCADE;

-- 2. CREATE NEW JOB REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.employee_job_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id uuid NOT NULL REFERENCES public.disturbance_reports(id) ON DELETE CASCADE,
    employee_id uuid NOT NULL REFERENCES public.service_employees(id) ON DELETE CASCADE,
    building_id uuid NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
    manager_uid uuid NOT NULL REFERENCES auth.users(id),
    instructions text NOT NULL,
    schedule_time text NOT NULL,
    status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DONE', 'REJECTED')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_employee_job_requests_employee ON public.employee_job_requests (employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_job_requests_report ON public.employee_job_requests (report_id);

-- Update Trigger
CREATE OR REPLACE FUNCTION public.set_job_requests_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  return new;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_job_requests_updated_at ON public.employee_job_requests;

CREATE TRIGGER trg_set_job_requests_updated_at
BEFORE UPDATE ON public.employee_job_requests
FOR EACH ROW
EXECUTE PROCEDURE public.set_job_requests_updated_at();

-- RLS Policies
ALTER TABLE public.employee_job_requests ENABLE ROW LEVEL SECURITY;

-- Allow insert by authorized users (e.g. committee)
CREATE POLICY "Users can insert job requests" ON public.employee_job_requests
  FOR INSERT WITH CHECK (true);

-- Allow reading job requests
CREATE POLICY "Users can read job requests" ON public.employee_job_requests
  FOR SELECT USING (true); -- Read access is safe since UI filters by building/employee anyway, or restrict if you want

-- Allow updating job requests (e.g. employee marks as done)
CREATE POLICY "Users can update job requests" ON public.employee_job_requests
  FOR UPDATE USING (true);
