
-- Ad Fund Payments table
CREATE TABLE public.ad_fund_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paid_date date NOT NULL,
  paid_amount numeric NOT NULL DEFAULT 0,
  created_by uuid NULL,
  project_id uuid NULL REFERENCES public.projects(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ad_fund_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage ad fund payments" ON public.ad_fund_payments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view ad fund payments" ON public.ad_fund_payments
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client'::app_role));

-- Meta Leads table
CREATE TABLE public.meta_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name text NOT NULL,
  campaign_name text NOT NULL DEFAULT '',
  conversion text NOT NULL DEFAULT '',
  month text NOT NULL DEFAULT '',
  report_date text NOT NULL DEFAULT '',
  result integer NOT NULL DEFAULT 0,
  reach integer NOT NULL DEFAULT 0,
  impression integer NOT NULL DEFAULT 0,
  cost_per_result numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  client_logo_url text NULL DEFAULT '',
  project_id uuid NULL REFERENCES public.projects(id),
  created_by uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage meta leads" ON public.meta_leads
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Clients can view meta leads" ON public.meta_leads
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'client'::app_role));
