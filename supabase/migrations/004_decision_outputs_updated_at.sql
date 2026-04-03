-- Add updated_at to decision_outputs (required by pipeline upserts)
ALTER TABLE public.decision_outputs
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Add updated_at to interview_projects if missing (pipeline updates both tables)
ALTER TABLE public.interview_projects
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Trigger to auto-update decision_outputs.updated_at on row change
CREATE OR REPLACE FUNCTION public.decision_outputs_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS decision_outputs_set_updated_at ON public.decision_outputs;
CREATE TRIGGER decision_outputs_set_updated_at
  BEFORE UPDATE ON public.decision_outputs
  FOR EACH ROW
  EXECUTE FUNCTION public.decision_outputs_touch_updated_at();
