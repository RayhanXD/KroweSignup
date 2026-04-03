DO $$
BEGIN
  IF to_regclass('public.decision_outputs') IS NULL THEN
    RAISE NOTICE 'Skipping migration 010: public.decision_outputs does not exist.';
    RETURN;
  END IF;

  ALTER TABLE public.decision_outputs
    ADD COLUMN IF NOT EXISTS analysis_result jsonb,
    ADD COLUMN IF NOT EXISTS analysis_basis_updated_at timestamptz,
    ADD COLUMN IF NOT EXISTS analysis_generated_at timestamptz;
END
$$;
