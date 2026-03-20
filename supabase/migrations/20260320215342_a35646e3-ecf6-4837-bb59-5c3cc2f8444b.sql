
-- Webhook settings table
CREATE TABLE public.webhook_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.webhook_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view webhook settings" ON public.webhook_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create webhook settings" ON public.webhook_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update webhook settings" ON public.webhook_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete webhook settings" ON public.webhook_settings FOR DELETE TO authenticated USING (true);

-- Webhook logs table
CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_setting_id UUID REFERENCES public.webhook_settings(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view webhook logs" ON public.webhook_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert webhook logs" ON public.webhook_logs FOR INSERT TO authenticated WITH CHECK (true);
