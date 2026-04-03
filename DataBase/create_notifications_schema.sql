-- create_notifications_schema.sql
-- Run this in the Supabase SQL editor for your project.

CREATE TABLE IF NOT EXISTS public.app_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id text NOT NULL, -- auth_uid of a tenant OR employee_id
  sender_id text, -- who triggered this (auth_uid or employee_id)
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL, -- 'assignment_request', 'assignment_accepted', 'assignment_rejected', 'general'
  related_data jsonb, -- e.g. {"employee_id": "...", "building_id": "...", "building_name": "...", "reason": "..."}
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert notifications" ON public.app_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can read their own notifications" ON public.app_notifications
  FOR SELECT USING (recipient_id = auth.uid()::text OR recipient_id IN (
    SELECT id::text FROM public.service_employees
  ));

CREATE POLICY "Users can update their own notifications" ON public.app_notifications
  FOR UPDATE USING (recipient_id = auth.uid()::text OR recipient_id IN (
    SELECT id::text FROM public.service_employees
  ));

-- Create an assignment request record to ensure we don't have multiple pending assign requests.
-- Actually, we can just use related_data to check.
