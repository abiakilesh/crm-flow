
CREATE POLICY "Authenticated upload call recordings" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'call-recordings' AND owner = auth.uid());
CREATE POLICY "Owners and admins view call recordings" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'call-recordings' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager')));
CREATE POLICY "Owners and admins delete call recordings" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'call-recordings' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin')));
