ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS power_13a_available boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS floor_history text,
  ADD COLUMN IF NOT EXISTS desired_look text,
  ADD COLUMN IF NOT EXISTS urgency_status text,
  ADD COLUMN IF NOT EXISTS quality_expectation text,
  ADD COLUMN IF NOT EXISTS time_requirement text,
  ADD COLUMN IF NOT EXISTS image_urls text[],
  ADD COLUMN IF NOT EXISTS quiz_slug text UNIQUE;