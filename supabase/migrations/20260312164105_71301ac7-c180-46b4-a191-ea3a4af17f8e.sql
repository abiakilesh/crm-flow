
-- Create storage bucket for client logos
INSERT INTO storage.buckets (id, name, public) VALUES ('client-logos', 'client-logos', true);

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-logos');

-- Allow public read access
CREATE POLICY "Public can view logos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'client-logos');

-- Allow admin to delete logos
CREATE POLICY "Admin can delete logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'client-logos' AND public.has_role(auth.uid(), 'admin'::public.app_role));
