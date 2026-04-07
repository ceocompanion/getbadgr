
-- Make buckets private
UPDATE storage.buckets SET public = false WHERE id IN ('badge-photos', 'voice-notes');

-- Drop overly permissive public SELECT policies
DROP POLICY IF EXISTS "Badge photos are public" ON storage.objects;
DROP POLICY IF EXISTS "Voice notes are public" ON storage.objects;

-- Add owner-scoped SELECT policies
CREATE POLICY "Users can view own badge photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'badge-photos' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own voice notes"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-notes' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Add UPDATE policies
CREATE POLICY "Users can update own badge photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'badge-photos' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own voice notes"
ON storage.objects FOR UPDATE
USING (bucket_id = 'voice-notes' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Add DELETE policies
CREATE POLICY "Users can delete own badge photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'badge-photos' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own voice notes"
ON storage.objects FOR DELETE
USING (bucket_id = 'voice-notes' AND (auth.uid())::text = (storage.foldername(name))[1]);
