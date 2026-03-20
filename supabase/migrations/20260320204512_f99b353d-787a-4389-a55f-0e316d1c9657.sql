
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT,
  ADD COLUMN IF NOT EXISTS google_calendar_link TEXT;

CREATE TABLE IF NOT EXISTS public.user_google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens" ON public.user_google_tokens FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own tokens" ON public.user_google_tokens FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own tokens" ON public.user_google_tokens FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can delete own tokens" ON public.user_google_tokens FOR DELETE TO authenticated USING (user_id = auth.uid());
