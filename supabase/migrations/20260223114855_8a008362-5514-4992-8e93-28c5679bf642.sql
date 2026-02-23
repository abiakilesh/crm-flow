-- Add 'client' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

-- Update RLS policies for leads: clients see only assigned_to records
DROP POLICY IF EXISTS "All can view leads" ON public.leads;
CREATE POLICY "View leads"
  ON public.leads FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR lead_by = auth.uid()
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

-- Update RLS policies for sales: clients see only assigned_to records
DROP POLICY IF EXISTS "All can view sales" ON public.sales;
CREATE POLICY "View sales"
  ON public.sales FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR assigned_to = auth.uid()
    OR created_by = auth.uid()
  );

-- Update RLS policies for finance: clients see only their records
DROP POLICY IF EXISTS "All can view finance" ON public.finance;
CREATE POLICY "View finance"
  ON public.finance FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR created_by = auth.uid()
  );

-- Update RLS policies for call_logs: clients can see their own
DROP POLICY IF EXISTS "View call logs" ON public.call_logs;
CREATE POLICY "View call logs"
  ON public.call_logs FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR caller_id = auth.uid()
  );

-- Update RLS for call_lists: clients see their project or uploaded lists
DROP POLICY IF EXISTS "All can view call lists" ON public.call_lists;
CREATE POLICY "View call lists"
  ON public.call_lists FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR uploaded_by = auth.uid()
  );