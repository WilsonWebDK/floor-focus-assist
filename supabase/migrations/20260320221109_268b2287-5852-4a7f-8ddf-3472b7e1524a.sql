
-- Sales templates table
CREATE TABLE public.sales_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.sales_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sales templates" ON public.sales_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create sales templates" ON public.sales_templates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sales templates" ON public.sales_templates FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete sales templates" ON public.sales_templates FOR DELETE TO authenticated USING (true);

-- New lead fields
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS quote_content TEXT;
