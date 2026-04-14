ALTER TABLE public.signup_sessions
  ADD COLUMN IF NOT EXISTS onboarding_source_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS onboarding_source_updated_at TIMESTAMPTZ DEFAULT NULL;
