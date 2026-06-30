
TRUNCATE TABLE public.call_lists, public.call_logs, public.sales, public.leads, public.finance, public.meta_leads, public.ad_fund_payments, public.projects RESTART IDENTITY CASCADE;
DELETE FROM public.user_roles;
DELETE FROM auth.users;

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales';

DO $$ BEGIN
  CREATE TYPE public.lead_status AS ENUM ('New', 'Contacted', 'Follow-up', 'Interested', 'Not Interested', 'Closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
