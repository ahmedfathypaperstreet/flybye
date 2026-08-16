-- Private bucket for ID documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-documents', 'id-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies: each user can only access files under their own user_id folder
CREATE POLICY "Users can read own ID documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'id-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload own ID documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'id-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own ID documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'id-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own ID documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'id-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Track which path the user took for verification
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_method text,
  ADD COLUMN IF NOT EXISTS id_upload_complete boolean NOT NULL DEFAULT false;