
-- Add customer_id to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id);

-- Add disclaimer to sales_templates
ALTER TABLE public.sales_templates ADD COLUMN IF NOT EXISTS disclaimer TEXT;

-- Create function to auto-create customer when lead is won
CREATE OR REPLACE FUNCTION public.handle_lead_won()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  matched_customer_id UUID;
BEGIN
  -- Only fire when status changes TO 'won'
  IF NEW.status = 'won' AND (OLD.status IS DISTINCT FROM 'won') THEN
    -- Try to find existing customer by email or phone
    SELECT id INTO matched_customer_id
    FROM public.customers
    WHERE (NEW.email IS NOT NULL AND email = NEW.email)
       OR (NEW.phone IS NOT NULL AND phone = NEW.phone)
    LIMIT 1;

    IF matched_customer_id IS NOT NULL THEN
      -- Update existing customer with latest info
      UPDATE public.customers SET
        name = COALESCE(NEW.name, name),
        phone = COALESCE(NEW.phone, phone),
        email = COALESCE(NEW.email, email),
        address = COALESCE(NEW.address, address),
        city = COALESCE(NEW.city, city),
        postal_code = COALESCE(NEW.postal_code, postal_code),
        updated_at = now()
      WHERE id = matched_customer_id;
    ELSE
      -- Create new customer
      INSERT INTO public.customers (name, phone, email, address, city, postal_code, created_by)
      VALUES (NEW.name, NEW.phone, NEW.email, NEW.address, NEW.city, NEW.postal_code, NEW.created_by)
      RETURNING id INTO matched_customer_id;
    END IF;

    -- Link lead to customer
    NEW.customer_id := matched_customer_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_lead_won
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_lead_won();
