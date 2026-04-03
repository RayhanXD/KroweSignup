export type InterviewSegment = {
  type: "pain" | "context" | "emotion" | "intensity";
  text: string;
  quote: string;
  intensity?: number;
};

export type StructuredInterview = {
  segments: InterviewSegment[];
  summary: string;
};

export type ExtractedProblem = {
  problem_text: string;
  customer_type: string;
  context: string;
  root_cause: string;
  intensity_score: number;
  confidence: number;
  supporting_quote: string;
  verbatim_quote?: string;
};

export type ExtractedProblemWithEmbedding = ExtractedProblem & {
  id: string;
  interview_id: string;
  embedding: number[];
};

export type SupportingQuote = {
  text: string;
  normalized_text?: string;
  verbatim_text?: string;
  interview_id: string;
  problem_id: string;
};

export type ProblemCluster = {
  canonical_problem: string;
  frequency: number;
  avg_intensity: number;
  consistency_score: number;
  score: number;
  supporting_quotes: SupportingQuote[];
  member_problem_ids: string[];
  category: string;
};

export type FeatureSpec = {
  name: string;
  description: string;
  priority: "must-have" | "should-have" | "nice-to-have";
};

export type UserFlow = {
  title: string;
  steps: string[];
};

export type EdgeCase = {
  scenario: string;
  mitigation: string;
};

export type SuccessMetric = {
  metric: string;
  target: string;
  rationale: string;
};

export type MetaCluster = {
  id: string;
  title: string;
  description: string;
  cluster_ids: string[];
  supporting_quotes: SupportingQuote[];
  frequency: number;
  score: number;
};

export type DecisionOutput = {
  project_id: string;
  selected_cluster_id: string | null;
  reasoning: string[];
  feature_specs: FeatureSpec[];
  user_flows: UserFlow[];
  edge_cases: EdgeCase[];
  success_metrics: SuccessMetric[];
  confidence_score: number;
  meta_clusters?: MetaCluster[];
  status: "processing" | "ready" | "failed" | "insufficient_data";
  created_at: string;
};

export type PipelineResult =
  | { ok: true; decisionOutputId: string }
  | { ok: false; error?: string; status: "failed" | "insufficient_data" };
