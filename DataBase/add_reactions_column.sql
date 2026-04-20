
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;
