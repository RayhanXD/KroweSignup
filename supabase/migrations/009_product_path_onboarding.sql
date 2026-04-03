-- Track which onboarding flow was used
ALTER TABLE public.signup_sessions
  ADD COLUMN IF NOT EXISTS flow_type text NOT NULL DEFAULT 'product_path';

-- Supabase Storage bucket note (run manually in dashboard):
-- 1. Go to Storage > New bucket
-- 2. Name: interview-uploads
-- 3. Set to private (not public)
-- 4. Add RLS policy: allow anon INSERT scoped to {sessionId}/* paths
--    Policy example:
--      CREATE POLICY "session upload" ON storage.objects
--        FOR INSERT TO anon
--        WITH CHECK (bucket_id = 'interview-uploads');
