ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'inspection_scheduled' AFTER 'contacted';

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS next_action_type text;