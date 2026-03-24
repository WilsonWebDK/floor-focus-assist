
-- 1. Add financial fields to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS revenue numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS actual_costs numeric DEFAULT NULL;

-- 2. Add technical floor-specific columns to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS floor_level integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS has_elevator boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS floor_separation_type text DEFAULT NULL;

-- 3. Create parking_status enum and add column
DO $$ BEGIN
  CREATE TYPE public.parking_status AS ENUM ('free', 'paid', 'permit_required', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS parking_status public.parking_status DEFAULT 'unknown';

-- 4. Create user_roles table for admin checks
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Add disclaimer to sales_templates if not exists (may already exist from Phase 4)
ALTER TABLE public.sales_templates
  ADD COLUMN IF NOT EXISTS disclaimer text DEFAULT NULL;
