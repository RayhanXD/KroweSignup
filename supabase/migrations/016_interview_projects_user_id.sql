ALTER TABLE interview_projects
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

ALTER TABLE interview_projects
  ADD CONSTRAINT interview_projects_user_id_unique UNIQUE (user_id);

ALTER TABLE interview_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own projects"
  ON interview_projects FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own projects"
  ON interview_projects FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own projects"
  ON interview_projects FOR UPDATE USING (auth.uid() = user_id);
