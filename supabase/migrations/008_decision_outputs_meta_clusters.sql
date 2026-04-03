ALTER TABLE public.decision_outputs
  ADD COLUMN IF NOT EXISTS meta_clusters jsonb;
