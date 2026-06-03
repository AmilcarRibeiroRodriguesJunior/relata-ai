
-- Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- Storage policies: users access only their own folder (first path segment = user id)
CREATE POLICY "Users read own uploads" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users write own uploads" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own uploads" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own reports" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users write own reports" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'reports' AND auth.uid()::text = (storage.foldername(name))[1]);
