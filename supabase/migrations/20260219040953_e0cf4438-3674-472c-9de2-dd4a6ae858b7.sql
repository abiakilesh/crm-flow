
-- Tighten INSERT policies to require user sets their own ID

DROP POLICY "Authenticated can insert leads" ON public.leads;
CREATE POLICY "Authenticated can insert leads" ON public.leads 
  FOR INSERT TO authenticated 
  WITH CHECK (created_by = auth.uid());

DROP POLICY "Authenticated can insert sales" ON public.sales;
CREATE POLICY "Authenticated can insert sales" ON public.sales 
  FOR INSERT TO authenticated 
  WITH CHECK (created_by = auth.uid());

DROP POLICY "Insert call logs" ON public.call_logs;
CREATE POLICY "Insert call logs" ON public.call_logs 
  FOR INSERT TO authenticated 
  WITH CHECK (caller_id = auth.uid());

DROP POLICY "Authenticated can insert call lists" ON public.call_lists;
CREATE POLICY "Authenticated can insert call lists" ON public.call_lists 
  FOR INSERT TO authenticated 
  WITH CHECK (uploaded_by = auth.uid());
