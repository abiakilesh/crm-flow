
DO $$ BEGIN
  CREATE TYPE public.interest_level AS ENUM ('Very Interested','Interested','Need Follow-up','Not Interested');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS upload_batch_id uuid;

CREATE TABLE IF NOT EXISTS public.lead_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text,
  total_count integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_uploads TO authenticated;
GRANT ALL ON public.lead_uploads TO service_role;
ALTER TABLE public.lead_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lead_uploads_admin_all" ON public.lead_uploads FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "lead_uploads_manager_own" ON public.lead_uploads FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid());
CREATE POLICY "lead_uploads_manager_insert" ON public.lead_uploads FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND (private.has_role(auth.uid(),'manager') OR private.has_role(auth.uid(),'admin')));

CREATE TABLE IF NOT EXISTS public.site_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  phone_number text NOT NULL,
  project_name text,
  property_name text,
  location text,
  visit_date date NOT NULL,
  visit_time time,
  interest_level public.interest_level NOT NULL DEFAULT 'Interested',
  remarks text,
  image_urls text[] NOT NULL DEFAULT '{}',
  gps_lat numeric,
  gps_lng numeric,
  status text NOT NULL DEFAULT 'Completed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_visits TO authenticated;
GRANT ALL ON public.site_visits TO service_role;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_visits_admin_all" ON public.site_visits FOR ALL TO authenticated
  USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "site_visits_sales_own" ON public.site_visits FOR SELECT TO authenticated
  USING (sales_id = auth.uid());
CREATE POLICY "site_visits_manager_team" ON public.site_visits FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'manager') AND sales_id IN (SELECT user_id FROM public.profiles WHERE manager_id = auth.uid()));
CREATE POLICY "site_visits_sales_insert" ON public.site_visits FOR INSERT TO authenticated
  WITH CHECK (sales_id = auth.uid());
CREATE POLICY "site_visits_sales_update" ON public.site_visits FOR UPDATE TO authenticated
  USING (sales_id = auth.uid()) WITH CHECK (sales_id = auth.uid());
CREATE TRIGGER trg_site_visits_updated_at BEFORE UPDATE ON public.site_visits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_at timestamptz NOT NULL DEFAULT now(),
  logout_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_sessions TO service_role;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_admin_all" ON public.user_sessions FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "sessions_self_select" ON public.user_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "sessions_manager_team" ON public.user_sessions FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(),'manager') AND user_id IN (SELECT user_id FROM public.profiles WHERE manager_id = auth.uid()));
CREATE POLICY "sessions_self_insert" ON public.user_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "sessions_self_update" ON public.user_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_login ON public.user_sessions(user_id, login_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_visits_sales ON public.site_visits(sales_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_lead_uploads_by ON public.lead_uploads(uploaded_by, created_at DESC);

CREATE POLICY "site_visit_img_owner_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'site-visit-images' AND owner = auth.uid());
CREATE POLICY "site_visit_img_admin_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'site-visit-images' AND private.has_role(auth.uid(),'admin'));
CREATE POLICY "site_visit_img_manager_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'site-visit-images' AND private.has_role(auth.uid(),'manager')
    AND owner IN (SELECT user_id FROM public.profiles WHERE manager_id = auth.uid()));
CREATE POLICY "site_visit_img_owner_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-visit-images' AND owner = auth.uid());
CREATE POLICY "site_visit_img_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'site-visit-images' AND owner = auth.uid());
