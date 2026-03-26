import { createServerSupabaseClient } from "@/lib/supabaseServer";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MetaClusterCard } from "./MetaClusterCard";
import { AllProblemsButton } from "./AllProblemsButton";
import type {
  ProblemCluster,
  FeatureSpec,
  UserFlow,
  EdgeCase,
  SuccessMetric,
  DecisionOutput,
  MetaCluster,
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

function QuoteCard({
  quote,
  interviewLabel,
  rankLabel,
}: {
  quote: ProblemCluster["supporting_quotes"][number];
  interviewLabel: string;
  rankLabel?: string;
}) {
  return (
    <div className="flex flex-col justify-between border border-border rounded-xl p-5 bg-card min-h-[120px]">
      {rankLabel && (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          {rankLabel}
        </span>
      )}
      <p className="text-sm italic leading-relaxed text-foreground/90">
        &ldquo;{quote.text}&rdquo;
      </p>
      <cite className="text-xs text-muted-foreground mt-3 block not-italic font-medium">
        {interviewLabel}
      </cite>
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

function DashboardCard({
  children,
  className,
  accent = false,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`border border-border rounded-xl p-6 bg-card ${
        accent ? "border-t-2 border-t-foreground" : ""
      } ${className ?? ""}`}
    >
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
      {children}
    </h2>
  );
}

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
        "id, selected_cluster_id, reasoning, feature_specs, user_flows, edge_cases, success_metrics, confidence_score, meta_clusters, status, updated_at, created_at"
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
        <div className="max-w-7xl mx-auto px-4 py-10">
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

  const metaClusters = (decision.meta_clusters as MetaCluster[] | null) ?? [];
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
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Hero Bar */}
        <div className="w-full bg-muted/50 border border-border rounded-xl px-8 py-6 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Left: identity + back */}
          <div>
            <Link
              href={`/interviews/${projectId}`}
              className="text-xs text-muted-foreground hover:underline mb-2 block"
            >
              ← Back to project
            </Link>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-sm text-muted-foreground">Product Decision Report</p>
          </div>
          {/* Center: confidence */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">AI Confidence</span>
            <span className="text-5xl font-bold">{confidencePct}%</span>
            <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${confidencePct}%` }}
              />
            </div>
          </div>
          {/* Right: top problem preview */}
          {topCluster && (
            <div className="max-w-xs">
              <span className="text-xs uppercase tracking-wide text-muted-foreground block mb-1">
                Top Problem
              </span>
              <p className="text-sm font-medium line-clamp-2">{topCluster.canonical_problem}</p>
              <span className="mt-1 inline-block text-xs px-2 py-0.5 rounded-full bg-foreground text-background">
                Score: {topCluster.score.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">

          {/* Top Problem */}
          {topCluster && (
            <DashboardCard accent className="lg:col-span-7 space-y-4">
              <SectionHeading>Top Problem</SectionHeading>
              <p className="text-xl font-semibold">{topCluster.canonical_problem}</p>
              <div className="space-y-2">
                <ScoreBar label="Frequency" value={Math.min(topCluster.frequency / 10, 1)} />
                <ScoreBar label="Avg Intensity" value={topCluster.avg_intensity} max={5} />
                <ScoreBar label="Consistency" value={topCluster.consistency_score} />
                <ScoreBar label="Overall score" value={topCluster.score} />
              </div>
            </DashboardCard>
          )}

          {/* Reasoning */}
          <DashboardCard className="lg:col-span-5">
            <SectionHeading>Reasoning</SectionHeading>
            <ul className="space-y-2">
              {(() => {
                const raw = decision.reasoning;
                let points: string[];
                if (Array.isArray(raw)) {
                  points = raw;
                } else {
                  try {
                    const parsed = JSON.parse(String(raw));
                    points = Array.isArray(parsed) ? parsed : String(raw).split(/(?<=[.!?])\s+/);
                  } catch {
                    points = String(raw).split(/(?<=[.!?])\s+/);
                  }
                }
                return points
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-foreground/40" />
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ));
              })()}
            </ul>
          </DashboardCard>

          {/* Supporting Quotes — always render 3 slots */}
          {topCluster && (
            <div className="lg:col-span-12 md:col-span-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Voice of the Customer
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(() => {
                  const rankLabels = ["Weakest Signal", "Moderate Signal", "Strongest Signal"];
                  // quotes are in descending score order; reverse so strongest is on the right
                  const quotes = [...topCluster.supporting_quotes.slice(0, 3)].reverse();
                  return [0, 1, 2].map((i) => {
                    const q = quotes[i];
                    if (!q) {
                      return (
                        <div
                          key={i}
                          className="flex flex-col justify-center items-center border border-dashed border-border rounded-xl p-5 bg-card min-h-[120px]"
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                            {rankLabels[i]}
                          </span>
                          <span className="text-xs text-muted-foreground/50">No quote available</span>
                        </div>
                      );
                    }
                    const idx = interviewsSortedIds.indexOf(q.interview_id);
                    const label = idx >= 0 ? `Interview #${idx + 1}` : "Interview";
                    return (
                      <QuoteCard key={i} quote={q} interviewLabel={label} rankLabel={rankLabels[i]} />
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Meta Clusters */}
          {metaClusters.length > 0 && (
            <DashboardCard className="lg:col-span-12 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Problem Meta-Themes</h2>
                {allClusters.length > 0 && <AllProblemsButton allClusters={allClusters} />}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metaClusters.map((mc) => (
                  <MetaClusterCard key={mc.id} mc={mc} allClusters={allClusters} />
                ))}
              </div>
            </DashboardCard>
          )}

          {/* Feature Specs */}
          {sortedFeatures.length > 0 && (
            <DashboardCard className="lg:col-span-12 md:col-span-2">
              <SectionHeading>Feature Specifications</SectionHeading>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              </div>
            </DashboardCard>
          )}

          {/* User Flows */}
          {userFlows.length > 0 && (
            <DashboardCard className="lg:col-span-6 space-y-6">
              <SectionHeading>User Flows</SectionHeading>
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
            </DashboardCard>
          )}

          {/* Edge Cases */}
          {edgeCases.length > 0 && (
            <DashboardCard className="lg:col-span-6 space-y-4">
              <SectionHeading>Edge Cases</SectionHeading>
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
            </DashboardCard>
          )}

          {/* Success Metrics */}
          {successMetrics.length > 0 && (
            <DashboardCard className="lg:col-span-12 md:col-span-2">
              <SectionHeading>Success Metrics</SectionHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {successMetrics.map((m, i) => (
                  <div key={i} className="border border-border rounded-lg p-4 space-y-1.5">
                    <p className="font-medium text-sm">{m.metric}</p>
                    <p className="text-sm font-bold">{m.target}</p>
                    <p className="text-xs text-muted-foreground">{m.rationale}</p>
                  </div>
                ))}
              </div>
            </DashboardCard>
          )}

        </div>
      </div>
    </div>
  );
}
