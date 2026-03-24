import { createServerSupabaseClient } from "@/lib/supabaseServer";
import Link from "next/link";
import { notFound } from "next/navigation";
import type {
  ProblemCluster,
  FeatureSpec,
  UserFlow,
  EdgeCase,
  SuccessMetric,
  DecisionOutput,
} from "@/lib/interviews/types";

export const dynamic = "force-dynamic";

type ClusterWithId = ProblemCluster & { id: string };
type DecisionWithId = Omit<DecisionOutput, "project_id"> & { id: string; updated_at: string };

function ScoreBar({ label, value, max = 1 }: { label: string; value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <div className="flex-1 bg-muted rounded-full h-1.5">
        <div
          className="bg-foreground rounded-full h-1.5 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium w-8 text-right">{value.toFixed(2)}</span>
    </div>
  );
}

function SupportingQuotes({
  quotes,
  interviewsSortedIds,
}: {
  quotes: ProblemCluster["supporting_quotes"];
  interviewsSortedIds: string[];
}) {
  return (
    <div className="space-y-3">
      {quotes.map((q, i) => {
        const interviewIndex = interviewsSortedIds.indexOf(q.interview_id);
        const label =
          interviewIndex >= 0 ? `Interview #${interviewIndex + 1}` : "Interview";
        return (
          <blockquote key={i} className="border-l-2 border-border pl-4">
            <p className="text-sm italic">"{q.text}"</p>
            <cite className="text-xs text-muted-foreground mt-1 block not-italic">{label}</cite>
          </blockquote>
        );
      })}
    </div>
  );
}

const priorityOrder: Record<FeatureSpec["priority"], number> = {
  "must-have": 0,
  "should-have": 1,
  "nice-to-have": 2,
};

const priorityStyles: Record<FeatureSpec["priority"], string> = {
  "must-have": "bg-red-50 text-red-700 border-red-200",
  "should-have": "bg-yellow-50 text-yellow-700 border-yellow-200",
  "nice-to-have": "bg-blue-50 text-blue-700 border-blue-200",
};

export default async function DecisionPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const supabase = createServerSupabaseClient();

  const [projectRes, decisionRes, clustersRes, interviewsRes] = await Promise.all([
    supabase
      .from("interview_projects")
      .select("id, name")
      .eq("id", projectId)
      .single(),
    supabase
      .from("decision_outputs")
      .select(
        "id, selected_cluster_id, reasoning, feature_specs, user_flows, edge_cases, success_metrics, confidence_score, status, updated_at, created_at"
      )
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false })
      .limit(1),
    supabase
      .from("problem_clusters")
      .select(
        "id, canonical_problem, frequency, avg_intensity, consistency_score, score, supporting_quotes, member_problem_ids, category"
      )
      .eq("project_id", projectId)
      .order("score", { ascending: false }),
    supabase
      .from("interviews")
      .select("id, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
  ]);

  if (projectRes.error || !projectRes.data) notFound();

  const project = projectRes.data;
  const decisionRows = (decisionRes.data ?? []) as DecisionWithId[];
  const decision: DecisionWithId | null = decisionRows[0] ?? null;
  const allClusters = (clustersRes.data ?? []) as ClusterWithId[];
  const interviews = (interviewsRes.data ?? []) as Array<{ id: string; created_at: string }>;
  const interviewsSortedIds = interviews.map((i) => i.id);

  const topCluster = decision?.selected_cluster_id
    ? allClusters.find((c) => c.id === decision.selected_cluster_id) ?? null
    : allClusters[0] ?? null;

  if (!decision || decision.status !== "ready") {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <Link href={`/interviews/${projectId}`} className="text-sm text-muted-foreground hover:underline">
            ← Back to project
          </Link>
          <div className="mt-8 text-center py-16">
            <p className="text-lg font-medium mb-2">
              {decision?.status === "insufficient_data"
                ? "Insufficient data"
                : decision?.status === "processing"
                ? "Analysis in progress..."
                : "No decision yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {decision?.status === "insufficient_data"
                ? "Add more interviews with higher signal to generate a decision."
                : "Run analysis from the project page to generate a decision."}
            </p>
            {(decision?.status === "insufficient_data" || !decision) && (
              <Link
                href={`/interviews/${projectId}`}
                className="inline-flex px-4 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90"
              >
                ← Back to project to rerun
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const featureSpecs = (decision.feature_specs as FeatureSpec[] | null) ?? [];
  const userFlows = (decision.user_flows as UserFlow[] | null) ?? [];
  const edgeCases = (decision.edge_cases as EdgeCase[] | null) ?? [];
  const successMetrics = (decision.success_metrics as SuccessMetric[] | null) ?? [];

  const sortedFeatures = [...featureSpecs].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
  );
  const groupedFeatures = {
    "must-have": sortedFeatures.filter((f) => f.priority === "must-have"),
    "should-have": sortedFeatures.filter((f) => f.priority === "should-have"),
    "nice-to-have": sortedFeatures.filter((f) => f.priority === "nice-to-have"),
  };

  const confidencePct = Math.round((decision.confidence_score ?? 0) * 100);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        {/* Back link */}
        <Link href={`/interviews/${projectId}`} className="text-sm text-muted-foreground hover:underline">
          ← Back to project
        </Link>

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold mb-1">{project.name}</h1>
          <p className="text-sm text-muted-foreground mb-4">Product Decision Report</p>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Confidence</span>
            <div className="flex-1 max-w-xs bg-muted rounded-full h-2">
              <div
                className="bg-green-500 rounded-full h-2 transition-all"
                style={{ width: `${confidencePct}%` }}
              />
            </div>
            <span className="text-sm font-medium">{confidencePct}%</span>
          </div>
        </div>

        {/* Reasoning */}
        <section className="border border-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Reasoning
          </h2>
          <p className="text-sm leading-relaxed">{decision.reasoning}</p>
        </section>

        {/* Top Problem */}
        {topCluster && (
          <section className="border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Top Problem
            </h2>
            <p className="text-xl font-semibold">{topCluster.canonical_problem}</p>
            <div className="space-y-2">
              <ScoreBar label="Frequency" value={Math.min(topCluster.frequency / 10, 1)} />
              <ScoreBar label="Avg Intensity" value={topCluster.avg_intensity} max={5} />
              <ScoreBar label="Consistency" value={topCluster.consistency_score} />
              <ScoreBar label="Overall score" value={topCluster.score} />
            </div>
          </section>
        )}

        {/* Supporting Quotes */}
        {topCluster && topCluster.supporting_quotes.length > 0 && (
          <section className="border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Supporting Quotes
            </h2>
            <SupportingQuotes
              quotes={topCluster.supporting_quotes}
              interviewsSortedIds={interviewsSortedIds}
            />
          </section>
        )}

        {/* All Clusters — grouped by category */}
        {allClusters.length > 1 && (() => {
          const categoryOrder: string[] = [];
          const byCategory = new Map<string, ClusterWithId[]>();
          for (const cluster of allClusters) {
            const cat = cluster.category ?? "General Problems";
            if (!byCategory.has(cat)) {
              byCategory.set(cat, []);
              categoryOrder.push(cat);
            }
            byCategory.get(cat)!.push(cluster);
          }
          return (
            <section className="border border-border rounded-xl p-6 space-y-6">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                All Problem Clusters
              </h2>
              {categoryOrder.map((cat) => {
                const clusters = byCategory.get(cat)!;
                return (
                  <div key={cat}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 pb-1 border-b border-border">
                      {cat}
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-muted-foreground">
                            <th className="pb-2 pr-4 font-medium">Problem</th>
                            <th className="pb-2 pr-4 font-medium text-right">Freq</th>
                            <th className="pb-2 pr-4 font-medium text-right">Intensity</th>
                            <th className="pb-2 font-medium text-right">Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {clusters.map((cluster) => (
                            <tr key={cluster.id} className="border-t border-border/50">
                              <td className="py-2.5 pr-4 font-medium">{cluster.canonical_problem}</td>
                              <td className="py-2.5 pr-4 text-right text-muted-foreground">{cluster.frequency}</td>
                              <td className="py-2.5 pr-4 text-right text-muted-foreground">
                                {cluster.avg_intensity.toFixed(1)}
                              </td>
                              <td className="py-2.5 text-right font-medium">{cluster.score.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })()}

        {/* Feature Specs */}
        {sortedFeatures.length > 0 && (
          <section className="border border-border rounded-xl p-6 space-y-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Feature Specifications
            </h2>
            {(["must-have", "should-have", "nice-to-have"] as FeatureSpec["priority"][]).map(
              (priority) => {
                const features = groupedFeatures[priority];
                if (features.length === 0) return null;
                return (
                  <div key={priority}>
                    <h3 className="text-xs font-semibold uppercase tracking-wide mb-3 capitalize">
                      <span
                        className={`inline-block px-2 py-0.5 rounded border text-xs ${priorityStyles[priority]}`}
                      >
                        {priority}
                      </span>
                    </h3>
                    <div className="space-y-3">
                      {features.map((f, i) => (
                        <div key={i} className="border border-border rounded-lg p-4">
                          <p className="font-medium text-sm mb-1">{f.name}</p>
                          <p className="text-sm text-muted-foreground">{f.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
            )}
          </section>
        )}

        {/* User Flows */}
        {userFlows.length > 0 && (
          <section className="border border-border rounded-xl p-6 space-y-6">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              User Flows
            </h2>
            {userFlows.map((flow, i) => (
              <div key={i}>
                <h3 className="font-medium text-sm mb-3">{flow.title}</h3>
                <ol className="space-y-1.5">
                  {flow.steps.map((step, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {j + 1}
                      </span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </section>
        )}

        {/* Edge Cases */}
        {edgeCases.length > 0 && (
          <section className="border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Edge Cases
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="pb-2 pr-6 font-medium">Scenario</th>
                    <th className="pb-2 font-medium">Mitigation</th>
                  </tr>
                </thead>
                <tbody>
                  {edgeCases.map((ec, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-3 pr-6 font-medium align-top">{ec.scenario}</td>
                      <td className="py-3 text-muted-foreground align-top">{ec.mitigation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Success Metrics */}
        {successMetrics.length > 0 && (
          <section className="border border-border rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Success Metrics
            </h2>
            <div className="space-y-4">
              {successMetrics.map((m, i) => (
                <div key={i} className="border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <span className="font-medium text-sm">{m.metric}</span>
                    <span className="text-sm font-semibold shrink-0">{m.target}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{m.rationale}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
