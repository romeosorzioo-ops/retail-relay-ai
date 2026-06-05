ALTER TABLE public.promotions
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_type text,
  ADD COLUMN IF NOT EXISTS file_name text;

-- Storage RLS policies for promotion-files bucket
CREATE POLICY "Users can view their own promotion files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'promotion-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view promotion files"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'promotion-files');

CREATE POLICY "Users can upload their own promotion files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'promotion-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own promotion files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'promotion-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own promotion files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'promotion-files' AND auth.uid()::text = (storage.foldername(name))[1]);