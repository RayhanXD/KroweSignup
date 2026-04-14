ALTER TABLE public.interview_projects
  ADD COLUMN IF NOT EXISTS business_profile_json JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS business_profile_updated_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS business_profile_version INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_mode TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.interview_projects
  DROP CONSTRAINT IF EXISTS interview_projects_onboarding_mode_check;

ALTER TABLE public.interview_projects
  ADD CONSTRAINT interview_projects_onboarding_mode_check
  CHECK (onboarding_mode IS NULL OR onboarding_mode IN ('manual', 'webscraper'));
