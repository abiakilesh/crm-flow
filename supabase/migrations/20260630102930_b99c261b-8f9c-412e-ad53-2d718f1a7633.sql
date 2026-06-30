
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status public.lead_status NOT NULL DEFAULT 'New';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS follow_up_at timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS feedback text DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS leads_mobile_unique ON public.leads (mobile) WHERE mobile <> '';

ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS customer_name text DEFAULT '';
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS feedback text DEFAULT '';
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS recording_url text DEFAULT '';
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS follow_up_at timestamptz;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins insert notifications" ON public.notifications;
CREATE POLICY "Admins insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());
DROP POLICY IF EXISTS "Admins delete notifications" ON public.notifications;
CREATE POLICY "Admins delete notifications" ON public.notifications FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL DEFAULT '',
  target_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins view audit logs" ON public.audit_logs;
CREATE POLICY "Admins view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Anyone authenticated can insert audit logs" ON public.audit_logs;
CREATE POLICY "Anyone authenticated can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_my_team_ids(_manager_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT user_id FROM public.profiles WHERE manager_id = _manager_id;
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_team_ids(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_my_team_ids(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "View leads" ON public.leads;
CREATE POLICY "View leads" ON public.leads FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR assigned_to = auth.uid()
  OR lead_by = auth.uid()
  OR created_by = auth.uid()
  OR (public.has_role(auth.uid(), 'manager') AND assigned_to IN (SELECT public.get_my_team_ids(auth.uid())))
);
DROP POLICY IF EXISTS "Users can update leads" ON public.leads;
CREATE POLICY "Users can update leads" ON public.leads FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR assigned_to = auth.uid()
  OR (public.has_role(auth.uid(), 'manager') AND assigned_to IN (SELECT public.get_my_team_ids(auth.uid())))
);

DROP POLICY IF EXISTS "View call logs" ON public.call_logs;
CREATE POLICY "View call logs" ON public.call_logs FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin')
  OR caller_id = auth.uid()
  OR (public.has_role(auth.uid(), 'manager') AND caller_id IN (SELECT public.get_my_team_ids(auth.uid())))
);
DROP POLICY IF EXISTS "Admin can update call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Update call logs" ON public.call_logs;
CREATE POLICY "Update call logs" ON public.call_logs FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR caller_id = auth.uid()
);

DROP POLICY IF EXISTS "Anyone authenticated can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "View profiles" ON public.profiles;
CREATE POLICY "View profiles" ON public.profiles FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR (public.has_role(auth.uid(), 'manager') AND (manager_id = auth.uid() OR user_id = auth.uid()))
  OR public.has_role(auth.uid(), 'sales')
);

CREATE OR REPLACE FUNCTION public.enforce_role_limits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE manager_count integer;
BEGIN
  IF NEW.role = 'manager' THEN
    SELECT count(*) INTO manager_count FROM public.user_roles WHERE role = 'manager' AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    IF manager_count >= 5 THEN RAISE EXCEPTION 'Maximum of 5 Managers allowed'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.enforce_role_limits() FROM public, anon;
DROP TRIGGER IF EXISTS trg_enforce_role_limits ON public.user_roles;
CREATE TRIGGER trg_enforce_role_limits BEFORE INSERT OR UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.enforce_role_limits();

CREATE OR REPLACE FUNCTION public.enforce_sales_per_manager()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE team_count integer;
BEGIN
  IF NEW.manager_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.manager_id IS NULL OR NEW.manager_id <> OLD.manager_id) THEN
    SELECT count(*) INTO team_count FROM public.profiles WHERE manager_id = NEW.manager_id AND user_id <> NEW.user_id;
    IF team_count >= 5 THEN RAISE EXCEPTION 'A Manager can have at most 5 Sales Executives'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.enforce_sales_per_manager() FROM public, anon;
DROP TRIGGER IF EXISTS trg_enforce_sales_per_manager ON public.profiles;
CREATE TRIGGER trg_enforce_sales_per_manager BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.enforce_sales_per_manager();
