-- Supplier score columns (replace price_level with granular scores)
ALTER TABLE public.suppliers
  DROP COLUMN IF EXISTS price_level,
  ADD COLUMN IF NOT EXISTS score_floor_sanding integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS score_floor_laying integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS score_surface_treatment integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS score_terrace integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS score_danish_language integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS score_reliability integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS capacity_notes text;

-- Contact-method statuses
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'kontaktet_tlf' AFTER 'contacted';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'kontaktet_mail' AFTER 'kontaktet_tlf';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'kontaktet_sms' AFTER 'kontaktet_mail';