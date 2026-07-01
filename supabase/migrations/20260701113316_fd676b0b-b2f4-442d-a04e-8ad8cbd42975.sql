
-- 1. Drop legacy 'client' role policies (role no longer exists in this app)
DROP POLICY IF EXISTS "Clients can view meta leads" ON public.meta_leads;
DROP POLICY IF EXISTS "Clients can view ad fund payments" ON public.ad_fund_payments;

-- 2. Private schema for security-definer helpers (removes them from PostgREST-exposed schema)
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role); $$;

CREATE OR REPLACE FUNCTION private.get_my_team_ids(_manager_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ SELECT user_id FROM public.profiles WHERE manager_id = _manager_id; $$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.get_my_team_ids(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_my_team_ids(uuid) TO authenticated, service_role;

-- 3. Recreate all policies referencing public.has_role/public.get_my_team_ids to use private.*
-- finance
DROP POLICY IF EXISTS "Admin can delete finance" ON public.finance;
DROP POLICY IF EXISTS "Admin can insert finance" ON public.finance;
DROP POLICY IF EXISTS "Admin can update finance" ON public.finance;
DROP POLICY IF EXISTS "View finance" ON public.finance;
CREATE POLICY "Admin can delete finance" ON public.finance FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin can insert finance" ON public.finance FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin can update finance" ON public.finance FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "View finance" ON public.finance FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin') OR created_by = auth.uid());

-- meta_leads
DROP POLICY IF EXISTS "Admin can manage meta leads" ON public.meta_leads;
CREATE POLICY "Admin can manage meta leads" ON public.meta_leads FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

-- ad_fund_payments
DROP POLICY IF EXISTS "Admin can manage ad fund payments" ON public.ad_fund_payments;
CREATE POLICY "Admin can manage ad fund payments" ON public.ad_fund_payments FOR ALL TO authenticated USING (private.has_role(auth.uid(),'admin')) WITH CHECK (private.has_role(auth.uid(),'admin'));

-- notifications
DROP POLICY IF EXISTS "Admins delete notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Admins delete notifications" ON public.notifications FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(),'admin') OR user_id = auth.uid());
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'));

-- audit_logs
DROP POLICY IF EXISTS "Admins view audit logs" ON public.audit_logs;
CREATE POLICY "Admins view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin'));

-- call_lists
DROP POLICY IF EXISTS "Admin can delete call lists" ON public.call_lists;
DROP POLICY IF EXISTS "View call lists" ON public.call_lists;
CREATE POLICY "Admin can delete call lists" ON public.call_lists FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "View call lists" ON public.call_lists FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin') OR uploaded_by = auth.uid());

-- call_logs
DROP POLICY IF EXISTS "Admin can delete call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Update call logs" ON public.call_logs;
DROP POLICY IF EXISTS "View call logs" ON public.call_logs;
CREATE POLICY "Admin can delete call logs" ON public.call_logs FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Update call logs" ON public.call_logs FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin') OR caller_id = auth.uid());
CREATE POLICY "View call logs" ON public.call_logs FOR SELECT TO authenticated USING (
  private.has_role(auth.uid(),'admin')
  OR caller_id = auth.uid()
  OR (private.has_role(auth.uid(),'manager') AND caller_id IN (SELECT private.get_my_team_ids(auth.uid())))
);

-- user_roles
DROP POLICY IF EXISTS "Admin can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Admin can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.has_role(auth.uid(),'admin'));

-- sales
DROP POLICY IF EXISTS "Admin can delete sales" ON public.sales;
DROP POLICY IF EXISTS "Users can update sales" ON public.sales;
DROP POLICY IF EXISTS "View sales" ON public.sales;
CREATE POLICY "Admin can delete sales" ON public.sales FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Users can update sales" ON public.sales FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin') OR assigned_to = auth.uid());
CREATE POLICY "View sales" ON public.sales FOR SELECT TO authenticated USING (private.has_role(auth.uid(),'admin') OR assigned_to = auth.uid() OR created_by = auth.uid());

-- projects
DROP POLICY IF EXISTS "Admin can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Admin can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Admin can update projects" ON public.projects;
CREATE POLICY "Admin can delete projects" ON public.projects FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin can insert projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin can update projects" ON public.projects FOR UPDATE TO authenticated USING (private.has_role(auth.uid(),'admin'));

-- profiles (fix sales exposure)
DROP POLICY IF EXISTS "Admin can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "View profiles" ON public.profiles;
CREATE POLICY "Admin can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (private.has_role(auth.uid(),'admin'));
CREATE POLICY "View profiles" ON public.profiles FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR private.has_role(auth.uid(),'admin')
  OR (private.has_role(auth.uid(),'manager') AND (manager_id = auth.uid() OR user_id = auth.uid()))
);

-- leads
DROP POLICY IF EXISTS "Admin can delete leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads" ON public.leads;
DROP POLICY IF EXISTS "View leads" ON public.leads;
CREATE POLICY "Admin can delete leads" ON public.leads FOR DELETE TO authenticated USING (private.has_role(auth.uid(),'admin'));
CREATE POLICY "Users can update leads" ON public.leads FOR UPDATE TO authenticated USING (
  private.has_role(auth.uid(),'admin')
  OR assigned_to = auth.uid()
  OR (private.has_role(auth.uid(),'manager') AND assigned_to IN (SELECT private.get_my_team_ids(auth.uid())))
);
CREATE POLICY "View leads" ON public.leads FOR SELECT TO authenticated USING (
  private.has_role(auth.uid(),'admin')
  OR assigned_to = auth.uid()
  OR lead_by = auth.uid()
  OR created_by = auth.uid()
  OR (private.has_role(auth.uid(),'manager') AND assigned_to IN (SELECT private.get_my_team_ids(auth.uid())))
);

-- 4. Storage policies
-- Restrict manager access to only their own team's call recordings
DROP POLICY IF EXISTS "Owners and admins view call recordings" ON storage.objects;
CREATE POLICY "Owners and admins view call recordings" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'call-recordings'
  AND (
    owner = auth.uid()
    OR private.has_role(auth.uid(),'admin')
    OR (private.has_role(auth.uid(),'manager') AND owner IN (SELECT private.get_my_team_ids(auth.uid())))
  )
);

DROP POLICY IF EXISTS "Owners and admins delete call recordings" ON storage.objects;
CREATE POLICY "Owners and admins delete call recordings" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'call-recordings' AND (owner = auth.uid() OR private.has_role(auth.uid(),'admin')));

DROP POLICY IF EXISTS "Admin can delete logos" ON storage.objects;
CREATE POLICY "Admin can delete logos" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'client-logos' AND private.has_role(auth.uid(),'admin'));

-- Prevent anonymous listing of the client-logos bucket. Files remain reachable via
-- their public URLs because the bucket is marked public, but object listing now
-- requires authentication.
DROP POLICY IF EXISTS "Public can view logos" ON storage.objects;
CREATE POLICY "Authenticated view logos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'client-logos');

-- 5. Old public.* helpers are no longer referenced by any policy; drop them
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS public.get_my_team_ids(uuid);

-- 6. Switch get_user_role to SECURITY INVOKER (relies on user_roles RLS)
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$ SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1; $$;

-- 7. Lock down trigger-only definer functions so they can't be invoked via the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_role_limits() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_sales_per_manager() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
