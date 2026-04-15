-- Enable multiple interview projects per user.
ALTER TABLE public.interview_projects
  DROP CONSTRAINT IF EXISTS interview_projects_user_id_unique;

-- Granola user connection and sync state.
CREATE TABLE IF NOT EXISTS public.granola_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_api_key text NOT NULL,
  key_hint text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invalid', 'disabled')),
  last_sync_started_at timestamptz,
  last_sync_completed_at timestamptz,
  last_sync_cursor text,
  last_synced_note_updated_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Synced Granola notes waiting for assignment to a project.
CREATE TABLE IF NOT EXISTS public.granola_inbox_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.granola_connections(id) ON DELETE CASCADE,
  external_note_id text NOT NULL,
  granola_updated_at timestamptz NOT NULL,
  granola_created_at timestamptz,
  title text,
  owner_name text,
  owner_email text,
  attendees jsonb NOT NULL DEFAULT '[]'::jsonb,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary_text text,
  summary_markdown text,
  transcript_preview text NOT NULL,
  normalized_text text NOT NULL,
  assignment_status text NOT NULL DEFAULT 'unassigned' CHECK (assignment_status IN ('unassigned', 'assigned', 'ignored')),
  assigned_project_id uuid REFERENCES public.interview_projects(id) ON DELETE SET NULL,
  assigned_interview_id uuid REFERENCES public.interviews(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, external_note_id)
);

CREATE INDEX IF NOT EXISTS granola_inbox_items_user_id_status_idx
  ON public.granola_inbox_items(user_id, assignment_status, granola_updated_at DESC);

CREATE INDEX IF NOT EXISTS granola_inbox_items_user_project_idx
  ON public.granola_inbox_items(user_id, assigned_project_id);

-- Sync run logs for visibility/debugging.
CREATE TABLE IF NOT EXISTS public.granola_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.granola_connections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_source text NOT NULL CHECK (trigger_source IN ('manual', 'scheduled')),
  status text NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  notes_scanned integer NOT NULL DEFAULT 0,
  notes_upserted integer NOT NULL DEFAULT 0,
  notes_skipped integer NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS granola_sync_runs_user_started_at_idx
  ON public.granola_sync_runs(user_id, started_at DESC);

ALTER TABLE public.granola_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.granola_inbox_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.granola_sync_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "granola_connections_select_own" ON public.granola_connections;
CREATE POLICY "granola_connections_select_own"
  ON public.granola_connections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "granola_connections_insert_own" ON public.granola_connections;
CREATE POLICY "granola_connections_insert_own"
  ON public.granola_connections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "granola_connections_update_own" ON public.granola_connections;
CREATE POLICY "granola_connections_update_own"
  ON public.granola_connections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "granola_inbox_items_select_own" ON public.granola_inbox_items;
CREATE POLICY "granola_inbox_items_select_own"
  ON public.granola_inbox_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "granola_inbox_items_insert_own" ON public.granola_inbox_items;
CREATE POLICY "granola_inbox_items_insert_own"
  ON public.granola_inbox_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "granola_inbox_items_update_own" ON public.granola_inbox_items;
CREATE POLICY "granola_inbox_items_update_own"
  ON public.granola_inbox_items
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "granola_sync_runs_select_own" ON public.granola_sync_runs;
CREATE POLICY "granola_sync_runs_select_own"
  ON public.granola_sync_runs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "granola_sync_runs_insert_own" ON public.granola_sync_runs;
CREATE POLICY "granola_sync_runs_insert_own"
  ON public.granola_sync_runs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "granola_sync_runs_update_own" ON public.granola_sync_runs;
CREATE POLICY "granola_sync_runs_update_own"
  ON public.granola_sync_runs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Transactional promotion from inbox -> interviews and counter update.
CREATE OR REPLACE FUNCTION public.assign_granola_inbox_item(
  p_item_id uuid,
  p_project_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_item public.granola_inbox_items%ROWTYPE;
  v_project public.interview_projects%ROWTYPE;
  v_interview_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT *
  INTO v_item
  FROM public.granola_inbox_items
  WHERE id = p_item_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'inbox_item_not_found';
  END IF;

  IF v_item.assignment_status <> 'unassigned' THEN
    RAISE EXCEPTION 'inbox_item_already_assigned';
  END IF;

  SELECT *
  INTO v_project
  FROM public.interview_projects
  WHERE id = p_project_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'project_not_found';
  END IF;

  INSERT INTO public.interviews (project_id, raw_text, status)
  VALUES (p_project_id, v_item.normalized_text, 'pending')
  RETURNING id INTO v_interview_id;

  UPDATE public.interview_projects
  SET
    interview_count = COALESCE(interview_count, 0) + 1,
    updated_at = now()
  WHERE id = p_project_id;

  UPDATE public.granola_inbox_items
  SET
    assignment_status = 'assigned',
    assigned_project_id = p_project_id,
    assigned_interview_id = v_interview_id,
    assigned_at = now(),
    updated_at = now()
  WHERE id = p_item_id;

  RETURN v_interview_id;
END;
$$;
