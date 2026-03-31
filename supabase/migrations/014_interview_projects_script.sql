ALTER TABLE interview_projects
  ADD COLUMN IF NOT EXISTS interview_script JSONB DEFAULT NULL;
