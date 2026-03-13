-- Add a JSONB column to the messages table to store reactions
-- Structure: { "profile_id_1": "👍", "profile_id_2": "❤️" }

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;
