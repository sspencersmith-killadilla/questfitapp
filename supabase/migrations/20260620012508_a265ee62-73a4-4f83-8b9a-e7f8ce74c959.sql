
CREATE POLICY "Users read own chapter audio"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chapter-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users write own chapter audio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chapter-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own chapter audio"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'chapter-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own chapter audio"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chapter-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
