ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'mangler_pris' AFTER 'ready_for_pricing';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'opkald_mislykkedes' AFTER 'contacted';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS priority_score numeric DEFAULT 0;