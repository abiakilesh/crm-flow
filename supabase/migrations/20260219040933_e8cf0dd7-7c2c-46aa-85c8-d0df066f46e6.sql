
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'member');

-- 2. Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 4. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Get user role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 6. Projects table (dynamic, admin-managed)
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL UNIQUE DEFAULT 'LD-' || substr(gen_random_uuid()::text, 1, 8),
  customer_name TEXT NOT NULL,
  place TEXT DEFAULT '',
  mobile TEXT DEFAULT '',
  review TEXT DEFAULT '',
  lead_by UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Sales table
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  follow_up_1 TEXT DEFAULT '',
  follow_up_2 TEXT DEFAULT '',
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Call logs table
CREATE TABLE public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_date DATE NOT NULL DEFAULT CURRENT_DATE,
  call_time TIME NOT NULL DEFAULT CURRENT_TIME,
  duration_minutes INTEGER DEFAULT 0,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'dropped')),
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  caller_id UUID REFERENCES auth.users(id),
  phone_number TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Call lists table (uploaded Excel data)
CREATE TABLE public.call_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_no INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Finance table
CREATE TABLE public.finance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  share_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_status TEXT NOT NULL DEFAULT 'Processing' CHECK (paid_status IN ('Paid', 'Processing', 'On Practically')),
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_finance_updated_at BEFORE UPDATE ON public.finance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 14. RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance ENABLE ROW LEVEL SECURITY;

-- 15. RLS Policies

-- Profiles: users can read all, update own
CREATE POLICY "Anyone authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admin can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User roles: only admin can manage, users can read own
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Projects: all authenticated can view, admin can manage
CREATE POLICY "All can view projects" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert projects" ON public.projects FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update projects" ON public.projects FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete projects" ON public.projects FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Leads: all can view, admin full CRUD, manager/member can insert/update
CREATE POLICY "All can view leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update leads" ON public.leads FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR assigned_to = auth.uid() OR lead_by = auth.uid()
);
CREATE POLICY "Admin can delete leads" ON public.leads FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Sales: all can view, insert allowed, update by assigned/admin, delete admin only
CREATE POLICY "All can view sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update sales" ON public.sales FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR assigned_to = auth.uid()
);
CREATE POLICY "Admin can delete sales" ON public.sales FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Call logs: view based on role, admin full CRUD
CREATE POLICY "View call logs" ON public.call_logs FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin') OR caller_id = auth.uid()
);
CREATE POLICY "Insert call logs" ON public.call_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin can update call logs" ON public.call_logs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete call logs" ON public.call_logs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Call lists: all can view, insert allowed, admin can delete
CREATE POLICY "All can view call lists" ON public.call_lists FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert call lists" ON public.call_lists FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin can delete call lists" ON public.call_lists FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Finance: all can view, admin can manage
CREATE POLICY "All can view finance" ON public.finance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can insert finance" ON public.finance FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can update finance" ON public.finance FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin can delete finance" ON public.finance FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
