ALTER TABLE interview_projects
  ADD COLUMN IF NOT EXISTS interviewer_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS interviewer_context TEXT DEFAULT NULL;
