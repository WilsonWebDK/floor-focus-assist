
-- Lead status enum
CREATE TYPE public.lead_status AS ENUM (
  'new', 'needs_qualification', 'contacted', 'waiting_for_customer', 
  'ready_for_pricing', 'offer_sent', 'won', 'lost'
);

-- Lead source enum
CREATE TYPE public.lead_source AS ENUM (
  'website_form', 'quiz_funnel', 'manual', 'referral', 'phone', 'email', 'other'
);

-- Communication type enum
CREATE TYPE public.comm_type AS ENUM (
  'phone_call', 'email', 'sms', 'meeting', 'note', 'other'
);

-- Communication direction enum
CREATE TYPE public.comm_direction AS ENUM ('inbound', 'outbound', 'internal');

-- Reminder status enum
CREATE TYPE public.reminder_status AS ENUM ('pending', 'completed', 'snoozed', 'cancelled');

-- ===================== LEADS TABLE =====================
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source lead_source NOT NULL DEFAULT 'manual',
  status lead_status NOT NULL DEFAULT 'new',
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  lead_message TEXT,
  job_type TEXT,
  square_meters NUMERIC,
  floor_type TEXT,
  treatment_preference TEXT,
  stairs_count INTEGER DEFAULT 0,
  doorsteps_count INTEGER DEFAULT 0,
  parking_info TEXT,
  elevator_info TEXT,
  urgency_flag BOOLEAN DEFAULT false,
  complexity_flag BOOLEAN DEFAULT false,
  missing_info_summary TEXT,
  suggested_questions TEXT[],
  internal_notes TEXT,
  last_contacted_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all leads"
  ON public.leads FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create leads"
  ON public.leads FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update leads"
  ON public.leads FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete leads"
  ON public.leads FOR DELETE TO authenticated USING (true);

-- ===================== CUSTOMERS TABLE =====================
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  general_notes TEXT,
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all customers"
  ON public.customers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create customers"
  ON public.customers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON public.customers FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete customers"
  ON public.customers FOR DELETE TO authenticated USING (true);

-- ===================== COMMUNICATION LOG =====================
CREATE TABLE public.communication_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  type comm_type NOT NULL DEFAULT 'note',
  direction comm_direction NOT NULL DEFAULT 'internal',
  summary TEXT NOT NULL,
  full_note TEXT,
  followup_needed BOOLEAN DEFAULT false,
  followup_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all comm logs"
  ON public.communication_logs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create comm logs"
  ON public.communication_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update comm logs"
  ON public.communication_logs FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete comm logs"
  ON public.communication_logs FOR DELETE TO authenticated USING (true);

-- ===================== REMINDERS =====================
CREATE TABLE public.reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  related_type TEXT NOT NULL, -- 'lead', 'customer', 'job'
  related_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  status reminder_status NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all reminders"
  ON public.reminders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create reminders"
  ON public.reminders FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update reminders"
  ON public.reminders FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete reminders"
  ON public.reminders FOR DELETE TO authenticated USING (true);

-- ===================== SUPPLIERS =====================
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  cities_served TEXT[],
  skills TEXT[],
  price_level TEXT,
  can_do_carpentry BOOLEAN DEFAULT false,
  speaks_good_danish BOOLEAN DEFAULT true,
  quality_score INTEGER,
  reliability_notes TEXT,
  general_notes TEXT,
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all suppliers"
  ON public.suppliers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create suppliers"
  ON public.suppliers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update suppliers"
  ON public.suppliers FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete suppliers"
  ON public.suppliers FOR DELETE TO authenticated USING (true);

-- ===================== UPDATED_AT TRIGGER =====================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===================== INDEXES =====================
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_next_followup ON public.leads(next_followup_at);
CREATE INDEX idx_leads_urgency ON public.leads(urgency_flag) WHERE urgency_flag = true;
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX idx_comm_logs_lead_id ON public.communication_logs(lead_id);
CREATE INDEX idx_comm_logs_customer_id ON public.communication_logs(customer_id);
CREATE INDEX idx_reminders_due ON public.reminders(due_at) WHERE status = 'pending';
CREATE INDEX idx_reminders_related ON public.reminders(related_type, related_id);

-- ===================== WEBHOOK SUPPORT =====================
-- Allow anonymous inserts for webhook-created leads
CREATE POLICY "Webhooks can create leads"
  ON public.leads FOR INSERT TO anon WITH CHECK (true);
