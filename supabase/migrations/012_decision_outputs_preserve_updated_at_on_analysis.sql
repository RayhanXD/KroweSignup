/*
  Hypothesis-vs-reality analysis caches when analysis_basis_updated_at matches updated_at.
  The prior trigger set updated_at on every row change, so saving analysis bumped updated_at
  while analysis_basis stayed on the pre-save value (cache never hit).
  This migration repairs existing rows and replaces the trigger so analysis-only updates
  preserve updated_at.
*/

UPDATE public.decision_outputs
SET analysis_basis_updated_at = updated_at
WHERE analysis_result IS NOT NULL
  AND analysis_basis_updated_at IS DISTINCT FROM updated_at;

CREATE OR REPLACE FUNCTION public.decision_outputs_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status
     AND OLD.selected_cluster_id IS NOT DISTINCT FROM NEW.selected_cluster_id
     AND OLD.reasoning IS NOT DISTINCT FROM NEW.reasoning
     AND OLD.feature_specs IS NOT DISTINCT FROM NEW.feature_specs
     AND OLD.user_flows IS NOT DISTINCT FROM NEW.user_flows
     AND OLD.edge_cases IS NOT DISTINCT FROM NEW.edge_cases
     AND OLD.success_metrics IS NOT DISTINCT FROM NEW.success_metrics
     AND OLD.confidence_score IS NOT DISTINCT FROM NEW.confidence_score
     AND OLD.meta_clusters IS NOT DISTINCT FROM NEW.meta_clusters
     AND OLD.project_id IS NOT DISTINCT FROM NEW.project_id
  THEN
    NEW.updated_at := OLD.updated_at;
    RETURN NEW;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
