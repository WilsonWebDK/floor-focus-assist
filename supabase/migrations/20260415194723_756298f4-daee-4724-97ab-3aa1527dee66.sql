ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS labels text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS manual_lead_score integer,
  ADD COLUMN IF NOT EXISTS calculated_lead_score integer;