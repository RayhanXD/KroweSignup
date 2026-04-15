-- Phase 1 platform foundation:
-- 1) move to multi-project-per-user
-- 2) add soft-archive support
-- 3) enforce RLS on dashboard-critical tables
-- 4) add activity log table for dashboard logs

ALTER TABLE public.interview_projects
  DROP CONSTRAINT IF EXISTS interview_projects_user_id_unique;

ALTER TABLE public.interview_projects
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS interview_projects_user_archived_idx
  ON public.interview_projects(user_id, archived_at, created_at DESC);

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problem_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decision_outputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own interviews via project" ON public.interviews;
CREATE POLICY "Users see own interviews via project"
  ON public.interviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.interview_projects p
      WHERE p.id = interviews.project_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users insert own interviews via project" ON public.interviews;
CREATE POLICY "Users insert own interviews via project"
  ON public.interviews
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.interview_projects p
      WHERE p.id = interviews.project_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users update own interviews via project" ON public.interviews;
CREATE POLICY "Users update own interviews via project"
  ON public.interviews
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.interview_projects p
      WHERE p.id = interviews.project_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users delete own interviews via project" ON public.interviews;
CREATE POLICY "Users delete own interviews via project"
  ON public.interviews
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.interview_projects p
      WHERE p.id = interviews.project_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users see own clusters via project" ON public.problem_clusters;
CREATE POLICY "Users see own clusters via project"
  ON public.problem_clusters
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.interview_projects p
      WHERE p.id = problem_clusters.project_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users mutate own clusters via project" ON public.problem_clusters;
CREATE POLICY "Users mutate own clusters via project"
  ON public.problem_clusters
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.interview_projects p
      WHERE p.id = problem_clusters.project_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.interview_projects p
      WHERE p.id = problem_clusters.project_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users see own decisions via project" ON public.decision_outputs;
CREATE POLICY "Users see own decisions via project"
  ON public.decision_outputs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.interview_projects p
      WHERE p.id = decision_outputs.project_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users mutate own decisions via project" ON public.decision_outputs;
CREATE POLICY "Users mutate own decisions via project"
  ON public.decision_outputs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.interview_projects p
      WHERE p.id = decision_outputs.project_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.interview_projects p
      WHERE p.id = decision_outputs.project_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users see own extracted problems via project" ON public.extracted_problems;
CREATE POLICY "Users see own extracted problems via project"
  ON public.extracted_problems
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.interviews i
      JOIN public.interview_projects p ON p.id = i.project_id
      WHERE i.id = extracted_problems.interview_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users mutate own extracted problems via project" ON public.extracted_problems;
CREATE POLICY "Users mutate own extracted problems via project"
  ON public.extracted_problems
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.interviews i
      JOIN public.interview_projects p ON p.id = i.project_id
      WHERE i.id = extracted_problems.interview_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.interviews i
      JOIN public.interview_projects p ON p.id = i.project_id
      WHERE i.id = extracted_problems.interview_id
        AND p.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.dashboard_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NULL REFERENCES public.interview_projects(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dashboard_activity_logs_user_created_idx
  ON public.dashboard_activity_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS dashboard_activity_logs_project_created_idx
  ON public.dashboard_activity_logs(project_id, created_at DESC);

ALTER TABLE public.dashboard_activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own dashboard activity logs" ON public.dashboard_activity_logs;
CREATE POLICY "Users see own dashboard activity logs"
  ON public.dashboard_activity_logs
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own dashboard activity logs" ON public.dashboard_activity_logs;
CREATE POLICY "Users insert own dashboard activity logs"
  ON public.dashboard_activity_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
